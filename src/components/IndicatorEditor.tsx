"use client";
import React,{useEffect,useRef,useState} from 'react';
import {fvgReactionInputs,fvgReactionScript} from '@/lib/indicators/fvg-reaction';
import {noWickInputs,noWickScript} from '@/lib/indicators/no-wick';
export type IndicatorInput={id:string;name:string;type:string;defval:string|number|boolean;options?:string[];min?:number;max?:number;step?:number};
export type IndicatorProgram={script:string;inputs:Record<string,string|number|boolean>;revision:number};
const defaultJson=JSON.stringify([{id:'colour',name:'Label colour',type:'color',defval:'#34d399'}],null,2);
const defaultScript=`// Free Chart factory body. Use completed bars only.\nreturn {\n  figures: [],\n  calc(data, indicator) {\n    const p = indicator.extendData.inputs;\n    const i = Math.max(0, data.length - 2);\n    indicator._example = { i, price: data[i]?.high, colour: p.colour };\n    return data.map(() => ({}));\n  },\n  draw(args) {\n    const z = args.indicator._example;\n    if (z && Number.isFinite(z.price))\n      bv.text(args, { index: z.i, price: z.price, text: 'EXAMPLE', color: z.colour, align: 'center', baseline: 'bottom', offsetY: -8 });\n    return false;\n  }\n};`;
const css='w-full rounded-lg border border-slate-700 bg-[#090f17] p-3 font-mono text-xs leading-5 text-slate-300 outline-none focus:border-emerald-600';
export function IndicatorEditor({onApply,status,hasData,preset}:{onApply:(p:IndicatorProgram|null)=>void;status:string;hasData:boolean;preset:string}){
 const [json,setJson]=useState(defaultJson),[script,setScript]=useState(defaultScript),[definitions,setDefinitions]=useState<IndicatorInput[]>([]),[values,setValues]=useState<Record<string,string|number|boolean>>({}),[error,setError]=useState(''),[compiledScript,setCompiledScript]=useState('');
 const applyRef=useRef(onApply);applyRef.current=onApply;
 useEffect(()=>{
  if(!['fvg-reaction','no-wick'].includes(preset)||!hasData)return;
  const presetInputs=preset==='no-wick'?noWickInputs:fvgReactionInputs,presetScript=preset==='no-wick'?noWickScript:fvgReactionScript;
  const defs=presetInputs as IndicatorInput[],vals:Record<string,string|number|boolean>={};
  defs.forEach(d=>{vals[d.id]=d.defval});setJson(JSON.stringify(presetInputs,null,2));setScript(presetScript);setCompiledScript(presetScript);setDefinitions(defs);setValues(vals);setError('');applyRef.current({script:presetScript,inputs:vals,revision:Date.now()});
 },[preset,hasData]);
 function parse(){
  if(json.length>100000||script.length>250000)throw Error('The JSON or script is too large.');
  let arr:unknown;try{arr=JSON.parse(json);}catch(e){throw Error('Invalid inputs JSON: '+(e instanceof Error?e.message:''));}
  if(!Array.isArray(arr)||arr.length>100)throw Error('Inputs must be a JSON array with at most 100 entries.');
  const ids=new Set<string>(),out:IndicatorInput[]=[];const allowed=['bool','int','float','color','select','session','string','time','source'];
  for(const raw of arr){
   if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(raw.id)||ids.has(raw.id))throw Error('Each input needs a unique safe id.');
   if(!allowed.includes(raw.type))throw Error('Unsupported input type: '+raw.type);if(typeof raw.name!=='string')throw Error('Input '+raw.id+' needs a name.');
   if(raw.type==='bool'&&typeof raw.defval!=='boolean')throw Error(raw.id+' needs a boolean default.');
   if(['int','float'].includes(raw.type)&&(!Number.isFinite(raw.defval)||typeof raw.defval!=='number'))throw Error(raw.id+' needs a numeric default.');
   if(['color','select','session','string','time','source'].includes(raw.type)&&typeof raw.defval!=='string')throw Error(raw.id+' needs a string default.');
   if(raw.type==='select'&&(!Array.isArray(raw.options)||!raw.options.every((x:unknown)=>typeof x==='string')||!raw.options.includes(raw.defval)))throw Error(raw.id+' needs options including its default.');
   ids.add(raw.id);out.push(raw as IndicatorInput);
  }
  if(!script.trim())throw Error('Paste a script factory body.');return out;
 }
 function compile(){try{const defs=parse(),vals:Record<string,string|number|boolean>={};defs.forEach(d=>{vals[d.id]=d.defval});setDefinitions(defs);setValues(vals);setCompiledScript(script);setError('');onApply({script,inputs:vals,revision:Date.now()});}catch(e){setError(e instanceof Error?e.message:'Invalid indicator');}}
 function update(d:IndicatorInput,val:string|number|boolean){const next={...values,[d.id]:val};setValues(next);onApply({script:compiledScript,inputs:next,revision:Date.now()});}
 async function file(e:React.ChangeEvent<HTMLInputElement>,set:(s:string)=>void){const f=e.target.files?.[0];if(!f)return;if(f.size>250000){setError('File exceeds 250 KB.');return;}set(await f.text());setError('');}
 return <details className="rounded-2xl border border-slate-800/90 bg-[#101722] p-5"><summary className="cursor-pointer text-sm font-semibold text-white">Custom indicator · Free Chart-compatible subset</summary>
  <p className="mt-2 text-xs leading-5 text-slate-400">Paste or upload both files, then compile after loading candles. Runs in an isolated browser worker with no network access. Drawings are visual only and do not affect confluence scores or backtests.</p>
  <div className="mt-4 grid gap-4 xl:grid-cols-2"><label className="text-xs font-semibold text-slate-300">Inputs JSON <input type="file" accept=".json,application/json" className="ml-2 max-w-[180px] text-[10px] font-normal text-slate-400" onChange={e=>file(e,setJson)}/><textarea aria-label="Inputs JSON" className={`${css} mt-2 h-52`} spellCheck={false} value={json} onChange={e=>setJson(e.target.value)}/></label><label className="text-xs font-semibold text-slate-300">Script factory body <input type="file" accept=".js,text/javascript" className="ml-2 max-w-[180px] text-[10px] font-normal text-slate-400" onChange={e=>file(e,setScript)}/><textarea aria-label="Indicator script" className={`${css} mt-2 h-52`} spellCheck={false} value={script} onChange={e=>setScript(e.target.value)}/></label></div>
  <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={compile} disabled={!hasData} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Compile &amp; show</button><button type="button" onClick={()=>{onApply(null);setDefinitions([]);setError('');}} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300">Remove indicator</button><span role="status" className="self-center text-xs text-slate-400">{error||status||(!hasData?'Load candles first.':'Ready to compile.')}</span></div>
  {!!definitions.length&&<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{definitions.map(d=><label key={d.id} className="text-xs text-slate-400">{d.name}{d.type==='bool'?<input className="ml-2" type="checkbox" checked={!!values[d.id]} onChange={e=>update(d,e.target.checked)}/>:d.type==='select'?<select className={`${css} mt-1`} value={String(values[d.id])} onChange={e=>update(d,e.target.value)}>{d.options?.map(o=><option key={o} value={o}>{o}</option>)}</select>:<input className={`${css} mt-1`} type={d.type==='color'?'color':d.type==='int'||d.type==='float'?'number':'text'} min={d.min} max={d.max} step={d.step||'any'} value={String(values[d.id])} onChange={e=>update(d,d.type==='int'||d.type==='float'?Number(e.target.value):e.target.value)}/>}</label>)}</div>}
  <p className="mt-4 text-[11px] leading-5 text-slate-500">Supported: calc/draw, core bv geometry, text, boxes, lines, moving averages and common inputs. Unsupported APIs return an error; alerts, series figures, advanced scale fitting and exact Free Chart layering aren’t supported. Code can repaint: visual output isn’t validated for look-ahead.</p>
 </details>;
}
