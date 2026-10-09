"""Build a GLB with a chosen texture size while preserving every geometry buffer.

Desktop: python optimize_model.py --size 2048 --target destek-detail.glb
Mobile:  python optimize_model.py --size 1024 --target destek-web.glb
The original GLB or its lossless repack can be used as the input.
"""
import argparse
from io import BytesIO
import json
from pathlib import Path
import struct
from PIL import Image

HERE = Path(__file__).resolve().parent
original = HERE / 'kaynak' / 'destek.glb'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=original if original.exists() else HERE / 'destek-lossless.glb')
parser.add_argument('--target', type=Path, default=HERE / 'destek-detail.glb')
parser.add_argument('--size', type=int, default=2048)
args = parser.parse_args()
if args.size < 128:
    parser.error('--size must be at least 128')
EXTENSION = 'EXT_texture_webp'

def pad4(data, fill):
    return data + fill * ((-len(data)) % 4)

with args.source.open('rb') as f:
    magic, version, _ = struct.unpack('<4sII', f.read(12))
    if magic != b'glTF' or version != 2:
        raise ValueError('Expected a glTF 2.0 binary file')
    length, kind = struct.unpack('<I4s', f.read(8))
    if kind != b'JSON':
        raise ValueError('Missing JSON chunk')
    document = json.loads(f.read(length))
    length, kind = struct.unpack('<I4s', f.read(8))
    if kind != b'BIN\0':
        raise ValueError('Missing binary chunk')
    binary = f.read(length)

image_views = {image['bufferView']: (i, image) for i, image in enumerate(document['images'])}
converted = set()
new_binary = bytearray()
for index, view in enumerate(document['bufferViews']):
    start = view.get('byteOffset', 0)
    data = binary[start:start + view['byteLength']]
    if index in image_views:
        image_index, metadata = image_views[index]
        image = Image.open(BytesIO(data))
        image.thumbnail((args.size, args.size), Image.Resampling.LANCZOS)
        output = BytesIO()
        # Lossless packing of the resized pixels; all mesh data stays untouched.
        image.save(output, 'WEBP', lossless=True, method=4, exact=True)
        metadata['mimeType'] = 'image/webp'
        converted.add(image_index)
        data = output.getvalue()
    new_binary.extend(b'\0' * ((-len(new_binary)) % 4))
    view['byteOffset'] = len(new_binary)
    view['byteLength'] = len(data)
    new_binary.extend(data)

for texture in document['textures']:
    source_index = texture.get('source', texture.get('extensions', {}).get(EXTENSION, {}).get('source'))
    if source_index in converted:
        texture.pop('source', None)
        texture.setdefault('extensions', {})[EXTENSION] = {'source': source_index}
for key in ['extensionsUsed', 'extensionsRequired']:
    if EXTENSION not in document.setdefault(key, []):
        document[key].append(EXTENSION)
document['buffers'][0]['byteLength'] = len(new_binary)
json_bytes = pad4(json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode(), b' ')
bin_bytes = pad4(bytes(new_binary), b'\0')
with args.target.open('wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 28 + len(json_bytes) + len(bin_bytes)))
    f.write(struct.pack('<I4s', len(json_bytes), b'JSON'))
    f.write(json_bytes)
    f.write(struct.pack('<I4s', len(bin_bytes), b'BIN\0'))
    f.write(bin_bytes)
print(f'Created {args.target}: {args.target.stat().st_size / 1024 / 1024:.1f} MiB; textures ≤ {args.size}px')
