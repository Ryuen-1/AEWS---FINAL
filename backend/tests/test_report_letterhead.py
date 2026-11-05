from pathlib import Path
import sys
import base64
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers.admin import _generate_html_report


def test_admin_pdf_preview_embeds_the_university_logo():
    html = _generate_html_report(1, 0, 1, 1, []).body.decode()
    logo = Path(__file__).resolve().parents[1] / 'app' / 'assets' / 'buksu-logo.png'
    assert 'data:image/png;base64,' + base64.b64encode(logo.read_bytes()).decode() in html
    assert 'BUKIDNON STATE UNIVERSITY' in html
    assert 'Malaybalay City, Bukidnon 8700' in html
    assert 'Institution Performance Report' in html
    assert 'Academic Monitoring Unit' in html
