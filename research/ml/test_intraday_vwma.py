import unittest
from datetime import datetime,timezone
from intraday_vwma_2023_2025 import local_minutes,CUTOFF

class IntradayCutoffTest(unittest.TestCase):
    def test_new_york_cutoff_tracks_daylight_saving(self):
        winter=datetime(2024,1,2,17,45,tzinfo=timezone.utc).timestamp()
        summer=datetime(2024,7,2,16,45,tzinfo=timezone.utc).timestamp()
        self.assertEqual(local_minutes(winter),CUTOFF)
        self.assertEqual(local_minutes(summer),CUTOFF)
        self.assertEqual(local_minutes(winter-900),CUTOFF-15)
        self.assertEqual(local_minutes(summer-900),CUTOFF-15)

if __name__=='__main__':unittest.main()
