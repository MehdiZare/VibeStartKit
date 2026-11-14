import unittest

from jobs import JobLedger


class JobLedgerTests(unittest.TestCase):
    def test_first_delivery_is_recorded(self) -> None:
        ledger = JobLedger()
        self.assertTrue(ledger.record("job-1", "build"))
        self.assertEqual(ledger.jobs, [("job-1", "build")])
        self.assertEqual(ledger.count, 1)

    def test_duplicate_delivery_is_counted_once(self) -> None:
        ledger = JobLedger()
        ledger.record("job-1", "build")
        self.assertFalse(ledger.record("job-1", "build"))
        self.assertEqual(ledger.count, 1)
        self.assertEqual(ledger.jobs, [("job-1", "build")])

    def test_distinct_jobs_with_same_payload_are_preserved(self) -> None:
        ledger = JobLedger()
        self.assertTrue(ledger.record("job-1", "build"))
        self.assertTrue(ledger.record("job-2", "build"))
        self.assertEqual(ledger.count, 2)

    def test_replay_does_not_replace_original_payload(self) -> None:
        ledger = JobLedger()
        ledger.record("job-1", "original")
        self.assertFalse(ledger.record("job-1", "changed"))
        self.assertEqual(ledger.jobs, [("job-1", "original")])


if __name__ == "__main__":
    unittest.main()
