import io
import os
import time
from datetime import datetime
from typing import Callable, List, Optional, Tuple

import requests
from openpyxl import load_workbook

from hh_research.client import VacancyRef, fetch_vacancy, search_vacancies
from hh_research.excel_export import (
    create_export_workbook,
    find_next_row_after_max,
    write_vacancy_row_aligned,
)


def build_default_out_path(
    project_dir: str,
    out_dir: str,
    mode: str,
    out_prefix: str,
    template_basename: str,
) -> str:
    os.makedirs(os.path.join(project_dir, out_dir), exist_ok=True)
    _, ext = os.path.splitext(template_basename)
    if not ext:
        ext = ".xlsx"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_name = f"{out_prefix}_{mode}_filled_{timestamp}{ext}"
    return os.path.join(project_dir, out_dir, out_name)


def collect_refs_auto(
    session: requests.Session,
    token: Optional[str],
    queries: List[str],
    pages: int,
    per_page: int,
    dedupe_vacancies: bool,
    search_sleep_s: float,
) -> List[VacancyRef]:
    seen_ids: set[str] = set()
    vacancy_ids_to_process: List[VacancyRef] = []
    for q in queries:
        for page in range(pages):
            items = search_vacancies(session, token, q, page=page, per_page=per_page)
            for it in items:
                vid = str(it.get("id") or "").strip()
                if not vid:
                    continue
                if dedupe_vacancies:
                    if vid in seen_ids:
                        continue
                    seen_ids.add(vid)
                vacancy_ids_to_process.append(VacancyRef(vacancy_id=vid))
            if search_sleep_s > 0:
                time.sleep(search_sleep_s)
    return vacancy_ids_to_process


def run_export_on_worksheet(
    ws,
    refs: List[VacancyRef],
    session: requests.Session,
    token: Optional[str],
    next_row: int,
    col_title: int,
    col_keywords: int,
    col_skills: int,
    col_id: int,
    col_link: int,
    kw_top_n: int,
    kw_max_ngram: int,
    sleep_s: float,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> Tuple[int, int, List[str]]:
    """
    Fetches each vacancy and appends blocks to ws starting at next_row.
    Returns (processed_count, next_row_after_last_block, list of error messages per failed id).
    """
    total = len(refs)
    processed = 0
    errors: List[str] = []
    row = next_row

    for ref in refs:
        vid = ref.vacancy_id
        try:
            vac = fetch_vacancy(session, token, vid)
        except Exception as e:
            errors.append(f"{vid}: {e}")
            continue

        row = write_vacancy_row_aligned(
            ws=ws,
            vac=vac,
            start_row=row,
            col_title=col_title,
            col_keywords=col_keywords,
            col_skills=col_skills,
            col_id=col_id,
            col_link=col_link,
            kw_top_n=kw_top_n,
            kw_max_ngram=kw_max_ngram,
        )
        processed += 1
        if sleep_s > 0:
            time.sleep(sleep_s)
        if on_progress and processed % 10 == 0:
            on_progress(processed, total)

    return processed, row, errors


def export_refs_to_xlsx_bytes(
    refs: List[VacancyRef],
    token: Optional[str],
    kw_top_n: int = 30,
    kw_max_ngram: int = 3,
    sleep_s: float = 0.2,
    col_title: int = 1,
    col_keywords: int = 2,
    col_skills: int = 3,
    col_id: int = 4,
    col_link: int = 5,
    start_row: int = 2,
    sheet_name: str = "Sheet1",
) -> Tuple[bytes, int, List[str]]:
    session = requests.Session()
    wb, ws = create_export_workbook(sheet_name=sheet_name)
    processed, _, errors = run_export_on_worksheet(
        ws=ws,
        refs=refs,
        session=session,
        token=token,
        next_row=start_row,
        col_title=col_title,
        col_keywords=col_keywords,
        col_skills=col_skills,
        col_id=col_id,
        col_link=col_link,
        kw_top_n=kw_top_n,
        kw_max_ngram=kw_max_ngram,
        sleep_s=sleep_s,
    )
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue(), processed, errors


def append_refs_to_template_file(
    excel_path: str,
    sheet_name: str,
    refs: List[VacancyRef],
    token: Optional[str],
    start_row: int,
    col_title: int,
    col_keywords: int,
    col_skills: int,
    col_id: int,
    col_link: int,
    kw_top_n: int,
    kw_max_ngram: int,
    sleep_s: float,
    out_path: str,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> Tuple[int, int, List[str]]:
    wb = load_workbook(excel_path)
    if sheet_name not in wb.sheetnames:
        raise ValueError(f"Sheet '{sheet_name}' not found. Available: {wb.sheetnames}")
    ws = wb[sheet_name]
    next_row = max(
        find_next_row_after_max(ws, col_keywords, start_row),
        find_next_row_after_max(ws, col_skills, start_row),
        find_next_row_after_max(ws, col_id, start_row),
    )
    session = requests.Session()
    processed, next_row_after, errors = run_export_on_worksheet(
        ws=ws,
        refs=refs,
        session=session,
        token=token,
        next_row=next_row,
        col_title=col_title,
        col_keywords=col_keywords,
        col_skills=col_skills,
        col_id=col_id,
        col_link=col_link,
        kw_top_n=kw_top_n,
        kw_max_ngram=kw_max_ngram,
        sleep_s=sleep_s,
        on_progress=on_progress,
    )
    wb.save(out_path)
    return processed, next_row_after, errors
