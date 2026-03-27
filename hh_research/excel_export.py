from typing import Tuple, List

from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from hh_research.keywords import extract_keywords_simple, extract_text_from_html


def extract_skills_and_keywords(
    vac: dict,
    kw_top_n: int,
    kw_max_ngram: int,
) -> Tuple[str, str, str, List[str], List[str]]:
    vid = str(vac.get("id") or "").strip()
    title = str(vac.get("name") or "").strip()
    link = vac.get("alternate_url") or vac.get("url") or ""
    link = str(link).strip()
    if not link and vid:
        link = f"https://hh.ru/vacancy/{vid}"

    key_skills = vac.get("key_skills") or []
    skill_names: list[str] = []
    for s in key_skills:
        name = None
        if isinstance(s, dict):
            name = s.get("name")
        elif isinstance(s, str):
            name = s
        if name and str(name).strip():
            skill_names.append(str(name).strip())

    description_html = vac.get("description") or ""
    description_text = extract_text_from_html(description_html)
    keywords = extract_keywords_simple(
        description_text,
        top_n=kw_top_n,
        max_ngram=kw_max_ngram,
    )
    keywords = [str(k).strip() for k in keywords if k and str(k).strip()]

    return title, vid, link, keywords, skill_names


def create_export_workbook(sheet_name: str = "Sheet1") -> Tuple[Workbook, Worksheet]:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.cell(1, 1, "Vacancy Title")
    ws.cell(1, 2, "Key Words")
    ws.cell(1, 3, "Key Skills (...)")
    ws.cell(1, 4, "ID")
    ws.cell(1, 5, "Link")
    return wb, ws


def find_next_row_after_max(ws: Worksheet, col: int, start_row: int = 2) -> int:
    last = start_row - 1
    for r in range(start_row, ws.max_row + 1):
        v = ws.cell(r, col).value
        if v is not None and str(v).strip() != "":
            last = r
    return last + 1


def write_vacancy_row_aligned(
    ws: Worksheet,
    vac: dict,
    start_row: int,
    col_title: int,
    col_keywords: int,
    col_skills: int,
    col_id: int,
    col_link: int,
    kw_top_n: int,
    kw_max_ngram: int,
    *,
    keywords: List[str] | None = None,
    skill_names: List[str] | None = None,
) -> int:
    title, vid, link, computed_keywords, computed_skills = extract_skills_and_keywords(
        vac,
        kw_top_n=kw_top_n,
        kw_max_ngram=kw_max_ngram,
    )
    if keywords is None:
        keywords = computed_keywords
    if skill_names is None:
        skill_names = computed_skills

    max_len = max(len(keywords), len(skill_names), 1)

    for i in range(max_len):
        row = start_row + i

        if i == 0:
            if title:
                ws.cell(row, col_title, title)
            if vid:
                ws.cell(row, col_id, vid)
            if link:
                ws.cell(row, col_link, link)

        if i < len(keywords):
            ws.cell(row, col_keywords, keywords[i])
        if i < len(skill_names):
            ws.cell(row, col_skills, skill_names[i])

    return start_row + max_len
