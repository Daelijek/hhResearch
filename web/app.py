import os
import json
import base64
from datetime import datetime
from io import BytesIO
import logging
from typing import Annotated, Optional
from uuid import uuid4

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from hh_research.client import (
    dedupe_vacancy_refs_preserve_order,
    refs_from_lines,
    search_employers,
    fetch_dictionaries,
    fetch_areas,
)
from hh_research.job_queue import (
    enqueue_export_job,
    get_job_result_path,
    get_job_status,
)
from hh_research.pipeline import collect_refs_auto, export_refs_to_xlsx_bytes, compute_summary_for_refs

MAX_VACANCIES_PER_REQUEST = int(os.environ.get("HH_EXPORT_MAX_VACANCIES", "100"))

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("hhResearchAPI")


def _parse_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


def _cors_origin_regex() -> Optional[str]:
    """Optional regex for origins not listed in CORS_ORIGINS (e.g. all *.vercel.app previews)."""
    raw = os.environ.get("CORS_ORIGIN_REGEX", "").strip()
    if raw:
        return raw

    # Dev convenience: allow localhost/127.0.0.1 on any port.
    # Enable explicitly to avoid widening CORS in production.
    if os.environ.get("DEV_CORS_ANY_LOCALHOST", "").strip() in ("1", "true", "True", "yes", "YES"):
        return r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    return None


def _effective_token(body_token: Optional[str]) -> Optional[str]:
    return body_token or os.environ.get("HH_TOKEN") or None


def _require_api_key(
    x_api_key: Annotated[Optional[str], Header(alias="X-API-Key")] = None,
) -> None:
    expected = os.environ.get("API_SHARED_KEY")
    if not expected:
        return
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


app = FastAPI(title="hhResearch API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_origin_regex=_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "X-Export-Warnings",
        "X-Export-Summary",
        "X-Request-Id",
    ],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


class ManualExportBody(BaseModel):
    vacancy_ids_or_urls: list[str] = Field(..., min_length=1, max_length=MAX_VACANCIES_PER_REQUEST)
    kw_top_n: int = Field(30, ge=1, le=200)
    kw_max_ngram: int = Field(3, ge=1, le=5)
    token: Optional[str] = None
    sleep_s: float = Field(0.2, ge=0, le=5)


class AutoExportBody(BaseModel):
    queries: list[str] = Field(..., min_length=1, max_length=50)
    pages: int = Field(2, ge=1, le=20)
    per_page: int = Field(100, ge=1, le=100)
    kw_top_n: int = Field(30, ge=1, le=200)
    kw_max_ngram: int = Field(3, ge=1, le=5)
    token: Optional[str] = None
    sleep_s: float = Field(0.2, ge=0, le=5)
    search_sleep_s: float = Field(0.2, ge=0, le=5)
    employer_id: Optional[str] = None
    area: Optional[str] = None
    experience: Optional[str] = None
    period: Optional[int] = Field(None, ge=1, le=30)


class SummaryAutoBody(BaseModel):
    queries: list[str] = Field(..., min_length=1, max_length=50)
    pages: int = Field(2, ge=1, le=20)
    per_page: int = Field(100, ge=1, le=100)
    kw_top_n: int = Field(30, ge=1, le=200)
    kw_max_ngram: int = Field(3, ge=1, le=5)
    token: Optional[str] = None
    sleep_s: float = Field(0.2, ge=0, le=5)
    search_sleep_s: float = Field(0.2, ge=0, le=5)
    employer_id: Optional[str] = None
    area: Optional[str] = None
    experience: Optional[str] = None
    period: Optional[int] = Field(None, ge=1, le=30)


def _attachment_filename(prefix: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{ts}.xlsx"


@app.post("/api/v1/export/manual")
def export_manual(
    body: ManualExportBody,
    _: Annotated[None, Depends(_require_api_key)],
) -> StreamingResponse:
    request_id = str(uuid4())
    try:
        raw_refs = refs_from_lines(body.vacancy_ids_or_urls)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_vacancy_ref",
                "message": str(e),
            },
            headers={"X-Request-Id": request_id},
        )

    refs, duplicates_removed = dedupe_vacancy_refs_preserve_order(raw_refs)
    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "too_many_vacancies",
                "message": (
                    f"After deduplication, {len(refs)} vacancies exceed max {MAX_VACANCIES_PER_REQUEST}."
                ),
                "max": MAX_VACANCIES_PER_REQUEST,
                "after_dedup_count": len(refs),
            },
            headers={"X-Request-Id": request_id},
        )

    token = _effective_token(body.token)
    try:
        data, _processed, errors, summary = export_refs_to_xlsx_bytes(
            refs,
            token=token,
            kw_top_n=body.kw_top_n,
            kw_max_ngram=body.kw_max_ngram,
            sleep_s=body.sleep_s,
        )
    except Exception as e:
        logger.exception("export_manual failed (request_id=%s)", request_id)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "export_failed",
                "message": "Internal error while generating xlsx.",
            },
            headers={"X-Request-Id": request_id},
        ) from e

    summary["dedup"] = {
        "input_count": len(raw_refs),
        "unique_count": len(refs),
        "duplicates_removed": duplicates_removed,
    }
    bio = BytesIO(data)
    bio.seek(0)
    out_headers: dict[str, str] = {
        "X-Request-Id": request_id,
    }
    if errors:
        out_headers["X-Export-Warnings"] = str(len(errors))
    summary_bytes = json.dumps(summary, ensure_ascii=False).encode("utf-8")
    out_headers["X-Export-Summary"] = base64.urlsafe_b64encode(summary_bytes).decode("ascii").rstrip("=")
    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{_attachment_filename("hh_keyskills_manual")}"',
            **out_headers,
        },
    )


@app.post("/api/v1/export/auto")
def export_auto(
    body: AutoExportBody,
    _: Annotated[None, Depends(_require_api_key)],
) -> StreamingResponse:
    request_id = str(uuid4())
    session = requests.Session()
    token = _effective_token(body.token)
    try:
        refs, raw_id_hits = collect_refs_auto(
            session=session,
            token=token,
            queries=body.queries,
            pages=body.pages,
            per_page=body.per_page,
            dedupe_vacancies=True,
            search_sleep_s=body.search_sleep_s,
            employer_id=body.employer_id,
            area=body.area,
            experience=body.experience,
            period=body.period,
        )
    except Exception as e:
        logger.exception("collect_refs_auto failed (request_id=%s)", request_id)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "search_failed",
                "message": "Internal error while searching vacancies.",
            },
            headers={"X-Request-Id": request_id},
        ) from e

    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "too_many_vacancies",
                "message": (
                    f"Search returned {len(refs)} vacancies; max per request is {MAX_VACANCIES_PER_REQUEST}. "
                    "Reduce pages, per_page, or queries."
                ),
                "max": MAX_VACANCIES_PER_REQUEST,
                "search_count": len(refs),
            },
            headers={"X-Request-Id": request_id},
        )

    try:
        data, _processed, errors, summary = export_refs_to_xlsx_bytes(
            refs,
            token=token,
            kw_top_n=body.kw_top_n,
            kw_max_ngram=body.kw_max_ngram,
            sleep_s=body.sleep_s,
        )
    except Exception as e:
        logger.exception("export_auto failed (request_id=%s)", request_id)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "export_failed",
                "message": "Internal error while generating xlsx.",
            },
            headers={"X-Request-Id": request_id},
        ) from e

    summary["dedup"] = {
        "input_count": raw_id_hits,
        "unique_count": len(refs),
        "duplicates_removed": max(0, raw_id_hits - len(refs)),
    }
    bio = BytesIO(data)
    bio.seek(0)
    out_headers: dict[str, str] = {
        "X-Request-Id": request_id,
    }
    if errors:
        out_headers["X-Export-Warnings"] = str(len(errors))
    summary_bytes = json.dumps(summary, ensure_ascii=False).encode("utf-8")
    out_headers["X-Export-Summary"] = base64.urlsafe_b64encode(summary_bytes).decode("ascii").rstrip("=")
    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{_attachment_filename("hh_keyskills_auto")}"',
            **out_headers,
        },
    )


@app.get("/api/v1/meta/dictionaries")
def meta_dictionaries(
    token: Optional[str] = None,
    _: Annotated[None, Depends(_require_api_key)] = None,
) -> dict:
    session = requests.Session()
    eff = _effective_token(token)
    return fetch_dictionaries(session=session, token=eff)


@app.get("/api/v1/meta/areas")
def meta_areas(
    token: Optional[str] = None,
    _: Annotated[None, Depends(_require_api_key)] = None,
) -> list:
    session = requests.Session()
    eff = _effective_token(token)
    return fetch_areas(session=session, token=eff)


@app.get("/api/v1/meta/employers")
def meta_employers(
    text: str,
    area: Optional[str] = None,
    token: Optional[str] = None,
    _: Annotated[None, Depends(_require_api_key)] = None,
) -> dict:
    session = requests.Session()
    eff = _effective_token(token)
    return search_employers(session=session, token=eff, text=text, area=area, only_with_vacancies=True)


@app.post("/api/v1/summary/auto")
def summary_auto(
    body: SummaryAutoBody,
    _: Annotated[None, Depends(_require_api_key)],
    response: Response,
) -> dict:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    session = requests.Session()
    token = _effective_token(body.token)

    try:
        refs, raw_id_hits = collect_refs_auto(
            session=session,
            token=token,
            queries=body.queries,
            pages=body.pages,
            per_page=body.per_page,
            dedupe_vacancies=True,
            search_sleep_s=body.search_sleep_s,
            employer_id=body.employer_id,
            area=body.area,
            experience=body.experience,
            period=body.period,
        )
    except Exception as e:
        logger.exception("summary_auto search failed (request_id=%s)", request_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "search_failed", "message": "Internal error while searching vacancies."},
            headers={"X-Request-Id": request_id},
        ) from e

    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "too_many_vacancies",
                "message": (
                    f"Search returned {len(refs)} vacancies; max per request is {MAX_VACANCIES_PER_REQUEST}. "
                    "Reduce pages, per_page, or queries."
                ),
                "max": MAX_VACANCIES_PER_REQUEST,
                "search_count": len(refs),
            },
            headers={"X-Request-Id": request_id},
        )

    errors, summary = compute_summary_for_refs(
        refs=refs,
        session=session,
        token=token,
        kw_top_n=body.kw_top_n,
        kw_max_ngram=body.kw_max_ngram,
        sleep_s=body.sleep_s,
    )
    if errors:
        response.headers["X-Export-Warnings"] = str(len(errors))

    summary["dedup"] = {
        "input_count": raw_id_hits,
        "unique_count": len(refs),
        "duplicates_removed": max(0, raw_id_hits - len(refs)),
    }
    return {"summary": summary}


@app.post("/api/v1/summary/auto/async")
def summary_auto_async(
    body: SummaryAutoBody,
    response: Response,
    _: Annotated[None, Depends(_require_api_key)],
) -> dict:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    token = _effective_token(body.token)
    payload = {
        "queries": body.queries,
        "pages": body.pages,
        "per_page": body.per_page,
        "kw_top_n": body.kw_top_n,
        "kw_max_ngram": body.kw_max_ngram,
        "sleep_s": body.sleep_s,
        "search_sleep_s": body.search_sleep_s,
        "employer_id": body.employer_id,
        "area": body.area,
        "experience": body.experience,
        "period": body.period,
        "token": token,
    }
    job_id = enqueue_export_job("summary_auto", payload)
    return {"job_id": job_id}


@app.post("/api/v1/export/manual/async")
def export_manual_async(
    body: ManualExportBody,
    response: Response,
    _: Annotated[None, Depends(_require_api_key)],
) -> dict:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    try:
        raw_refs = refs_from_lines(body.vacancy_ids_or_urls)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_vacancy_ref", "message": str(e)},
            headers={"X-Request-Id": request_id},
        ) from e

    refs, duplicates_removed = dedupe_vacancy_refs_preserve_order(raw_refs)
    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "too_many_vacancies",
                "message": (
                    f"After deduplication, {len(refs)} vacancies exceed max {MAX_VACANCIES_PER_REQUEST}."
                ),
                "max": MAX_VACANCIES_PER_REQUEST,
                "after_dedup_count": len(refs),
            },
            headers={"X-Request-Id": request_id},
        )

    token = _effective_token(body.token)
    payload = {
        "ref_ids": [r.vacancy_id for r in refs],
        "input_count": len(raw_refs),
        "unique_count": len(refs),
        "duplicates_removed": duplicates_removed,
        "kw_top_n": body.kw_top_n,
        "kw_max_ngram": body.kw_max_ngram,
        "sleep_s": body.sleep_s,
        "token": token,
    }

    job_id = enqueue_export_job("manual", payload)
    return {"job_id": job_id}


@app.post("/api/v1/export/auto/async")
def export_auto_async(
    body: AutoExportBody,
    response: Response,
    _: Annotated[None, Depends(_require_api_key)],
) -> dict:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    token = _effective_token(body.token)
    payload = {
        "queries": body.queries,
        "pages": body.pages,
        "per_page": body.per_page,
        "kw_top_n": body.kw_top_n,
        "kw_max_ngram": body.kw_max_ngram,
        "sleep_s": body.sleep_s,
        "search_sleep_s": body.search_sleep_s,
        "token": token,
    }
    job_id = enqueue_export_job("auto", payload)
    return {"job_id": job_id}


@app.get("/api/v1/jobs/{job_id}")
def job_status(job_id: str, response: Response) -> dict:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    st = get_job_status(job_id)
    if st is None:
        raise HTTPException(status_code=404, detail={"error": "job_not_found", "job_id": job_id})

    download_url = (
        f"/api/v1/jobs/{job_id}/download" if st.get("status") == "succeeded" else None
    )
    return {
        "job_id": job_id,
        "status": st.get("status"),
        "kind": st.get("kind"),
        "progress_done": st.get("progress_done"),
        "progress_total": st.get("progress_total"),
        "processed": st.get("processed"),
        "warnings_count": st.get("warnings_count"),
        "errors_sample": st.get("errors_sample"),
        "summary": st.get("summary"),
        "download_url": download_url,
    }


@app.get("/api/v1/jobs/{job_id}/download")
def job_download(job_id: str, response: Response) -> FileResponse:
    request_id = str(uuid4())
    response.headers["X-Request-Id"] = request_id

    try:
        path = get_job_result_path(job_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail={"error": "job_result_not_found", "job_id": job_id})
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{job_id}.xlsx",
        headers={"X-Request-Id": request_id},
    )
