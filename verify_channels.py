"""Live-verify governing-body YouTube channel IDs via the Atom feed.

For each governing body:
  a) If channel_id is non-null: verify GET https://www.youtube.com/feeds/videos.xml?channel_id={id} returns HTTP 200.
  b) If channel_id is null: resolve UC... id from the official handle URL (CONSENT=YES+1 cookie),
     extracting "channelId":"(UC[a-zA-Z0-9_-]{22})" or <meta itemprop="channelId" content="...">,
     and only accept if the feed returns HTTP 200 OK.

Prints one JSON line per governing body plus a summary.
"""

import json
import re
import urllib.error
import urllib.request

FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={}"
CHANNEL_ID_RE = re.compile(r'"channelId":"(UC[a-zA-Z0-9_-]{22})"')
META_CHANNEL_ID_RE = re.compile(r'<meta itemprop="channelId" content="([^"]+)"')

GOVERNING_BODIES = [
    {"discipline": "Agile", "governing_body": "Agile Alliance", "channel_id": None, "handle": "@agileallianceofficial", "url": "https://www.youtube.com/@agileallianceofficial"},
    {"discipline": "Scrum", "governing_body": "Scrum.org", "channel_id": "UCjX8DX2unX1Os3zZeMs-IWA", "handle": "@scrumorg", "url": "https://www.youtube.com/channel/UCjX8DX2unX1Os3zZeMs-IWA"},
    {"discipline": "Scrum (Co-governing)", "governing_body": "Scrum Alliance", "channel_id": None, "handle": "@scrumalliance", "url": "https://www.youtube.com/@scrumalliance"},
    {"discipline": "Kanban", "governing_body": "Kanban University", "channel_id": None, "handle": "@KanbanUniversity", "url": "https://www.youtube.com/@KanbanUniversity"},
    {"discipline": "SAFe", "governing_body": "Scaled Agile, Inc.", "channel_id": "UC-n4Mb-Bu5Pgl0z5L1jyhSQ", "handle": "@ScaledAgile", "url": "https://www.youtube.com/channel/UC-n4Mb-Bu5Pgl0z5L1jyhSQ"},
    {"discipline": "LeSS", "governing_body": "The LeSS Company", "channel_id": None, "handle": "@LargeScaleScrum", "url": "https://www.youtube.com/@LargeScaleScrum"},
    {"discipline": "AgilePM", "governing_body": "Agile Business Consortium", "channel_id": None, "handle": "@AgileBusinessConsortium", "url": "https://www.youtube.com/@AgileBusinessConsortium"},
    {"discipline": "APM", "governing_body": "Association for Project Management (APM)", "channel_id": None, "handle": "@APMProjectManagement", "url": "https://www.youtube.com/@APMProjectManagement"},
    {"discipline": "Product Management", "governing_body": "Pragmatic Institute", "channel_id": None, "handle": "@PragmaticInstitute", "url": "https://www.youtube.com/@PragmaticInstitute"},
    {"discipline": "Product Management (Community)", "governing_body": "Product School", "channel_id": "UC6hlQ0x6kPbAGjYkoz53cvA", "handle": "@ProductSchool", "url": "https://www.youtube.com/channel/UC6hlQ0x6kPbAGjYkoz53cvA"},
    {"discipline": "Product Owner", "governing_body": "Scrum.org (PSPO)", "channel_id": "UCjX8DX2unX1Os3zZeMs-IWA", "handle": "@scrumorg", "url": "https://www.youtube.com/channel/UCjX8DX2unX1Os3zZeMs-IWA"},
    {"discipline": "Scrum Master", "governing_body": "Scrum.org (PSM)", "channel_id": "UCjX8DX2unX1Os3zZeMs-IWA", "handle": "@scrumorg", "url": "https://www.youtube.com/channel/UCjX8DX2unX1Os3zZeMs-IWA"},
    {"discipline": "Enterprise Agile Coach", "governing_body": "ICAgile", "channel_id": None, "handle": "@ICAgile", "url": "https://www.youtube.com/@ICAgile"},
    {"discipline": "SRE", "governing_body": "USENIX Association (SREcon)", "channel_id": "UC4-GrpQBx6WCGwmwozP744Q", "handle": "@USENIXAssociation", "url": "https://www.youtube.com/channel/UC4-GrpQBx6WCGwmwozP744Q"},
    {"discipline": "DevOps", "governing_body": "DevOps Institute (PeopleCert)", "channel_id": None, "handle": "@DevOpsInstitute", "url": "https://www.youtube.com/@DevOpsInstitute"},
    {"discipline": "Platform Engineering", "governing_body": "Cloud Native Computing Foundation (CNCF)", "channel_id": "UCvqbFHwN-nwalWPjPUKpvTA", "handle": "@cncf", "url": "https://www.youtube.com/channel/UCvqbFHwN-nwalWPjPUKpvTA"},
    {"discipline": "Business Analysis", "governing_body": "International Institute of Business Analysis (IIBA)", "channel_id": "UCtpU0wWTg_QBEXnp4HujLEg", "handle": "@IIBA", "url": "https://www.youtube.com/channel/UCtpU0wWTg_QBEXnp4HujLEg"},
    {"discipline": "User Research", "governing_body": "Nielsen Norman Group (NN/g)", "channel_id": "UC2oCugzU6W8-h95W7eBTUEg", "handle": "@NNgroup", "url": "https://www.youtube.com/channel/UC2oCugzU6W8-h95W7eBTUEg"},
    {"discipline": "Management Consultant", "governing_body": "Management Consultancies Association (MCA)", "channel_id": None, "handle": "@MCA_UK", "url": "https://www.youtube.com/@MCA_UK"},
    {"discipline": "Delivery Management", "governing_body": "Agile Business Consortium", "channel_id": None, "handle": "@AgileBusinessConsortium", "url": "https://www.youtube.com/@AgileBusinessConsortium"},
    {"discipline": "Programme Management", "governing_body": "PeopleCert (MSP / PRINCE2)", "channel_id": None, "handle": "@PeopleCert", "url": "https://www.youtube.com/@PeopleCert"},
]

EXISTING_CHANNELS = {
    "Atlassian": "UCLXo7UDZvByw2ixzpQCufnA",
    "Google Cloud Tech": "UCJS9pqu9BzkAMNTmzNMNhvg",
    "CNCF": "UCvqbFHwN-nwalWPjPUKpvTA",
    "NVIDIA": "UCHuiy8bXnmK5nisYHUd1J5g",
    "GOTO Conferences": "UCs_tLP3AiwYKwdUHpltJPuA",
    "Microsoft Developer": "UCsMica-v34Irf9KVTh6xx-g",
    "HashiCorp": "UC-Royw29u1-263-299276645g",
    "InfoQ": "UCkQX1tChV7Z7l1LFF4L9j_g",
    "Nielsen Norman Group": "UC2oCugzU6W8-h95W7eBTUEg",
}


def http_get(url, cookie_consent=False):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "*/*",
    }
    if cookie_consent:
        headers["Cookie"] = "CONSENT=YES+1"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as exc:  # noqa: BLE001
        return None, str(exc).encode()


def verify_feed(channel_id):
    status, _ = http_get(FEED_URL.format(channel_id))
    return status == 200, status


def resolve_channel_id(handle_url):
    status, body = http_get(handle_url, cookie_consent=True)
    if status != 200:
        return None, status, "handle_fetch_failed"
    text = body.decode("utf-8", errors="replace")
    cid = None
    m = CHANNEL_ID_RE.search(text)
    if m:
        cid = m.group(1)
    else:
        m2 = META_CHANNEL_ID_RE.search(text)
        if m2:
            cid = m2.group(1)
    if not cid:
        return None, status, "channel_id_not_found"
    vstatus_ok, vstatus = verify_feed(cid)
    if vstatus_ok:
        return cid, 200, "resolved_and_verified"
    return None, vstatus, "resolved_but_feed_failed"


def main():
    results = []
    for body in GOVERNING_BODIES:
        record = {
            "discipline": body["discipline"],
            "governing_body": body["governing_body"],
            "handle": body["handle"],
            "given_channel_id": body["channel_id"],
            "verified_channel_id": None,
            "feed_status": None,
            "notes": "",
        }
        if body["channel_id"]:
            ok, status = verify_feed(body["channel_id"])
            record["feed_status"] = status
            if ok:
                record["verified_channel_id"] = body["channel_id"]
                record["notes"] = "given_channel_id_verified"
            else:
                record["notes"] = "given_channel_id_feed_failed"
        else:
            cid, status, notes = resolve_channel_id(body["url"])
            record["feed_status"] = status
            record["verified_channel_id"] = cid
            record["notes"] = notes
        results.append(record)
        print(json.dumps(record))

    # Summary
    verified = [r for r in results if r["verified_channel_id"]]
    failed = [r for r in results if not r["verified_channel_id"]]
    print("---SUMMARY---")
    print(json.dumps({"total": len(results), "verified": len(verified), "failed": len(failed)}))
    if failed:
        print("FAILED:")
        for r in failed:
            print("  ", r["governing_body"], r["handle"], r["notes"], r["feed_status"])

    return results


if __name__ == "__main__":
    main()
