const fs = require('fs');
const ts = require('typescript');
const Module = require('module');

const source = fs.readFileSync('src/lib/sniperReplay.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new Module('sniperReplay');
m._compile(compiled, 'sniperReplay.js');

const bars = JSON.parse(fs.readFileSync('sample_bars.json', 'utf8'));
console.log('Loaded sample bars:', bars.length);

const strategies = ['institutional_triad', 'vwma_crossover', 'fvg_displacement', 'rapid_internal_scalp'];

for (const strat of strategies) {
  const settings = {
    ...m.exports.sniperDefaults,
    strategyProfile: strat,
    initialBalance: 100,
    riskPct: 1.0,
    sessionFilter: 'all_sessions', // check with all_sessions first
  };

  let state = m.exports.initSniperSimulation(15, bars, settings);
  let proposalCount = 0;
  for (let i = 15; i < bars.length - 1; i++) {
    state = m.exports.stepSniperSimulation(state, bars, settings);
    if (state.activePlan) proposalCount++;
  }
  console.log(`Strategy: ${strat} | Active Plan Steps: ${proposalCount} | Completed Trades: ${state.outcomes.length} | Status: ${state.status}`);
}
