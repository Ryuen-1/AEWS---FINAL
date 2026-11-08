import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile } from 'file:///C:/Users/Ian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=process.cwd();
const specs=JSON.parse(await fs.readFile(path.join(root,'tmp/pdfs/card_workbooks.json'),'utf8'));
const out=path.join(root,'output/AEWS_Card_Attachments');
const previews=path.join(root,'tmp/pdfs/card_previews');await fs.mkdir(previews,{recursive:true});
function col(n){let s='';for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
for(const spec of specs){
 const wb=Workbook.create();
 for(const def of spec.sheets){
  const sh=wb.worksheets.add(def.name);sh.showGridLines=false;
  const n=def.headers.length, end=col(n), h=def.raw?1:6, first=h+1, last=h+def.rows.length;
  sh.getRange(`A${h}:${end}${last}`).values=[def.headers,...def.rows];
  const whole=sh.getRange(`A${h}:${end}${last}`);whole.format.font={name:'Arial',size:10,color:'#24374A'};whole.format.verticalAlignment='top';whole.format.wrapText=true;
  sh.getRange(`A${h}:${end}${h}`).format={fill:'#173F59',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:34,wrapText:true,verticalAlignment:'center'};
  for(let i=0;i<n;i++)sh.getRange(`${col(i+1)}${h}:${col(i+1)}${last}`).format.columnWidth=def.widths[i];
  if(!def.raw){
   sh.getRange('A2').values=[[spec.title]];sh.getRange('A2').format.font={name:'Arial',size:14,bold:true,color:'#173F59'};
   sh.getRange('A3').values=[['Prepared for AEWS QA. Actual results are not recorded.']];
   sh.getRange('A4').values=[['Enter actual results only after execution; yellow cells are editable inputs.']];
   sh.getRange('A3:A4').format.font={name:'Arial',size:10,color:'#526779'};
   sh.getRange(`A${first}:${end}${last}`).format.rowHeight=def.name==='Test Cases'?90:48;
   const table=sh.tables.add(`A${h}:${end}${last}`,true,def.name.replaceAll(' ','')+'Table');table.showFilterButton=true;
   if(def.name==='Test Cases'){
    sh.getRange(`E${first}:K${last}`).format.fill='#FFF5D7';
    sh.getRange(`F${first}:F${last}`).dataValidation={rule:{type:'list',values:['Not run','Pass','Fail','Blocked']}};
    for(const [text,color] of [['Fail','#FDE5E2'],['Blocked','#FFF0CD']])sh.getRange(`F${first}:F${last}`).conditionalFormats.add('containsText',{text,format:{fill:color}});
   }
   if(def.formula==='grade'){
    sh.getRange(`D${first}:D${last}`).format.fill='#FFF5D7';sh.getRange(`F${first}:F${last}`).format.fill='#FFF5D7';
    for(let r=first;r<=last;r++)sh.getRange(`E${r}`).formulas=[[`=IF(ISNUMBER(D${r}),IF(C${r}=D${r},"Match","Mismatch"),IF(LEN(D${r})=0,"Pending","Invalid input"))`]];
    sh.getRange(`C${first}:D${last}`).setNumberFormat('0.00');
   }
   if(def.formula==='attendance'){
    sh.getRange(`F${first}:F${last}`).format.fill='#FFF5D7';sh.getRange(`H${first}:H${last}`).format.fill='#FFF5D7';
    for(let r=first;r<=last;r++){
     sh.getRange(`E${r}`).formulas=[[`=C${r}/D${r}`]];
     sh.getRange(`G${r}`).formulas=[[`=IF(ISNUMBER(F${r}),IF(ABS(E${r}-F${r})<0.0001,"Match","Mismatch"),IF(LEN(F${r})=0,"Pending","Invalid input"))`]];
    }
    sh.getRange(`E${first}:F${last}`).setNumberFormat('0.0%');
   }
   if(def.name==='Bugs'){
    sh.getRange(`A${first}:${end}${last}`).format.fill='#FFF5D7';
    sh.getRange(`G${first}:G${last}`).dataValidation={rule:{type:'list',values:['Critical','High','Medium','Low']}};
    sh.getRange(`K${first}:K${last}`).dataValidation={rule:{type:'list',values:['Open','In progress','Fixed awaiting verification','Reopened','Verified','Accepted limitation']}};
    sh.getRange(`O${first}:O${last}`).dataValidation={rule:{type:'list',values:['Not run','Pass','Fail','Blocked']}};
   }
   if(def.formula){
    sh.getRange(`A${last+3}`).values=[['Synthetic expected values from Card 5 fixtures. Source: AEWS class upload/referral source review.']];
    if(def.formula==='attendance')sh.getRange(`A${last+4}`).values=[['Enter Actual rate as an Excel percentage, for example 80% (not 80).']];
   }
  }else{
   sh.getRange(`A${first}:${end}${last}`).format.rowHeight=28;
   sh.getRange(`A${first}:A${last}`).setNumberFormat('@');
   if(spec.path.includes('Gradesheet'))sh.getRange(`C${first}:C${last}`).setNumberFormat('0.00');
  }
  sh.freezePanes.freezeRows(h);sh.freezePanes.freezeColumns(2);
 }
 // Check that blank actuals stay pending and valid zero is compared, not discarded.
 if(spec.card===6){
  const sh=wb.worksheets.getItem('Attendance Reconciliation');
  sh.getRange('F10').values=[[0]];wb.recalculate();
  if(sh.getRange('G10').values[0][0]!=='Match')throw new Error('Valid zero comparison failed');
  sh.getRange('F10').values=[[0.5]];wb.recalculate();
  if(sh.getRange('G10').values[0][0]!=='Mismatch')throw new Error('Mismatch comparison failed');
  sh.getRange('F10').clear({applyTo:'contents'});
  wb.recalculate();
  if(sh.getRange('G10').values[0][0]!=='Pending')throw new Error('Blank comparison failed');
  const grade=wb.worksheets.getItem('Grade Reconciliation');
  grade.getRange('D7').values=[[2.25]];wb.recalculate();
  if(grade.getRange('E7').values[0][0]!=='Match')throw new Error('Grade match failed');
  grade.getRange('D7').values=[['bad input']];wb.recalculate();
  if(grade.getRange('E7').values[0][0]!=='Invalid input')throw new Error('Invalid grade failed');
  grade.getRange('D7').clear({applyTo:'contents'});wb.recalculate();
  if(grade.getRange('E7').values[0][0]!=='Pending')throw new Error('Blank grade failed');
 }
 wb.recalculate();
 const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:10},maxChars:1000});
 console.log(spec.title,errors.ndjson);
 for(const def of spec.sheets){
  const maxCol=def.raw?def.headers.length:Math.min(def.headers.length,6);
  const lastRow=def.raw?def.rows.length+1:Math.min(11,def.rows.length+6);
  const blob=await wb.render({sheetName:def.name,range:`A1:${col(maxCol)}${lastRow}`,scale:1,format:'png'});
  await fs.writeFile(path.join(previews,spec.card+'_'+def.name.replaceAll(' ','_')+'_'+path.basename(spec.path)+'.png'),new Uint8Array(await blob.arrayBuffer()));
 }
 const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(out,spec.path));
 console.log('Saved',spec.path);
}
