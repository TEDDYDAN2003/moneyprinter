import type {QuickZone,Scenario} from './fvgQuick';
export type ClusterMode='touch'|'confirmation';
export type ClusterDimensions={displacement:boolean;alignment:boolean;choppiness:boolean;depth:boolean;gap:boolean;approach:boolean;reactionCandle:boolean;age:boolean};
export type Cluster={key:string;label:string;resolved:number;wins:number;losses:number;netR:number;excluded:number;open:number;noSignal:number;zones:number;};
export const defaultClusterDimensions:ClusterDimensions={displacement:true,alignment:true,choppiness:true,depth:false,gap:false,approach:false,reactionCandle:false,age:false};
export function clusterKey(z:QuickZone,opt:ClusterDimensions):{key:string;label:string}|null{
 if(z.touch===null||!z.reaction)return null;
 const labels=[z.direction===1?'Bull':'Bear',z.reaction];
 if(opt.displacement)labels.push('disp '+z.displacementClass);
 if(opt.alignment){const t=z.retestInternal,e=z.retestExternal;labels.push('structure '+(t===z.direction&&e===z.direction?'aligned':t===-z.direction||e===-z.direction?'opposed':'mixed'))}
 if(opt.choppiness)labels.push('market '+(z.efficiency===null?'unknown':z.efficiency<.3?'choppy':z.efficiency<.6?'mixed':'directional'));
 if(opt.depth)labels.push('depth '+(z.depth===null?'unknown':z.depth<1/3?'shallow':z.depth<2/3?'middle':'deep'));
 if(opt.gap)labels.push('gap '+(z.gapAtr===null?'unknown':z.gapAtr<.5?'small':z.gapAtr<1?'medium':'large'));
 if(opt.approach)labels.push('approach '+(z.approachAtr===null?'unknown':z.approachAtr<0?'away':z.approachAtr<1?'gradual':'fast'));
 if(opt.reactionCandle)labels.push('close '+(z.reactionCloseRange===null?'unknown':(z.direction===1?z.reactionCloseRange>=.5:z.reactionCloseRange<=.5)?'favourable half':'opposite half'));
 if(opt.age)labels.push('age '+(z.age<=20?'0–20 bars':'>20 bars'));
 return {key:labels.join('|'),label:labels.join(' · ')};
}
export function summarizeClusters(zones:QuickZone[],mode:ClusterMode,opt:ClusterDimensions):Cluster[]{
 const groups=new Map<string,Cluster>();
 for(const z of zones){const identity=clusterKey(z,opt);if(!identity)continue;let g=groups.get(identity.key);if(!g){g={...identity,resolved:0,wins:0,losses:0,netR:0,excluded:0,open:0,noSignal:0,zones:0};groups.set(identity.key,g)}g.zones++;
  const v:Scenario|null=mode==='touch'?z.touchScenario:z.confirmationScenario;if(!v){g.open++;continue;}
  if((v.outcome==='win'||v.outcome==='loss')&&v.netR!==null&&Number.isFinite(v.netR)){g.resolved++;if(v.outcome==='win')g.wins++;else g.losses++;g.netR+=v.netR;}
  else if(v.outcome==='no-confirmation')g.noSignal++;else if(v.outcome==='open'||v.outcome==='waiting')g.open++;else g.excluded++;
 }
 return Array.from(groups.values()).sort((a,b)=>b.resolved-a.resolved||b.zones-a.zones||a.label.localeCompare(b.label));
}
