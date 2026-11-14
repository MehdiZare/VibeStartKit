"""Intentionally broken teaching example. See ISSUE.md before changing it."""


class JobLedger:
    def __init__(self) -> None:
        self.jobs: list[tuple[str, str]] = []

    def record(self, job_id: str, payload: str) -> bool:
        self.jobs.append((job_id, payload))
        return True

    @property
    def count(self) -> int:
        return len(self.jobs)
