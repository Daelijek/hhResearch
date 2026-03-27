import re
from typing import Iterable, List, Tuple

from bs4 import BeautifulSoup

RU_STOPWORDS = {
    "и",
    "в",
    "во",
    "не",
    "что",
    "он",
    "на",
    "я",
    "с",
    "со",
    "как",
    "а",
    "то",
    "все",
    "она",
    "так",
    "его",
    "ее",
    "к",
    "у",
    "же",
    "вы",
    "бы",
    "по",
    "за",
    "от",
    "из",
    "ли",
    "ты",
    "при",
    "мы",
    "это",
    "или",
    "но",
    "для",
    "над",
    "до",
    "после",
    "про",
    "об",
    "надо",
    "можно",
    "нужно",
    "быть",
    "есть",
    "будет",
    "будут",
    "будем",
    "эти",
    "также",
    "там",
    "тут",
    "где",
    "когда",
    "чтобы",
    "либо",
    "лишь",
    "уже",
    "ещё",
    "отлично",
    "опыт",
    "работа",
    "работать",
    "разработка",
    "разработчик",
    "разработки",
}

TOKEN_RE = re.compile(r"[A-Za-zА-Яа-яЁё0-9\-\+]{2,}")


def extract_text_from_html(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    return " ".join(text.split())


def tokenize_ru(text: str, min_token_len: int = 3) -> List[str]:
    text = text.lower()
    tokens = TOKEN_RE.findall(text)
    min_token_len = max(1, int(min_token_len))
    out = []
    for t in tokens:
        t = t.strip("+-")
        if not t:
            continue
        if t in RU_STOPWORDS:
            continue
        if len(t) < min_token_len:
            continue
        out.append(t)
    return out


def make_ngrams(tokens: List[str], n: int) -> Iterable[str]:
    if n <= 1:
        for t in tokens:
            yield t
        return
    for i in range(0, len(tokens) - n + 1):
        gram = tokens[i : i + n]
        yield " ".join(gram)


def extract_keywords_simple(
    description_text: str,
    top_n: int,
    max_ngram: int,
    min_token_len: int = 3,
) -> List[str]:
    min_token_len = max(1, int(min_token_len))
    tokens = tokenize_ru(description_text, min_token_len=min_token_len)
    if not tokens:
        return []

    freq: dict[str, int] = {}
    max_ngram = max(1, int(max_ngram))
    for n in range(1, max_ngram + 1):
        for g in make_ngrams(tokens, n):
            if len(g) < min_token_len:
                continue
            if len(g) > 60:
                continue
            parts = g.split()
            if any(len(p) < min_token_len for p in parts):
                continue
            freq[g] = freq.get(g, 0) + 1

    sorted_items: List[Tuple[str, int]] = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    return [k for k, _ in sorted_items[:top_n]]
