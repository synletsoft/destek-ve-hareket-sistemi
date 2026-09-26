"""Create a browser-friendly copy of the supplied GLB without changing its meshes."""

from io import BytesIO
import json
from pathlib import Path
import struct

from PIL import Image


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "kaynak" / "destek.glb"
TARGET = HERE / "destek-web.glb"
MAX_TEXTURE_SIZE = 1024


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

image_views = {image["bufferView"]: image for image in document["images"]}
new_binary = bytearray()

for index, view in enumerate(document["bufferViews"]):
    start = view.get("byteOffset", 0)
    data = binary[start : start + view["byteLength"]]
    if index in image_views:
        image = Image.open(BytesIO(data))
        image.thumbnail((MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE), Image.Resampling.LANCZOS)
        output = BytesIO()
        if image_views[index]["mimeType"] == "image/jpeg":
            image.convert("RGB").save(output, "JPEG", quality=86, optimize=True)
        else:
            image.save(output, "PNG", optimize=True)
        data = output.getvalue()
    new_binary.extend(b"\0" * ((-len(new_binary)) % 4))
    view["byteOffset"] = len(new_binary)
    view["byteLength"] = len(data)
    new_binary.extend(data)

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
