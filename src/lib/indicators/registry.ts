import { fvgReactionInputs, fvgReactionScript } from './fvg-reaction';
import { keyLevelsInputs, keyLevelsScript } from './key-levels';
import { macroTrendInputs, macroTrendScript } from './macro-trend';
import { killzonesInputs, killzonesScript } from './killzones';
import { newsFilterInputs, newsFilterScript } from './news-filter';
import { noWickInputs, noWickScript } from './no-wick';
import { marketRegimeInputs, marketRegimeScript } from './market-regime';
import { vwmaCrossoverInputs, vwmaCrossoverScript } from './vwma-crossover';
import type { IndicatorInput, IndicatorProgram } from '@/components/IndicatorEditor';

export interface IndicatorDefinition {
  id: string;
  name: string;
  tag: string;
  color: string;
  description: string;
  inputs: IndicatorInput[];
  script: string;
}

export const INDICATOR_REGISTRY: IndicatorDefinition[] = [
  {
    id: 'fvg-reaction',
    name: 'FVG Reaction Study',
    tag: 'FVG & MSS',
    color: '#a855f7',
    description: '3-candle FVG detection with liquidity sweep, displacement MSS, and BUY/SELL entry tags.',
    inputs: fvgReactionInputs as IndicatorInput[],
    script: fvgReactionScript
  },
  {
    id: 'key-levels',
    name: 'Key Levels & Order Blocks',
    tag: 'Key Levels (OB/OTE)',
    color: '#38bdf8',
    description: 'Swing BSL/SSL liquidity pools, MSS lines, 0.705 OTE Retracement bands, and Order Blocks.',
    inputs: keyLevelsInputs as IndicatorInput[],
    script: keyLevelsScript
  },
  {
    id: 'macro-trend',
    name: 'Macro Trend Ribbon',
    tag: '50/200 EMA',
    color: '#10b981',
    description: '50 EMA and 200 EMA institutional trend regime ribbon to filter counter-trend signals.',
    inputs: macroTrendInputs as IndicatorInput[],
    script: macroTrendScript
  },
  {
    id: 'market-regime',
    name: 'Market Regime (Wyckoff)',
    tag: 'Accum/Dist/Trend',
    color: '#22d3ee',
    description: 'Classifies price action into Wyckoff phases: Accumulation, Markup, Distribution, Markdown, Consolidation.',
    inputs: marketRegimeInputs as IndicatorInput[],
    script: marketRegimeScript
  },
  {
    id: 'vwma-crossover',
    name: 'VWMA × EMA Crossover',
    tag: 'Volume Divergence',
    color: '#eab308',
    description: 'Price-range/body-weighted crossover and divergence; not actual traded volume. Optional experimental XAU M15 zone scores are unvalidated and not trading advice.',
    inputs: vwmaCrossoverInputs as IndicatorInput[],
    script: vwmaCrossoverScript
  },
  {
    id: 'killzones',
    name: 'ICT Killzones',
    tag: 'London/NY Sessions',
    color: '#fbbf24',
    description: 'Asian Range (00-06 UTC), London Open (07-10 UTC), and New York Open (12:30-15:30 UTC) session boxes.',
    inputs: killzonesInputs as IndicatorInput[],
    script: killzonesScript
  },
  {
    id: 'news-filter',
    name: 'News Shock & CPI/PPI Filter',
    tag: 'CPI/PPI/FOMC',
    color: '#f43f5e',
    description: 'Flags abnormal whipsaw bars during CPI, PPI, NFP, and FOMC releases and marks blackout zones.',
    inputs: newsFilterInputs as IndicatorInput[],
    script: newsFilterScript
  },
  {
    id: 'no-wick',
    name: 'No-Wick Structure',
    tag: 'No-Wick',
    color: '#94a3b8',
    description: 'Original algorithmic market structure and breaker pivot study.',
    inputs: noWickInputs as IndicatorInput[],
    script: noWickScript
  }
];

export function createDefaultProgram(def: IndicatorDefinition): IndicatorProgram {
  const vals: Record<string, string | number | boolean> = {};
  for (const inp of def.inputs) {
    vals[inp.id] = inp.defval;
  }
  return {
    script: def.script,
    inputs: vals,
    revision: Date.now()
  };
}
