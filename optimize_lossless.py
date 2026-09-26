"""Repack the original GLB with pixel-identical lossless WebP textures.

Only PNG images are converted. JPEG images and mesh bytes remain untouched.
The result requires EXT_texture_webp support (provided by our Three.js loader).
"""

import argparse
from io import BytesIO
import json
from pathlib import Path
import struct

from PIL import Image, ImageChops


HERE = Path(__file__).resolve().parent
EXTENSION = "EXT_texture_webp"

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source", type=Path, default=HERE / "kaynak" / "destek.glb")
parser.add_argument("--target", type=Path, default=HERE / "destek-lossless.glb")
args = parser.parse_args()
SOURCE = args.source
TARGET = args.target


def pad4(data: bytes, fill: bytes) -> bytes:
    return data + fill * ((-len(data)) % 4)


with SOURCE.open("rb") as source:
    magic, version, _ = struct.unpack("<4sII", source.read(12))
    if magic != b"glTF" or version != 2:
        raise ValueError("Expected a glTF 2.0 binary file")
    json_length, json_type = struct.unpack("<I4s", source.read(8))
    if json_type != b"JSON":
        raise ValueError("GLB JSON chunk missing")
    document = json.loads(source.read(json_length))
    binary_length, binary_type = struct.unpack("<I4s", source.read(8))
    if binary_type != b"BIN\x00":
        raise ValueError("GLB binary chunk missing")
    binary = source.read(binary_length)

png_views = {
    image["bufferView"]: index
    for index, image in enumerate(document["images"])
    if image.get("mimeType") == "image/png"
}
converted_indices = set(png_views.values())
new_binary = bytearray()

for view_index, view in enumerate(document["bufferViews"]):
    start = view.get("byteOffset", 0)
    data = binary[start : start + view["byteLength"]]
    if view_index in png_views:
        image_index = png_views[view_index]
        image = Image.open(BytesIO(data))
        output = BytesIO()
        image.save(output, "WEBP", lossless=True, method=4, exact=True)
        new_data = output.getvalue()
        decoded = Image.open(BytesIO(new_data))
        if ImageChops.difference(image.convert("RGBA"), decoded.convert("RGBA")).getbbox():
            raise ValueError(f"Texture {image_index} changed pixels")
        document["images"][image_index]["mimeType"] = "image/webp"
        print(f"Texture {image_index}: {len(data) / 1e6:.2f} → {len(new_data) / 1e6:.2f} MB (pixel identical)", flush=True)
        data = new_data

    new_binary.extend(b"\0" * ((-len(new_binary)) % 4))
    view["byteOffset"] = len(new_binary)
    view["byteLength"] = len(data)
    new_binary.extend(data)

for texture in document["textures"]:
    if texture.get("source") in converted_indices:
        source_index = texture.pop("source")
        texture.setdefault("extensions", {})[EXTENSION] = {"source": source_index}

document.setdefault("extensionsUsed", []).append(EXTENSION)
document.setdefault("extensionsRequired", []).append(EXTENSION)
document["buffers"][0]["byteLength"] = len(new_binary)
json_bytes = pad4(json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode(), b" ")
bin_bytes = pad4(bytes(new_binary), b"\0")
total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)

with TARGET.open("wb") as target:
    target.write(struct.pack("<4sII", b"glTF", 2, total_length))
    target.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
    target.write(json_bytes)
    target.write(struct.pack("<I4s", len(bin_bytes), b"BIN\x00"))
    target.write(bin_bytes)

print(f"Created {TARGET.name}: {TARGET.stat().st_size / 1024 / 1024:.1f} MiB")
