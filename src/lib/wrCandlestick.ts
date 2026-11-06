import referenceData from "@/lib/wrCandlestickReferences.json";
import type { Category } from "@/lib/candlestickPatterns";

type Reference = { title: string; anchor: string; classification: string; charts: {url: string; alt: string}[] };
const references: Record<string, Reference> = referenceData;
// One article section can cover both directional cards. This avoids duplicate cards.
const sections: Record<string, number> = {
  "Hammer":1,"Shooting Star":2,"Bullish Engulfing":3,"Morning Star":4,"Evening Star":5,"Bullish Harami":6,"Bearish Harami":6,"Hanging Man":7,"Doji":8,"Pin Bar":9,"Bullish Mat Hold":10,"Gap Up / Gap Down":11,"Tri Star":12,"Tweezer Top":13,"Tweezer Bottom":13,"Belt Hold":14,"Bullish Abandoned Baby":15,"Bearish Abandoned Baby":15,"Bullish Kicker":16,"Bearish Kicker":16,"Three Outside Up":17,"Three Outside Down":17,"Three Inside Up":18,"Three Inside Down":18,"Piercing Line":19,"Dark Cloud Cover":20,"Three Black Crows":21,"Rising Three Methods":22,"Falling Three Methods":23,"Tasuki Gap":24,"Inside Bar":25,"Outside Bar":26,"Bullish Spinning Top":27,"Bearish Spinning Top":27,"Popgun":28,"Shaven Head":29,"Shaven Bottom":30,"High Wave":31,"Separating Lines":32,"On Neck":33,"In Neck":34,"Breakaway":35,"Concealing Baby Swallow":36,"Homing Pigeon":37,"Ladder Bottom":38,"Ladder Top":39,"Matching High":40,"Matching Low":41,"Meeting Lines":42,"Bullish Side by Side White Lines":43,"Bullish Stick Sandwich":44,"Three Line Strike":45,"Unique Three River Bottom":46,"Three Stars in the South":47,"Advanced Block":48,"Deliberation":49,"Identical Three Crows":50,
};
export function getWrReference(name: string, category: Category) {
  const number = sections[name];
  if (!number) return null;
  const entry = references[String(number)];
  // Some article sections illustrate only the opposite direction; don't pass off
  // a bearish market example as a bullish one (or vice versa).
  const charts = entry.charts.filter(chart => {
    const text = chart.alt.toLowerCase();
    if (name === "Bullish Harami" && !text.includes("bullish")) return false;
    if (name === "Bearish Harami" && !text.includes("bearish")) return false;
    if (name === "Three Inside Up" && !text.includes("three inside up")) return false;
    if (name === "Three Inside Down" && !text.includes("three inside down")) return false;
    if (category === "bullish" && /bearish/.test(text) && !/bullish/.test(text)) return false;
    if (category === "bearish" && /bullish/.test(text) && !/bearish/.test(text)) return false;
    return true;
  });
  return { ...entry, charts, url: `https://wrtrading.com/candlestick-patterns/#${entry.anchor}` };
}

// Concise paraphrases of selected examples, not mechanical trade instructions.
export const ARTICLE_SETUPS: Record<string, string[]> = {
  "Bullish Harami": ["Find a small bullish body inside a larger bearish body after a decline.", "The article suggests waiting for a subsequent close above the pattern before considering a long entry.", "Its example places a stop below the second candle’s low and considers the next resistance as a target."],
  "Bearish Harami": ["Find a small bearish body inside a larger bullish body after a rise.", "The article suggests waiting for a subsequent close below the pattern before considering a short entry.", "Its example places a stop above the second candle’s high and considers the next support as a target."],
  "Hammer": ["Look for the candle after a decline.", "The article’s example waits for a later close above the hammer high before considering a long.", "It places the stop below the wick and considers the next resistance as a target."],
  "Hanging Man": ["Look for the candle after an advance.", "The article’s example waits for a later close below the candle low before considering a short.", "It places the stop above the high and considers the next support as a target."],
  "Shooting Star": ["Look for the candle after an advance.", "The article’s example waits for a close below the pattern low before considering a short.", "It places the stop above the wick and considers the next support as a target."],
  "Bullish Engulfing": ["Look for a bullish body engulfing the prior bearish body after a decline.", "The article’s example waits for a close above the engulfing candle’s high before considering a long.", "It places a stop below the engulfing candle’s low and considers the next resistance as a target."],
};
