"""Debug: inspect oEmbed author_name + playableInEmbed for verified channels."""

import asyncio
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "backend")

import httpx
from core.web_research import (
    _fetch_youtube_channel,
    _verify_youtube_embeddable,
    VERIFIED_OFFICIAL_CHANNELS,
    OFFICIAL_YOUTUBE_AUTHORS,
)


async def main():
    print("OFFICIAL_YOUTUBE_AUTHORS:", sorted(OFFICIAL_YOUTUBE_AUTHORS))
    print()
    timeout = httpx.Timeout(10.0, connect=10.0, read=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for name, cid in list(VERIFIED_OFFICIAL_CHANNELS.items())[:6]:
            videos = await _fetch_youtube_channel(name, cid, client)
            print(f"{name} ({cid}): {len(videos)} video(s) from feed")
            for v in videos[:1]:
                res = await _verify_youtube_embeddable(client, v["video_id"])
                print(f"   video={v['video_id']!r} embeddable={res}")


if __name__ == "__main__":
    asyncio.run(main())
