#!/usr/bin/env python3
import os
import re
import ssl
import sys
import urllib.request
from io import BytesIO

# 18 new ibb pages provided by the user
IBB_URLS = [
    "https://ibb.co/Z6Fhdfrg",
    "https://ibb.co/1G30qvkp",
    "https://ibb.co/845zxRcM",
    "https://ibb.co/7Dk3m3j",
    "https://ibb.co/8nGDr118",
    "https://ibb.co/Z68nqgVM",
    "https://ibb.co/20ZQxZDN",
    "https://ibb.co/twyMGd9j",
    "https://ibb.co/tppVtcMg",
    "https://ibb.co/Y7wGjhtf",
    "https://ibb.co/5Wpv26sV",
    "https://ibb.co/Swrt24Rv",
    "https://ibb.co/LDxQKCvQ",
    "https://ibb.co/yxQ9B5G",
    "https://ibb.co/KcbG7vL8",
    "https://ibb.co/kV83mV1T",
    "https://ibb.co/nSrfBtG",
    "https://ibb.co/SL4mq7X",
]

START_INDEX = 21  # save as tag21.webp .. tag38.webp

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(REPO_ROOT, "client", "public", "tags")
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=60) as resp:
        return resp.read()


def extract_og_image(html: str) -> str | None:
    m = re.search(
        r"<meta[^>]+property=\"og:image\"[^>]+content=\"([^\"]+)\"[^>]*>", html, re.IGNORECASE
    )
    if m:
        return m.group(1)
    m2 = re.search(r"<img[^>]+src=\"(https?://i\.ibb\.co/[^\"]+)\"", html, re.IGNORECASE)
    return m2.group(1) if m2 else None


def infer_extension_from_url(url: str) -> str:
    url = url.lower()
    for ext in ('.webp', '.png', '.jpg', '.jpeg'):
        if ext in url:
            return ext
    return '.webp'


def main() -> int:
    if not os.path.isdir(OUT_DIR):
        print(f"Output directory not found: {OUT_DIR}", file=sys.stderr)
        return 1

    saved = 0
    for offset, page_url in enumerate(IBB_URLS):
        target_idx = START_INDEX + offset
        print(f"Processing {page_url} -> tag{target_idx}.*")
        try:
            html = http_get(page_url).decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"Failed to fetch page {page_url}: {e}", file=sys.stderr)
            return 1

        direct = extract_og_image(html)
        if not direct:
            print(f"Could not extract direct image URL from {page_url}", file=sys.stderr)
            return 1
        if direct.startswith("//"):
            direct = "https:" + direct

        try:
            img_bytes = http_get(direct)
        except Exception as e:
            print(f"Failed to download image {direct}: {e}", file=sys.stderr)
            return 1

        # Save with original/guessed extension; UI falls back .webp→.png→.jpg
        ext = infer_extension_from_url(direct)
        dest = os.path.join(OUT_DIR, f"tag{target_idx}{ext}")
        try:
            with open(dest, 'wb') as f:
                f.write(img_bytes)
        except Exception as e:
            print(f"Failed to save to {dest}: {e}", file=sys.stderr)
            return 1

        try:
            os.chmod(dest, 0o644)
        except Exception:
            pass
        saved += 1
        print(f"Wrote {dest}")

    print(f"All {saved}/{len(IBB_URLS)} new tag images saved to {OUT_DIR}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
