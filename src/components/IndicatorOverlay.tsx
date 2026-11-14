"use client";
import {useEffect,useRef,useState} from 'react';
import type {IChartApi,ISeriesApi} from 'lightweight-charts';
import type {IndicatorProgram} from './IndicatorEditor';
import {indicatorSandboxHtml} from '@/lib/indicatorSandbox';
type Bar={time:number;open:number;high:number;low:number;close:number};
export function IndicatorOverlay({chart,series,node,bars,program,onStatus}:{chart:IChartApi;series:ISeriesApi<'Candlestick'>;node:HTMLDivElement;bars:Bar[];program:IndicatorProgram;onStatus:(s:string)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),surface=useRef<HTMLCanvasElement>(null),[frameReady,setFrameReady]=useState(false),seq=useRef(0),callback=useRef(onStatus);callback.current=onStatus;
 useEffect(()=>{function message(e:MessageEvent){if(e.source!==frame.current?.contentWindow||e.data?.channel!=='mp-indicator-v1')return;if(e.data.type==='ready')setFrameReady(true);else if(e.data.id===seq.current){if(e.data.type==='frame'&&e.data.bitmap instanceof ImageBitmap&&surface.current){const c=surface.current;c.width=e.data.width;c.height=e.data.height;const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height);ctx?.drawImage(e.data.bitmap,0,0);e.data.bitmap.close();callback.current('Rendered successfully');}else if(e.data.type==='error'){const c=surface.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height);callback.current(String(e.data.message||'Indicator error'));}}}window.addEventListener('message',message);return()=>window.removeEventListener('message',message);},[]);
 useEffect(()=>{if(!frameReady)return;let timer:ReturnType<typeof setTimeout>|undefined;
  function render(){
   const scale=chart.timeScale(),x0=scale.logicalToCoordinate(0 as import('lightweight-charts').Logical),x1=scale.logicalToCoordinate(1 as import('lightweight-charts').Logical),range=scale.getVisibleLogicalRange(),base=bars[bars.length-1]?.close,y0=series.priceToCoordinate(base),y1=series.priceToCoordinate(base+1);
   if(x0===null||x1===null||!range||y0===null||y1===null){callback.current('Waiting for chart geometry…');return;}
   const width=Math.max(1,Math.round(node.clientWidth)),height=Math.max(1,Math.round(node.clientHeight)),paneWidth=Math.max(1,width-chart.priceScale('right').width()),paneHeight=Math.max(1,height-scale.height());
   const id=++seq.current;
   frame.current?.contentWindow?.postMessage({channel:'mp-indicator-v1',type:'render',id,payload:{script:program.script,inputs:program.inputs,bars,symbol:'XAU_USD',width,height,paneWidth,paneHeight,x0,step:x1-x0,y0,yStep:y1-y0,yBase:base,visible:{from:range.from,to:range.to}}},'*');
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,180);}
  chart.timeScale().subscribeVisibleLogicalRangeChange(schedule);node.addEventListener('wheel',schedule,{passive:true});node.addEventListener('pointerup',schedule);const ro=new ResizeObserver(schedule);ro.observe(node);schedule();
  return()=>{clearTimeout(timer);chart.timeScale().unsubscribeVisibleLogicalRangeChange(schedule);node.removeEventListener('wheel',schedule);node.removeEventListener('pointerup',schedule);ro.disconnect();};
 },[frameReady,chart,series,node,bars,program]);
 return <><canvas ref={surface} aria-label="Indicator overlay" className="pointer-events-none absolute inset-0 z-20 h-full w-full"/><iframe ref={frame} title="Isolated custom indicator renderer" sandbox="allow-scripts" srcDoc={indicatorSandboxHtml} className="hidden" /></>;
}
