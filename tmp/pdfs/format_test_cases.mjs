import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,Workbook,SpreadsheetFile} from 'file:///C:/Users/Ian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=process.cwd(),target=path.join(root,'output/AEWS_Card_Attachments/Card_03_Test_Cases/AEWS_Test_Cases.xlsx');
const previewDir=path.join(root,'tmp/pdfs/formatted_cases_review');await fs.mkdir(previewDir,{recursive:true});
await fs.copyFile(target,path.join(root,'tmp/pdfs/AEWS_Test_Cases_before_format.xlsx'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(target));
const summary=wb.worksheets.getItem('Overview'),design=wb.worksheets.getItem('Test Cases'),execution=wb.worksheets.getItem('Execution');
const before=await wb.render({sheetName:'Overview',range:'A1:G22',scale:1,format:'png'});await fs.writeFile(path.join(previewDir,'before.png'),new Uint8Array(await before.arrayBuffer()));
const compareRanges={'Overview':'A1:G59','Test Cases':'A1:M68','Execution':'A1:L68'};
const saved=Object.fromEntries([summary,design,execution].map(sh=>[sh.name,{values:JSON.stringify(sh.getRange(compareRanges[sh.name]).values),formulas:JSON.stringify(sh.getRange(compareRanges[sh.name]).formulas)}]));
function col(n){let s='';for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
const navy='#1F3B50',ink='#263747',muted='#627487',line='#D6DFE7',amber='#FFF8E5';
function font(sh,range,size=11){sh.getRange(range).format.font={name:'Arial',size,color:ink};}
function heading(sh,range){sh.getRange(range).format={fill:navy,font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:36,wrapText:true,verticalAlignment:'center',horizontalAlignment:'center',borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};}
function top(sh,end){
 sh.showGridLines=false;font(sh,`A1:${end}68`);sh.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:navy};
 sh.getRange(`A1:${end}1`).format.rowHeight=8;sh.getRange(`A2:${end}2`).format.rowHeight=27;
 sh.getRange(`A3:${end}3`).format.rowHeight=7;sh.getRange(`A4:${end}4`).format.rowHeight=22;
 sh.getRange('A4').format.font={name:'Arial',size:10,color:muted};
 sh.getRange(`A5:${end}5`).format.rowHeight=7;
 sh.getRange(`A6:${end}6`).format.rowHeight=20;sh.getRange(`A7:${end}7`).format.rowHeight=7;
}
const configs=[
 [design,[12,38,13,11,12,23,23,43,43,74,65,14,23],'M'],
 [execution,[12,38,17,58,22,18,25,32,42,18,30,42],'L']
];
for(const [sh,widths,end] of configs){
 top(sh,end);
 for(let i=0;i<widths.length;i++)sh.getRange(`${col(i+1)}1:${col(i+1)}68`).format.columnWidth=widths[i];
 for(const t of sh.tables.items)t.style='TableStyleLight1';
 const values=sh.getRange(`A9:${end}68`).values;
 sh.getRange(`A9:${end}68`).format.wrapText=true;sh.getRange(`A9:${end}68`).format.verticalAlignment='top';
 for(let i=0;i<60;i++){
  const r=i+9;let maxLines=1;
  for(let j=0;j<widths.length;j++){
   const val=values[i][j];if(val===null||val===undefined||val==='')continue;
   const capacity=Math.max(7,Math.floor(widths[j]*.85));
   const lines=String(val).split('\n').reduce((total,s)=>total+Math.max(1,Math.ceil(s.length/capacity)),0);maxLines=Math.max(maxLines,lines);
  }
  sh.getRange(`A${r}:${end}${r}`).format.fill=i%2===0?'#FFFFFF':'#F3F6F8';
  sh.getRange(`A${r}:${end}${r}`).format.borders={bottom:{style:'thin',color:'#E2E8ED'}};
  sh.getRange(`A${r}:${end}${r}`).format.rowHeight=Math.max(sh.name==='Execution'?42:58,maxLines*14+12);
 }
 heading(sh,`A8:${end}8`);
 sh.getRange('A2').format.borders={bottom:{style:'thin',color:line}};
 sh.getRange('A9:A68').format.font={name:'Arial',size:11,bold:true,color:navy};
 sh.getRange('A9:A68').format.verticalAlignment='center';
 sh.freezePanes.freezeRows(8);sh.freezePanes.freezeColumns(2);
}
design.getRange('C9:E68').format.horizontalAlignment='center';design.getRange('L9:M68').format.verticalAlignment='center';
design.getRange('M9:M68').format.fill=amber;design.getRange('M9:M68').format.horizontalAlignment='center';
execution.getRange('C9:L68').format.fill=amber;execution.getRange('C9:C68').format.horizontalAlignment='center';execution.getRange('C9:C68').format.verticalAlignment='center';
for(let r=9;r<=68;r++)execution.getRange(`C${r}:L${r}`).format.fill=r%2===1?'#FFF8E5':'#FFFCF3';
execution.getRange('F9:F68').setNumberFormat('yyyy-mm-dd');
// Add visual group labels only in previously empty cells; the underlying test content is unchanged.
for(const [sh,labels] of [[design,[['A6','CASE IDENTIFICATION'],['G6','TEST SETUP'],['J6','PROCEDURE AND EXPECTED RESULT'],['L6','REVIEW']]],[execution,[['A6','CASE REFERENCE'],['C6','EXECUTION RESULTS'],['G6','RUN CONTEXT'],['I6','EVIDENCE AND FOLLOW-UP']]]]){
 for(const [cell,label] of labels){sh.getRange(cell).values=[[label]];sh.getRange(cell).format.font={name:'Arial',size:9,bold:true,color:muted};}
}
// A compact summary at the top, followed by coverage, guidance and source notes.
summary.showGridLines=false;font(summary,'A1:G59');
for(const [c,w] of [['A',28],['B',30],['C',17],['D',4],['E',28],['F',24],['G',67]])summary.getRange(`${c}1:${c}59`).format.columnWidth=w;
summary.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:navy};summary.getRange('A2:G2').format.rowHeight=28;
// The presentation title spans only empty cells; working tables remain unmerged.
summary.mergeCells('A2:C2');summary.getRange('A2:C2').format.wrapText=false;
summary.getRange('A4').format.font={name:'Arial',size:10,color:muted};
summary.getRange('A7:G15').format.rowHeight=25;
for(const range of ['A6:B6','E6:F6','A17:C17','E17:G17'])heading(summary,range);
summary.getRange('A18:C34').format.wrapText=true;summary.getRange('E18:G34').format.wrapText=true;
summary.getRange('A18:G34').format.verticalAlignment='top';
for(let row=18;row<=34;row++){
 const guide=summary.getRange(`E${row}:G${row}`).values[0];
 const widths=[28,24,67];const max=Math.max(...guide.map((v,i)=>String(v??'').split('\n').reduce((n,s)=>n+Math.max(1,Math.ceil(s.length/(widths[i]*.85))),0)));
 summary.getRange(`A${row}:G${row}`).format.rowHeight=Math.max(34,max*14+10);
 summary.getRange(`A${row}:C${row}`).format.fill=row%2===0?'#FFFFFF':'#F3F6F8';
}
summary.getRange('A18:A34').format.font={name:'Arial',size:11,bold:true,color:navy};
summary.getRange('C18:C34').format.horizontalAlignment='right';summary.getRange('B7:B15').format.horizontalAlignment='right';summary.getRange('F7:F11').format.horizontalAlignment='right';
summary.getRange('E36').format.font={name:'Arial',size:13,bold:true,color:navy};summary.getRange('A36:G36').format.rowHeight=27;
for(let row=38;row<=45;row++){
 const val=String(summary.getRange(`G${row}`).values[0][0]??'');summary.getRange(`E${row}:G${row}`).format.wrapText=true;summary.getRange(`E${row}:G${row}`).format.verticalAlignment='top';
 summary.getRange(`A${row}:G${row}`).format.rowHeight=Math.max(40,Math.ceil(val.length/(67*.85))*14+12);
 summary.getRange(`E${row}`).format.font={name:'Arial',size:11,bold:true,color:muted};
}
summary.getRange('D1:D59').format.fill='#FFFFFF';summary.freezePanes.unfreeze();
wb.recalculate();
// Compare all populated records and formulas, ignoring only the added group-label cells.
for(const sh of [summary,design,execution]){
 const reference=JSON.parse(saved[sh.name].values);const current=sh.getRange(compareRanges[sh.name]).values;
 for(let r=0;r<reference.length;r++)for(let c=0;c<reference[r].length;c++){
  const a=reference[r][c],b=current[r]?.[c];
  if(a!==null&&a!==undefined&&a!==''&&JSON.stringify(a)!==JSON.stringify(b))throw new Error(`Content changed: ${sh.name} ${r+1},${c+1}: ${a} -> ${b}`);
 }
 if(JSON.stringify(sh.getRange(compareRanges[sh.name]).formulas)!==saved[sh.name].formulas)throw new Error('Formula change in '+sh.name);
}
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:15},maxChars:1000})).ndjson);
for(const [sh,range,name] of [[summary,'A1:G24','overview'],[summary,'E36:G46','sources'],[design,'A1:G12','case_identification'],[design,'H6:M11','case_details'],[execution,'A1:F13','execution'],[execution,'G6:L12','evidence']]){
 const img=await wb.render({sheetName:sh.name,range,scale:1,format:'png'});await fs.writeFile(path.join(previewDir,name+'.png'),new Uint8Array(await img.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(target);console.log('Formatted workbook saved:',target);
