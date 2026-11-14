// Static srcdoc: opaque-origin iframe, CSP blocks connections and nested frames.
// User scripts only enter a disposable worker via postMessage, never this HTML.
export const indicatorSandboxHtml = String.raw`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>html,body{margin:0;overflow:hidden;background:transparent}canvas{display:block}</style></head><body><canvas id="view"></canvas><script>
(function(){
 'use strict';
 const canvas=document.getElementById('view');let worker=null,timer=null,job=0;
 function clear(){canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)}
 function send(type,message,id){parent.postMessage({channel:'mp-indicator-v1',type,message,id},'*')}
 function workerMain(){
  self.onmessage=function(e){
   const q=e.data;
   try{
    const canvas=new OffscreenCanvas(q.width,q.height),ctx=canvas.getContext('2d');
    const data=q.bars.map(x=>({timestamp:x.time*1000,open:x.open,high:x.high,low:x.low,close:x.close,volume:0}));
    const X=i=>q.x0+q.step*i,Y=p=>q.y0+q.yStep*(p-q.yBase);
    const bounds={left:0,top:0,width:q.paneWidth,height:q.paneHeight,right:q.paneWidth,bottom:q.paneHeight};
    const vis=q.visible;
    function text(args,s,chip){const x=X(s.index)+(s.offsetX||0),y=Y(s.price)+(s.offsetY||0);if(!Number.isFinite(x)||!Number.isFinite(y))return false;ctx.save();ctx.font=(s.weight||'normal')+' '+(s.size||11)+'px sans-serif';ctx.textAlign=s.align||'left';ctx.textBaseline=s.baseline||'bottom';if(chip&&s.background){const t=String(s.text||''),w=ctx.measureText(t).width,pad=s.padding==null?4:s.padding,h=(s.size||11)+pad*2;let xx=x-(ctx.textAlign==='center'?w/2:ctx.textAlign==='right'?w:0)-pad;let yy=ctx.textBaseline==='bottom'?y-h:ctx.textBaseline==='middle'?y-h/2:y;ctx.fillStyle=s.background;ctx.fillRect(xx,yy,w+pad*2,h);}ctx.fillStyle=s.color||'#fff';ctx.globalAlpha=s.opacity==null?1:s.opacity;ctx.fillText(String(s.text||''),x,y);ctx.restore();return true;}
    const bv={
     bounds:()=>bounds,visible:()=>vis,visibleBars:()=>({from:Math.max(0,Math.floor(vis.from)),to:Math.min(data.length-1,Math.ceil(vis.to))}),xOfIndex:(_,i)=>X(i),yOfPrice:(_,p)=>Y(p),halfBar:()=>Math.abs(q.step)/2,precision:()=>3,priceText:(_,p)=>Number(p).toFixed(3),
     clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),syminfo:()=>({ticker:q.symbol,timezone:'UTC'}),
     parseClock:(s,f)=>{const m=String(s).match(/^(\d{1,2}):(\d{2})$/);return m&&+m[1]<24&&+m[2]<60?+m[1]*60 + +m[2]:(f==null?0:f)},
     detectBarMs:(d)=>{let arr=[];for(let i=1;i<Math.min(d.length,200);i++){const x=d[i].timestamp-d[i-1].timestamp;if(x>0)arr.push(x);}arr.sort((a,b)=>a-b);return arr.length?arr[Math.floor(arr.length/2)]:60000;},
     withAlpha:(color,a)=>{let h=String(color).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!h)return color;let s=h[1];if(s.length===3)s=s.split('').map(c=>c+c).join('');const n=parseInt(s,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'},
     text:(a,s)=>text(a,s,false),label:(a,s)=>text(a,s,true),
     line:(a,s)=>{const x1=X(s.fromIndex),x2=X(s.toIndex),y1=Y(s.price==null?s.fromPrice:s.price),y2=Y(s.price==null?s.toPrice:s.price);if(![x1,x2,y1,y2].every(Number.isFinite))return false;ctx.save();ctx.globalAlpha=s.opacity==null?1:s.opacity;ctx.strokeStyle=s.color||'#fff';ctx.lineWidth=s.width||1;ctx.setLineDash(s.dash||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();return true;},
     box:(a,s)=>{const x1=X(s.fromIndex)-Math.abs(q.step)/2,x2=X(s.toIndex)+Math.abs(q.step)/2,y1=Y(s.top),y2=Y(s.bottom);if(![x1,x2,y1,y2].every(Number.isFinite))return false;ctx.save();ctx.fillStyle=s.color||'#fff';ctx.globalAlpha=s.fillOpacity==null?.1:s.fillOpacity;ctx.fillRect(x1,Math.min(y1,y2),x2-x1,Math.abs(y2-y1));ctx.strokeStyle=s.color||'#fff';ctx.globalAlpha=s.borderOpacity==null?.55:s.borderOpacity;ctx.strokeRect(x1,Math.min(y1,y2),x2-x1,Math.abs(y2-y1));ctx.restore();return true;},
     ma:(values,length,type)=>{length=Math.max(1,Math.floor(length));let out=new Array(values.length).fill(null),prev=null;for(let i=0;i<values.length;i++){let v=values[i];if(!Number.isFinite(v))continue;if(type==='EMA'||type==='RMA'){const alpha=type==='EMA'?2/(length+1):1/length;prev=prev===null?v:prev+alpha*(v-prev);out[i]=prev;}else if(i>=length-1){let sum=0,den=0;for(let k=0;k<length;k++){let w=type==='WMA'?length-k:1;sum+=values[i-k]*w;den+=w;}out[i]=sum/den;}}return out;}
    };
    const indicator={extendData:{inputs:q.inputs}};
    // Defence in depth: no nested workers or networking APIs are exposed to
    // the indicator. CSP also blocks connections. Browser sandboxing is not
    // a guarantee against resource exhaustion or browser vulnerabilities.
    for(const name of ['Worker','SharedWorker','fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','BroadcastChannel']){
      try{Object.defineProperty(self,name,{value:undefined,writable:false,configurable:false});}catch(_){}
    }
    // Factory body only, as in Free Chart; executes inside the disposable worker.
    const factory=new Function('bv',q.script);const obj=factory(bv);
    if(!obj||typeof obj.calc!=='function'||typeof obj.draw!=='function')throw Error('Script must return an object with calc(data, indicator) and draw(args).');
    obj.calc(data,indicator);
    obj.draw({ctx,indicator,bounding:bounds,xAxis:{convertToPixel:X},yAxis:{convertToPixel:Y}});
    const bitmap=canvas.transferToImageBitmap();self.postMessage({ok:true,bitmap},[bitmap]);
   }catch(err){self.postMessage({ok:false,error:String(err&&err.message||err)});}
  };
 }
 const url=URL.createObjectURL(new Blob(['('+workerMain.toString()+')()'],{type:'text/javascript'}));
 addEventListener('message',function(e){if(e.source!==parent||!e.data||e.data.channel!=='mp-indicator-v1')return;let q=e.data;if(q.type==='clear'){job++;if(worker)worker.terminate();clearTimeout(timer);canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);return;}if(q.type!=='render')return;
   job++;const own=job;if(worker)worker.terminate();clearTimeout(timer);canvas.width=q.payload.width;canvas.height=q.payload.height;
   try{worker=new Worker(url);}catch(err){send('error','Worker could not start: '+err.message,q.id);return;}
   timer=setTimeout(()=>{if(own!==job)return;worker.terminate();clear();send('error','Indicator exceeded the 3 second execution limit.',q.id)},3000);
   worker.onmessage=function(event){if(own!==job)return;clearTimeout(timer);const r=event.data;if(r.ok){parent.postMessage({channel:'mp-indicator-v1',type:'frame',id:q.id,bitmap:r.bitmap,width:q.payload.width,height:q.payload.height},'*',[r.bitmap]);}else{clear();send('error',r.error,q.id);}worker.terminate();};
   worker.onerror=function(){if(own!==job)return;clearTimeout(timer);clear();send('error','Indicator worker failed.',q.id);worker.terminate();};worker.postMessage(q.payload);
 });
 send('ready','',0);
})();
</script></body></html>`;
