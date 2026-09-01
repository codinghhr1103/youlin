"""Download public-domain Chinese stamp scans from Wikimedia Commons (issued before 1931)."""

from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "stamps"
OUT.mkdir(parents=True, exist_ok=True)

UA = "YoulinPhilately/0.2 (https://github.com/codinghhr1103/youlin; educational catalog)"
CTX = ssl.create_default_context()

# Wikimedia pageids for pre-1931 Chinese stamps (Qing / early ROC).
PAGEIDS = [
    20074894,  # Big Dragon 1 candareen 1878
    20074895,  # Big Dragon 3 candareen 1878
    20074893,  # Big Dragon 5 candareen 1878
    135482,    # Small Dragon 1c 1885
    174582746, # Qing Customs cloud dragon
    174566833, # Coiling dragon 1 candarin
    158916322, # Empress Dowager 1894 4c
    123435469, # Ichang 1 candarin 1894
    123465076, # Ichang 3 mace
    133474402, # Formosa dragon-horse
    86578363,  # Formosa 20 wen 1896
    135483,    # 1897 0.5c litho
    35866111,  # Red Revenue small 4c
    75147797,  # Red Revenue $1 绿衣红娘
    34142821,  # 1897Red 1
    34209065,  # 1897Red 4
    20073972,  # 1910 2c overprint
    136067,    # 1912 30c Waterlow overprint
    11006640,  # Provisional Neutrality ROC
    11006619,  # Provisional Neutrality
    32871912,  # ROC memorial 1912
    20704599,  # 1902 coiling dragon Yv67
    65010021,  # 1909 Hsuan-tung
    35131186,  # Puyi accession 1909
    84667766,  # Chungking local post 1894
]


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90, context=CTX) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise last_error  # type: ignore[misc]


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90, context=CTX) as resp:
                dest.write_bytes(resp.read())
                return
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise last_error  # type: ignore[misc]


def slug(index: int, mime: str) -> str:
    ext = ".png" if "png" in mime else ".jpg"
    return f"cn-{index:02d}{ext}"


def main() -> None:
    joined = "|".join(str(pid) for pid in PAGEIDS)
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "pageids": joined,
            "prop": "imageinfo",
            "iiprop": "url|mime|extmetadata|size",
            "iiurlwidth": "720",
            "format": "json",
        }
    )
    data = request_json(f"https://commons.wikimedia.org/w/api.php?{query}")
    pages = data.get("query", {}).get("pages", {})
    manifest = []
    for index, pid in enumerate(PAGEIDS, start=1):
        page = pages.get(str(pid)) or pages.get(pid)
        if not page:
            print("MISSING page", pid)
            continue
        title = page.get("title", "")
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            print("NO IMAGE", pid, title)
            continue
        mime = info.get("mime", "image/jpeg")
        url = info.get("thumburl") or info.get("url")
        filename = slug(index, mime)
        dest = OUT / filename
        print("GET", title, "->", filename)
        download(url, dest)
        time.sleep(0.35)
        meta = info.get("extmetadata") or {}
        license_short = (meta.get("LicenseShortName") or {}).get("value") or ""
        artist = (meta.get("Artist") or {}).get("value") or ""
        manifest.append(
            {
                "id": index,
                "commons": title,
                "file": f"/stamps/{filename}",
                "license": license_short,
                "artist": artist,
                "source_url": "https://commons.wikimedia.org/wiki/"
                + urllib.parse.quote(title.replace(" ", "_")),
            }
        )
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("saved", len(manifest), "files")


if __name__ == "__main__":
    main()
