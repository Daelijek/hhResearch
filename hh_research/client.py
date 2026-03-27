import re
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

import requests

HH_API_BASE = "https://api.hh.ru"


@dataclass(frozen=True)
class VacancyRef:
    vacancy_id: str


def parse_vacancy_id(s: str) -> str:
    s = s.strip()
    if not s:
        raise ValueError("empty input")

    m = re.search(r"/vacancy/(\d+)", s)
    if m:
        return m.group(1)

    m2 = re.fullmatch(r"\d+", s)
    if m2:
        return s

    raise ValueError(f"Can't extract vacancy id from: {s}")


def refs_from_lines(lines: List[str]) -> List[VacancyRef]:
    out: List[VacancyRef] = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        out.append(VacancyRef(vacancy_id=parse_vacancy_id(s)))
    return out


def load_manual_refs(path: str) -> List[VacancyRef]:
    with open(path, "r", encoding="utf-8") as f:
        return refs_from_lines(f.readlines())


def dedupe_vacancy_refs_preserve_order(refs: List[VacancyRef]) -> Tuple[List[VacancyRef], int]:
    seen: set[str] = set()
    out: List[VacancyRef] = []
    for r in refs:
        if r.vacancy_id in seen:
            continue
        seen.add(r.vacancy_id)
        out.append(r)
    skipped = len(refs) - len(out)
    return out, skipped


def _retry_after_seconds(response: Optional[requests.Response], attempt: int) -> float:
    if response is not None:
        ra = response.headers.get("Retry-After")
        if ra:
            try:
                return float(ra)
            except ValueError:
                pass
    return 1.5 * (attempt + 1)


def _is_retryable_requests_error(e: BaseException) -> bool:
    if isinstance(e, (requests.Timeout, requests.ConnectionError)):
        return True
    if isinstance(e, requests.HTTPError):
        r = e.response
        if r is None:
            return True
        if r.status_code == 429:
            return True
        if 500 <= r.status_code <= 599:
            return True
        return False
    return False


def hh_get_json(
    url: str,
    session: requests.Session,
    token: Optional[str],
    timeout_s: int = 30,
) -> dict:
    headers = {
        "User-Agent": "hh-research-script",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = session.get(url, headers=headers, timeout=timeout_s)
    resp.raise_for_status()
    return resp.json()


def search_vacancies(
    session: requests.Session,
    token: Optional[str],
    query: str,
    page: int,
    per_page: int,
) -> List[dict]:
    params = {
        "text": query,
        "page": page,
        "per_page": per_page,
    }
    headers = {"User-Agent": "hh-research-script", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = session.get(f"{HH_API_BASE}/vacancies", params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json().get("items", []) or []


def fetch_vacancy(
    session: requests.Session,
    token: Optional[str],
    vacancy_id: str,
    retries: int = 3,
) -> dict:
    url = f"{HH_API_BASE}/vacancies/{vacancy_id}"
    last_err: Optional[Exception] = None
    for attempt in range(retries):
        try:
            return hh_get_json(url, session, token)
        except requests.RequestException as e:
            last_err = e
            if not _is_retryable_requests_error(e):
                raise
            wait = _retry_after_seconds(getattr(e, "response", None), attempt)
            time.sleep(wait)
    assert last_err is not None
    raise last_err
