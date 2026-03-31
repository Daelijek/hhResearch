import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

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
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout_s: float = 30.0,
    retries: int = 3,
) -> dict:
    headers: Dict[str, str] = {
        "User-Agent": "hh-research-script",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_err: Optional[Exception] = None
    for attempt in range(retries):
        try:
            resp = session.get(url, params=params, headers=headers, timeout=timeout_s)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            last_err = e
            if attempt >= retries - 1 or not _is_retryable_requests_error(e):
                raise
            wait = _retry_after_seconds(getattr(e, "response", None), attempt)
            time.sleep(wait)

    # retries=0 не ожидаем, но если передадут — пусть упадет с понятной ошибкой
    assert last_err is not None
    raise last_err


def search_vacancies(
    session: requests.Session,
    token: Optional[str],
    query: str,
    page: int,
    per_page: int,
    employer_id: Optional[str] = None,
    area: Optional[str] = None,
    experience: Optional[str] = None,
    period: Optional[int] = None,
    timeout_s: float = 30.0,
    retries: int = 3,
) -> List[dict]:
    params = {
        "text": query,
        "page": page,
        "per_page": per_page,
    }
    if employer_id:
        params["employer_id"] = employer_id
    if area:
        params["area"] = area
    if experience:
        params["experience"] = experience
    if period is not None:
        params["period"] = int(period)
    data = hh_get_json(
        f"{HH_API_BASE}/vacancies",
        session=session,
        token=token,
        params=params,
        timeout_s=timeout_s,
        retries=retries,
    )
    return data.get("items", []) or []


def search_employers(
    session: requests.Session,
    token: Optional[str],
    text: str,
    *,
    area: Optional[str] = None,
    only_with_vacancies: bool = True,
    page: int = 0,
    per_page: int = 20,
    timeout_s: float = 30.0,
    retries: int = 3,
) -> dict:
    """
    GET /employers
    https://api.hh.ru/openapi/redoc#tag/Rabotodateli/operation/get-employers
    """
    params: Dict[str, Any] = {
        "text": text,
        "page": page,
        "per_page": per_page,
        "only_with_vacancies": "true" if only_with_vacancies else "false",
    }
    if area:
        params["area"] = area
    return hh_get_json(
        f"{HH_API_BASE}/employers",
        session=session,
        token=token,
        params=params,
        timeout_s=timeout_s,
        retries=retries,
    )


def fetch_dictionaries(
    session: requests.Session,
    token: Optional[str],
    *,
    timeout_s: float = 30.0,
    retries: int = 3,
) -> dict:
    return hh_get_json(
        f"{HH_API_BASE}/dictionaries",
        session=session,
        token=token,
        params=None,
        timeout_s=timeout_s,
        retries=retries,
    )


def fetch_areas(
    session: requests.Session,
    token: Optional[str],
    *,
    timeout_s: float = 30.0,
    retries: int = 3,
) -> list:
    data = hh_get_json(
        f"{HH_API_BASE}/areas",
        session=session,
        token=token,
        params=None,
        timeout_s=timeout_s,
        retries=retries,
    )
    return data if isinstance(data, list) else []

def fetch_vacancy(
    session: requests.Session,
    token: Optional[str],
    vacancy_id: str,
    retries: int = 3,
) -> dict:
    url = f"{HH_API_BASE}/vacancies/{vacancy_id}"
    return hh_get_json(url, session=session, token=token, timeout_s=30.0, retries=retries)
