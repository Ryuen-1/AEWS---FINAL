import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,Workbook,SpreadsheetFile} from 'file:///C:/Users/Ian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=process.cwd(),dest=path.join(root,'output/AEWS_Card_Attachments/Card_03_Test_Cases/AEWS_Test_Cases.xlsx');
const previews=path.join(root,'tmp/pdfs/reference_spec_review');await fs.mkdir(previews,{recursive:true});
await fs.copyFile(dest,path.join(root,'tmp/pdfs/AEWS_Test_Cases_before_reference_layout.xlsx'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(dest));
console.log(wb.help('worksheet',{search:'position|activate|pageLayout|pageSetup',include:'index,notes',maxChars:2500}).ndjson);
const design=wb.worksheets.getItem('Test Cases'),run=wb.worksheets.getItem('Execution'),overview=wb.worksheets.getItem('Overview');
const before=(await wb.render({sheetName:'Test Cases',range:'A1:F11',scale:1,format:'png'}));await fs.writeFile(path.join(previews,'before.png'),new Uint8Array(await before.arrayBuffer()));
const rows=design.getRange('A9:M68').values;
const modules=['Accounts and Approval','Authentication and Sessions','Role and Record Access','Class Management','Academic File Uploads','Grades and Academic History','Attendance','Referrals and AMU Handoff','Needs Assessment','Risk Prediction','Support Routing and Communication','Student Portal','Administration','Dashboards and Reports','Usability','Performance','End-to-End Integration'];
const widths=[20,55,46,63],navy='#07557A',teal='#16465A',pale='#D8E3F3',gray='#F1F1F1',line='#C8CCD0';
const specifications=[];
for(let i=0;i<rows.length;i++){
 const [id,title,req,card,priority,type,role,pre,data,procedure,expected,finding,review]=rows[i];
 const name=id;
 let sh;
 try{sh=wb.worksheets.getItem(name);}catch{sh=null;}
 if(!sh)sh=wb.worksheets.add(name);
 const sourceRow=i+9;sh.showGridLines=false;
 sh.getRange('A1:D30').format.font={name:'Times New Roman',size:12,color:'#111111'};
 for(let j=0;j<4;j++)sh.getRange(`${String.fromCharCode(65+j)}1:${String.fromCharCode(65+j)}30`).format.columnWidth=widths[j];
 sh.mergeCells('A1:D1');sh.getRange('A1').values=[['ACADEMIC EARLY WARNING SYSTEM (AEWS) - TEST CASE SPECIFICATION']];
 sh.getRange('A1:D1').format={font:{name:'Times New Roman',size:18,bold:true,color:teal},rowHeight:34,verticalAlignment:'center',wrapText:false};
 sh.getRange('A2:D2').format.rowHeight=15;
 function band(row,title){sh.mergeCells(`A${row}:D${row}`);sh.getRange(`A${row}`).values=[[title]];sh.getRange(`A${row}:D${row}`).format={fill:pale,font:{name:'Times New Roman',size:12,bold:true,color:teal},rowHeight:27,verticalAlignment:'center',borders:{preset:'all',style:'thin',color:line}};}
 band(3,'1. TEST CASE OVERVIEW');
 sh.getRange('A4:D5').values=[['Test Case ID',id,'Module / Feature',modules[Number(req.slice(1))-1]],['Test Title',title,'Priority',priority]];
 // Overview values remain linked to the source register, so case text does not diverge.
 sh.getRange('B4').formulas=[[`='Test Cases'!A${sourceRow}`]];
 sh.getRange('B5').formulas=[[`='Test Cases'!B${sourceRow}`]];
 sh.getRange('D5').formulas=[[`='Test Cases'!E${sourceRow}`]];
 sh.getRange('A4:D5').format={wrapText:true,verticalAlignment:'top',borders:{preset:'all',style:'thin',color:line}};
 for(const r of [4,5])for(const c of ['A','C'])sh.getRange(`${c}${r}`).format={fill:gray,font:{name:'Times New Roman',size:12,bold:true}};
 sh.getRange('A4:D4').format.rowHeight=32;sh.getRange('A5:D5').format.rowHeight=Math.max(46,Math.ceil(String(title).length/48)*16+10);
 sh.getRange('D5').format={fill:priority==='High'?'#FCE4DC':'#FFF2CF',font:{name:'Times New Roman',size:12,bold:true,color:priority==='High'?'#A00000':'#805A0A'},horizontalAlignment:'center',verticalAlignment:'center'};
 sh.getRange('A6').values=[['Pre-Conditions']];sh.getRange('A6').format={fill:gray,font:{name:'Times New Roman',size:12,bold:true},verticalAlignment:'top'};
 sh.mergeCells('B6:D6');sh.getRange('B6').values=[[`1. ${pre}\n2. Test role: ${role}. Use isolated synthetic records and the approved requirement ${req}.\n3. Keep controlled credentials private; resolve missing prerequisites before execution.`]];
 sh.getRange('A6:D6').format.borders={preset:'all',style:'thin',color:line};sh.getRange('B6:D6').format.wrapText=true;sh.getRange('B6:D6').format.verticalAlignment='top';sh.getRange('A6:D6').format.rowHeight=72;
 sh.getRange('A7:D7').format.rowHeight=15;band(8,'2. TEST STEPS & EXECUTION');
 sh.getRange('A9:D9').values=[['Step #','Action','Input Data','Expected Result']];
 sh.getRange('A9:D9').format={fill:navy,font:{name:'Times New Roman',size:12,bold:true,color:'#FFFFFF'},rowHeight:31,verticalAlignment:'center',borders:{preset:'all',style:'thin',color:line}};
 sh.getRange('A9').format.horizontalAlignment='center';
 const actions=String(procedure).split('\n').map(s=>s.replace(/^\d+\.\s*/,''));
 const stepRows=actions.map((action,j)=>{
  let input=data,exp=expected;
  if(i<40){
   if(j===0){input=`Role: ${role}\n${pre}`;exp='The stated test account, environment and baseline fixtures are available. Missing prerequisites are recorded as blockers.';}
   if(j===2){input='Observed response, persisted state, screenshots/logs and any linked bug reference.';exp='Actual results and evidence are recorded against the expected outcome. Failures or blocked variants remain visible in the execution tracker.';}
  }else{
   if(/^(Record .*baseline|Save .*baseline|Prepare |Make the artifact|Identify model|Create original invitation)/i.test(action))exp='The controlled test state or evaluation evidence is prepared as specified; production records remain unchanged.';
   if(/^Restore /i.test(action))exp='The standard test configuration is restored and any cached state is handled according to the approved procedure.';
  }
  return [j+1,action,input,exp];
 });
 const last=9+stepRows.length;sh.getRange(`A10:D${last}`).values=stepRows;
 sh.getRange(`A10:D${last}`).format={wrapText:true,verticalAlignment:'top',borders:{preset:'all',style:'thin',color:line}};
 sh.getRange(`A10:A${last}`).format.horizontalAlignment='center';
 for(let j=0;j<stepRows.length;j++){
  const r=10+j;const lines=Math.max(...stepRows[j].slice(1).map((v,k)=>String(v).split('\n').reduce((n,s)=>n+Math.max(1,Math.ceil(s.length/(widths[k+1]*.84))),0)));
  sh.getRange(`A${r}:D${r}`).format.rowHeight=Math.max(60,lines*16+12);
 }
 const trace=last+2;sh.getRange(`A${last+1}:D${last+1}`).format.rowHeight=14;
 band(trace,'3. TRACEABILITY AND RESULT RECORD');
 sh.getRange(`A${trace+1}:D${trace+2}`).values=[['Requirement',req,'Trello Card',card],['Review Finding',finding||'Not linked to a specific finding','Design Review',review]];
 sh.getRange(`D${trace+2}`).formulas=[[`='Test Cases'!M${sourceRow}`]];
 sh.getRange(`A${trace+1}:D${trace+2}`).format={wrapText:true,verticalAlignment:'top',borders:{preset:'all',style:'thin',color:line},rowHeight:32};
 for(const r of [trace+1,trace+2])for(const c of ['A','C'])sh.getRange(`${c}${r}`).format={fill:gray,font:{name:'Times New Roman',size:12,bold:true}};
 sh.mergeCells(`A${trace+3}:D${trace+3}`);sh.getRange(`A${trace+3}`).values=[[`Record actual results in the Execution sheet under ${id}. Do not enter passwords or real student records. This specification contains expected behavior, not a completed test result.`]];
 sh.getRange(`A${trace+3}:D${trace+3}`).format={font:{name:'Times New Roman',size:11,italic:true,color:'#4D5961'},wrapText:true,rowHeight:35,verticalAlignment:'center'};
 sh.freezePanes.freezeRows(3);
 specifications.push({id,last:trace+3});
}
overview.getRange('A46').values=[['Individual specifications']];overview.getRange('A46').format.font={name:'Arial',size:13,bold:true,color:teal};
overview.getRange('A48:C48').values=[['Worksheet','Test title','Requirement']];overview.getRange('A48:C48').format={fill:'#1F3B50',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:32};
overview.getRange('A49:C108').values=rows.map(r=>[r[0],r[1],r[2]]);overview.getRange('A49:C108').format={font:{name:'Arial',size:11,color:'#263747'},wrapText:true,verticalAlignment:'top'};
for(let i=0;i<60;i++)overview.getRange(`A${49+i}:C${49+i}`).format.rowHeight=Math.max(35,Math.ceil(rows[i][1].length/27)*14+10);
overview.getRange('E48:G48').values=[['Reference layout','Where to go','Purpose']];overview.getRange('E48:G48').format={fill:'#1F3B50',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:32};
overview.getRange('E49:G52').values=[['TC-01 to TC-60','Worksheet tabs','Each case uses the overview and four-column steps format from your reference image.'],['Test Cases','Case register','The existing design register is retained for filtering and source traceability.'],['Execution','Actual results','Record status, actual outcome, tester, date, build, evidence and defects here.'],['Reference image','Layout only','Sample account names, percentage-grade thresholds and claimed outcomes were not adopted as AEWS requirements.']];
overview.getRange('E49:G52').format={font:{name:'Arial',size:11,color:'#263747'},wrapText:true,verticalAlignment:'top',rowHeight:52};
wb.recalculate();
if(overview.getRange('B7').values[0][0]!==60||overview.getRange('B11').values[0][0]!==60)throw new Error('Summary changed');
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:10},maxChars:1200})).ndjson);
for(let i=0;i<specifications.length;i++){
 const {id,last}=specifications[i];const img=await wb.render({sheetName:id,range:`A1:D${last}`,scale:1,format:'png'});await fs.writeFile(path.join(previews,id+'.png'),new Uint8Array(await img.arrayBuffer()));
 if(i%10===9)console.log('Rendered',i+1,'of 60 specifications');
}
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(dest);console.log('Saved reference-format workbook',dest);
