import {createStructureEngine} from '../marketStructure';
// User-supplied settings and protected-structure logic, adapted to the local completed-candle runtime.
export const noWickInputs = [
  {
    "id": "tickSize",
    "name": "Minimum tick size in price units (0 = auto-detect from price decimals)",
    "type": "float",
    "defval": 0,
    "min": 0,
    "step": 1e-05
  },
  {
    "id": "tolTicks",
    "name": "Wick tolerance (ticks)",
    "type": "float",
    "defval": 0,
    "min": 0,
    "step": 1
  },
  {
    "id": "minBodyTicks",
    "name": "Minimum body size (ticks)",
    "type": "float",
    "defval": 0,
    "min": 0,
    "step": 1
  },
  {
    "id": "showRaw",
    "name": "Show wickless candles that failed the rules (faded)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "entryMode",
    "name": "Entry mode",
    "type": "select",
    "options": [
      "Retest: limit at zone edge",
      "Retest: rejection candle close",
      "Immediate (on candle close)"
    ],
    "defval": "Retest: limit at zone edge"
  },
  {
    "id": "pipSizeIn",
    "name": "Pip size in price units (0 = auto)",
    "type": "float",
    "defval": 0,
    "min": 0,
    "step": 0.01
  },
  {
    "id": "zonePips",
    "name": "Entry zone size beyond the candle region (pips)",
    "type": "float",
    "defval": 3,
    "min": 0,
    "step": 0.5
  },
  {
    "id": "needReject",
    "name": "Require a rejection candle in the zone",
    "type": "bool",
    "defval": true
  },
  {
    "id": "retestBars",
    "name": "Retest window (bars)",
    "type": "int",
    "defval": 10,
    "min": 1,
    "step": 1
  },
  {
    "id": "cancelOnFlip",
    "name": "Cancel waiting setup if internal trend flips against it",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showZone",
    "name": "Draw entry zone box",
    "type": "bool",
    "defval": true
  },
  {
    "id": "useStructure",
    "name": "Use market structure (master switch)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "intLen",
    "name": "Internal swing length",
    "type": "int",
    "defval": 3,
    "min": 1,
    "step": 1
  },
  {
    "id": "extLen",
    "name": "External swing length",
    "type": "int",
    "defval": 10,
    "min": 2,
    "step": 1
  },
  {
    "id": "zoneBars",
    "name": "CHOCH zone: bars after the shift",
    "type": "int",
    "defval": 15,
    "min": 1,
    "step": 1
  },
  {
    "id": "showInternal",
    "name": "Show internal structure",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showExternal",
    "name": "Show external structure",
    "type": "bool",
    "defval": false
  },
  {
    "id": "showSwings",
    "name": "Show HH / HL / LH / LL",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showBOS",
    "name": "Show BOS",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showMSS",
    "name": "Show MSS / CHOCH",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showIntHL",
    "name": "Internal trend highlighter (ribbon at bottom)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showExtHL",
    "name": "External trend highlighter (background tint)",
    "type": "bool",
    "defval": false
  },
  {
    "id": "showProtected",
    "name": "Show protected level (the level whose close flips the internal trend)",
    "type": "bool",
    "defval": false
  },
  {
    "id": "showTL",
    "name": "Draw trend lines through HH / HL / LH / LL",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tlSource",
    "name": "Trend line source",
    "type": "select",
    "options": [
      "External",
      "Internal",
      "Both"
    ],
    "defval": "External"
  },
  {
    "id": "tlBull",
    "name": "Bullish lines (through HH and HL)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tlBear",
    "name": "Bearish lines (through LH and LL)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "useConsol",
    "name": "Detect consolidation (context only; does not block entries)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "useConsolRange",
    "name": "Detect by range compression (ATR)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "consolBars",
    "name": "Range lookback (bars)",
    "type": "int",
    "defval": 20,
    "min": 5,
    "step": 1
  },
  {
    "id": "consolMult",
    "name": "Range < ATR(14) x",
    "type": "float",
    "defval": 3.5,
    "min": 1,
    "step": 0.25
  },
  {
    "id": "useConsolMixed",
    "name": "Detect by mixed swings",
    "type": "bool",
    "defval": true
  },
  {
    "id": "showConsol",
    "name": "Highlight consolidation (grey tint)",
    "type": "bool",
    "defval": true
  },
  {
    "id": "allowLongs",
    "name": "Allow longs",
    "type": "bool",
    "defval": true
  },
  {
    "id": "allowShorts",
    "name": "Allow shorts",
    "type": "bool",
    "defval": true
  },
  {
    "id": "slLive",
    "name": "SL uses the latest swing even if not yet confirmed",
    "type": "bool",
    "defval": true
  },
  {
    "id": "slBufTicks",
    "name": "SL buffer (ticks)",
    "type": "float",
    "defval": 0,
    "min": 0,
    "step": 1
  },
  {
    "id": "tpMode",
    "name": "TP mode",
    "type": "select",
    "options": [
      "Fixed R:R",
      "Structure (HH/LL) with R:R fallback"
    ],
    "defval": "Fixed R:R"
  },
  {
    "id": "rrValue",
    "name": "R:R (1.0 = 1:1)",
    "type": "float",
    "defval": 1,
    "min": 0.25,
    "step": 0.25
  },
  {
    "id": "minRR",
    "name": "Minimum R:R (Structure mode only)",
    "type": "float",
    "defval": 1,
    "min": 0,
    "step": 0.25
  },
  {
    "id": "showPlan",
    "name": "Draw entry / TP / SL",
    "type": "bool",
    "defval": true
  },
  {
    "id": "planBars",
    "name": "Plan line length (bars)",
    "type": "int",
    "defval": 15,
    "min": 3,
    "step": 1
  },
  {
    "id": "showResults",
    "name": "Show \u2714 / \u2716 when a trade hits TP / SL",
    "type": "bool",
    "defval": true
  },
  {
    "id": "upColor",
    "name": "Bullish colour",
    "type": "color",
    "defval": "#008000",
    "tab": "style"
  },
  {
    "id": "downColor",
    "name": "Bearish colour",
    "type": "color",
    "defval": "#ff0000",
    "tab": "style"
  },
  {
    "id": "extUpColor",
    "name": "External bullish colour",
    "type": "color",
    "defval": "#0000ff",
    "tab": "style"
  },
  {
    "id": "extDownColor",
    "name": "External bearish colour",
    "type": "color",
    "defval": "#ffa500",
    "tab": "style"
  },
  {
    "id": "showStats",
    "name": "Show statistics table",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tablePos",
    "name": "Table position",
    "type": "select",
    "options": [
      "top_right",
      "top_left",
      "bottom_right",
      "bottom_left"
    ],
    "defval": "top_right"
  }
];
export const noWickScript = 'const createStructureEngine = (' + createStructureEngine.toString() + ');\n' + "  const defaults = {\"tickSize\":0,\"tolTicks\":0,\"minBodyTicks\":0,\"showRaw\":true,\"entryMode\":\"Retest: limit at zone edge\",\"pipSizeIn\":0,\"zonePips\":3,\"needReject\":true,\"retestBars\":10,\"cancelOnFlip\":true,\"showZone\":true,\"useStructure\":true,\"intLen\":3,\"extLen\":10,\"zoneBars\":15,\"showInternal\":true,\"showExternal\":false,\"showSwings\":true,\"showBOS\":true,\"showMSS\":true,\"showIntHL\":true,\"showExtHL\":false,\"showProtected\":false,\"showTL\":true,\"tlSource\":\"External\",\"tlBull\":true,\"tlBear\":true,\"useConsol\":true,\"useConsolRange\":true,\"consolBars\":20,\"consolMult\":3.5,\"useConsolMixed\":true,\"showConsol\":true,\"allowLongs\":true,\"allowShorts\":true,\"slLive\":true,\"slBufTicks\":0,\"tpMode\":\"Fixed R:R\",\"rrValue\":1,\"minRR\":1,\"showPlan\":true,\"planBars\":15,\"showResults\":true,\"upColor\":\"#008000\",\"downColor\":\"#ff0000\",\"extUpColor\":\"#0000ff\",\"extDownColor\":\"#ffa500\",\"showStats\":true,\"tablePos\":\"top_right\"};\n  function valid(x){return x !== null && x !== undefined && Number.isFinite(x);}\n  return {\n    // Binary 0/1 figures expose alertable series; custom draw paints the chart.\n    figures: [\n      { key:'alertAll', title:'All wick and retest signals: ', type:'line' },\n      { key:'alertBullWick', title:'Bullish 0-wick: ', type:'line' },\n      { key:'alertBearWick', title:'Bearish 0-wick: ', type:'line' },\n      { key:'alertBullRetest', title:'Bullish retest entry: ', type:'line' },\n      { key:'alertBearRetest', title:'Bearish retest entry: ', type:'line' }\n    ],\n    calc(data, indicator) {\n      const p=Object.assign({},defaults,indicator.extendData?.inputs||{}), n=data.length;\n      const rows=data.map(()=>({})); if(!n)return rows;\n      const shapes=[], zones=[], pending=[], trades=[], bands=[], confirmedShifts=[];\n      const events=data.map(()=>({bullWick:0,bearWick:0,bullRetest:0,bearRetest:0}));\n      let wins=0,losses=0,cancelled=0,netR=0,bulls=0,bears=0;\n      let tick=Number(p.tickSize); if(!(tick>0)){tick=0;const m=Math.min(n,300);for(let d=0;d<=8&&tick===0;d++){const f=Math.pow(10,d);let ok=true;for(let k=n-m;k<n&&ok;k++){const c=data[k];if(Math.abs(c.open*f-Math.round(c.open*f))>1e-4||Math.abs(c.high*f-Math.round(c.high*f))>1e-4||Math.abs(c.low*f-Math.round(c.low*f))>1e-4||Math.abs(c.close*f-Math.round(c.close*f))>1e-4)ok=false;}if(ok)tick=1/f;}}\n      const enabled=tick>0;\n      const sym=String((bv.syminfo()||{}).ticker||'').toUpperCase();\n      const pip=p.pipSizeIn>0?p.pipSizeIn:(sym.includes('XAU')?0.1:tick*10), zoneBuf=p.zonePips*pip;\n      const tr=data.map((c,j)=>j?Math.max(c.high-c.low,Math.abs(c.high-data[j-1].close),Math.abs(c.low-data[j-1].close)):c.high-c.low);\n      const atr=bv.ma(tr,14,'RMA');\n      const labelRing=[];function shape(type,o){if(type==='label'){let slot=0;for(const r of labelRing)if(r.above===o.above&&Math.abs(r.index-o.index)<=2)slot=Math.max(slot,r.slot+1);o.slot=Math.min(slot,3);labelRing.push({index:o.index,above:o.above,slot:o.slot});if(labelRing.length>16)labelRing.shift();}shapes.push(Object.assign({type},o));}\n      function structureEvent(ext,e){\n        if(!p.useStructure||!(ext?p.showExternal:p.showInternal))return;\n        const bull=ext?p.extUpColor:p.upColor,bear=ext?p.extDownColor:p.downColor,col=e.direction===1?bull:bear;\n        if(e.kind==='swing'){if(p.showSwings)shape('label',{index:e.index,price:e.price,text:e.label,color:col,above:e.label==='HH'||e.label==='LH'});return;}\n        if(e.kind==='mss'&&!p.showMSS||e.kind==='bos'&&!p.showBOS||e.from<0)return;\n        shape('line',{a:e.from,b:e.to,pa:e.price,pb:e.price,color:col,dash:e.kind==='mss'?[]:[5,4],width:e.kind==='mss'?(ext?3:2):(ext?2:1)});\n        shape('label',{index:e.index,price:e.price,text:e.label,color:col,above:e.direction===1});\n      }\n      const I=createStructureEngine(data,Math.max(1,Math.floor(p.intLen)),e=>structureEvent(false,e));\n      const E=createStructureEngine(data,Math.max(2,Math.floor(p.extLen)),e=>structureEvent(true,e));\n      const states=[I.state,E.state];\n      function provisional(i,from,key,high){if(!valid(from)||from<0)return null;let n=Math.min(i-1-from,300);if(n<1)return null;let v=null;for(let k=1;k<=n;k++){let a=data[i-k][key];v=v===null?a:(high?Math.max(v,a):Math.min(v,a));}return v;}\n      function plan(i,d,entry,tp,sl,tag){if(!p.showPlan)return;for(const [price,color,text,dash] of [[tp,'#008000','TP ',[5,4]],[sl,'#ff0000','SL ',[5,4]],[entry,'#808080',(d===1?'BUY \u00b7 ':'SELL \u00b7 ')+tag+' \u00b7 RR '+(Math.abs(tp-entry)/Math.abs(entry-sl)).toFixed(2)+' ',[2,3]]]){shape('line',{a:i,b:i+p.planBars,pa:price,pb:price,color,dash,width:1});shape('label',{index:i+p.planBars,price,text:text+(price===entry?'':String(price)),color,above:true});}}\n      for(let i=0;i<n;i++){\n        let c=data[i], internal=states[0];\n        // The local chart supplies completed candles only, including the last candle.\n        I.step(i); E.step(i);\n        let lo=Infinity,hi=-Infinity;for(let k=Math.max(0,i-p.consolBars+1);k<=i;k++){lo=Math.min(lo,data[k].low);hi=Math.max(hi,data[k].high);}\n        let consolidation=p.useConsol&&((p.useConsolRange&&valid(atr[i])&&hi-lo<atr[i]*p.consolMult)||(p.useConsolMixed&&internal.hiType*internal.loType===-1));\n        bands.push({consolidation,internal:internal.trend,external:E.state.trend,protectedLevel:internal.trend===1?internal.PL:internal.trend===-1?internal.PH:null});\n        if(!enabled)continue;\n        let body=Math.abs(c.close-c.open), bodyOk=body>=p.minBodyTicks*tick&&body>0;\n        let rawBull=c.close>c.open&&c.open-c.low<=p.tolTicks*tick&&bodyOk,rawBear=c.close<c.open&&c.high-c.open<=p.tolTicks*tick&&bodyOk;\n        if(rawBull)bulls++;if(rawBear)bears++;\n        events[i].bullWick=rawBull?1:0; events[i].bearWick=rawBear?1:0;\n        const immediate=p.entryMode==='Immediate (on candle close)',reject=p.entryMode==='Retest: rejection candle close',limit=!immediate&&!reject;\n        // Existing positions are checked before today's setups, as in Pine.\n        for(let k=trades.length-1;k>=0;k--){let t=trades[k],hitTP=t.d===1?c.high>=t.tp:c.low<=t.tp,hitSL=t.d===1?c.low<=t.sl:c.high>=t.sl;if(hitTP||hitSL){let win=hitTP&&!hitSL;if(win){wins++;netR+=t.rr;}else{losses++;netR--;}if(p.showResults)shape('label',{index:i,price:win?t.tp:t.sl,text:win?'\u2714':'\u2716',color:win?'#008000':'#ff0000',above:true});trades.splice(k,1);}}\n        function setup(d,raw,allow){\n          if(!raw||!allow)return false; // Consolidation is context only; do not block setups.\n          let sl=null,st=null,tag='',buf=p.slBufTicks*tick;\n          if(!p.useStructure){sl=c.open-d*buf;tag='Wickless';}\n          else if(internal.chochDir===d&&i-internal.chochBar<=p.zoneBars){if(valid(internal.chochLevel))sl=internal.chochLevel-d*buf;tag='CHOCH';}\n          else if(internal.trend===d){\n            let pv=p.slLive?provisional(i,d===1?internal.loBar:internal.hiBar,d===1?'low':'high',d===-1):null;\n            st=d===1?(internal.lastHH>c.close?internal.lastHH:null):(internal.lastLL<c.close&&valid(internal.lastLL)?internal.lastLL:null);\n            let confirm=d===1?internal.lastHL:internal.lastLH, last=d===1?internal.lo:internal.hi;\n            let ahead=x=>valid(x)&&(d===1?x<c.close:x>c.close);\n            sl=(ahead(pv)?pv:ahead(confirm)?confirm:ahead(last)?last:c.open)-d*buf;tag='Trend';\n          }\n          let ref=immediate?c.close:c.open+d*zoneBuf;if(!valid(sl)||(d===1?sl>=ref:sl<=ref))return false;\n          let entry=null,tp=null;\n          if(limit){entry=ref;let risk=d*(entry-sl);let candidate=valid(st)&&d*(st-entry)>0?st:entry+d*risk*p.rrValue;tp=p.tpMode==='Fixed R:R'?entry+d*risk*p.rrValue:candidate;if(risk<=0||(p.tpMode!=='Fixed R:R'&&d*(tp-entry)/risk<p.minRR))return true;}\n          let zone={a:i,b:i+p.retestBars,top:d===1?c.open+zoneBuf:Math.max(c.open,c.high),bottom:d===1?Math.min(c.open,c.low):c.open-zoneBuf,color:d===1?p.upColor:p.downColor,status:'waiting'};\n          if(p.showZone&&!immediate)zones.push(zone);\n          pending.push({d,sb:i,bot:zone.bottom,top:zone.top,sl,st,entry,tp,tag,zone});return true;\n        }\n        let l=setup(1,rawBull,p.allowLongs),s=setup(-1,rawBear,p.allowShorts);\n        if(!immediate&&l)shape('label',{index:i,price:c.low,text:'\u25b2',color:p.upColor,above:false});\n        if(!immediate&&s)shape('label',{index:i,price:c.high,text:'\u25bc',color:p.downColor,above:true});\n        if(p.showRaw&&rawBull&&!l)shape('label',{index:i,price:c.low,text:'\u25b2',color:'#999999',above:false});\n        if(p.showRaw&&rawBear&&!s)shape('label',{index:i,price:c.high,text:'\u25bc',color:'#999999',above:true});\n        for(let k=pending.length-1;k>=0;k--){let q=pending[k],age=i-q.sb,trig=false,dead=false;\n          if(immediate)trig=age===0;else if(age>=1){let broken=reject&&(q.d===1?(c.close<q.bot||c.low<=q.sl):(c.close>q.top||c.high>=q.sl));let flipped=p.cancelOnFlip&&p.useStructure&&(q.d===1?internal.trend===-1:internal.trend===1);let touched=q.d===1?c.low<=q.top:c.high>=q.bot;let rejected=!reject||!p.needReject||(q.d===1?c.close>c.open:c.close<c.open);if(broken)dead=true;else if(touched&&rejected)trig=true;else if(age>=p.retestBars||flipped)dead=true;}\n          if(trig){let entry=limit?q.entry:c.close,risk=q.d*(entry-q.sl),tp=null;if(risk>0){if(limit)tp=q.tp;else if(p.tpMode==='Fixed R:R')tp=entry+q.d*risk*p.rrValue;else tp=valid(q.st)&&q.d*(q.st-entry)>0?q.st:entry+q.d*risk*p.rrValue;}\n            let rr=valid(tp)&&risk>0?Math.abs(tp-entry)/risk:null,ok=risk>0&&valid(tp)&&(p.tpMode==='Fixed R:R'||rr>=p.minRR);\n            if(ok){if(!immediate){if(q.d===1)events[i].bullRetest=1;else events[i].bearRetest=1;}shape('label',{index:i,price:q.d===1?c.low:c.high,text:q.d===1?'BUY':'SELL',color:q.d===1?p.upColor:p.downColor,above:q.d!==1});plan(i,q.d,entry,tp,q.sl,q.tag);let stopped=limit&&(q.d===1?c.low<=q.sl:c.high>=q.sl);if(stopped){losses++;netR--;if(p.showResults)shape('label',{index:i,price:q.sl,text:'\u2716',color:'#ff0000',above:true});}else trades.push({d:q.d,tp,sl:q.sl,rr});q.zone.status='filled';}else{cancelled++;q.zone.status='cancelled';shape('label',{index:q.sb,price:q.d===1?data[q.sb].low:data[q.sb].high,text:'CANCELLED',color:'#a3a3a3',above:q.d!==1});}q.zone.b=i;\n          }else if(dead){cancelled++;q.zone.status='cancelled';q.zone.b=i;shape('label',{index:q.sb,price:q.d===1?data[q.sb].low:data[q.sb].high,text:'CANCELLED',color:'#a3a3a3',above:q.d!==1});}\n          if(trig||dead)pending.splice(k,1);\n        }\n      }\n      // The runtime has no documented confirmed-bar flag. Publish the previous\n      // completed bar's event on the new bar, rather than alerting on a live wick.\n      for(let i=0;i<n;i++) {\n        const e=i>0?events[i-1]:{bullWick:0,bearWick:0,bullRetest:0,bearRetest:0};\n        rows[i].alertAll=(e.bullWick||e.bearWick||e.bullRetest||e.bearRetest)?1:0;\n        rows[i].alertBullWick=e.bullWick; rows[i].alertBearWick=e.bearWick;\n        rows[i].alertBullRetest=e.bullRetest; rows[i].alertBearRetest=e.bearRetest;\n      }\n      rows[n-1]._view={shapes,zones,bands,states,wins,losses,cancelled,netR,bulls,bears,pending:pending.length,trades:trades.length,zoneBuf,enabled,params:p};return rows;\n    },\n    draw(args) {\n      const {ctx,bounding,xAxis,yAxis,indicator}=args, result=indicator.result||[],v=result[result.length-1]?._view;if(!v)return true;\n      const p=v.params,w=bounding.width,h=bounding.height,x=i=>xAxis.convertToPixel(i),y=a=>yAxis.convertToPixel(a);ctx.save();ctx.setLineDash([]);\n      // Paint shaded areas behind candles where supported by the chart compositor.\n      ctx.save();ctx.globalCompositeOperation='destination-over';\n      for(let i=0;i<v.bands.length;i++){let band=v.bands[i],xx=x(i),next=x(i+1),width=Math.max(1,Math.abs(next-xx));if(xx+width<0||xx-width>w)continue;if(p.showConsol&&band.consolidation){ctx.fillStyle='#808080';ctx.globalAlpha=.13;ctx.fillRect(xx-width/2,0,width,h);}if(p.useStructure&&p.showExtHL&&band.external){ctx.fillStyle=band.external===1?p.extUpColor:p.extDownColor;ctx.globalAlpha=.09;ctx.fillRect(xx-width/2,0,width,h);}}\n      ctx.globalAlpha=1;for(const z of v.zones){let a=x(z.a),b=x(z.b);if(b<0||a>w)continue;let top=y(z.top),bottom=y(z.bottom);ctx.fillStyle=z.status==='cancelled'?'#808080':z.color;ctx.globalAlpha=z.status==='filled'?.35:.15;ctx.fillRect(a,Math.min(top,bottom),b-a,Math.abs(bottom-top));ctx.globalAlpha=.4;ctx.strokeStyle=z.status==='cancelled'?'#808080':z.color;ctx.strokeRect(a,Math.min(top,bottom),b-a,Math.abs(bottom-top));}ctx.restore();\n      function line(a,b,pa,pb,color,width,dash){let x1=x(a),x2=x(b),y1=y(pa),y2=y(pb);if(![x1,x2,y1,y2].every(Number.isFinite))return;if(Math.max(x1,x2)<0||Math.min(x1,x2)>w)return;ctx.strokeStyle=color;ctx.lineWidth=width||1;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}\n      for(const s of v.shapes){if(s.type==='line'){line(s.a,s.b,s.pa,s.pb,s.color,s.width,s.dash);continue;}let xx=x(s.index),yy=y(s.price);if(!Number.isFinite(xx)||!Number.isFinite(yy)||xx< -100||xx>w+100)continue;ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline=s.above?'bottom':'top';ctx.fillStyle=s.color;ctx.fillText(s.text,xx,yy+(s.above?-(4+(s.slot||0)*13):(4+(s.slot||0)*13)));}\n      for(let which=0;which<v.states.length;which++){if(!p.showTL||(which===0&&p.tlSource==='External')||(which===1&&p.tlSource==='Internal'))continue;const state=v.states[which];for(const tl of [state.highLine,state.lowLine])if(tl&&tl.b!==tl.a&&((tl.rising&&p.tlBull)||(!tl.rising&&p.tlBear))){let end=result.length+200,price=tl.pb+(tl.pb-tl.pa)*(end-tl.b)/(tl.b-tl.a),col=tl.rising?(which?p.extUpColor:p.upColor):(which?p.extDownColor:p.downColor);line(tl.a,end,tl.pa,price,col,which?2:1,[]);}}\n      if(p.useStructure&&p.showProtected){for(let i=0;i<v.bands.length;i++){const band=v.bands[i];if(!Number.isFinite(band.protectedLevel))continue;line(i,i+1,band.protectedLevel,band.protectedLevel,band.internal===1?p.upColor:p.downColor,1,[1,3]);}}\n      if(p.useStructure&&p.showIntHL){for(let i=0;i<v.bands.length;i++){let b=v.bands[i];if(!b.internal)continue;let xx=x(i),dx=Math.abs(x(i+1)-xx);if(xx+dx<0||xx-dx>w)continue;ctx.fillStyle=b.internal===1?p.upColor:p.downColor;ctx.fillRect(xx-dx/2,h-4,Math.max(1,dx),4);}}\n      if(p.showStats||!v.enabled){let total=v.wins+v.losses, trend=t=>t===1?'Bullish':t===-1?'Bearish':'\u2014';let rows=!v.enabled?[['Tick size required','Set it in Inputs']]:[['Wickless strategy','Simulation'],['Bullish wickless',v.bulls],['Bearish wickless',v.bears],['Internal trend',trend(v.states[0].trend)],['External trend',trend(v.states[1].trend)],['Market state',v.bands[v.bands.length-1].consolidation?'Consolidating':'Trending'],['Entry zone (price)',v.zoneBuf.toFixed(3)],['Waiting for retest',v.pending],['Cancelled setups',v.cancelled],['Hit TP \u2714',v.wins],['Hit SL \u2716',v.losses],['Open trades',v.trades],['Win rate',total?(100*v.wins/total).toFixed(1)+'%':'\u2014'],['Net R',v.netR.toFixed(2)+'R']];let pw=210,ph=rows.length*18+8,left=p.tablePos.includes('right')?Math.max(0,w-pw-8):8,top=p.tablePos.includes('bottom')?Math.max(0,h-ph-8):8;ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(left,top,pw,ph);ctx.font='11px sans-serif';ctx.textBaseline='middle';for(let i=0;i<rows.length;i++){ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(String(rows[i][0]),left+6,top+13+i*18);ctx.textAlign='right';ctx.fillText(String(rows[i][1]),left+pw-6,top+13+i*18);}}\n      ctx.restore();return true;\n    }\n  };\n";
