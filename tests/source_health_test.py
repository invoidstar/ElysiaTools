import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "source_health", Path(__file__).resolve().parents[1] / "scripts/sync/check_sources.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

class SourceHealthTest(unittest.TestCase):
    def setUp(self):
        self.sources = [
            {"id": "example", "kind": "official-cfp", "url": "https://example.org/cfp"},
            {"id": "archive", "kind": "community-history", "url": "https://example.org/old"},
        ]
        self.previous = {"sources": {"example": {
            "url": "https://example.org/cfp", "fingerprint": "old"}}}

    def test_changed_page_requires_review_not_automatic_update(self):
        result, snapshot = module.inspect(
            self.sources, self.previous, lambda _: {"ok": True, "fingerprint": "new"})
        self.assertEqual(result["requiresReview"], ["example"])
        self.assertEqual(result["total"], 1)
        self.assertEqual(snapshot["sources"]["example"]["fingerprint"], "new")

    def test_network_failure_preserves_last_good_fingerprint(self):
        result, snapshot = module.inspect(
            self.sources, self.previous, lambda _: {"ok": False, "error": "HTTP 429"})
        self.assertFalse(result["requiresReview"])
        self.assertEqual(result["networkProblems"], ["example"])
        self.assertEqual(snapshot["sources"]["example"]["fingerprint"], "old")

    def test_first_observation_is_not_false_alert(self):
        result, _ = module.inspect(
            self.sources, {}, lambda _: {"ok": True, "fingerprint": "new"})
        self.assertEqual(result["summary"]["baseline_created"], 1)
        self.assertFalse(result["requiresReview"])

    def test_html_fingerprint_ignores_scripts_and_whitespace(self):
        a = module.fingerprint(b"<p>A  B</p><script>123</script>", "text/html")
        b = module.fingerprint(b"<p>A B</p><script>456</script>", "text/html")
        self.assertEqual(a, b)

if __name__ == "__main__":
    unittest.main()
