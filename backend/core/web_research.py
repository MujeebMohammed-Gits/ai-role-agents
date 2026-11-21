"""Free real-world web search & authoritative source extraction for grounded agents."""

from __future__ import annotations

import urllib.parse
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from core.trace import TraceEmitter


async def search_web_sources(query: str, max_results: int = 4, emitter: Optional[TraceEmitter] = None) -> list[dict]:
    """Fetch authentic live web results via DuckDuckGo HTML without paid API keys."""
    results: list[dict] = []
    try:
        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.post("https://duckduckgo.com", data={"q": query})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for item in soup.select(".result")[:max_results]:
                a_tag = item.select_one(".result__a")
                snip_tag = item.select_one(".result__snippet")
                if not a_tag:
                    continue
                title = a_tag.get_text(" ", strip=True)
                raw_href = a_tag.get("href", "")
                if "uddg=" in raw_href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                    url = parsed.get("uddg", [raw_href])
                else:
                    url = raw_href
                snippet = snip_tag.get_text(" ", strip=True) if snip_tag else ""
                if title and url.startswith("http"):
                    results.append({"title": title, "url": url, "snippet": snippet})
    except Exception as exc:
        if emitter is not None:
            await emitter.web_search({"query": query, "returned": 0, "error": str(exc)})
        return []

    if emitter is not None:
        await emitter.web_search({"query": query, "returned": len(results), "sources": [r["url"] for r in results]})
    return results
