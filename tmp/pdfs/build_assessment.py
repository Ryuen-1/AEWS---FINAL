from pathlib import Path
import re, html
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
root=Path.cwd(); dest=root/'output/pdf/AEWS_QA_Assessment_Complete_Pack.pdf'; dest.parent.mkdir(parents=True,exist_ok=True)
src=(root/'output/assessment/AEWS_QA_Assessment_Complete_Pack.md').read_text(encoding='utf-8')
src=src.replace('–','-').replace('—','-').replace('→','->').replace('’',"'").replace('“','"').replace('”','"')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyA',fontName='Helvetica',fontSize=9.3,leading=13,spaceAfter=6,textColor=colors.HexColor('#243448')))
styles.add(ParagraphStyle(name='CellA',parent=styles['BodyA'],fontSize=8,leading=11,spaceAfter=0))
styles.add(ParagraphStyle(name='CodeA',parent=styles['BodyA'],fontName='Courier',fontSize=8,leading=11,leftIndent=10,backColor=colors.HexColor('#f0f4f8'),spaceAfter=4))
for n,size in [('Heading1',21),('Heading2',15),('Heading3',11.5)]:
 styles[n].fontName='Helvetica-Bold';styles[n].fontSize=size;styles[n].leading=size*1.23;styles[n].textColor=colors.HexColor('#123a58');styles[n].spaceBefore=12;styles[n].spaceAfter=9

def fmt(s):
 s=html.escape(s);s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s);return s
story=[]
story.append(Paragraph('ACADEMIC EARLY WARNING SYSTEM',styles['Heading2']))
story.append(Paragraph('QA Assessment<br/>Complete Activity Pack',styles['Title']))
story.append(Spacer(1,12))
story.append(Paragraph('IT143 CO3 Major Assessment | Trello QAPMF',styles['Heading2']))
story.append(Paragraph('Tailored instructions, 20 task cards, five milestones, 40 test procedures, evidence templates, and presentation guide.',styles['BodyA']))
story.append(Spacer(1,20))
story.append(Paragraph('<b>Before you begin</b><br/>Replace team/member placeholders and working-day references with your actual details. Results and approvals must reflect work your group performs. This pack is a guide, not a completed test report.',styles['BodyA']))
story.append(Spacer(1,16))
story.append(Paragraph('Contents',styles['Heading2']))
for line in src.splitlines():
 if line.startswith('## '): story.append(Paragraph(fmt(line[3:]),styles['BodyA']))
lines=src.splitlines();i=1;code=False
while i<len(lines):
 line=lines[i].strip();i+=1
 if not line: continue
 if line.startswith('```'):code=not code;continue
 if code:
  story.append(Paragraph(fmt(line).replace(' ','&nbsp;'),styles['CodeA']));continue
 if line.startswith('|'):
  rows=[line]
  while i<len(lines) and lines[i].strip().startswith('|'):
   rows.append(lines[i].strip());i+=1
  data=[]
  for r in rows:
   cells=[x.strip() for x in r.strip('|').split('|')]
   if all(re.fullmatch(r'[:\- ]+',c) for c in cells):continue
   data.append([Paragraph(fmt(c),styles['CellA']) for c in cells])
  n=len(data[0]);width=475
  if n==3 and 'ID / requirement' in rows[0]: widths=[79,216,180]
  elif n==3: widths=[width*.25,width*.22,width*.53]
  elif n==4: widths=[65,150,105,155]
  else: widths=[width/n]*n
  t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
  t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#deebf3')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f8fb')]),('VALIGN',(0,0),(-1,-1),'TOP'),('BOX',(0,0),(-1,-1),.4,colors.HexColor('#c3d0dc')),('INNERGRID',(0,0),(-1,-1),.25,colors.HexColor('#d7e0e8')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
  story.extend([t,Spacer(1,10)]);continue
 if line.startswith('## '):
  story.append(PageBreak());story.append(Paragraph(fmt(line[3:]),styles['Heading2']));continue
 if line.startswith('### '):story.append(Paragraph(fmt(line[4:]),styles['Heading3']));continue
 if line.startswith('- [ ] '):line='[  ] '+line[6:]
 elif line.startswith('- '):line='- '+line[2:]
 elif line.startswith('> '):line=line[2:]
 story.append(Paragraph(fmt(line),styles['BodyA']))

def page(c,d):
 c.setStrokeColor(colors.HexColor('#c5d3df'));c.line(60,805,535,805)
 c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#52677a'));c.drawString(60,815,'AEWS | IT143 QA ASSESSMENT PACK');c.drawString(60,30,'Planning guide - complete results only after execution');c.drawRightString(535,30,str(d.page))
doc=SimpleDocTemplate(str(dest),pagesize=(595.28,841.89),rightMargin=60,leftMargin=60,topMargin=54,bottomMargin=49,title='AEWS QA Assessment Complete Pack',author='AEWS QA Team')
doc.build(story,onFirstPage=page,onLaterPages=page)
print(dest)

