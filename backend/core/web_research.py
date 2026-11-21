"""Free real-world web search & lightweight metadata extraction using Python stdlib + httpx."""

from __future__ import annotations

import html
import re
import urllib.parse
from typing import Optional
import httpx
from core.trace import TraceEmitter


async def search_web_sources(query: str, max_results: int = 4, emitter: Optional[TraceEmitter] = None) -> list[dict]:
    """Fetch authentic live web results via DuckDuckGo HTML without paid API keys or bs4."""
    results: list[dict] = []
    try:
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.post("https://duckduckgo.com", data={"q": query})
            resp.raise_for_status()
            raw_html = resp.text
            links = re.findall(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', raw_html, flags=re.S | re.I)
            snips = re.findall(r'<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>|<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</div>', raw_html, flags=re.S | re.I)
            for idx, (raw_href, raw_title) in enumerate(links[:max_results]):
                title = html.unescape(re.sub(r"<[^>]+>", "", raw_title)).strip()
                if "uddg=" in raw_href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(html.unescape(raw_href)).query)
                    url = parsed.get("uddg", [raw_href])
                else:
                    url = html.unescape(raw_href)
                raw_snip = ""
                if idx < len(snips):
                    raw_snip = snips[idx] or snips[idx]
                snippet = html.unescape(re.sub(r"<[^>]+>", "", raw_snip)).strip()
                if title and url.startswith("http"):
                    results.append({"title": title, "url": url, "snippet": snippet})
    except Exception as exc:
        if emitter is not None:
            await emitter.web_search({"query": query, "returned": 0, "error": str(exc)})
        return []

    if emitter is not None:
        await emitter.web_search({"query": query, "returned": len(results), "sources": [r["url"] for r in results]})
    return results
