"""Fixture-free parity for training features and portable score (not a holdout test)."""
import json, math, unittest
import numpy as np
from pathlib import Path
class ScoreParity(unittest.TestCase):
 def test_scored_training_candidates(self):
  p=Path('research/data/research-zones-scored-2021-2025.json')
  if not p.exists():self.skipTest('private training extraction not present')
  zones=json.loads(p.read_text());m=json.loads(Path('research/models/chart-zone-score-2021-2025.json').read_text());self.assertGreater(len(zones),0)
  for z in zones:
   a=float(np.dot((np.array(z['features'])-m['mean'])/m['scale'],m['coef'])+m['intercept']);score=1/(1+math.exp(-a));self.assertAlmostEqual(z['score'],score,places=12);self.assertEqual(z['suggested'],score>=m['threshold'])
if __name__=='__main__':unittest.main()
