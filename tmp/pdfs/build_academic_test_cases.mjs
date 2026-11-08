import fs from 'node:fs/promises';
import path from 'node:path';
import {Workbook,SpreadsheetFile} from 'file:///C:/Users/Ian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=process.cwd(),dest=path.join(root,'output/AEWS_Card_Attachments/Card_03_Test_Cases/AEWS_Test_Cases.xlsx');
await fs.copyFile(dest,path.join(root,'tmp/pdfs/AEWS_Test_Cases_previous.xlsx'));
const original=JSON.parse(await fs.readFile(path.join(root,'tmp/pdfs/card_workbooks.json'),'utf8')).find(w=>w.card===3).sheets[0].rows;
// Title, role, test input, prerequisites. Cases retain the original forty IDs.
const meta=[
['Valid staff registration and verification','Staff applicant','Unique synthetic email; valid approved registration fields','Controlled mailbox and approved registration/verification rules.'],
['Duplicate and invalid registration','Staff applicant','Existing email; missing field; invalid email/college as separate variants','Existing synthetic account; reviewed field validation rules.'],
['Account approval state and login','Administrator / staff','Approved, pending and rejected synthetic accounts','Admin test account and reviewed account-state matrix.'],
['Login, logout and session expiry','Staff user','Valid/wrong password; expired session; signed-out request','Active staff account; means to inspect protected API responses.'],
['Password reset token lifecycle','Staff user','Valid, invalid, expired and reused reset links','Controlled email delivery; isolated account; approved token policy.'],
['Protected role operation denied','Instructor / unauthenticated','Protected read; administrative mutation without allowed role','Reviewed access matrix; two staff roles; resettable test state.'],
['Cross-instructor class isolation','Instructor A','Class B ID in read/edit/upload/archive requests','Class A owned by A; Class B owned by B; synthetic data only.'],
['Cross-student record isolation','Student A / unauthenticated','Student B identifier in dashboard and profile requests','Two synthetic students; approved private/public data policy.'],
['Class creation validation','Instructor','Valid class fields and missing-required-field variants','Authorized instructor and agreed required class fields.'],
['Class archive and restore consistency','Instructor','Synthetic class with linked enrollments','Resettable class and approved archive/restore semantics.'],
['Classlist identity reconciliation','Instructor','Synthetic_Classlist.xlsx with five known identities','Empty synthetic class; controlled email; fixture manifest.'],
['Gradesheet and attendance import mapping','Instructor','Synthetic_Gradesheet.xlsx; Synthetic_Attendance.xlsx','Roster already loaded; separate grade/attendance upload selections.'],
['Mismatches, duplicates and repeat uploads','Instructor','Mismatched ID/name; repeated upload; duplicate row','Saved baseline state; approved duplicate and partial-failure policy.'],
['Empty, malformed and unsupported uploads','Instructor','Empty file; malformed supported file; text/plain fixture','Isolated class; record pre-test state for comparison.'],
['Per-file and aggregate upload limits','Instructor','Otherwise valid files at/above 10 MiB; aggregate at/above 50 MiB','Endpoint supports tested upload mode; sufficient isolated storage.'],
['Whole, component and prior-term grades','Instructor','Known values for current/prior terms and grade components','Approved formulas/rounding; independent expected values.'],
['Missing and invalid grade handling','Instructor','Missing, zero sentinel, permitted extremes and invalid values','Approved grade-domain policy and resettable enrollment.'],
['Attendance computation and valid zero','Instructor','Known counts; 0%, 100%, missing and above 100%','Approved attendance denominator/status rules; fixture manifest.'],
['Whole-midterm referral boundary','Instructor / AMU','Separate 2.49, 2.50, 5.00 and invalid 5.01 records','Approved trigger policy; no pre-existing referral on test records.'],
['Component versus whole-grade referral','Instructor / AMU','Whole MTG below threshold with varied components; then threshold MTG','Approved whole-grade rule; isolated student; reset between variants.'],
['Referral linkage, scope and repeat update','Instructor / AMU','Eligible update repeated for the same synthetic enrollment','Known class/student and approved AMU assignment scope.'],
['Complete needs-assessment submission','Student / AMU','Valid invitation; all mandatory answers','Configured test form and invitation linked to Student A.'],
['Required and negative assessment answers','Student','Missing required field; genuine false/no answer in separate run','Known required fields and approved conditional validation.'],
['Assessment token validity and reuse','Student / unauthenticated','Invalid, expired and reused invitation tokens','Controlled invitations; approved expiry and reuse lifecycle.'],
['AMU prediction prerequisites','AMU staff','Complete fixture; remove each required source separately','Reviewed entry-point prerequisite matrix and test referral.'],
['Zero attendance and assessment completeness','AMU staff','0% attendance; genuine false answers; derived-score-only assessment','Valid MTG; independent reset for each source-data variant.'],
['Prediction repeatability and output meaning','AMU staff / instructor','Fixed complete input and fixed model/profile/version','Known artifact and approved label/probability definitions.'],
['Unavailable model and entry-point contract','AMU staff / instructor','Model unavailable in isolated config; controlled source combinations','Restart/cache-reset procedure and approved fallback policy.'],
['Support-routing persistence and isolation','AMU staff','Routing action for Student A referral','Two referrals and permitted routing options.'],
['Controlled notification and delivery failure','AMU staff','Test recipient; controlled queue/SMTP failure variant','Intercepted/test email, resettable notification state.'],
['Student own dashboard and required profile','Student A','Own known academic/referral data; incomplete academic profile','Test student login and fixture values; no real students.'],
['Allowed student profile update','Student A','Valid own field; invalid value; another student identifier','Approved editable-field list and ownership policy.'],
['Administrative account lifecycle','Administrator','Approve/decline request; archive/restore test account','Authorized admin; synthetic accounts and expected state rules.'],
['Assessment version and audit information','Administrator / student','Form edit; new and existing invitations','Test form/version and approved existing-invitation policy.'],
['Role dashboards and filtered totals','Instructor / AMU / admin','Known-count fixtures; search/filter; empty-result variant','Independently calculated totals and authorized scope.'],
['Export content and report layout','Authorized report user','Available format; long values; multi-page synthetic records','Approved report formulas, scope and active filters.'],
['Independent usability task walkthrough','Representative member','Written upload/referral/assessment tasks without coaching','Stable build; another member observes and records outcomes.'],
['Keyboard, viewport and recovery behavior','All relevant roles','Keyboard; agreed desktop/narrow viewports; controlled network error','Approved task/browser coverage and safe error simulation.'],
['Response-time baseline measurement','Authorized test user','100-student class; 20 runs per selected task','Approved timing boundary/targets; recorded environment and cold/warm conditions.'],
['End-to-end intervention and fix regression','Instructor / student / AMU / admin','Roster -> academic data -> referral -> assessment -> prediction -> routing -> report','Fixed build; valid full-source synthetic fixtures; prior defect steps.']
];
const cardFor=n=>n<=8?4:n<=15?5:n<=18?6:n<=24?7:n<=30?8:n<=34?4:n<=39?9:10;
const cases=original.map((r,i)=>({id:r[0],req:r[1].split(' ')[0],card:cardFor(i+1),title:meta[i][0],role:meta[i][1],priority:i>=36&&i<=38?'Medium':'High',type:i<8?'Functional / security':i>=36&&i<=38?'Quality attribute':'Functional / data',pre:meta[i][3],data:meta[i][2],steps:'1. Establish the stated test account, prerequisites and baseline state.\n2. '+r[2]+'\n3. Compare the response, interface and saved state with the expected result; record actual evidence. Use separate execution rows/suffixes for independent variants.',expected:r[3],finding:'',review:'Pending review'}));
function add(req,card,title,role,type,pre,data,steps,expected,finding,priority='High'){
 cases.push({id:'TC-'+String(cases.length+1).padStart(2,'0'),req,card,title,role,type,pre,data,steps:steps.map((s,i)=>(i+1)+'. '+s).join('\n'),expected,finding,priority,review:'Pending review'});
}
add('R03',4,'Reject untrusted role and user headers','Unauthenticated requester','Security','Isolated API; approved authenticated-identity contract.','Synthetic user/role headers; no valid bearer token',['Request a protected synthetic record using only client-declared user/role headers.','Repeat an otherwise privileged test mutation.','Inspect authorization response and unchanged protected state.'],'No private read or privileged mutation succeeds solely through untrusted client-declared identity. An approved trusted-gateway contract must be independently evidenced.','F01');
add('R02',4,'Invalid or expired token cannot fall back to declared identity','Unauthenticated requester','Security','Known test user; expired/invalid token fixture.','Invalid/expired token plus user/role headers',['Send a protected request with the invalid or expired token and declared test identity.','Inspect response and persisted state.'],'Request is denied; invalid credentials are not converted into authority by a fallback identity path.','F01');
add('R12',4,'Student profile read requires identity proof','Unauthenticated requester','Security','Private synthetic Student B record; approved access policy.','Student B identifier without valid student identity',['Request the student-profile API without authenticated student proof.','Inspect returned fields and access response.'],'Private profile fields are not disclosed through identifier knowledge alone; any approved public fields are explicitly scoped.','F02');
add('R12',4,'Student profile mutation cannot use another identifier','Student A','Security','Two student profiles; approved identity and edit rules.','Student B identifier with Student A context',['Record Student B baseline.','Attempt an allowed-looking profile change for Student B under Student A context.','Reload Student B through an authorized view.'],'Change is denied and Student B remains unchanged.','F02');
for(const source of ['midterm grades','attendance','genuine completed assessment'])add('R10',8,'AMU prediction missing '+source,'AMU staff','Negative / data','Complete synthetic referral; approved AMU source matrix.','Remove only '+source,['Save a complete baseline and remove the specified source.','Invoke AMU prediction.','Record missing-requirement metadata and inspect whether inference was called using safe test instrumentation.'],'Insufficient-data response identifies the missing source; no risk prediction is produced and inference is not invoked.','F03');
add('R10',8,'Entry-point prediction prerequisite agreement','Instructor / AMU','Integration / data','Approved per-entry-point matrix; same synthetic enrollment/model.','Matched complete/incomplete source combinations',['Submit the same source combinations to the permitted instructor and AMU prediction workflows.','Compare availability decisions with each approved entry-point rule.','Record differences and their approved rationale.'],'Each entry point follows its documented prerequisite contract; unintended differences are logged rather than normalized into a pass.','F03');
for(const [label,value] of [['zero','0'],['negative','-1'],['above scale','5.01'],['non-finite','NaN / infinity']])add('R06',6,'Reject or explicitly handle '+label+' whole grade','Instructor / AMU','Boundary / data','Approved 1.00-5.00 whole-grade domain or recorded alternative; isolated enrollment.','Whole midterm = '+value,['Record valid baseline.','Submit the invalid/sentinel grade through the selected supported import/update path.','Check saved values, referral behavior and inference eligibility.'],'Invalid grade cannot silently become a valid academic value, referral input or prediction source. Any approved missing sentinel produces missing-data handling. Use separate rows for NaN and infinity.','F04');
add('R10',8,'Separate risk and intervention-cause labels','AMU staff','AI / integration','Approved output schema; known test input/model.','Risk category; Academic Problem / External Factor; probability metadata',['Capture API output for a fixed complete fixture.','Compare risk, intervention-cause label, source and probability with UI/report.','Check each field against the approved definitions.'],'Distinct concepts remain distinguishable; field mappings, probability units and explanations agree across views.','F05');
add('R10',8,'Fallback provenance is distinguishable','AMU staff / instructor','AI / negative','Isolated missing-model configuration; approved fallback policy.','Complete input with model artifact unavailable',['Make the artifact unavailable using the approved test configuration and reset caches.','Run prediction and inspect provenance in API/UI.','Restore the normal model configuration.'],'Fallback/unavailability follows the approved contract; heuristic output is not represented as a trained-model evaluation or calibrated accuracy.','F05');
add('R16',9,'Performance criteria approved before acceptance','QA coordinator','Review / performance','Test Plan version 2.0; named target approver.','Timing boundary, workload, cold/warm policy, p95 targets',['Review target approval, environment, workload and timing method.','Record missing decisions before performing acceptance assessment.'],'Acceptance is assessed only against approved targets under recorded conditions. Otherwise the affected measurement/acceptance case is Blocked, not Pass.','F06','Medium');
add('R10',8,'Model evaluation evidence and leakage review','Model evaluator','AI / review','Evaluation artifact and dataset provenance available.','Split, sample/class counts, confusion matrix, High Risk recall, F1',['Identify model and dataset versions.','Review train/test separation and student/target leakage.','Reconcile reported metrics with saved evaluation output and record limitations.'],'Reported metrics are traceable and suitable for the stated evaluation; unsupported accuracy or real-world effectiveness claims are not accepted. Missing evidence blocks the claim.','F06');
add('R05',5,'Duplicate upload policy is deterministic','Instructor','Data / regression','Approved duplicate policy; saved baseline roster.','Negative_Duplicate_Classlist.xlsx and repeat valid upload',['Record original IDs and counts.','Upload duplicate fixture and repeat valid fixture as separate runs.','Reconcile records, messages and approved reject/update behavior.'],'No unintended duplicate or cross-student write; outcome follows the approved policy with clear feedback.','F07');
add('R05',5,'Partial invalid import preserves defined state','Instructor','Negative / data','Approved atomic/partial-import policy; resettable class.','One valid row and one invalid/mismatched row',['Save baseline state.','Upload the mixed-validity file.','Inspect response, accepted/rejected row accounting and saved records.'],'Import follows the approved atomic or partial policy; no unreported partial writes or accidental overwrite occurs.','F07');
add('R09',7,'Expired or consumed invitation follows policy','Student','Security / lifecycle','Approved invitation expiry/reuse policy and controlled clock/state.','Expired token; consumed token in independent runs',['Prepare an expired or consumed synthetic invitation.','Attempt form access and submission.','Inspect record changes and response.'],'Expiry/reuse policy is enforced without exposing another student or creating unintended duplicate answers.','F07');
add('R13',4,'Existing invitation retains approved form version','Administrator / student','Integration / lifecycle','Known form version; invitation created before edit.','Old invitation; new invitation after form edit',['Create original invitation.','Edit the form as authorized admin and create a new invitation.','Open both and compare rendered fields, validation and version linkage.'],'New and existing invitations follow the approved versioning policy; submitted answers remain interpretable under the correct form definition.','F07');
if(cases.length!==60)throw new Error('Expected 60 cases');
const wb=Workbook.create(),overview=wb.worksheets.add('Overview'),design=wb.worksheets.add('Test Cases'),run=wb.worksheets.add('Execution');
const header=8,first=9,last=header+cases.length;
function col(n){let s='';for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function base(sh,title,note){sh.showGridLines=false;sh.getRange('A2').values=[[title]];sh.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#173F59'};sh.getRange('A4').values=[[note]];sh.getRange('A4').format.font={name:'Arial',size:10,color:'#536779'};sh.getRange('A2').format.rowHeight=26;}
function grid(sh,heads,rows,widths,name){
 const end=col(heads.length);sh.getRange(`A${header}:${end}${last}`).values=[heads,...rows];
 sh.getRange(`A${header}:${end}${last}`).format={font:{name:'Arial',size:10,color:'#24374A'},wrapText:true,verticalAlignment:'top'};
 sh.getRange(`A${header}:${end}${header}`).format={fill:'#173F59',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:32,wrapText:true,verticalAlignment:'center',horizontalAlignment:'center'};
 for(let i=0;i<widths.length;i++)sh.getRange(`${col(i+1)}1:${col(i+1)}${last}`).format.columnWidth=widths[i];
 sh.tables.add(`A${header}:${end}${last}`,true,name).showFilterButton=true;
 sh.freezePanes.freezeRows(header);sh.freezePanes.freezeColumns(2);
}
base(design,'AEWS Test Cases','Review the design before execution. TC-01 to TC-40 retain the original mappings; TC-41 to TC-60 address review findings.');
const heads=['Case ID','Test title','Requirement','Trello card','Priority','Test type','Role / actor','Preconditions','Test data / variants','Numbered procedure','Expected result','Review finding','Design review'];
const rows=cases.map(c=>[c.id,c.title,c.req,c.card,c.priority,c.type,c.role,c.pre,c.data,c.steps,c.expected,c.finding,c.review]);
grid(design,heads,rows,[14,44,16,14,14,24,26,48,48,76,74,17,23],'AEWSTestDesign');
design.getRange(`M${first}:M${last}`).format.fill='#FFF5D7';design.getRange(`M${first}:M${last}`).dataValidation={rule:{type:'list',values:['Pending review','Approved','Revision needed']}};
for(let i=0;i<cases.length;i++){
 const c=cases[i];const stepsLines=c.steps.split('\n').reduce((n,s)=>n+Math.ceil(s.length/85),0);
 design.getRange(`A${first+i}:M${first+i}`).format.rowHeight=Math.max(105,stepsLines*13+16);
}
base(run,'AEWS Test Execution','Yellow fields are completed after actual execution. One row is one case result; use a saved copy for another build/run.');
const runHeads=['Case ID','Test title','Status','Actual result / blocking reason','Tester','Execution date','Build / version','Environment','Evidence file / link','Bug ID','Reviewer / review date','Execution variant / notes'];
grid(run,runHeads,cases.map(c=>[c.id,c.title,'Not run','','',null,'','','','','','']),[14,44,17,65,23,19,28,38,48,22,35,50],'AEWSTestExecution');
run.getRange(`C${first}:L${last}`).format.fill='#FFF5D7';run.getRange(`A${first}:L${last}`).format.rowHeight=65;
// Immutable case IDs identify each execution record when users filter or sort a complete table.
run.getRange(`C${first}:C${last}`).dataValidation={rule:{type:'list',values:['Not run','Pass','Fail','Blocked']}};
run.getRange(`F${first}:F${last}`).setNumberFormat('yyyy-mm-dd');
for(const [text,fill] of [['Fail','#FCE4E2'],['Blocked','#FFEAC4']])run.getRange(`C${first}:C${last}`).conditionalFormats.add('containsText',{text,format:{fill}});

base(overview,'AEWS QA Test Case Workbook','AEWS-QA-TC-001 | Version 2.0 | Prepared 7 November 2026 | Trello Card 3');
overview.getRange('A1:F59').format.font={name:'Arial',size:10,color:'#24374A'};
for(const [c,w] of [['A',29],['B',26],['C',22],['D',5],['E',29],['F',24],['G',45]])overview.getRange(`${c}1:${c}59`).format.columnWidth=w;
overview.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#173F59'};
overview.getRange('A6:B6').values=[['Execution metric','Value']];overview.getRange('E6:F6').values=[['Design metric','Value']];
overview.getRange('A7:A15').values=[['Planned cases'],['Pass'],['Fail'],['Blocked'],['Not run'],['Executed'],['Execution rate'],['Pass rate (executed)'],['Unclassified statuses']];
const count=s=>`COUNTIFS(Execution!$C$${first}:$C$${last},"${s}")`;
overview.getRange('B7:B15').formulas=[[`=COUNTA('Test Cases'!A${first}:A${last})`],[`=${count('Pass')}`],[`=${count('Fail')}`],[`=${count('Blocked')}`],[`=${count('Not run')}`],['=SUM(B8:B9)'],['=IF(B7=0,"N/A",B12/B7)'],['=IF(B12=0,"N/A",B8/B12)'],['=B7-SUM(B8:B11)']];
overview.getRange('B13:B14').setNumberFormat('0.0%');
overview.getRange('E7:E11').values=[['Original mapped cases'],['Review-finding additions'],['Designs approved'],['Design review pending'],['Needs revision']];
overview.getRange('F7:F11').formulas=[['=B7-F8'],['=SUM('+Array.from({length:7},(_,i)=>`COUNTIFS('Test Cases'!L${first}:L${last},"F0${i+1}")`).join(',')+')'],[`=COUNTIFS('Test Cases'!M${first}:M${last},"Approved")`],[`=COUNTIFS('Test Cases'!M${first}:M${last},"Pending review")`],[`=COUNTIFS('Test Cases'!M${first}:M${last},"Revision needed")`]];
// Original mapping count is based on the fixed original suite boundary, independent of blank-search behavior.
overview.getRange('A17:C17').values=[['Requirement','Feature group','Planned cases']];
const reqNames=['Accounts','Sessions','Role / ownership access','Classes','Academic imports','Grades','Attendance','Referral','Needs assessment','Prediction','Routing / communication','Student portal','Administration','Reports','Usability','Performance','Integration'];
for(let i=0;i<17;i++){
 const row=18+i,id='R'+String(i+1).padStart(2,'0');overview.getRange(`A${row}:B${row}`).values=[[id,reqNames[i]]];
 overview.getRange(`C${row}`).formulas=[[`=COUNTIFS('Test Cases'!$C$${first}:$C$${last},A${row})`]];
}
overview.getRange('E17:G17').values=[['How to use','Action','Meaning']];
const usage=[['1. Review','Test Cases','Review the proposed preconditions, data, procedure and expected result before running.'],['2. Approve','Design review','Record Approved only after actual review; resolve unclear expected behavior.'],['3. Execute','Execution','Use the matching Case ID. Fill status, observed result, tester, date, build and evidence.'],['4. Variants','Separate outcomes','For grouped variants, duplicate the workbook per variant or add uniquely identified cases to BOTH tables.'],['5. Failures','Bug ID','Link observed failures to Card 10; do not replace the original expected result.'],['6. Readiness','Card 11','Passing some cases is not overall QA approval. Review remaining failures and blockers.'],['7. Preserve IDs','Sort whole tables','Keep case IDs immutable. Filter or sort COMPLETE tables; never sort a single column.'],['8. Retests','New saved copy','Save a new run copy per build and retain failed evidence in the earlier copy.'],['Status','Not run','No execution yet.'],['Status','Pass','Observed result meets ALL approved expected conditions.'],['Status','Fail','An observed result differs from the approved expectation.'],['Status','Blocked','A dependency, environment or unresolved requirement prevents valid execution.'],['Inputs','Yellow cells','Execution entries and design-review decisions are editable.'],['Privacy','Synthetic evidence','Keep real grades, assessment disclosures, passwords and tokens off the public board.'],['Terms','Test identifiers','TC = test case; R = requirement; F = review finding.'],['Scope','Review checks','TC-41 to TC-60 implement supplemental scenarios from F01-F07.'],['Counting','Case versus variant','Summary counts workbook rows. Report variant runs separately and consistently.']];
usage[3][2]='Keep separate saved run copies for independent variants; summarize all required variants before marking the grouped case Pass.';
usage[16][2]='Summary counts these 60 case rows in this file. It does not aggregate other saved runs. Extend formulas and both tables if adding cases.';
overview.getRange(`E18:G${17+usage.length}`).values=usage;
overview.getRange('A17:G34').format.wrapText=true;overview.getRange('A18:G34').format.verticalAlignment='top';overview.getRange('A18:G34').format.rowHeight=55;
overview.getRange('E36').values=[['Document alignment and sources']];
const sources=[
['Primary baseline','AEWS-QA-RR-001 version 2.0, requirements R01-R17 and findings F01-F07.'],
['Test approach','AEWS-QA-TP-001 version 2.0, sections 1-4 and 8-10. Targets/entry-point contracts require actual approval.'],
['Assessment','IT143_CO3_MajorAssessment_Guidelines.pdf, pp. 1-3; Rubric for Group Activity using Trello.pdf, p. 1.'],
['Project source','AEWS source: frontend/src/App.jsx; backend/app/authz.py; backend/app/routers/classes.py, students.py, amu_staff.py, admin.py; backend/app/ai_model.py.'],
['Fixture basis','Card 5 synthetic roster/grades/attendance. Baseline MTG: 2.25, 2.49, 2.50, 3.00, 5.00; attendance: 100%, 80%, 60%, 0%, 100%.'],
['Model basis','backend/MODEL_DOCUMENTATION.md; backend/tests/test_amu_prediction_requirements.py. Source documentation is not proof of live-system behavior.'],
['Validation rule','When a business policy is unresolved, record Blocked instead of inventing an expected result.'],
['Performance','Proposed p95 limits: dashboard/search <=3 s; prediction <=5 s; twenty single-user runs, 100-student fixture. Approve before judging acceptance.']];
// Long reference text occupies an intentionally wide notes column rather than merged cells.
overview.getRange('E38:G45').values=sources.map(([label,source])=>[label,'',source]);
overview.getRange('E38:G45').format.wrapText=true;overview.getRange('E38:G45').format.verticalAlignment='top';overview.getRange('E38:G45').format.rowHeight=70;
for(const range of ['A6:B6','E6:F6','A17:C17','E17:G17'])overview.getRange(range).format={fill:'#173F59',font:{name:'Arial',bold:true,color:'#FFFFFF',size:10},rowHeight:30,wrapText:true,verticalAlignment:'center'};
overview.getRange('E36').format.font={name:'Arial',bold:true,size:12,color:'#173F59'};
overview.getRange('B15').conditionalFormats.add('cellIs',{operator:'greaterThan',formula:0,format:{fill:'#FCE4E2',font:{color:'#9E2825',bold:true}}});
overview.freezePanes.freezeRows(6);
// Meaningful input-change checks: counts, rates and design approval must react, then restore.
wb.recalculate();
const value=a=>overview.getRange(a).values[0][0];
if(value('B7')!==60||value('B11')!==60||value('F7')!==40||value('F8')!==20)throw new Error('Initial suite counts incorrect '+JSON.stringify(overview.getRange('A7:B15').values));
run.getRange('C9:C11').values=[['Pass'],['Fail'],['Blocked']];design.getRange('M9').values=[['Approved']];wb.recalculate();
if(value('B8')!==1||value('B9')!==1||value('B10')!==1||value('B11')!==57||value('B12')!==2||value('B14')!==.5||value('F9')!==1)throw new Error('Input change check failed');
run.getRange('C9:C11').values=[['Not run'],['Not run'],['Not run']];design.getRange('M9').values=[['Pending review']];wb.recalculate();
if(value('B14')!=='N/A'||value('B15')!==0||value('F10')!==60)throw new Error('Initial state restore failed');
console.log((await wb.inspect({kind:'region',sheetId:overview.name,range:'A6:E15',maxChars:2500})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:20},maxChars:1500})).ndjson);
const previewDir=path.join(root,'tmp/pdfs/academic_cases_review');await fs.mkdir(previewDir,{recursive:true});
for(const [sh,range,name] of [[overview,'A1:G34','overview'],[overview,'E36:G46','references'],[design,'A8:F12','design_ids'],[design,'G8:M11','design_procedure'],[design,'H49:M52','supplemental'],[run,'A1:F12','execution'],[run,'G8:L11','execution_evidence']]){
 const img=await wb.render({sheetName:sh.name,range,scale:1,format:'png'});await fs.writeFile(path.join(previewDir,name+'.png'),new Uint8Array(await img.arrayBuffer()));
}
await fs.writeFile(path.join(root,'tmp/pdfs/academic_cases.json'),JSON.stringify(cases,null,2));
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(dest);console.log('Saved',dest,'with',cases.length,'test cases across three sheets.');
