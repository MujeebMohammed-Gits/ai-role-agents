"""LLM client abstraction.

Provides a single ``complete`` coroutine the agents call. Defaults to a
deterministic mock so the whole mesh runs without any API keys. To wire
a real provider, subclass ``LLMClient`` and register it in
``orchestrator.py`` (or set ``LLM_PROVIDER=openai|anthropic``).
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

from collections.abc import AsyncIterator

logger = logging.getLogger("core.llm_client")

from config.settings import _NVIDIA_NIM_CANONICAL_BASE_URL, _normalize_nvidia_base_url


class LLMClient:
    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ) -> str:
        raise NotImplementedError

    async def stream_complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ):
        """Yield text chunks as they are produced by the provider.

        Default implementation falls back to :meth:`complete` and yields the
        full response as a single chunk. Subclasses that support native
        streaming should override this.
        """
        response = await self.complete(
            system_prompt, messages, temperature=temperature, max_tokens=max_tokens
        )
        if response:
            yield response


def build_client(provider: str, model: str, **kwargs) -> LLMClient:
    import os

    _openai_key = (kwargs.get("openai_api_key") or os.environ.get("OPENAI_API_KEY") or "").strip()
    _anthropic_key = (kwargs.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if not _openai_key and not _anthropic_key:
        raise RuntimeError("Production LLM API key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)")

    provider = (provider or "openai").lower()
    if provider == "openai":
        try:
            from openai import AsyncOpenAI  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("openai package not installed; `pip install openai`") from exc
        _api_key = _openai_key
        if not _api_key:
            raise RuntimeError("Production LLM API key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)")
        if _api_key.startswith("nvapi-"):
            # NVIDIA NIM: always use the canonical integrate API endpoint so the
            # broken ``https://nvidia.com`` host can never cause a 404.
            _base_url = _NVIDIA_NIM_CANONICAL_BASE_URL
        else:
            _default_base = "https://api.openai.com/v1"
            _base_url = _normalize_nvidia_base_url(
                os.environ.get("OPENAI_BASE_URL")
                or os.environ.get("OPENAI_API_BASE")
                or kwargs.get("openai_api_base")
                or _default_base
            )
        return _OpenAILLMClient(
            AsyncOpenAI(api_key=_api_key, base_url=_base_url, timeout=90.0), model
        )
    if provider == "anthropic":
        try:
            import anthropic  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("anthropic package not installed; `pip install anthropic`") from exc
        _anth_key = _anthropic_key
        if not _anth_key:
            raise RuntimeError("Production LLM API key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)")
        _anth_base = os.environ.get("ANTHROPIC_BASE_URL") or "https://api.anthropic.com"
        return _AnthropicLLMClient(
            anthropic.AsyncAnthropic(api_key=_anth_key, base_url=_anth_base, timeout=120.0), model
        )
    raise RuntimeError(
        f"Unknown LLM provider '{provider}'. Use 'openai' or 'anthropic'. "
        "Mock clients are not supported in production."
    )


_FALLBACK_MODEL = "meta/llama-3.3-70b-instruct"


class _OpenAILLMClient(LLMClient):
    def __init__(self, client: object, model: str) -> None:
        self._client = client
        self._model = model

    def _is_retriable_nvidia_error(self, exc) -> bool:
        """True if ``exc`` is a retriable NVIDIA NIM error (HTTP 400 or 404).

        Only NVIDIA NIM 400/404s are retried with the fallback model; any other
        provider's error is still surfaced to the caller.
        """
        if "integrate.api.nvidia.com" not in str(getattr(self._client, "base_url", "")):
            return False
        status = getattr(exc, "status_code", None)
        if status is None:
            response = getattr(exc, "response", None)
            status = getattr(response, "status_code", None) if response is not None else None
        if status is not None:
            try:
                return int(status) in (400, 404)
            except (TypeError, ValueError):
                return False
        text = str(exc).lower()
        return ("400" in text or "404" in text) and (
            "not found" in text or "notfound" in text or "bad request" in text
        )

    async def _create_with_fallback(self, model: str, chat: list[dict], max_tokens: int, stream: bool = False):
        """Create a chat completion, retrying once with the fallback model on NVIDIA NIM 400/404."""
        try:
            return await self._client.chat.completions.create(
                model=model,
                messages=chat,
                max_tokens=max_tokens,
                stream=stream,
            )
        except Exception as exc:
            cause = getattr(exc, "__cause__", None) or exc
            if model != _FALLBACK_MODEL and self._is_retriable_nvidia_error(cause):
                return await self._client.chat.completions.create(
                    model=_FALLBACK_MODEL,
                    messages=chat,
                    max_tokens=max_tokens,
                    stream=stream,
                )
            raise RuntimeError(
                f"LLM API failed ({self._client.base_url} | model={model}): "
                f"{type(cause).__name__}: {cause}"
            ) from exc

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ) -> str:
        chat = [{"role": "system", "content": system_prompt}] + messages
        resp = await self._create_with_fallback(self._model, chat, max_tokens, stream=False)
        return resp.choices[0].message.content or ""



    async def stream_complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ):
        extra_sys = "\n\n".join(
            m.get("content", "") for m in messages
            if m.get("role") == "system" and m.get("content", "") != system_prompt
        )
        merged_sys = f"{system_prompt}\n\n{extra_sys}" if extra_sys else system_prompt
        full_messages = [{"role": "system", "content": merged_sys}] + [
            m for m in messages if m.get("role") != "system"
        ]
        async def _collect(model: str) -> str:
            stream = await self._create_with_fallback(model, full_messages, max_tokens, stream=True)
            chunks: list[str] = []
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    chunks.append(chunk.choices[0].delta.content)
            return "".join(chunks)

        response = await _collect(self._model)
        if not response and self._model != _FALLBACK_MODEL:
            response = await _collect(_FALLBACK_MODEL)
        for piece in response:
            yield piece

class _AnthropicLLMClient(LLMClient):
    def __init__(self, client: object, model: str) -> None:
        self._client = client
        self._model = model

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ) -> str:
        system_msgs = [m for m in messages if m.get("role") == "system"]
        user_msgs = [m for m in messages if m.get("role") != "system"]
        resp = await self._client.messages.create(
            model=self._model,
            system=system_prompt + "\n" + "\n".join(m.get("content", "") for m in system_msgs),
            messages=user_msgs,
            max_tokens=max_tokens,
        )
        text_blocks: list[str] = []
        for block in resp.content:
            block_type = getattr(block, "type", "")
            if block_type == "text":
                text_blocks.append(getattr(block, "text", ""))
            # ``thinking`` blocks are never surfaced to the caller.
        response = "".join(text_blocks)
        if not response:
            # Retry once with thinking disabled so a reasoning model that
            # exhausted its budget thinking still returns a clean text answer.
            retry = await self._client.messages.create(
                model=self._model,
                system=system_prompt + "\n" + "\n".join(m.get("content", "") for m in system_msgs),
                messages=user_msgs,
                max_tokens=max_tokens,
                thinking={"type": "disabled"},
            )
            text_blocks = [
                getattr(b, "text", "") for b in retry.content if getattr(b, "type", "") == "text"
            ]
            response = "".join(text_blocks)
        if not response:
            raise RuntimeError(
                "Anthropic response contained no text blocks. "
                f"Received {len(resp.content)} content block(s): "
                f"{[getattr(b, 'type', 'unknown') for b in resp.content]}"
            )
        return response

    async def stream_complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ) -> AsyncIterator[str]:
        """Yield text chunks from the Anthropic stream, skipping thinking blocks.

        Only ``block.type == "text_delta"`` chunks are yielded; ``thinking_delta``
        blocks are ignored and never surfaced to the caller. If no
        ``text_delta`` is yielded (reasoning model spent its budget thinking),
        retry once with thinking disabled so only clean, final text is streamed.
        """
        system_msgs = [m for m in messages if m.get("role") == "system"]
        user_msgs = [m for m in messages if m.get("role") != "system"]
        if not user_msgs:
            user_msgs = [{"role": "user", "content": system_prompt}]

        async def _stream(thinking_param=None):
            kwargs = {}
            if thinking_param is not None:
                kwargs["thinking"] = thinking_param
            async with self._client.messages.stream(
                model=self._model,
                system=system_prompt + "\n" + "\n".join(m.get("content", "") for m in system_msgs),
                messages=user_msgs,
                max_tokens=max_tokens,
                **kwargs,
            ) as stream:
                async for event in stream:
                    if event.type != "content_block_delta":
                        continue
                    delta = event.delta
                    delta_type = getattr(delta, "type", "")
                    if delta_type == "text_delta":
                        chunk = getattr(delta, "text", "")
                        if chunk:
                            yield chunk

        any_text = False
        async for chunk in _stream():
            any_text = True
            yield chunk

        if not any_text:
            # Retry once with thinking disabled; the model should now emit text.
            async for chunk in _stream({"type": "disabled"}):
                any_text = True
                yield chunk

        if not any_text:
            raise RuntimeError(
                "Anthropic stream produced no text blocks. "
                "All content blocks were thinking blocks or empty."
            )
