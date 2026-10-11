import os
from sqlalchemy import create_engine, inspect, text

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

basedir = os.path.abspath(os.path.dirname(__file__))

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = "sqlite:///" + os.path.join(basedir, "project.db")

print("Target:", DATABASE_URL.split("@")[-1])

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

TABLE = "message_attachments"

if TABLE not in inspector.get_table_names():
    raise SystemExit(f"{TABLE} table does not exist")

existing = {c["name"] for c in inspector.get_columns(TABLE)}

with engine.begin() as conn:
    for col in ("width", "height"):
        if col in existing:
            print(f"{col} already exists, skipping.")
        else:
            print(f"Adding {col}...")
            conn.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {col} INTEGER"))

inspector = inspect(engine)
print(f"\n{TABLE} columns:")
for col in inspector.get_columns(TABLE):
    print("  ", col["name"])

print("\nDone.")











import os
import io
import json
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor

import requests
from PIL import Image
from sqlalchemy import create_engine, inspect, text

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

basedir = os.path.abspath(os.path.dirname(__file__))

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = "sqlite:///" + os.path.join(basedir, "project.db")

print("Target:", DATABASE_URL.split("@")[-1])

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
tables = inspector.get_table_names()

TABLE = "message_attachments"

if TABLE not in tables:
    raise SystemExit(f"{TABLE} table does not exist")

existing = {c["name"] for c in inspector.get_columns(TABLE)}

with engine.begin() as conn:
    for col in ("width", "height"):
        if col in existing:
            print(f"{col} already exists, skipping.")
        else:
            print(f"Adding {col}...")
            conn.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {col} INTEGER"))

MAX_BYTES = 40 * 1024 * 1024
HAS_FFPROBE = shutil.which("ffprobe") is not None


def image_dims(url):
    r = requests.get(url, timeout=30, stream=True)
    r.raise_for_status()
    buf = io.BytesIO()
    for chunk in r.iter_content(65536):
        buf.write(chunk)
        if buf.tell() > MAX_BYTES:
            raise ValueError("too large")
    buf.seek(0)
    with Image.open(buf) as img:
        w, h = img.size
        try:
            orientation = img.getexif().get(274)
        except Exception:
            orientation = None
        if orientation in (5, 6, 7, 8):
            w, h = h, w
    return w, h


def video_dims(url):
    if not HAS_FFPROBE:
        raise RuntimeError("ffprobe not installed")
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
            "-of", "json", url,
        ],
        capture_output=True, text=True, timeout=60,
    )
    data = json.loads(out.stdout or "{}")
    stream = (data.get("streams") or [{}])[0]
    w = int(stream["width"])
    h = int(stream["height"])
    rotation = 0
    tags = stream.get("tags") or {}
    if "rotate" in tags:
        rotation = int(tags["rotate"])
    for sd in stream.get("side_data_list") or []:
        if "rotation" in sd:
            rotation = int(sd["rotation"])
    if abs(rotation) % 180 == 90:
        w, h = h, w
    return w, h


def probe(row):
    att_id, url, ftype = row
    if not url or not url.startswith("http"):
        return att_id, None, "no http url"
    try:
        if ftype == "image":
            w, h = image_dims(url)
        else:
            w, h = video_dims(url)
        if not (1 <= w <= 20000 and 1 <= h <= 20000):
            return att_id, None, "bad size"
        return att_id, (w, h), None
    except Exception as e:
        return att_id, None, str(e)


with engine.connect() as conn:
    rows = conn.execute(text(
        f"SELECT id, file_url, file_type FROM {TABLE} "
        f"WHERE (width IS NULL OR height IS NULL) AND file_type IN ('image', 'video') "
        f"ORDER BY id"
    )).fetchall()

print(f"\n{len(rows)} attachments to backfill")
if not HAS_FFPROBE and any(r[2] == "video" for r in rows):
    print("ffprobe not found, videos will be skipped")

ok = 0
failed = 0

with ThreadPoolExecutor(max_workers=8) as pool:
    for att_id, dims, err in pool.map(probe, rows):
        if dims is None:
            failed += 1
            print(f"  skip {att_id}: {err}")
            continue
        with engine.begin() as conn:
            conn.execute(
                text(f"UPDATE {TABLE} SET width = :w, height = :h WHERE id = :id"),
                {"w": dims[0], "h": dims[1], "id": att_id},
            )
        ok += 1
        if ok % 50 == 0:
            print(f"  {ok} done")

print(f"\nUpdated {ok}, skipped {failed}")

inspector = inspect(engine)
print(f"\n{TABLE} columns:")
for col in inspector.get_columns(TABLE):
    print("  ", col["name"])

print("\nDone.")