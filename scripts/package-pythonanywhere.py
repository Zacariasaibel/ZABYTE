"""Validate and ZIP only a newly successful public Angular build (standard library)."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import zipfile

ALLOWED_SUFFIXES = {".html", ".js", ".css", ".json", ".txt", ".svg", ".webp", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".avif", ".woff", ".woff2", ".ttf", ".otf", ".eot"}


class IndexResources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.base = None
        self.urls = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "base":
            self.base = values.get("href")
        if tag in ["script", "link", "img"]:
            value = values.get("src" if tag in ["script", "img"] else "href")
            if value:
                self.urls.append(value)


def validate_build(directory, build_start):
    directory = directory.resolve()
    index = directory / "index.html"
    if not index.is_file() or index.stat().st_mtime < build_start:
        raise ValueError("No index from this build attempt. Do not package an older build.")
    files = sorted(path for path in directory.rglob("*") if path.is_file())
    for path in files:
        relative = path.relative_to(directory)
        if path.is_symlink() or not path.resolve().is_relative_to(directory):
            raise ValueError("Build contains a link outside the public directory.")
        if path.name in {"environment.json", "package.json", "package-lock.json"} or path.suffix.lower() not in ALLOWED_SUFFIXES or any(
            part.startswith(".") or part in {"node_modules", "src", "backend"} for part in relative.parts
        ):
            raise ValueError(f"Not a public build asset: {relative}")
    parser = IndexResources()
    parser.feed(index.read_text(encoding="utf-8"))
    if parser.base != "/":
        raise ValueError("Expected base href=/.")
    for value in parser.urls:
        url = urlsplit(value)
        path = unquote(url.path)
        if url.scheme or url.netloc or ".." in Path(path).parts:
            raise ValueError("Index must use safe same-origin resources.")
        if path.startswith("/shop-static/"):
            target = directory / path.removeprefix("/shop-static/")
        elif path.startswith("/assets/"):
            target = directory / path.lstrip("/")
        else:
            raise ValueError(f"Unexpected resource prefix: {path}")
        if not target.is_file() or not target.resolve().is_relative_to(directory):
            raise ValueError(f"Missing mapped index resource: {path}")
    if not any(url.startswith("/shop-static/") and urlsplit(url).path.endswith(".js") for url in parser.urls):
        raise ValueError("Expected compiled JavaScript under /shop-static/.")
    if not any(url.startswith("/shop-static/") and urlsplit(url).path.endswith(".css") for url in parser.urls):
        raise ValueError("Expected compiled CSS under /shop-static/.")
    return files


def package_build(directory, destination, build_start):
    directory = directory.resolve()
    files = validate_build(directory, build_start)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(directory).as_posix())
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError("Archive CRC check failed.")
    return len(files)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--build-start", type=float, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    output = root / ".local/deploy" / ("zabyte-frontend-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".zip")
    count = package_build(root / "frontend/dist/pythonanywhere/browser", output, args.build_start)
    print(f"Validated {count} public files. New upload package: {output}")
