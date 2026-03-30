import unittest

from hh_research.keywords import extract_keywords_simple


class TestKeywords(unittest.TestCase):
    def test_empty_text(self) -> None:
        out = extract_keywords_simple(description_text="", top_n=10, max_ngram=2)
        self.assertEqual(out, [])

    def test_extract_keywords_max_ngram_2_contains_expected_bigrams(self) -> None:
        # Используем "инженер", чтобы не попадать в стоп-слова (в RU_STOPWORDS есть "разработчик"/"опыт").
        text = ("python инженер " * 6).strip()
        out = extract_keywords_simple(description_text=text, top_n=10, max_ngram=2)

        # Благодаря фильтру избыточности униграммы ("python", "инженер") должны быть пропущены,
        # т.к. уже покрыты биграммами.
        expected = {"python инженер", "инженер python"}
        self.assertEqual(set(out), expected)

    def test_max_ngram_1_has_no_spaces(self) -> None:
        text = ("python инженер " * 6).strip()
        out = extract_keywords_simple(description_text=text, top_n=10, max_ngram=1)
        self.assertTrue(out)  # sanity check
        self.assertTrue(all(" " not in k for k in out))


if __name__ == "__main__":
    unittest.main()

