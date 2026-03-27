import os
import json
import base64
from datetime import datetime
from io import BytesIO
from typing import Annotated, Optional

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from hh_research.client import dedupe_vacancy_refs_preserve_order, refs_from_lines
from hh_research.pipeline import collect_refs_auto, export_refs_to_xlsx_bytes

MAX_VACANCIES_PER_REQUEST = int(os.environ.get("HH_EXPORT_MAX_VACANCIES", "100"))


def _parse_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Export-Warnings", "X-Export-Summary"],
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


def _attachment_filename(prefix: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{ts}.xlsx"


@app.post("/api/v1/export/manual")
def export_manual(
    body: ManualExportBody,
    _: Annotated[None, Depends(_require_api_key)],
) -> StreamingResponse:
    raw_refs = refs_from_lines(body.vacancy_ids_or_urls)
    refs, duplicates_removed = dedupe_vacancy_refs_preserve_order(raw_refs)
    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail=f"After deduplication, {len(refs)} vacancies exceed max {MAX_VACANCIES_PER_REQUEST}.",
        )
    token = _effective_token(body.token)
    data, _processed, errors, summary = export_refs_to_xlsx_bytes(
        refs,
        token=token,
        kw_top_n=body.kw_top_n,
        kw_max_ngram=body.kw_max_ngram,
        sleep_s=body.sleep_s,
    )
    summary["dedup"] = {
        "input_count": len(raw_refs),
        "unique_count": len(refs),
        "duplicates_removed": duplicates_removed,
    }
    bio = BytesIO(data)
    bio.seek(0)
    out_headers: dict[str, str] = {}
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
    session = requests.Session()
    token = _effective_token(body.token)
    refs, raw_id_hits = collect_refs_auto(
        session=session,
        token=token,
        queries=body.queries,
        pages=body.pages,
        per_page=body.per_page,
        dedupe_vacancies=True,
        search_sleep_s=body.search_sleep_s,
    )
    if len(refs) > MAX_VACANCIES_PER_REQUEST:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Search returned {len(refs)} vacancies; max per request is {MAX_VACANCIES_PER_REQUEST}. "
                "Reduce pages, per_page, or queries."
            ),
        )
    data, _processed, errors, summary = export_refs_to_xlsx_bytes(
        refs,
        token=token,
        kw_top_n=body.kw_top_n,
        kw_max_ngram=body.kw_max_ngram,
        sleep_s=body.sleep_s,
    )
    summary["dedup"] = {
        "input_count": raw_id_hits,
        "unique_count": len(refs),
        "duplicates_removed": max(0, raw_id_hits - len(refs)),
    }
    bio = BytesIO(data)
    bio.seek(0)
    out_headers: dict[str, str] = {}
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
