"""Prepare a private, dependency-free browser study from a supplied reference.
No image generation, depth inference or super-resolution is performed.
"""
from __future__ import annotations
import argparse, base64, hashlib, json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent

def prepare(source: Path, regions: Path, output: Path) -> dict:
    cfg = json.loads(regions.read_text())
    image = Image.open(source).convert('RGB')
    w, h = image.size
    rw, rh = cfg['reference_size']
    if abs(w / h - rw / rh) > 0.002:
        raise ValueError('Reference aspect does not match region annotations. Supply a new region file; do not stretch the image.')
    if w * h > 16_777_216:
        raise ValueError('Reference exceeds the 16 megapixel preparation limit.')
    def poly(points):
        return [(round(x*w/rw), round(y*h/rh)) for x,y in points]
    def mask(polygons, blur=0):
        m = Image.new('L', (w,h)); d = ImageDraw.Draw(m)
        for p in polygons: d.polygon(poly(p), fill=255)
        return m.filter(ImageFilter.GaussianBlur(blur*w/rw)) if blur else m
    output.mkdir(parents=True, exist_ok=True)
    a = output / 'assets'; a.mkdir(exist_ok=True)
    remove = Image.new('L', (w,h)); rd = ImageDraw.Draw(remove)
    actors = []
    for i, entry in enumerate(cfg['actors']):
        am = mask([entry['polygon']], 0.3)
        bbox = am.getbbox()
        rgba = image.convert('RGBA'); rgba.putalpha(am)
        name = f'traveller-{i}.png'; rgba.crop(bbox).save(a/name)
        rd.polygon(poly(entry['polygon']), fill=255)
        actors.append({'image':name, 'width':bbox[2]-bbox[0], 'height':bbox[3]-bbox[1], 'anchor':entry['anchor']})
    # Classical local inpainting repairs only the small source figure footprints.
    remove = remove.filter(ImageFilter.MaxFilter(3))
    clean = cv2.inpaint(np.asarray(image), np.asarray(remove), 3, cv2.INPAINT_TELEA)
    Image.fromarray(clean).save(a/'plate.png')
    water = mask(cfg['water'], 1.2)
    foliage = mask(cfg['foliage'], 2)
    sky = mask(cfg['sky'], 1.8)
    # Artist-authored depth proxy, NOT measured geometry or a neural depth map.
    yy = np.linspace(0,1,h)[:,None]
    depth = np.repeat(np.clip((0.87-yy)/0.55,0,1),w,axis=1)
    depth = np.maximum(depth, np.asarray(sky)/255.0)
    depth = Image.fromarray(np.uint8(depth*255)).filter(ImageFilter.GaussianBlur(4*w/rw))
    Image.merge('RGBA',(water,foliage,sky,depth)).save(a/'masks.png')
    manifest = {
        'schema':1, 'width':w, 'height':h, 'period':120,
        'camera_limit':0.035, 'actors':actors,
        'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'provenance':'User-supplied reference; manually annotated masks; classical local inpainting; no AI generation.',
        'quality_status':'DIAGNOSTIC_ONLY_NOT_PRODUCTION_APPROVED',
        'images':{}
    }
    for path in sorted(a.glob('*.png')):
        manifest['images'][path.name] = 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
    template = (ROOT/'lab.html').read_text()
    token = '/* ASSET_DATA */ null'
    if template.count(token) != 1: raise RuntimeError('Asset injection marker must appear exactly once.')
    (output/'study.html').write_text(template.replace(token,json.dumps(manifest,separators=(',',':'))))
    public_manifest = {k:v for k,v in manifest.items() if k!='images'}
    public_manifest['files'] = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in a.glob('*.png')}
    (output/'manifest.json').write_text(json.dumps(public_manifest,indent=2))
    return public_manifest

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('--regions', type=Path, default=ROOT/'reference-regions.json')
    p.add_argument('--out', type=Path, default=ROOT/'private-build')
    args=p.parse_args()
    try: print(json.dumps(prepare(args.source,args.regions,args.out),indent=2))
    except (OSError,ValueError,KeyError) as e: p.exit(2, f'Preparation failed: {e}\n')
