// Saved internal-structure Free Chart version; visual simulation only.
export const noWickInputs = [
  {
    "id": "tickSize",
    "name": "Minimum tick size (price units; 0 = disabled)",
    "type": "float",
    "defval": 0.01,
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
    "defval": "Retest: limit at zone edge",
    "options": [
      "Retest: limit at zone edge",
      "Retest: rejection candle close",
      "Immediate (on candle close)"
    ]
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
    "id": "showTL",
    "name": "Draw lines through internal swing pivots",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tlBull",
    "name": "Show rising internal swing lines",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tlBear",
    "name": "Show falling internal swing lines",
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
    "id": "placeTrades",
    "name": "Place trades (off = suggestions only)",
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
    "defval": "Fixed R:R",
    "options": [
      "Fixed R:R",
      "Structure (HH/LL) with R:R fallback"
    ]
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
    "id": "showStats",
    "name": "Show statistics table",
    "type": "bool",
    "defval": true
  },
  {
    "id": "tablePos",
    "name": "Table position",
    "type": "select",
    "defval": "top_right",
    "options": [
      "top_right",
      "top_left",
      "bottom_right",
      "bottom_left"
    ]
  }
];
export const noWickScript = "  const defaults = {tickSize:0,tolTicks:0,minBodyTicks:0,showRaw:true,entryMode:'Retest: limit at zone edge',pipSizeIn:0,zonePips:3,needReject:true,retestBars:10,cancelOnFlip:true,showZone:true,useStructure:true,intLen:3,zoneBars:15,showInternal:true,showSwings:true,showBOS:true,showMSS:true,showIntHL:true,showTL:true,tlBull:true,tlBear:true,useConsol:true,useConsolRange:true,consolBars:20,consolMult:3.5,useConsolMixed:true,showConsol:true,allowLongs:true,allowShorts:true,placeTrades:true,slLive:true,slBufTicks:0,tpMode:'Fixed R:R',rrValue:1,minRR:1,showPlan:true,planBars:15,showResults:true,upColor:'#008000',downColor:'#ff0000',showStats:true,tablePos:'top_right'};\n  function structure(){return {lastHigh:null,lastLow:null,highBar:null,lowBar:null,HH:null,HL:null,LL:null,LH:null,hBroken:true,lBroken:true,trend:0,highs:[],lows:[],highCrossed:false,lowCrossed:false,protectedHigh:null,protectedHighBar:null,protectedLow:null,protectedLowBar:null,protectedHighBroken:true,protectedLowBroken:true,pendingDir:0,pendingCount:0,pendingBar:null,chochDir:0,chochLevel:null,chochBar:null,hiType:0,loType:0,prevH:null,prevL:null,prevHB:null,prevLB:null,highLine:null,lowLine:null};}\n  function valid(x){return x !== null && x !== undefined && Number.isFinite(x);}\n  return {\n    // Binary 0/1 figures expose alertable series; custom draw paints the chart.\n    figures: [\n      { key:'alertAll', title:'All wick and retest signals: ', type:'line' },\n      { key:'alertBullWick', title:'Bullish 0-wick: ', type:'line' },\n      { key:'alertBearWick', title:'Bearish 0-wick: ', type:'line' },\n      { key:'alertBullRetest', title:'Bullish retest entry: ', type:'line' },\n      { key:'alertBearRetest', title:'Bearish retest entry: ', type:'line' }\n    ],\n    calc(data, indicator) {\n      const p=Object.assign({},defaults,indicator.extendData?.inputs||{}), n=data.length;\n      const rows=data.map(()=>({})); if(!n)return rows;\n      const shapes=[], zones=[], pending=[], trades=[], bands=[], confirmedShifts=[];\n      const events=data.map(()=>({bullWick:0,bearWick:0,bullRetest:0,bearRetest:0}));\n      const states=[structure()]; let wins=0,losses=0,cancelled=0,netR=0,bulls=0,bears=0;\n      const tick=Number(p.tickSize), enabled=Number.isFinite(tick)&&tick>0;\n      const sym=String((bv.syminfo()||{}).ticker||'').toUpperCase();\n      const pip=p.pipSizeIn>0?p.pipSizeIn:(sym.includes('XAU')?0.1:tick*10), zoneBuf=p.zonePips*pip;\n      const tr=data.map((c,j)=>j?Math.max(c.high-c.low,Math.abs(c.high-data[j-1].close),Math.abs(c.low-data[j-1].close)):c.high-c.low);\n      const atr=bv.ma(tr,14,'RMA');\n      function shape(type, o){shapes.push(Object.assign({type},o));}\n      function pivot(i,len,key,high){let j=i-len;if(j-len<0)return null;let v=data[j][key];for(let k=j-len;k<=i;k++){if(k===j)continue;let q=data[k][key];if(high?(k<j?q>v:q>=v):(k<j?q<v:q<=v))return null;}return v;}\n      function advance(s,len,i,isInt){\n        const ph=pivot(i,len,'high',true),pl=pivot(i,len,'low',false),j=i-len;\n        const bull=p.upColor,bear=p.downColor;\n        const drawStruct=p.useStructure&&p.showInternal;\n        const drawTL=p.showTL;\n        if(ph!==null){\n          if(s.pendingDir===1&&j>s.pendingBar){s.pendingCount=valid(s.lastHigh)&&ph>s.lastHigh?s.pendingCount+1:0;if(s.pendingCount>=2){if(isInt)confirmedShifts.push({from:s.pendingBar,to:i,dir:1});s.trend=1;s.protectedLow=null;s.protectedLowBar=null;s.protectedLowBroken=true;s.pendingDir=0;s.pendingCount=0;}}\n          if(valid(s.lastHigh)){let hh=ph>s.lastHigh, crossed=s.highCrossed||data[i].close>s.lastHigh;s.hiType=hh?1:(ph<s.lastHigh?-1:0);if(hh&&crossed&&s.trend===1){s.HH=ph;if(drawStruct&&p.showSwings)shape('label',{index:j,price:ph,text:'HH',color:bull,above:true});}}\n          if(valid(s.prevH)){let hh=ph>s.prevH;s.highLine=drawTL&&((hh&&p.tlBull)||(!hh&&p.tlBear))?{a:s.prevHB,b:j,pa:s.prevH,pb:ph,color:hh?bull:bear,width:isInt?1:2}:null;}\n          s.prevH=ph;s.prevHB=j;s.lastHigh=ph;s.highBar=j;s.hBroken=false;s.highCrossed=false;s.highs.push({bar:j,price:ph});\n        }\n        if(pl!==null){\n          if(s.pendingDir===-1&&j>s.pendingBar){s.pendingCount=valid(s.lastLow)&&pl<s.lastLow?s.pendingCount+1:0;if(s.pendingCount>=2){if(isInt)confirmedShifts.push({from:s.pendingBar,to:i,dir:-1});s.trend=-1;s.protectedHigh=null;s.protectedHighBar=null;s.protectedHighBroken=true;s.pendingDir=0;s.pendingCount=0;}}\n          if(valid(s.lastLow)){let ll=pl<s.lastLow,crossed=s.lowCrossed||data[i].close<s.lastLow;s.loType=pl>s.lastLow?1:(ll?-1:0);if(ll&&crossed&&s.trend===-1){s.LL=pl;if(drawStruct&&p.showSwings)shape('label',{index:j,price:pl,text:'LL',color:bear,above:false});}}\n          if(valid(s.prevL)){let hl=pl>s.prevL;s.lowLine=drawTL&&((hl&&p.tlBull)||(!hl&&p.tlBear))?{a:s.prevLB,b:j,pa:s.prevL,pb:pl,color:hl?bull:bear,width:isInt?1:2}:null;}\n          s.prevL=pl;s.prevLB=j;s.lastLow=pl;s.lowBar=j;s.lBroken=false;s.lowCrossed=false;s.lows.push({bar:j,price:pl});\n        }\n        if(valid(s.lastHigh)&&data[i].close>s.lastHigh)s.highCrossed=true;\n        if(valid(s.lastLow)&&data[i].close<s.lastLow)s.lowCrossed=true;\n        let bos=false,mss=false,dir=0,lvl=null,from=null;\n        // BOS uses the last confirmed swing in the current direction. Opposite\n        // MSS uses only the protected pullback established by a prior BOS.\n        if((s.trend===0||s.trend===1)&&valid(s.lastHigh)&&!s.hBroken&&data[i].close>s.lastHigh){\n          s.hBroken=true;dir=1;lvl=s.lastHigh;from=s.highBar;\n          if(s.trend===0)s.trend=1;\n          else {bos=true;\n            // Exclude both the prior swing candle and the BOS candle.\n            let count=i-s.highBar-1;if(count>=1&&count<=4999){let best=Infinity,bar=null;for(let k=s.highBar+1;k<i;k++){if(data[k].low<best){best=data[k].low;bar=k;}}\n              let base=null;for(let k=s.lows.length-1;k>=0;k--){if(s.lows[k].bar<s.highBar){base=s.lows[k].price;break;}}\n              if(valid(s.protectedLow))base=valid(base)?Math.max(base,s.protectedLow):s.protectedLow;\n              if(valid(base)&&best>base){s.protectedLow=best;s.protectedLowBar=bar;s.protectedLowBroken=false;s.HL=best;\n                if(drawStruct&&p.showSwings)shape('label',{index:bar,price:best,text:'HL',color:bull,above:false});}}\n            if(s.pendingDir===-1){s.pendingDir=0;s.pendingCount=0;s.chochDir=0;}else if(s.chochDir===1)s.chochDir=0;\n          }\n        } else if(s.trend===-1&&s.pendingDir!==1&&valid(s.protectedHigh)&&!s.protectedHighBroken&&data[i].close>s.protectedHigh){\n          s.protectedHighBroken=true;dir=1;lvl=s.protectedHigh;from=s.protectedHighBar;mss=true;\n          s.chochLevel=valid(s.LL)?s.LL:s.lastLow;s.chochDir=1;s.chochBar=i;s.pendingDir=1;s.pendingCount=0;s.pendingBar=i;s.LL=null;s.LH=null;s.hiType=0;s.loType=0;\n        }\n        if((s.trend===0||s.trend===-1)&&valid(s.lastLow)&&!s.lBroken&&data[i].close<s.lastLow){\n          s.lBroken=true;dir=-1;lvl=s.lastLow;from=s.lowBar;\n          if(s.trend===0)s.trend=-1;\n          else {bos=true;\n            let count=i-s.lowBar-1;if(count>=1&&count<=4999){let best=-Infinity,bar=null;for(let k=s.lowBar+1;k<i;k++){if(data[k].high>best){best=data[k].high;bar=k;}}\n              let base=null;for(let k=s.highs.length-1;k>=0;k--){if(s.highs[k].bar<s.lowBar){base=s.highs[k].price;break;}}\n              if(valid(s.protectedHigh))base=valid(base)?Math.min(base,s.protectedHigh):s.protectedHigh;\n              if(valid(base)&&best<base){s.protectedHigh=best;s.protectedHighBar=bar;s.protectedHighBroken=false;s.LH=best;\n                if(drawStruct&&p.showSwings)shape('label',{index:bar,price:best,text:'LH',color:bear,above:true});}}\n            if(s.pendingDir===1){s.pendingDir=0;s.pendingCount=0;s.chochDir=0;}else if(s.chochDir===-1)s.chochDir=0;\n          }\n        } else if(s.trend===1&&s.pendingDir!==-1&&valid(s.protectedLow)&&!s.protectedLowBroken&&data[i].close<s.protectedLow){\n          s.protectedLowBroken=true;dir=-1;lvl=s.protectedLow;from=s.protectedLowBar;mss=true;\n          s.chochLevel=valid(s.HH)?s.HH:s.lastHigh;s.chochDir=-1;s.chochBar=i;s.pendingDir=-1;s.pendingCount=0;s.pendingBar=i;s.HH=null;s.HL=null;s.hiType=0;s.loType=0;\n        }\n        if(drawStruct&&((bos&&p.showBOS)||(mss&&p.showMSS))&&valid(from)){let col=dir===1?bull:bear;shape('line',{a:from,b:i,pa:lvl,pb:lvl,color:col,dash:isInt?[4,4]:[],width:isInt?1:2});shape('label',{index:Math.round((from+i)/2),price:lvl,text:mss?'MSS':'BOS',color:col,above:dir===1});}\n      }\n      function provisional(i,from,key,high){if(!valid(from))return null;let n=Math.min(i-1-from,300);if(n<1)return null;let v=null;for(let k=1;k<=n;k++){let a=data[i-k][key];v=v===null?a:(high?Math.max(v,a):Math.min(v,a));}return v;}\n      function plan(i,d,entry,tp,sl,tag){if(!p.showPlan)return;for(const [price,color,text,dash] of [[tp,'#008000','TP ',[5,4]],[sl,'#ff0000','SL ',[5,4]],[entry,'#808080',(d===1?'BUY \u00b7 ':'SELL \u00b7 ')+tag+' \u00b7 RR '+(Math.abs(tp-entry)/Math.abs(entry-sl)).toFixed(2)+' ',[2,3]]]){shape('line',{a:i,b:i+p.planBars,pa:price,pb:price,color,dash,width:1});shape('label',{index:i+p.planBars,price,text:text+(price===entry?'':String(price)),color,above:true});}}\n      for(let i=0;i<n;i++){\n        let c=data[i], internal=states[0];\n        // No documented confirmed flag: the last loaded candle is treated as live.\n        if(i<n-1){advance(internal,Math.max(1,Math.floor(p.intLen)),i,true);}\n        let lo=Infinity,hi=-Infinity;for(let k=Math.max(0,i-p.consolBars+1);k<=i;k++){lo=Math.min(lo,data[k].low);hi=Math.max(hi,data[k].high);}\n        let consolidation=p.useConsol&&((p.useConsolRange&&valid(atr[i])&&hi-lo<atr[i]*p.consolMult)||(p.useConsolMixed&&internal.hiType*internal.loType===-1));\n        bands.push({consolidation,internal:internal.trend});\n        if(i===n-1||!enabled)continue;\n        let body=Math.abs(c.close-c.open), bodyOk=body>=p.minBodyTicks*tick&&body>0;\n        let rawBull=c.close>c.open&&c.open-c.low<=p.tolTicks*tick&&bodyOk,rawBear=c.close<c.open&&c.high-c.open<=p.tolTicks*tick&&bodyOk;\n        if(rawBull)bulls++;if(rawBear)bears++;\n        events[i].bullWick=rawBull?1:0; events[i].bearWick=rawBear?1:0;\n        const immediate=p.entryMode==='Immediate (on candle close)',reject=p.entryMode==='Retest: rejection candle close',limit=!immediate&&!reject;\n        // Existing positions are checked before today's setups, as in Pine.\n        for(let k=trades.length-1;k>=0;k--){let t=trades[k],hitTP=t.d===1?c.high>=t.tp:c.low<=t.tp,hitSL=t.d===1?c.low<=t.sl:c.high>=t.sl;if(hitTP||hitSL){let win=hitTP&&!hitSL;if(win){wins++;netR+=t.rr;}else{losses++;netR--;}if(p.showResults)shape('label',{index:i,price:win?t.tp:t.sl,text:win?'\u2714':'\u2716',color:win?'#008000':'#ff0000',above:true});trades.splice(k,1);}}\n        function setup(d,raw,allow){\n          if(!raw||!allow||!p.placeTrades)return false; // Consolidation is context only; do not block setups.\n          let sl=null,st=null,tag='',buf=p.slBufTicks*tick;\n          if(!p.useStructure){sl=c.open-d*buf;tag='Wickless';}\n          else if(internal.chochDir===d&&i-internal.chochBar<=p.zoneBars){if(valid(internal.chochLevel))sl=internal.chochLevel-d*buf;tag='CHOCH';}\n          else if(internal.trend===d){\n            let pv=p.slLive?provisional(i,d===1?internal.lowBar:internal.highBar,d===1?'low':'high',d===-1):null;\n            st=d===1?(internal.HH>c.close?internal.HH:null):(internal.LL<c.close&&valid(internal.LL)?internal.LL:null);\n            let confirm=d===1?internal.HL:internal.LH, last=d===1?internal.lastLow:internal.lastHigh;\n            let ahead=x=>valid(x)&&(d===1?x<c.close:x>c.close);\n            sl=(ahead(pv)?pv:ahead(confirm)?confirm:ahead(last)?last:c.open)-d*buf;tag='Trend';\n          }\n          let ref=immediate?c.close:c.open+d*zoneBuf;if(!valid(sl)||(d===1?sl>=ref:sl<=ref))return false;\n          let entry=null,tp=null;\n          if(limit){entry=ref;let risk=d*(entry-sl);let candidate=valid(st)&&d*(st-entry)>0?st:entry+d*risk*p.rrValue;tp=p.tpMode==='Fixed R:R'?entry+d*risk*p.rrValue:candidate;if(risk<=0||(p.tpMode!=='Fixed R:R'&&d*(tp-entry)/risk<p.minRR))return true;}\n          let zone={a:i,b:i+p.retestBars,top:d===1?c.open+zoneBuf:Math.max(c.open,c.high),bottom:d===1?Math.min(c.open,c.low):c.open-zoneBuf,color:d===1?p.upColor:p.downColor,status:'waiting'};\n          if(p.showZone&&!immediate)zones.push(zone);\n          pending.push({d,sb:i,bot:zone.bottom,top:zone.top,sl,st,entry,tp,tag,zone});return true;\n        }\n        let l=setup(1,rawBull,p.allowLongs),s=setup(-1,rawBear,p.allowShorts);\n        if(!immediate&&l)shape('label',{index:i,price:c.low,text:'\u25b2',color:p.upColor,above:false});\n        if(!immediate&&s)shape('label',{index:i,price:c.high,text:'\u25bc',color:p.downColor,above:true});\n        if(p.showRaw&&rawBull&&!l)shape('label',{index:i,price:c.low,text:'\u25b2',color:'#999999',above:false});\n        if(p.showRaw&&rawBear&&!s)shape('label',{index:i,price:c.high,text:'\u25bc',color:'#999999',above:true});\n        for(let k=pending.length-1;k>=0;k--){let q=pending[k],age=i-q.sb,trig=false,dead=false;\n          if(immediate)trig=age===0;else if(age>=1){let broken=reject&&(q.d===1?(c.close<q.bot||c.low<=q.sl):(c.close>q.top||c.high>=q.sl));let flipped=p.cancelOnFlip&&p.useStructure&&internal.pendingDir!==q.d&&(q.d===1?internal.trend===-1:internal.trend===1);let touched=q.d===1?c.low<=q.top:c.high>=q.bot;let rejected=!reject||!p.needReject||(q.d===1?c.close>c.open:c.close<c.open);if(broken)dead=true;else if(touched&&rejected)trig=true;else if(age>=p.retestBars||flipped)dead=true;}\n          if(trig){let entry=limit?q.entry:c.close,risk=q.d*(entry-q.sl),tp=null;if(risk>0){if(limit)tp=q.tp;else if(p.tpMode==='Fixed R:R')tp=entry+q.d*risk*p.rrValue;else tp=valid(q.st)&&q.d*(q.st-entry)>0?q.st:entry+q.d*risk*p.rrValue;}\n            let rr=valid(tp)&&risk>0?Math.abs(tp-entry)/risk:null,ok=risk>0&&valid(tp)&&(p.tpMode==='Fixed R:R'||rr>=p.minRR);\n            if(ok){if(!immediate){if(q.d===1)events[i].bullRetest=1;else events[i].bearRetest=1;}shape('label',{index:i,price:q.d===1?c.low:c.high,text:q.d===1?'BUY':'SELL',color:q.d===1?p.upColor:p.downColor,above:q.d!==1});plan(i,q.d,entry,tp,q.sl,q.tag);let stopped=limit&&(q.d===1?c.low<=q.sl:c.high>=q.sl);if(stopped){losses++;netR--;if(p.showResults)shape('label',{index:i,price:q.sl,text:'\u2716',color:'#ff0000',above:true});}else trades.push({d:q.d,tp,sl:q.sl,rr});q.zone.status='filled';}else{cancelled++;q.zone.status='cancelled';shape('label',{index:q.sb,price:q.d===1?data[q.sb].low:data[q.sb].high,text:'CANCELLED',color:'#a3a3a3',above:q.d!==1});}q.zone.b=i;\n          }else if(dead){cancelled++;q.zone.status='cancelled';q.zone.b=i;shape('label',{index:q.sb,price:q.d===1?data[q.sb].low:data[q.sb].high,text:'CANCELLED',color:'#a3a3a3',above:q.d!==1});}\n          if(trig||dead)pending.splice(k,1);\n        }\n      }\n      // The runtime has no documented confirmed-bar flag. Publish the previous\n      // completed bar's event on the new bar, rather than alerting on a live wick.\n      for(let i=0;i<n;i++) {\n        const e=i>0?events[i-1]:{bullWick:0,bearWick:0,bullRetest:0,bearRetest:0};\n        rows[i].alertAll=(e.bullWick||e.bearWick||e.bullRetest||e.bearRetest)?1:0;\n        rows[i].alertBullWick=e.bullWick; rows[i].alertBearWick=e.bearWick;\n        rows[i].alertBullRetest=e.bullRetest; rows[i].alertBearRetest=e.bearRetest;\n      }\n      // Display-only hindsight: once the 2nd pivot confirms, recolour the\n      // internal ribbon from the initiating MSS. Decisions above use only\n      // the trend actually known at each bar; no setup or alert is backdated.\n      for(const shift of confirmedShifts){\n        for(let j=Math.max(0,shift.from);j<=shift.to&&j<bands.length;j++)bands[j].internal=shift.dir;\n      }\n      rows[n-1]._view={shapes,zones,bands,states,wins,losses,cancelled,netR,bulls,bears,pending:pending.length,trades:trades.length,zoneBuf,enabled,params:p};return rows;\n    },\n    draw(args) {\n      const {ctx,bounding,xAxis,yAxis,indicator}=args, result=indicator.result||[],v=result[result.length-1]?._view;if(!v)return true;\n      const p=v.params,w=bounding.width,h=bounding.height,x=i=>xAxis.convertToPixel(i),y=a=>yAxis.convertToPixel(a);ctx.save();ctx.setLineDash([]);\n      // Paint shaded areas behind candles where supported by the chart compositor.\n      ctx.save();ctx.globalCompositeOperation='destination-over';\n      for(let i=0;i<v.bands.length;i++){let band=v.bands[i],xx=x(i),next=x(i+1),width=Math.max(1,Math.abs(next-xx));if(xx+width<0||xx-width>w)continue;if(p.showConsol&&band.consolidation){ctx.fillStyle='#808080';ctx.globalAlpha=.15;ctx.fillRect(xx-width/2,0,width,h);}}\n      ctx.globalAlpha=1;for(const z of v.zones){let a=x(z.a),b=x(z.b);if(b<0||a>w)continue;let top=y(z.top),bottom=y(z.bottom);ctx.fillStyle=z.status==='cancelled'?'#808080':z.color;ctx.globalAlpha=z.status==='filled'?.35:.15;ctx.fillRect(a,Math.min(top,bottom),b-a,Math.abs(bottom-top));ctx.globalAlpha=.4;ctx.strokeStyle=z.status==='cancelled'?'#808080':z.color;ctx.strokeRect(a,Math.min(top,bottom),b-a,Math.abs(bottom-top));}ctx.restore();\n      function line(a,b,pa,pb,color,width,dash){let x1=x(a),x2=x(b),y1=y(pa),y2=y(pb);if(![x1,x2,y1,y2].every(Number.isFinite))return;if(Math.max(x1,x2)<0||Math.min(x1,x2)>w)return;ctx.strokeStyle=color;ctx.lineWidth=width||1;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}\n      for(const s of v.shapes){if(s.type==='line'){line(s.a,s.b,s.pa,s.pb,s.color,s.width,s.dash);continue;}let xx=x(s.index),yy=y(s.price);if(!Number.isFinite(xx)||!Number.isFinite(yy)||xx< -100||xx>w+100)continue;ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline=s.above?'bottom':'top';ctx.fillStyle=s.color;ctx.fillText(s.text,xx,yy+(s.above?-4:4));}\n      for(const state of v.states)for(const tl of [state.highLine,state.lowLine])if(tl&&tl.b!==tl.a){let end=result.length+200,price=tl.pb+(tl.pb-tl.pa)*(end-tl.b)/(tl.b-tl.a);line(tl.a,end,tl.pa,price,tl.color,tl.width,[]);}\n      if(p.useStructure&&p.showIntHL){for(let i=0;i<v.bands.length;i++){let b=v.bands[i];if(!b.internal)continue;let xx=x(i),dx=Math.abs(x(i+1)-xx);if(xx+dx<0||xx-dx>w)continue;ctx.fillStyle=b.internal===1?p.upColor:p.downColor;ctx.fillRect(xx-dx/2,h-4,Math.max(1,dx),4);}}\n      if(p.showStats||!v.enabled){let total=v.wins+v.losses, trend=t=>t===1?'Bullish':t===-1?'Bearish':'\u2014';let rows=!v.enabled?[['Tick size required','Set it in Inputs']]:[['Wickless strategy','Simulation'],['Bullish wickless',v.bulls],['Bearish wickless',v.bears],['Internal trend',trend(v.states[0].trend)],['Market state',v.bands[v.bands.length-1].consolidation?'Consolidating':'Trending'],['Entry zone (price)',v.zoneBuf],['Waiting for retest',v.pending],['Cancelled setups',v.cancelled],['Hit TP \u2714',v.wins],['Hit SL \u2716',v.losses],['Open trades',v.trades],['Win rate',total?(100*v.wins/total).toFixed(1)+'%':'\u2014'],['Net R',v.netR.toFixed(2)+'R']];let pw=210,ph=rows.length*18+8,left=p.tablePos.includes('right')?Math.max(0,w-pw-8):8,top=p.tablePos.includes('bottom')?Math.max(0,h-ph-8):8;ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(left,top,pw,ph);ctx.font='11px sans-serif';ctx.textBaseline='middle';for(let i=0;i<rows.length;i++){ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(String(rows[i][0]),left+6,top+13+i*18);ctx.textAlign='right';ctx.fillText(String(rows[i][1]),left+pw-6,top+13+i*18);}}\n      ctx.restore();return true;\n    }\n  };\n";
