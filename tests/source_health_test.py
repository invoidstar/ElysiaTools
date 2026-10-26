import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
monitor=load("source_monitor","scripts/sync/check_sources.py")
review=load("source_review","scripts/sync/report_source_changes.py")

class SourceHealthTest(unittest.TestCase):
    def setUp(self):
        self.sources=[{"id":"example","kind":"official-cfp",
                       "url":"https://example.org/cfp"},
                      {"id":"archive","kind":"community-history",
                       "url":"https://example.org/archive"}]
        self.prior={"sources":{"example":{"url":"https://example.org/cfp",
                                           "fingerprint":"original"}}}

    def seen(self,result,prior=None):
        return monitor.inspect(self.sources,prior if prior is not None else self.prior,
                               lambda _:{"ok":True,"fingerprint":result})

    def test_first_baseline_then_confirmation_then_review(self):
        first,stable=self.seen("different",{})
        self.assertEqual(first["summary"]["baseline_created"],1)
        changed,provisional=self.seen("different")
        self.assertFalse(changed["requiresReview"])
        self.assertEqual(changed["summary"]["pending_confirmation"],1)
        self.assertEqual(provisional["sources"]["example"]["fingerprint"],"original")
        confirmed,updated=self.seen("different",provisional)
        self.assertEqual(confirmed["requiresReview"],["example"])
        self.assertEqual(updated["sources"]["example"]["fingerprint"],"different")
        no_change,_=self.seen("different",updated)
        self.assertFalse(no_change["requiresReview"])

    def test_one_off_dynamic_change_does_not_trigger_issue(self):
        _,provisional=self.seen("clock-1")
        report,snapshot=self.seen("clock-2",provisional)
        self.assertFalse(report["requiresReview"])
        self.assertEqual(snapshot["sources"]["example"]["fingerprint"],"original")
        recovered,restored=self.seen("original",snapshot)
        self.assertEqual(recovered["summary"]["unchanged"],1)
        self.assertNotIn("candidate",restored["sources"]["example"])

    def test_http_429_preserves_last_fingerprint_and_candidate(self):
        _,candidate=self.seen("new")
        report,restored=monitor.inspect(self.sources,candidate,
                                         lambda _:{"ok":False,"error":"HTTP 429"})
        self.assertFalse(report["requiresReview"])
        self.assertEqual(report["networkProblems"],["example"])
        self.assertEqual(restored["sources"]["example"],candidate["sources"]["example"])

    def test_html_fingerprint_ignores_scripts_and_whitespace(self):
        a=monitor.fingerprint(b"<p>Submission date: A  B</p><script>123</script>","text/html")
        b=monitor.fingerprint(b"<p>Submission date: A B</p><script>456</script>","text/html")
        self.assertEqual(a,b)

    def test_changed_page_issues_are_separate_and_not_overwritten(self):
        report={"checkedAt":"2026-10-26T00:00:00Z","results":[
            {"id":"icra-27","kind":"official-cfp","url":"https://example.org/a",
             "state":"changed","fingerprint":"2","previousFingerprint":"1"},
            {"id":"iccv-27","kind":"official-cfp","url":"https://example.org/b",
             "state":"changed","fingerprint":"4","previousFingerprint":"3"}]}
        planned=review.make_plan(report,[{"number":7,"title":"[Source review] icra-27",
                                          "state":"OPEN"}])
        self.assertEqual([x["action"] for x in planned],["comment","create"])
        self.assertEqual(planned[0]["number"],7)
        self.assertEqual(planned[1]["title"],"[Source review] iccv-27")
        planned2=review.make_plan(report,[{"number":8,"title":"[Source review] iccv-27",
                                           "state":"CLOSED"}])
        self.assertEqual(planned2[1]["action"],"reopen")
        self.assertEqual(len(review.make_plan({"checkedAt":"now","results":[]},[])),0)

    def test_official_pdf_over_2mb_can_be_monitored(self):
        # Previously several publisher/organizer PDFs were silently
        # classified unreachable solely for exceeding the HTML size cap.
        from unittest.mock import patch
        blob=b"%PDF-1.7"+b"x"*(2_000_010-len(b"%PDF-1.7"))
        class PdfResponse:
            status=200
            headers={"Content-Type":"application/pdf"}
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self,n): return blob[:n]
            def geturl(self): return "https://example.org/official.pdf"
        with patch.object(monitor.urllib.request,"urlopen",return_value=PdfResponse()):
            result=monitor.fetch({"url":"https://example.org/official.pdf"})
        self.assertTrue(result["ok"])
        self.assertEqual(result["bytesRead"],len(blob))
        self.assertEqual(len(result["fingerprint"]),64)

    def test_html_over_2mb_is_still_capped(self):
        from unittest.mock import patch
        class LargeHtml:
            status=200
            headers={"Content-Type":"text/html"}
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self,n): return b"x"*n
        with patch.object(monitor.urllib.request,"urlopen",return_value=LargeHtml()):
            result=monitor.fetch({"url":"https://example.org/giant.html"})
        self.assertFalse(result["ok"])
        self.assertIn("2 MB",result["error"])

if __name__=="__main__":
    unittest.main()
