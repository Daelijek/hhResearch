from hh_research.client import (
    HH_API_BASE,
    VacancyRef,
    dedupe_vacancy_refs_preserve_order,
    fetch_vacancy,
    hh_get_json,
    load_manual_refs,
    parse_vacancy_id,
    refs_from_lines,
    search_vacancies,
)
from hh_research.excel_export import (
    create_export_workbook,
    find_next_row_after_max,
    write_vacancy_row_aligned,
)
from hh_research.keywords import extract_keywords_simple, extract_text_from_html
from hh_research.pipeline import (
    append_refs_to_template_file,
    build_default_out_path,
    collect_refs_auto,
    export_refs_to_xlsx_bytes,
    run_export_on_worksheet,
)

__all__ = [
    "HH_API_BASE",
    "VacancyRef",
    "append_refs_to_template_file",
    "collect_refs_auto",
    "create_export_workbook",
    "dedupe_vacancy_refs_preserve_order",
    "export_refs_to_xlsx_bytes",
    "extract_keywords_simple",
    "extract_text_from_html",
    "fetch_vacancy",
    "find_next_row_after_max",
    "hh_get_json",
    "load_manual_refs",
    "parse_vacancy_id",
    "refs_from_lines",
    "run_export_on_worksheet",
    "search_vacancies",
    "build_default_out_path",
    "write_vacancy_row_aligned",
]
