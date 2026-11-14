// Built-in Free Chart study supplied by the user. Visual only, not used by the Python scorer.
export const fvgReactionInputs = [
{id:'atrLength',name:'ATR length',type:'int',defval:14,min:1,max:200,step:1},
{id:'atrMultiple',name:'Outcome distance (ATR multiple)',type:'float',defval:1,min:.1,max:20,step:.1},
{id:'outcomeBars',name:'Outcome window (bars after event)',type:'int',defval:20,min:1,max:500,step:1},
{id:'zoneLife',name:'Maximum FVG age (bars)',type:'int',defval:100,min:1,max:1000,step:1},
{id:'minGapATR',name:'Minimum FVG height (ATR multiple; 0 = all)',type:'float',defval:0,min:0,max:10,step:.05},
{id:'requireMid',name:'Middle candle must match the gap direction (bullish up / bearish down)',type:'bool',defval:true},
{id:'showBull',name:'Show bullish FVGs',type:'bool',defval:true},
{id:'showBear',name:'Show bearish FVGs',type:'bool',defval:true},
{id:'showEvents',name:'Show event arrows (colour = grab / sweep, direction = outcome)',type:'bool',defval:true},
{id:'showTargets',name:'Show outcome target levels',type:'bool',defval:false},
{id:'showTable',name:'Show original FVG statistics table',type:'bool',defval:false},
{id:'tablePos',name:'Table position',type:'select',options:['top_right','top_left','bottom_right','bottom_left'],defval:'top_right'},
{id:'maxDraw',name:'Maximum recent FVGs displayed',type:'int',defval:150,min:10,max:500,step:10},
{id:'opacity',name:'FVG fill opacity (%)',type:'int',defval:16,min:0,max:80,step:1},
{id:'bullColor',name:'Bullish FVG colour',type:'color',defval:'#22c55e',tab:'style'},
{id:'bearColor',name:'Bearish FVG colour',type:'color',defval:'#f87171',tab:'style'},
{id:'grabColor',name:'Grab label colour',type:'color',defval:'#fbbf24',tab:'style'},
{id:'sweepColor',name:'Sweep label colour',type:'color',defval:'#c084fc',tab:'style'}
];
export const fvgReactionScript = String.raw`
// Free Chart factory body. Study only: no orders, guarantees, or prediction.
const defaults={atrLength:14,atrMultiple:1,outcomeBars:20,zoneLife:100,minGapATR:0,requireMid:true,showBull:true,showBear:true,showEvents:true,showTargets:false,showTable:false,tablePos:'top_right',maxDraw:150,opacity:16,bullColor:'#22c55e',bearColor:'#f87171',grabColor:'#fbbf24',sweepColor:'#c084fc'};
const KEYS=['bullGrab','bullSweep','bearGrab','bearSweep'];
return {
  figures:[],
  calc(data,indicator){
    const p=Object.assign({},defaults,indicator.extendData?.inputs||{}),n=data.length,rows=data.map(()=>({}));
    if(!n){indicator._fvgStudy=null;return rows;}
    const atrLen=Math.max(1,Math.min(200,Math.floor(Number(p.atrLength)||14))),horizon=Math.max(1,Math.min(500,Math.floor(Number(p.outcomeBars)||20))),life=Math.max(1,Math.min(1000,Math.floor(Number(p.zoneLife)||100))),multiple=Math.max(.1,Number(p.atrMultiple)||1),minATR=Math.max(0,Number(p.minGapATR)||0);
    const nominal=bv.detectBarMs(data),atr=new Array(n).fill(null);
    let seed=0,prev=null;
    for(let i=0;i<n;i++){
      const c=data[i],tr=i?Math.max(c.high-c.low,Math.abs(c.high-data[i-1].close),Math.abs(c.low-data[i-1].close)):c.high-c.low;
      if(!Number.isFinite(tr)||tr<0){seed=0;prev=null;continue;}
      if(i<atrLen){seed+=tr;if(i===atrLen-1){prev=seed/atrLen;atr[i]=prev;}}
      else if(prev!==null){prev=(prev*(atrLen-1)+tr)/atrLen;atr[i]=prev;}
    }
    const stats={};for(const k of KEYS)stats[k]={up:0,down:0,tie:0,unresolved:0,total:0};
    let zones=[],active=[],waiting=[],expired=0,gapDiscarded=0;
    for(let i=0;i<n-1;i++){
      const c=data[i],gap=i>0&&Number.isFinite(nominal)&&nominal>0&&data[i].timestamp-data[i-1].timestamp>nominal*1.05;
      if(gap){for(const q of waiting){stats[q.key].unresolved++;q.status='gap';q.end=i-1;}waiting=[];for(const z of active){z.end=i-1;z.status='gap';gapDiscarded++;}active=[];}
      for(let k=waiting.length-1;k>=0;k--){
        const q=waiting[k],up=c.high>=q.upLevel,down=c.low<=q.downLevel;
        if(up||down){const st=stats[q.key];if(up&&down){st.tie++;q.status='tie';}else if(up){st.up++;q.status='up';}else{st.down++;q.status='down';}q.end=i;waiting.splice(k,1);}
        else if(i-q.bar>=horizon){stats[q.key].unresolved++;q.status='timeout';q.end=i;waiting.splice(k,1);}
      }
      for(let k=active.length-1;k>=0;k--){
        const z=active[k];z.end=i;
        if(i-z.created>life){z.end=i-1;z.status='expired';expired++;active.splice(k,1);continue;}
        const touch=c.low<=z.top&&c.high>=z.bottom,beyond=z.dir===1?c.close<z.bottom:c.close>z.top;
        if(!touch&&beyond){z.status='crossed';gapDiscarded++;active.splice(k,1);continue;}
        if(!touch)continue;
        const grab=z.dir===1?c.close<=z.top:c.close>=z.bottom,type=grab?'Grab':'Sweep';
        z.status=type.toLowerCase();active.splice(k,1);
        const key=(z.dir===1?'bull':'bear')+type,st=stats[key];st.total++;
        const distance=atr[i]*multiple,q={bar:i,price:c.close,dir:z.dir,type,key,status:'waiting',end:i};
        z.ev=q;
        if(Number.isFinite(distance)&&distance>0){q.upLevel=c.close+distance;q.downLevel=c.close-distance;waiting.push(q);}
        else{q.status='no ATR';st.unresolved++;}
      }
      if(i>=2&&(!Number.isFinite(nominal)||nominal<=0||(data[i].timestamp-data[i-1].timestamp<=nominal*1.05&&data[i-1].timestamp-data[i-2].timestamp<=nominal*1.05))){
        const a=data[i-2],m=data[i-1];let dir=0,bottom,top;
        if(c.low>a.high&&(!p.requireMid||m.close>m.open)){dir=1;bottom=a.high;top=c.low;}
        else if(c.high<a.low&&(!p.requireMid||m.close<m.open)){dir=-1;bottom=c.high;top=a.low;}
        if(dir&&(minATR===0||(Number.isFinite(atr[i])&&top-bottom>=minATR*atr[i]))){const z={from:i-2,created:i,end:i,top,bottom,dir,status:'open',ev:null};zones.push(z);active.push(z);}
      }
    }
    for(const q of waiting){stats[q.key].unresolved++;q.status='open';q.end=Math.max(q.bar,n-2);}
    indicator._fvgStudy={p,stats,zones:zones.slice(-Math.max(10,Math.min(500,Math.floor(Number(p.maxDraw)||150)))),expired,gapDiscarded,active:active.length,waiting:waiting.length,total:zones.length,n};
    return rows;
  },
  draw(args){
    const {ctx,indicator}=args,v=indicator._fvgStudy;if(!v)return false;
    const p=v.p,vis=bv.visible(args),b=bv.bounds(args),X=i=>bv.xOfIndex(args,i),Y=price=>bv.yOfPrice(args,price);
    ctx.save();ctx.setLineDash([]);
    const alpha=Math.max(0,Math.min(.8,Number(p.opacity)/100));
    for(const z of v.zones){
      if((z.dir===1&&!p.showBull)||(z.dir===-1&&!p.showBear))continue;
      const end=z.status==='open'?Math.max(z.end,vis.to):z.end;
      if(end<vis.from||z.from>vis.to)continue;
      bv.box(args,{fromIndex:z.from,toIndex:end,top:z.top,bottom:z.bottom,color:z.dir===1?p.bullColor:p.bearColor,fillOpacity:z.status==='open'?alpha:alpha*.6,borderOpacity:z.status==='open'?.65:.35,under:true});
      const q=z.ev;if(!q||q.end<vis.from||q.bar>vis.to)continue;
      const color=q.type==='Grab'?p.grabColor:p.sweepColor;
      if(p.showEvents)bv.text(args,{index:q.bar,price:q.price,text:q.status==='up'?'↑':q.status==='down'?'↓':q.status==='tie'?'↕':'•',color,align:'center',baseline:q.dir===1?'top':'bottom',size:15,offsetY:q.dir===1?6:-6});
      if(p.showTargets&&Number.isFinite(q.upLevel)){const x1=X(q.bar),x2=X(q.end);for(const [price,col] of [[q.upLevel,p.bullColor],[q.downLevel,p.bearColor]]){const y=Y(price);if(![x1,x2,y].every(Number.isFinite))continue;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();ctx.setLineDash([]);}}
    }
    if(p.showTable){
      const rh=19,width=372,height=58+KEYS.length*rh+62;
      const left=p.tablePos.includes('right')?Math.max(0,b.width-width-8):8,top=p.tablePos.includes('bottom')?Math.max(0,b.height-height-8):8;
      ctx.fillStyle='rgba(9,15,24,.88)';ctx.fillRect(left,top,width,height);ctx.strokeStyle='rgba(148,163,184,.3)';ctx.strokeRect(left+.5,top+.5,width-1,height-1);
      ctx.textBaseline='middle';ctx.textAlign='left';ctx.font='bold 10px sans-serif';ctx.fillStyle='#f1f5f9';ctx.fillText('FVG REACTION STUDY',left+8,top+12);
      ctx.font='9px sans-serif';ctx.fillStyle='#94a3b8';ctx.fillText('EVENT',left+22,top+29);ctx.textAlign='right';ctx.fillText('UP',left+138,top+29);ctx.fillText('DOWN',left+204,top+29);ctx.fillText('RESPECT ±95%',left+303,top+29);ctx.fillText('N',left+width-8,top+29);
      for(let i=0;i<KEYS.length;i++){
        const key=KEYS[i],s=v.stats[key],bull=key.startsWith('bull'),resolved=s.up+s.down,y=top+46+i*rh,fmt=x=>resolved?x+' ('+(100*x/resolved).toFixed(0)+'%)':'—';
        ctx.fillStyle=key.endsWith('Grab')?p.grabColor:p.sweepColor;ctx.fillRect(left+8,y-5,8,10);
        ctx.textAlign='left';ctx.fillStyle=bull?p.bullColor:p.bearColor;ctx.fillText((bull?'Bull ':'Bear ')+key.slice(4).toLowerCase(),left+22,y);
        ctx.textAlign='right';ctx.fillStyle='#e2e8f0';ctx.fillText(fmt(s.up),left+138,y);ctx.fillText(fmt(s.down),left+204,y);
        if(resolved){const r=(bull?s.up:s.down)/resolved,m=1.96*Math.sqrt(r*(1-r)/resolved);ctx.fillText((100*r).toFixed(0)+'% ±'+(100*m).toFixed(0)+(resolved<30?' *':''),left+303,y);}else ctx.fillText('—',left+303,y);
        ctx.fillText(String(s.total),left+width-8,y);
      }
      const vals=Object.values(v.stats),unresolved=vals.reduce((a,s)=>a+s.unresolved,0),ties=vals.reduce((a,s)=>a+s.tie,0),fy=top+58+KEYS.length*rh-4;
      ctx.textAlign='left';ctx.fillStyle='#94a3b8';
      ctx.fillText('Grab: closed in the gap or past it  ·  Sweep: wick only, closed back out',left+8,fy);
      ctx.fillText('Arrow: ↑ up first  ↓ down first  ↕ both  • unresolved',left+8,fy+14);
      ctx.fillText('Race ±'+p.atrMultiple+' ATR, '+p.outcomeBars+' bars; 50% = coin flip; * under 30 events',left+8,fy+28);
      ctx.fillText('Unresolved '+unresolved+'  ·  Both hit '+ties+'  ·  FVGs found '+v.total,left+8,fy+42);
    }
    ctx.restore();return false;
  }
};`;
