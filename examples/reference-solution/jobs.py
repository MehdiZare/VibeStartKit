"""Reference solution for the in-memory duplicate-job exercise only."""


class JobLedger:
    def __init__(self) -> None:
        self.jobs: list[tuple[str, str]] = []
        self._seen: set[str] = set()

    def record(self, job_id: str, payload: str) -> bool:
        if job_id in self._seen:
            return False
        self.jobs.append((job_id, payload))
        self._seen.add(job_id)
        return True

    @property
    def count(self) -> int:
        return len(self.jobs)
