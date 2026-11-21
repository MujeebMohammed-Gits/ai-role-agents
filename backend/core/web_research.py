"""Multi-source authentic research retriever: Peer-Reviewed Journals (OpenAlex),
Organizational Standards & Articles, and Reference Media (YouTube)."""

from __future__ import annotations

import asyncio
import html
import json
import re
import urllib.parse
from typing import Optional
import httpx
from core.trace import TraceEmitter


async def search_academic_journals(query: str, max_papers: int = 3) -> list[dict]:
    """Fetch peer-reviewed journal articles & research papers via OpenAlex API (free, no key)."""
    papers: list[dict] = []
    try:
        q_enc = urllib.parse.quote_plus(query)
        api_url = f"https://openalex.org{q_enc}&per-page={max_papers}&sort=relevance_score:desc"
        async with httpx.AsyncClient(
            timeout=6.0,
            headers={"User-Agent": "AI-Role-Agents-Research/1.0 (mailto:research@ai-role-agents.app)"},
        ) as client:
            resp = await client.get(api_url)
            resp.raise_for_status()
            for work in resp.json().get("results", [])[:max_papers]:
                title = (work.get("title") or "").strip()
                year = work.get("publication_year") or ""
                doi = work.get("doi") or work.get("id") or ""
                loc = work.get("primary_location") or {}
                source_obj = loc.get("source") or {}
                journal = source_obj.get("display_name") or "Peer-Reviewed Research"
                # Reconstruct snippet from OpenAlex inverted index if present
                inv = work.get("abstract_inverted_index") or {}
                words_pos = []
                for w, positions in inv.items():
                    for p in positions:
                        words_pos.append((p, w))
                words_pos.sort(key=lambda x: x)
                abstract = " ".join(w for _, w in words_pos[:55])
                if title and doi:
                    papers.append({
                        "title": f"[Journal: {journal} ({year})] {title}",
                        "url": doi,
                        "snippet": abstract or f"Peer-reviewed paper published in {journal} ({year}).",
                        "kind": "journal",
                    })
    except Exception:
        pass
    return papers


async def search_org_articles(query: str, max_results: int = 3) -> list[dict]:
    """Fetch authoritative organizational standards, engineering blogs & articles."""
    articles: list[dict] = []
    try:
        ddg_url = "https://" + "html.duckduckgo." + "com/html/"
        async with httpx.AsyncClient(
            timeout=6.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.post(ddg_url, data={"q": query})
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
                raw_snip = (snips[idx] or snips[idx]) if idx < len(snips) else ""
                snippet = html.unescape(re.sub(r"<[^>]+>", "", raw_snip)).strip()
                if title and url.startswith("http"):
                    articles.append({
                        "title": f"[Org/Article] {title}",
                        "url": url,
                        "snippet": snippet,
                        "kind": "article",
                    })
    except Exception:
        pass
    return articles


async def search_youtube_videos(query: str, max_videos: int = 2) -> list[dict]:
    """Fetch authentic playable YouTube video talks & tutorials."""
    videos: list[dict] = []
    try:
        q_enc = urllib.parse.quote_plus(query)
        yt_search = "https://" + "www.youtube." + "com/results?search_query=" + q_enc
        yt_watch = "https://" + "www.youtube." + "com/watch?v="
        async with httpx.AsyncClient(
            timeout=6.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.get(yt_search)
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
                                "title": f"Video: {title}",
                                "url": f"{yt_watch}{vid}",
                                "snippet": f"Authentic reference video: {title} ({yt_watch}{vid})",
                                "kind": "video",
                            })
                            if len(videos) >= max_videos:
                                return videos
    except Exception:
        pass
    return videos


async def search_web_sources(query: str, max_results: int = 6, emitter: Optional[TraceEmitter] = None) -> list[dict]:
    """Concurrently fetch peer-reviewed journals, organizational articles, and reference videos."""
    j_task = asyncio.create_task(search_academic_journals(query, max_papers=2))
    a_task = asyncio.create_task(search_org_articles(query, max_results=3))
    v_task = asyncio.create_task(search_youtube_videos(query, max_videos=2))

    j_res, a_res, v_res = await asyncio.gather(j_task, a_task, v_task, return_exceptions=True)
    journals = j_res if isinstance(j_res, list) else []
    articles = a_res if isinstance(a_res, list) else []
    videos = v_res if isinstance(v_res, list) else []

    combined = (journals + articles + videos)[:max_results]

    if emitter is not None:
        await emitter.web_search({
            "query": query,
            "returned": len(combined),
            "journals_found": len(journals),
            "articles_found": len(articles),
            "videos_found": len(videos),
            "sources": [r["url"] for r in combined],
        })
    return combined
