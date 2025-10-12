#!/usr/bin/env python3
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from io import BytesIO

# List of ibb page URLs to fetch
IBB_URLS = [
    "https://ibb.co/chy31kJC",
    "https://ibb.co/Ngc7F9Mw",
    "https://ibb.co/GvvfR2by",
    "https://ibb.co/VFK3ykk",
    "https://ibb.co/tpY4gtx8",
    "https://ibb.co/mr8H6WkT",
    "https://ibb.co/8n09kPrT",
    "https://ibb.co/JRThHYWj",
    "https://ibb.co/6JJGD0kQ",
    "https://ibb.co/FLPTV9Kt",
    "https://ibb.co/m5mMfw6W",
    "https://ibb.co/NgSXmZZr",
]

# Determine output directory (client/public/tags)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(REPO_ROOT, "client", "public", "tags")
TMP_DIR = os.path.join(OUT_DIR, "_new_tmp_py")

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Build an SSL context that won't choke on cert issues in controlled envs
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=60) as resp:
        return resp.read()


def extract_og_image(html: str) -> str | None:
    # Try robustly to find a meta with og:image and capture its content attribute
    # 1) Direct regex search allowing any attribute order
    m = re.search(
        r"<meta[^>]*?(?:property|name)\s*=\s*['\"]og:image['\"][^>]*?content\s*=\s*['\"]([^'\"]+)['\"][^>]*?>",
        html,
        re.IGNORECASE,
    )
    if m:
        return m.group(1)
    # 2) Fallback: scan all meta tags and pick one containing og:image
    for tag in re.findall(r"<meta[^>]*?>", html, flags=re.IGNORECASE):
        if re.search(r"og:image", tag, flags=re.IGNORECASE):
            m2 = re.search(r"content\s*=\s*['\"]([^'\"]+)['\"]", tag, flags=re.IGNORECASE)
            if m2:
                return m2.group(1)
    return None


def ensure_pillow():
    try:
        import PIL  # noqa: F401
        from PIL import Image  # noqa: F401
    except Exception:
        # Install Pillow locally for the user
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
        # Normalize mode to ensure save compatibility
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im.save(dest_path, format="WEBP", quality=85, method=6)



def main() -> int:
    os.makedirs(TMP_DIR, exist_ok=True)
    if not os.path.isdir(OUT_DIR):
        print(f"Output directory not found: {OUT_DIR}", file=sys.stderr)
        return 1

    ensure_pillow()

    for idx, page_url in enumerate(IBB_URLS, start=1):
        print(f"Processing {page_url} -> tag{idx}.webp")
        try:
            html = http_get(page_url).decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"Failed to fetch page {page_url}: {e}", file=sys.stderr)
            return 1

        direct = extract_og_image(html)
        if not direct:
            print(f"Could not extract direct image URL from {page_url}", file=sys.stderr)
            return 1

        # Some links might be protocol-relative or have query params
        if direct.startswith("//"):
            direct = "https:" + direct

        try:
            img_bytes = http_get(direct)
        except Exception as e:
            print(f"Failed to download image {direct}: {e}", file=sys.stderr)
            return 1

        dest = os.path.join(OUT_DIR, f"tag{idx}.webp")
        try:
            convert_to_webp(img_bytes, dest)
        except Exception as e:
            print(f"Failed to convert/save to {dest}: {e}", file=sys.stderr)
            return 1
        os.chmod(dest, 0o644)
        print(f"Wrote {dest}")

    print("All 12 tag images replaced successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
