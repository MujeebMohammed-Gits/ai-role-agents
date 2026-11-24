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

from config.settings import (
    _DEFAULT_FALLBACK_MODEL,
    _NVIDIA_NIM_CANONICAL_BASE_URL,
    _normalize_nvidia_base_url,
)


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


class _OpenAILLMClient(LLMClient):
    def __init__(self, client: object, model: str) -> None:
        self._client = client
        self._model = model

    #: Cache of a live NVIDIA NIM chat model discovered via ``models.list()``.
    #: Shared across instances so a single discovery serves the whole mesh.
    _discovered_active_model: Optional[str] = None

    async def _discover_live_model(self) -> Optional[str]:
        """Query NVIDIA NIM ``models.list()`` and return the best live chat model id.

        Returns a cached model id once discovered, or ``None`` when discovery is
        not applicable (non-NVIDIA base URL) or the endpoint is unreachable.
        Only non-embedding / non-guard / non-rerank models are eligible.
        """
        base_url = str(getattr(self._client, "base_url", ""))
        if "integrate.api.nvidia.com" not in base_url:
            return None
        if _OpenAILLMClient._discovered_active_model is not None:
            return _OpenAILLMClient._discovered_active_model
        try:
            listed = await self._client.models.list()
        except Exception as exc:  # discovery is best-effort; fall back below
            logger.warning("NVIDIA NIM models.list() discovery failed: %s", exc)
            return None
        models_data = getattr(listed, "data", listed)
        if isinstance(models_data, dict):
            models_data = models_data.get("data", [])
        ids: list[str] = []
        for entry in models_data:
            if isinstance(entry, dict):
                mid = entry.get("id")
            else:
                mid = getattr(entry, "id", None)
            if mid:
                ids.append(str(mid))

        preferred = [
            "nvidia/llama-3.3-nemotron-super-49b-v1",
            "nvidia/nemotron-3.5-lightning-30b-a3b",
            "meta/llama-3.1-70b-instruct",
            "qwen/qwen2.5-72b-instruct",
        ]

        def _is_chat_model(model_id: str) -> bool:
            low = model_id.lower()
            return not any(
                token in low for token in ("embedding", "guard", "rerank", "moderation")
            )

        chat_models = [mid for mid in ids if _is_chat_model(mid)]
        chosen: Optional[str] = None
        for preferred_id in preferred:
            if preferred_id in chat_models:
                chosen = preferred_id
                break
        if chosen is None and chat_models:
            chosen = chat_models[0]
        if chosen is not None:
            _OpenAILLMClient._discovered_active_model = chosen
            logger.info("Discovered live NVIDIA NIM chat model: %s", chosen)
        return chosen

    def _is_retriable_nvidia_error(self, exc) -> bool:
        """True if ``exc`` is a retriable NVIDIA NIM error (HTTP 400, 404 or 410).

        A 410 (Gone) means the model slug is retired/deprecated. Only NVIDIA NIM
        400/404/410s are retried with a live model; any other provider's error is
        still surfaced to the caller.
        """
        if "integrate.api.nvidia.com" not in str(getattr(self._client, "base_url", "")):
            return False
        status = getattr(exc, "status_code", None)
        if status is None:
            response = getattr(exc, "response", None)
            status = getattr(response, "status_code", None) if response is not None else None
        if status is not None:
            try:
                return int(status) in (400, 404, 410)
            except (TypeError, ValueError):
                return False
        text = str(exc).lower()
        return any(code in text for code in ("410", "400", "404")) and (
            "gone" in text
            or "not found" in text
            or "notfound" in text
            or "bad request" in text
            or "deprecated" in text
        )

    async def _create_with_fallback(self, model: str, chat: list[dict], max_tokens: int, stream: bool = False):
        """Create a chat completion with live-model discovery fallback on NVIDIA NIM 410/404/400.

        Attempts (in order): the requested ``model``, then a live model discovered
        via ``models.list()`` (cached in memory), then the default fallback model.
        Only NVIDIA NIM 400/404/410 errors trigger a retry; every other error is
        surfaced to the caller unchanged.
        """
        tried: list[str] = [model]
        candidate = model
        for _attempt in range(3):
            try:
                return await self._client.chat.completions.create(
                    model=candidate,
                    messages=chat,
                    max_tokens=max_tokens,
                    stream=stream,
                )
            except Exception as exc:
                cause = getattr(exc, "__cause__", None) or exc
                if not self._is_retriable_nvidia_error(cause):
                    raise RuntimeError(
                        f"LLM API failed ({self._client.base_url} | model={candidate}): "
                        f"{type(cause).__name__}: {cause}"
                    ) from exc
                # A NVIDIA NIM model is retired/deprecated: discover a live
                # replacement and retry with it (cached so discovery runs once).
                discovered = await self._discover_live_model()
                next_candidate: Optional[str] = None
                if discovered is not None and discovered not in tried:
                    next_candidate = discovered
                elif _DEFAULT_FALLBACK_MODEL not in tried:
                    next_candidate = _DEFAULT_FALLBACK_MODEL
                if next_candidate is None:
                    raise RuntimeError(
                        f"LLM API failed ({self._client.base_url} | model={candidate}): "
                        f"{type(cause).__name__}: {cause} "
                        f"(no live fallback model available; tried {tried})"
                    ) from exc
                tried.append(next_candidate)
                candidate = next_candidate
        raise RuntimeError(
            f"LLM API failed ({self._client.base_url} | model={candidate}): "
            f"exhausted NVIDIA NIM fallback models {tried}"
        )

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 6144,
    ) -> str:
        extra_sys = "\n\n".join(
            m.get("content", "") for m in messages
            if m.get("role") == "system" and m.get("content", "") != system_prompt
        )
        merged_sys = f"{system_prompt}\n\n{extra_sys}" if extra_sys else system_prompt
        full_messages = [{"role": "system", "content": merged_sys}] + [
            m for m in messages if m.get("role") != "system"
        ]
        resp = await self._create_with_fallback(self._model, full_messages, max_tokens, stream=False)
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
        if not response and self._model != _DEFAULT_FALLBACK_MODEL:
            response = await _collect(_DEFAULT_FALLBACK_MODEL)
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
