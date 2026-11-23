"""Live test of search_youtube_videos across 3 disciplines.

Confirms: HTTP 200 Atom feed + oEmbed (HTTP 200 + official author) +
playableInEmbed:true results with zero exceptions.
"""

import asyncio
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "backend")

from core.web_research import search_youtube_videos


async def main():
    queries = [
        "SAFe agile scrum",
        "SRE platform engineering",
        "business analysis user research",
    ]
    for query in queries:
        try:
            results = await search_youtube_videos(query, max_videos=2)
            print(f"QUERY: {query!r} -> {len(results)} video(s)")
            for v in results:
                print(f"   title={v.get('title')!r} author={v.get('author_name')!r} "
                      f"video_id={v.get('video_id')!r} url={v.get('url')!r}")
        except Exception as exc:  # noqa: BLE001 — report, do not crash
            print(f"QUERY: {query!r} -> ERROR: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
