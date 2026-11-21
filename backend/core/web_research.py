"""Free real-world web search & authentic YouTube video lookup using Python stdlib + httpx."""

from __future__ import annotations

import html
import json
import re
import urllib.parse
from typing import Optional
import httpx
from core.trace import TraceEmitter


async def search_youtube_videos(query: str, max_videos: int = 2) -> list[dict]:
    """Fetch authentic playable YouTube video IDs and titles without paid API keys."""
    videos: list[dict] = []
    try:
        q_enc = urllib.parse.quote_plus(query)
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.get(f"https://youtube.com{q_enc}")
            resp.raise_for_status()
            m = re.search(r"var ytInitialData = (\{.*?\});</script>", resp.text)
            if m:
                data = json.loads(m.group(1))
                contents = (
                    data.get("contents", {})
                    .get("twoColumnSearchResultsRenderer", {})
                    .get("primaryContents", {})
                    .get("sectionListRenderer", {})
                    .get("contents", [])
                )
                seen = set()
                for section in contents:
                    items = section.get("itemSectionRenderer", {}).get("contents", [])
                    for it in items:
                        vr = it.get("videoRenderer")
                        if not vr:
                            continue
                        vid = vr.get("videoId", "")
                        runs = vr.get("title", {}).get("runs", [])
                        title = "".join(r.get("text", "") for r in runs).strip()
                        if len(vid) == 11 and title and vid not in seen:
                            seen.add(vid)
                            videos.append({
                                "title": title,
                                "url": f"https://youtube.com{vid}",
                                "video_id": vid,
                            })
                            if len(videos) >= max_videos:
                                return videos
    except Exception:
        pass
    return videos


async def search_web_sources(query: str, max_results: int = 4, emitter: Optional[TraceEmitter] = None) -> list[dict]:
    """Fetch authentic live web results via DuckDuckGo HTML + YouTube videos without paid API keys."""
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
                    results.append({"title": title, "url": url, "snippet": snippet, "kind": "web"})
    except Exception as exc:
        if emitter is not None:
            await emitter.web_search({"query": query, "returned": 0, "error": str(exc)})
        return []

    yt_videos = await search_youtube_videos(query, max_videos=2)
    for v in yt_videos:
        results.append({
            "title": f"Video: {v['title']}",
            "url": v["url"],
            "snippet": f"Authentic YouTube video tutorial/talk: {v['title']} ({v['url']})",
            "kind": "video",
        })

    if emitter is not None:
        await emitter.web_search({
            "query": query,
            "returned": len(results),
            "videos_found": len(yt_videos),
            "sources": [r["url"] for r in results],
        })
    return results
