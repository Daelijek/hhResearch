import argparse
import os

import requests

from hh_research.client import (
    dedupe_vacancy_refs_preserve_order,
    load_manual_refs,
)
from hh_research.pipeline import (
    append_refs_to_template_file,
    build_default_out_path,
    collect_refs_auto,
)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_EXCEL_PATH = os.path.join(_SCRIPT_DIR, "template.xlsx")
DEFAULT_SHEET_NAME = "Sheet1"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export HH key_skills and extracted keywords into Excel."
    )
    parser.add_argument(
        "--mode",
        choices=["auto", "manual"],
        required=True,
        help="auto: search vacancies by queries; manual: use provided vacancy ids/urls file",
    )
    parser.add_argument(
        "--excel",
        default=DEFAULT_EXCEL_PATH,
        help="Path to template.xlsx template",
    )
    parser.add_argument("--sheet", default=DEFAULT_SHEET_NAME, help="Worksheet name")
    parser.add_argument(
        "--manual-input",
        default=None,
        help="Text file with one vacancy id or hh.ru/vacancy/... URL per line (manual mode)",
    )
    parser.add_argument(
        "--queries",
        nargs="*",
        default=[
            "frontend разработчик",
            "fullstack разработчик",
            "frontend developer",
            "fullstack developer",
        ],
        help="Search queries (auto mode)",
    )
    parser.add_argument("--pages", type=int, default=2, help="How many pages per query (auto mode)")
    parser.add_argument("--per-page", type=int, default=100, help="Vacancies per page (auto mode)")

    parser.add_argument("--col-title", type=int, default=1, help="Excel column index for Vacancy Title (A=1)")
    parser.add_argument("--col-keywords", type=int, default=2, help="Excel column index for Key Words (B=2)")
    parser.add_argument("--col-skills", type=int, default=3, help="Excel column index for Key Skills (C=3)")
    parser.add_argument("--col-id", type=int, default=4, help="Excel column index for ID (D=4)")
    parser.add_argument("--col-link", type=int, default=5, help="Excel column index for Link (E=5)")
    parser.add_argument("--start-row", type=int, default=2, help="Excel start row (after headers)")

    parser.add_argument("--kw-top-n", type=int, default=30, help="How many keywords per vacancy (description)")
    parser.add_argument("--kw-max-ngram", type=int, default=3, help="Max ngram size for keywords (1..3)")

    parser.add_argument("--token", default=None, help="HH API access token (optional)")
    parser.add_argument("--sleep-s", type=float, default=0.2, help="Sleep between vacancy requests")
    parser.add_argument(
        "--search-sleep-s",
        type=float,
        default=0.2,
        help="Sleep after each search API request (auto mode, per query page)",
    )

    parser.add_argument(
        "--out",
        default=None,
        help="Output xlsx path (default: auto_/manual_ appended to template filename)",
    )
    parser.add_argument(
        "--out-dir",
        default="reports",
        help="Folder inside project to store output xlsx (default: ./reports)",
    )
    parser.add_argument(
        "--out-prefix",
        default="hh_keyskills",
        help="Filename prefix for output reports (default: hh_keyskills)",
    )
    parser.add_argument("--dedupe-vacancies", action="store_true", default=True, help="Avoid refetching same vacancy id")
    parser.add_argument(
        "--no-dedupe-vacancies",
        action="store_false",
        dest="dedupe_vacancies",
        help="Refetch duplicates too",
    )

    args = parser.parse_args()

    excel_path = args.excel
    sheet_name = args.sheet
    out_path = args.out
    project_dir = _SCRIPT_DIR

    if not out_path:
        out_path = build_default_out_path(
            project_dir=project_dir,
            out_dir=args.out_dir,
            mode=args.mode,
            out_prefix=args.out_prefix,
            template_basename=os.path.basename(excel_path),
        )

    session = requests.Session()
    vacancy_ids_to_process = []
    manual_dupes_skipped = 0

    if args.mode == "manual":
        if not args.manual_input:
            raise SystemExit("--manual-input is required in manual mode")
        raw_refs = load_manual_refs(args.manual_input)
        if args.dedupe_vacancies:
            vacancy_ids_to_process, manual_dupes_skipped = dedupe_vacancy_refs_preserve_order(raw_refs)
        else:
            vacancy_ids_to_process = raw_refs
    else:
        vacancy_ids_to_process = collect_refs_auto(
            session=session,
            token=args.token,
            queries=list(args.queries),
            pages=args.pages,
            per_page=args.per_page,
            dedupe_vacancies=args.dedupe_vacancies,
            search_sleep_s=args.search_sleep_s,
        )

    total = len(vacancy_ids_to_process)
    if manual_dupes_skipped:
        print(f"Skipped {manual_dupes_skipped} duplicate vacancy id(s) in manual input.")

    def on_progress(done: int, tot: int) -> None:
        print(f"Processed {done}/{tot} vacancies...")

    processed, next_row, errors = append_refs_to_template_file(
        excel_path=excel_path,
        sheet_name=sheet_name,
        refs=vacancy_ids_to_process,
        token=args.token,
        start_row=args.start_row,
        col_title=args.col_title,
        col_keywords=args.col_keywords,
        col_skills=args.col_skills,
        col_id=args.col_id,
        col_link=args.col_link,
        kw_top_n=args.kw_top_n,
        kw_max_ngram=args.kw_max_ngram,
        sleep_s=args.sleep_s,
        out_path=out_path,
        on_progress=on_progress,
    )

    for err in errors:
        print(f"[WARN] Failed to fetch vacancy {err}")

    print("Done")
    print("Output:", out_path)
    print("Vacancies processed:", processed)
    print("Next row:", next_row)


if __name__ == "__main__":
    main()
