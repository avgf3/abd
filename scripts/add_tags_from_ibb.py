#!/usr/bin/env python3
import os
import re
import ssl
import sys
import urllib.request
from io import BytesIO

# 8 new ibb pages provided by the user
IBB_URLS = [
    "https://ibb.co/7x6RKbzj",
    "https://ibb.co/39dctkPV",
    "https://ibb.co/8DykwnGt",
    "https://ibb.co/hJX7PHmC",
    "https://ibb.co/3YCgrnDf",
    "https://ibb.co/wm1331p",
    "https://ibb.co/Xk67SDwK",
    "https://ibb.co/cKvFst48",
]

START_INDEX = 13  # save as tag13.webp .. tag20.webp

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


def ensure_pillow():
    try:
        import PIL  # noqa: F401
        from PIL import Image  # noqa: F401
    except Exception:
        print("Installing Pillow...", file=sys.stderr)
        os.system(f"{sys.executable} -m pip install --user --disable-pip-version-check pillow > /dev/null 2>&1")
        try:
            import PIL  # noqa: F401
            from PIL import Image  # noqa: F401
        except Exception as e:
            print("Failed to import Pillow after installation:", e, file=sys.stderr)
            sys.exit(1)


def convert_to_webp(image_bytes: bytes, dest_path: str) -> None:
    from PIL import Image

    with Image.open(BytesIO(image_bytes)) as im:
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im.save(dest_path, format="WEBP", quality=88, method=6)


def main() -> int:
    if not os.path.isdir(OUT_DIR):
        print(f"Output directory not found: {OUT_DIR}", file=sys.stderr)
        return 1

    ensure_pillow()

    saved = 0
    for offset, page_url in enumerate(IBB_URLS):
        target_idx = START_INDEX + offset
        dest = os.path.join(OUT_DIR, f"tag{target_idx}.webp")
        print(f"Processing {page_url} -> tag{target_idx}.webp")
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

        try:
            convert_to_webp(img_bytes, dest)
        except Exception as e:
            print(f"Failed to convert/save to {dest}: {e}", file=sys.stderr)
            return 1

        os.chmod(dest, 0o644)
        saved += 1
        print(f"Wrote {dest}")

    print(f"All {saved}/{len(IBB_URLS)} new tag images saved to {OUT_DIR}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
