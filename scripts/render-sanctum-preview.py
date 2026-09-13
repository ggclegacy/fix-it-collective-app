"""Encode concept stills as a silent animatic; not a substitute for live-action footage."""
import os, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
encoder=os.environ.get('FFMPEG','ffmpeg')
for layout in ['desktop','mobile']:
    cmd=[encoder,'-y','-hide_banner','-loglevel','error']
    for image in ['arrival','confidence','restore','build','belong','arrival']:
        cmd+=['-i',str(root/'public/sanctum'/f'{image}.webp')]
    filters=[]
    for i,frames in enumerate([144,264,264,264,264,240]):
        # Portrait is deliberately reframed as a wider human group in the upper image.
        # It protects the client, practitioner and hands while reserving dark space for copy.
        if layout=='mobile':
            frame="crop=1040:900:560:0,scale=540:468,pad=540:960:0:160:color=0x07141d"
            size='540x960'
        else:
            frame='scale=1280:720'
            size='1280x720'
        filters.append(f'[{i}:v]{frame},zoompan=z=1+on*0.000025:x=iw/2-iw/zoom/2:y=0:d={frames}:s={size}:fps=24,setsar=1,format=yuv420p[v{i}]')
    previous='v0'
    for j,offset in enumerate([5,15,25,35,45],1):
        output='out' if j==5 else f'mix{j}'
        filters.append(f'[{previous}][v{j}]xfade=transition=fade:duration=1:offset={offset}[{output}]')
        previous=output
    cmd+=['-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(root/'public/sanctum'/f'concept-{layout}-v1.mp4')]
    subprocess.run(cmd,check=True)
