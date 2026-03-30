import re
from typing import Iterable, List, Optional, Set, Tuple

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

_PYMORPHY2_AVAILABLE = False
_MORPH = None
_STOPWORDS_LEMMAS: Optional[Set[str]] = None

try:
    import pymorphy2  # type: ignore

    _MORPH = pymorphy2.MorphAnalyzer()
    _PYMORPHY2_AVAILABLE = True
except Exception:
    _PYMORPHY2_AVAILABLE = False
    _MORPH = None


def _ensure_stopwords_lemmas() -> Set[str]:
    global _STOPWORDS_LEMMAS
    if _STOPWORDS_LEMMAS is not None:
        return _STOPWORDS_LEMMAS

    if not _MORPH:
        _STOPWORDS_LEMMAS = set(RU_STOPWORDS)
        return _STOPWORDS_LEMMAS

    out: Set[str] = set()
    for w in RU_STOPWORDS:
        try:
            lemma = _MORPH.parse(w.lower())[0].normal_form
            out.add(lemma)
        except Exception:
            # Fallback: if a token can't be parsed, keep raw form.
            out.add(w.lower())

    _STOPWORDS_LEMMAS = out
    return _STOPWORDS_LEMMAS


def _maybe_lemma(token: str) -> str:
    if not _PYMORPHY2_AVAILABLE or not _MORPH:
        return token
    try:
        return _MORPH.parse(token)[0].normal_form
    except Exception:
        return token


def extract_text_from_html(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    return " ".join(text.split())


def tokenize_ru(text: str, min_token_len: int = 3, *, lemmatize: bool = False) -> List[str]:
    text = text.lower()
    tokens = TOKEN_RE.findall(text)
    min_token_len = max(1, int(min_token_len))
    out = []
    for t in tokens:
        t = t.strip("+-")
        if not t:
            continue

        token_for_checks = _maybe_lemma(t) if lemmatize else t
        if lemmatize:
            stopwords = _ensure_stopwords_lemmas()
            if token_for_checks in stopwords:
                continue
        else:
            if token_for_checks in RU_STOPWORDS:
                continue

        if len(token_for_checks) < min_token_len:
            continue
        out.append(token_for_checks)
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

    # Use lemmatization only if pymorphy2 + dictionaries are available.
    tokens = tokenize_ru(
        description_text,
        min_token_len=min_token_len,
        lemmatize=_PYMORPHY2_AVAILABLE,
    )
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

    def _contains_subsequence(haystack: List[str], needle: List[str]) -> bool:
        if len(needle) > len(haystack):
            return False
        for i in range(0, len(haystack) - len(needle) + 1):
            if haystack[i : i + len(needle)] == needle:
                return True
        return False

    # Prefer longer n-grams with the same count; then filter out redundant shorter ones.
    sorted_candidates: List[Tuple[str, int, int]] = sorted(
        ((k, v, len(k.split())) for k, v in freq.items()),
        key=lambda x: (-x[1], -x[2], x[0]),
    )

    selected: List[str] = []
    selected_token_seqs: List[List[str]] = []
    for ngram, _count, _length in sorted_candidates:
        cand_tokens = ngram.split()
        redundant = False
        for st in selected_token_seqs:
            if _contains_subsequence(st, cand_tokens):
                redundant = True
                break
        if redundant:
            continue

        selected.append(ngram)
        selected_token_seqs.append(cand_tokens)
        if len(selected) >= top_n:
            break

    return selected
