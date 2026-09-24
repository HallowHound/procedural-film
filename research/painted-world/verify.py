"""Repeatable browser checks and bounded-memory short export for the art study.
Requires Playwright for Python, a Chromium binary, Pillow, numpy and FFmpeg.
This does not test Blender, final artwork, character rigs or a unique one-hour film.
"""
from __future__ import annotations
import argparse,base64,hashlib,io,json,os,shutil,subprocess,time
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent

def launch(p):
    exe=os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('chromium-browser')
    return p.chromium.launch(headless=True,executable_path=exe,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox'])

def load(page,study):
    # All artwork is embedded. No network or file navigation is needed.
    page.evaluate('window.__CAPTURE__=true')
    page.set_content(study.read_text(),wait_until='load')
    page.evaluate('lab.ready')

def frame(page,t,options):
    return page.evaluate('([t,o])=>{const state=lab.renderAt(t,o);return {state,png:lab.capture()}}',[t,options])

def png(result): return base64.b64decode(result['png'].split(',',1)[1])
def digest(result):return hashlib.sha256(png(result)).hexdigest()

def verify(study:Path,out:Path):
    out.mkdir(parents=True,exist_ok=True)
    report={'claims':'A short reference study, not production art acceptance.','tests':{},'limits':[]}
    with sync_playwright() as p:
        browser=launch(p);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        load(page,study)
        report['browser']=browser.version;report['renderer']=page.evaluate('lab.renderer()')
        base={'width':399,'height':501,'camera':0,'actors':False,'motion':False,'lighting':'day','rain':0,'fit':'contain'}
        result=frame(page,0,base);(out/'preserved.png').write_bytes(png(result))
        actual=np.asarray(Image.open(io.BytesIO(png(result))).convert('RGB'),dtype=np.int16)
        expected=np.asarray(Image.open(study.parent/'assets/plate.png').convert('RGB'),dtype=np.int16)
        delta=np.abs(actual-expected)
        report['source_pixel_error']={'max':int(delta.max()),'mean':float(delta.mean()),'p99':float(np.quantile(delta,.99))}
        # WebGL bilinear texture interpolation is not bit-exact. Test explicit 8-bit raster tolerances, not invented losslessness.
        report['source_pixel_error']['tolerance']='mean <= 0.1, p99 <= 1, max <= 8 on 8-bit RGB; not pixel-identical'
        report['tests']['source_projection_within_raster_tolerance']=bool(delta.mean()<=.1 and np.quantile(delta,.99)<=1 and delta.max()<=8)
        options={'width':798,'height':1002,'camera':0.025,'actors':True,'lighting':'cycle','rain':.4,'fit':'contain'}
        times=[0,1,7.5,18,44.9,45,68,69,70,99,114.9,115,119.9,120,1800,3599.9,3600]
        reference={t:digest(frame(page,t,options)) for t in times}
        report['tests']['reverse_seek_same_pixels']=all(reference[t]==digest(frame(page,t,options)) for t in reversed(times))
        report['tests']['period_closes_exactly']=reference[0]==reference[120]==reference[3600]
        report['tests']['non_static_frames']=len(set(reference.values()))>10
        order=[times[i] for i in [8,1,16,0,12,3,14,5,6,15,10,9,4,11,13,2,7]]
        page.close();page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)));load(page,study)
        report['tests']['fresh_page_shuffled_seek_same_pixels']=all(reference[t]==digest(frame(page,t,options)) for t in order)
        report['tests']['bad_input_rejected']=page.evaluate('''()=>[()=>lab.renderAt(NaN),()=>lab.renderAt(0,{width:0}),()=>lab.renderAt(0,{camera:.3}),()=>lab.renderAt(0,{rain:-1}),()=>lab.renderAt(0,{fit:'stretch'}),()=>lab.renderAt(0,{lighting:'fake'})].every(fn=>{try{fn();return false}catch{return true}})''')
        for name,t,opts in [('day',12,{'lighting':'day','camera':.025}),('rain',36,{'lighting':'day','rain':.9}),('night',60,{'lighting':'night','rain':0}),('camera-stress',30,{'lighting':'day','camera':.5,'allowStress':True}),('wide',12,{'width':1280,'height':720,'lighting':'day','fit':'cover'}),('tall',12,{'width':576,'height':1024,'lighting':'day','fit':'cover'})]:
            result=frame(page,t,{**options,**opts});(out/f'{name}.png').write_bytes(png(result))
        costs=[];reads=[]
        for t in range(10,34):
            begin=time.perf_counter();r=frame(page,t,{**options,'width':1920,'height':1080,'fit':'cover'});reads.append((time.perf_counter()-begin)*1000);costs.append(r['state']['renderMs'])
        report['benchmark_1080p']={'n':len(costs),'draw_and_finish_ms_p50':float(np.median(costs)),'draw_and_finish_ms_p95':float(np.quantile(costs,.95)),'draw_png_browser_roundtrip_ms_p50':float(np.median(reads)),'warning':'Software WebGL in this container. Not a benchmark of a production 3D scene or user hardware.'}
        report['tests']['no_page_errors']=not errors;report['page_errors']=errors
        report['limits']=['3600-second samples repeat a 120-second study; not a one-hour unique journey or soak.','No normal-speed end-to-end human watch-through.','Night is a colour treatment; cutout travellers are proxies; manual depth is not geometry recovery.','Single depth-sheet stress intentionally exhibits stretching; no disocclusion reconstruction.','16:9 and 9:16 are crops; no new detail, outpainting or AI assets were generated.']
        browser.close()
    (out/'verification.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    if not all(report['tests'].values()):raise SystemExit('Verification failed; inspect report.')

def export(study:Path,dest:Path,seconds:float,fps:int,width:int,height:int,start:float,lighting:str):
    if seconds<=0 or seconds>120:raise ValueError('This study exporter is intentionally limited to 120 seconds. Use the existing production exporter after art gates pass.')
    if fps<1 or fps>60 or width%2 or height%2:raise ValueError('Use 1..60 fps and even H.264 dimensions.')
    count=round(seconds*fps)
    if abs(count-seconds*fps)>1e-7:raise ValueError('Duration must be an exact number of frames.')
    dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_suffix('.partial.mp4');begin=time.perf_counter()
    command=['ffmpeg','-v','error','-y','-f','image2pipe','-vcodec','png','-threads','1','-framerate',str(fps),'-i','-','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(temp)]
    log=dest.with_suffix('.ffmpeg.log')
    with log.open('w') as err,sync_playwright() as p:
        browser=launch(p);page=browser.new_page();load(page,study);proc=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=err)
        try:
            for i in range(count):
                result=frame(page,start+i/fps,{'width':width,'height':height,'fit':'contain' if width/height<1 else 'cover','camera':.025,'actors':True,'lighting':lighting,'rain':0})
                proc.stdin.write(png(result))
                if i%fps==0: print(f'{i}/{count}',flush=True)
            proc.stdin.close()
            if proc.wait(timeout=60)!=0:raise RuntimeError(log.read_text())
        except BaseException:
            proc.kill();proc.wait();raise
        finally:browser.close()
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,r_frame_rate:format=duration','-of','json',str(temp)]))
    stream=probe['streams'][0]
    if int(stream['nb_read_frames'])!=count or stream['width']!=width or stream['height']!=height:raise RuntimeError('Encoded frame count or dimensions mismatch')
    os.replace(temp,dest);report={'seconds':seconds,'fps':fps,'frame_count':count,'width':width,'height':height,'wall_seconds':time.perf_counter()-begin,'probe':probe,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()};dest.with_suffix('.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('mode',choices=['verify','export']);ap.add_argument('--study',type=Path,default=ROOT/'private-build/study.html');ap.add_argument('--out',type=Path);ap.add_argument('--seconds',type=float,default=24);ap.add_argument('--fps',type=int,default=24);ap.add_argument('--width',type=int,default=798);ap.add_argument('--height',type=int,default=1002);ap.add_argument('--start',type=float,default=0);ap.add_argument('--lighting',choices=['day','cycle','night'],default='day');a=ap.parse_args()
    if a.mode=='verify':verify(a.study.resolve(),a.out or ROOT/'evidence')
    else:export(a.study.resolve(),a.out or ROOT/'evidence/motion-study.mp4',a.seconds,a.fps,a.width,a.height,a.start,a.lighting)
