from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as E
import re

root=Path(__file__).resolve().parent
source=Path(r'C:\Users\Ian\Downloads\Form 4B Informed Consent Assessment Form.docx')
out=root/'Form_4B_AEWS_Checked.docx'
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+ns['w']+'}'
def text(el): return ''.join(el.xpath('.//w:t/text()',namespaces=ns))
def fill(cell,value,check=False):
    p=cell.find(W+'p')
    if p is None: p=E.SubElement(cell,W+'p')
    for child in list(p):
        if child.tag!=W+'pPr': p.remove(child)
    pp=p.find(W+'pPr')
    if pp is None: pp=E.SubElement(p,W+'pPr')
    for child in list(pp):
        if child.tag in [W+'spacing',W+'ind',W+'jc']: pp.remove(child)
    sp=E.SubElement(pp,W+'spacing'); sp.set(W+'after','0'); sp.set(W+'before','0'); sp.set(W+'line','200'); sp.set(W+'lineRule','auto')
    jc=E.SubElement(pp,W+'jc'); jc.set(W+'val','center' if check else 'left')
    r=E.SubElement(p,W+'r'); rp=E.SubElement(r,W+'rPr'); font=E.SubElement(rp,W+'rFonts')
    font.set(W+'ascii','Segoe UI Symbol' if check else 'Arial Narrow'); font.set(W+'hAnsi','Segoe UI Symbol' if check else 'Arial Narrow')
    size=E.SubElement(rp,W+'sz'); size.set(W+'val','22' if check else '16')
    E.SubElement(r,W+'t').text=value

yes={1:'p. 30, para. 4',2:'p. 7, paras. 1–6',4:'p. 31, para. 1; p. 61, para. 4',6:'p. 33, para. 3 (interviews only)',7:'p. 33, para. 3 (15 interviews only)',8:'p. 9, para. 3; p. 31, para. 2',11:'p. 8, paras. 1–3 (intended benefits)',12:'p. 8, paras. 4–5; p. 9, para. 1'}
na={3,10,13,20,22,23,24,25}
partial={5:'p. 23, paras. 2–3; duties incomplete',9:'p. 31, para. 2; full risk disclosure absent',14:'p. 23, para. 4; alternatives not explicit',21:'p. 7, para. 3; confidentiality details absent',27:'p. 23, para. 3; research results access absent',28:'p. 23, para. 3; rights procedure absent',30:'Title page, paras. 3–8; funding not stated',31:'Title page, paras. 2–11; role not explicit',32:'Title page, paras. 3–6; contacts absent'}
with ZipFile(source) as zin:
    x=E.fromstring(zin.read('word/document.xml'))
    for table in x.xpath('//w:tbl',namespaces=ns):
        for row in table.xpath('./w:tr',namespaces=ns):
            cells=row.xpath('./w:tc',namespaces=ns)
            if not cells: continue
            first=text(cells[0]).strip()
            if first=='Study Protocol Title:' and len(cells)>1:
                fill(cells[1],'AI-Powered Predictive Analytics for an Academic Early Warning System')
            if 'Indicate if the ICF has' in text(row):
                for c in cells:
                    if 'Indicate if the ICF has' in text(c): fill(c,'Study-based draft checklist\nYES = addressed in study\nICF review still pending')
                    if 'Page and paragraph' in text(c): fill(c,'Study page and paragraph\nUnchecked = missing or incomplete')
            m=re.match(r'\s*(\d+)\s*\.',first)
            if not m or len(cells)<5: continue
            n=int(m.group(1))
            if n>33: continue
            if n in yes:
                fill(cells[1],'✓',True); fill(cells[3],yes[n])
            elif n in na:
                fill(cells[2],'✓',True); fill(cells[3],'N/A — nonclinical study')
            else: fill(cells[3],partial.get(n,'Not stated in study'))
    # Clarify basis on continuation pages without occupying reviewer-owned cells.
    for part in x.xpath('//w:tbl',namespaces=ns)[2:4]:
        pass
    with ZipFile(out,'w',ZIP_DEFLATED) as zout:
        for entry in zin.infolist():
            zout.writestr(entry,E.tostring(x,xml_declaration=True,encoding='UTF-8',standalone=True) if entry.filename=='word/document.xml' else zin.read(entry.filename))
print(out)
