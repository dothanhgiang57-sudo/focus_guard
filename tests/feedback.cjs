const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/app-harness.cjs');
require('../alert-core.js');require('../records.js');
const A=globalThis.FocusAlerts,R=globalThis.FocusRecords;
async function studying(options={}){const h=harness({ai:true,camera:true,...options});await h.settle();h.e.faceMode.checked=true;await h.e.startBtn.click();return h;}
async function signal(h,key,wait=2000){h.result.key=key;h.result.reason='AI '+key;await h.infer();await h.advance(wait);await h.infer();await h.settle();}
const record=h=>JSON.parse(h.storage.get('denban.history'))[0];
const choose=async(h,key,value)=>{h.e[key+'Sensitivity'].value=value;await h.e[key+'Sensitivity'].dispatch('change');};

test('feedback has stable IDs, is idempotent, stops audio and updates the same saved record',async()=>{
 const h=await studying();await signal(h,'left');await h.advance(1500);await h.e.saveSessionBtn.click();const before=record(h),id=before.events[0].id;
 assert.equal(h.e.falseAlert.dataset.eventId,id);const tones=h.tones.length;
 await h.e.falseAlert.click();const after=record(h);
 assert.equal(after.id,before.id);assert.equal(JSON.parse(h.storage.get('denban.history')).length,1);
 assert.equal(after.events.length,1);assert.equal(after.events[0].id,id);assert.equal(after.events[0].falsePositive,true);assert.ok(after.events[0].feedbackAt);
 assert.equal(after.distractions,0);assert.equal(after.distracted,0);assert.equal(after.userConfirmed,1500);assert.equal(after.estimatedFocused,2000);assert.equal(after.focused,3500);assert.equal(after.longestStreak,3500);
 assert.equal(after.elapsed,after.estimatedFocused+after.userConfirmed+after.distracted);assert.equal(h.e.alertBanner.hidden,true);assert.equal(h.e.falseAlert.hidden,true);
 assert.match(h.e.toast.textContent,/Đã ghi nhận. Tạm ngừng nhắc lỗi này trong 30 giây./);assert.ok(h.stops.includes(undefined),'Already scheduled tones are stopped immediately');
 await h.e.falseAlert.click();assert.deepEqual(record(h),after);assert.equal(h.tones.length,tones);
 assert.equal(R.summarize([after]).reasons.length,0);assert.equal(R.summarize([after]).distractions,0);
 assert.ok(h.e.logList.children.some(li=>li.children.some(c=>String(c.textContent).includes('Người dùng báo cảnh báo sai'))));
 await h.e.backupBtn.click();assert.equal(h.downloads.length,1);assert.deepEqual(JSON.parse(await h.blobs.at(-1).text()).sessions,[after]);
 assert.deepEqual(R.importRecords(JSON.parse(JSON.stringify({sessions:[after]})),[after]),[after]);
 h.e.importFile.files=[{size:1000,text:async()=>JSON.stringify({sessions:[after]})}];const importing=h.e.importFile.dispatch('change');await h.settle();await h.e.confirmDialog.close('confirm');await importing;assert.equal(record(h).events[0].falsePositive,true);
 const finish=h.e.finishBtn.click();await h.e.confirmDialog.close('confirm');await finish;assert.equal(record(h).events[0].id,id);assert.equal(record(h).distractions,0);
});

test('only the reported category is suppressed for exactly 30 seconds; other camera errors still alert',async()=>{
 const h=await studying();await signal(h,'left');await h.e.falseAlert.click();
 const settingsBefore=h.storage.get('denban.settings');
 await signal(h,'right');assert.equal(h.e.alertBanner.hidden,true,'Left/right share the head-turn category');
 await signal(h,'phone',3100);assert.equal(h.e.alertBanner.hidden,false);assert.equal(h.e.distractCount.textContent,1);
 await h.e.saveSessionBtn.click();let s=record(h);assert.equal(s.events.length,2);assert.equal(s.events[0].falsePositive,true);assert.equal(s.events[1].falsePositive,false);assert.equal(R.summarize([s]).reasons[0].reason,'AI phone');
 assert.equal(h.storage.get('denban.settings'),settingsBefore,'Feedback never changes sensitivity');
 h.result.key='right';await h.infer();h.elapse(24899);await h.infer();assert.equal(h.e.alertBanner.hidden,true);
 await h.advance(1);await h.infer();assert.equal(h.e.alertBanner.hidden,true,'First post-window sample cannot alert');
 await h.advance(1799);await h.infer();assert.equal(h.e.alertBanner.hidden,true);
 await h.advance(1);await h.infer();assert.equal(h.e.alertBanner.hidden,false,'Fresh observations must persist for the entire threshold');
});

test('delayed in-flight AI results and old event clicks cannot report a different alert',async()=>{
 const h=await studying();await signal(h,'left');const oldId=h.e.falseAlert.dataset.eventId;await h.e.falseAlert.dispatch('pointerdown');
 await signal(h,'phone',3100);const phoneId=h.e.falseAlert.dataset.eventId;assert.notEqual(phoneId,oldId);
 await h.e.falseAlert.click();assert.equal(h.e.alertBanner.hidden,false);assert.equal(h.e.distractCount.textContent,2,'Stale head-turn action cannot correct phone event');
 let resolve;h.setAnalyzeHook(()=>new Promise(r=>resolve=r));const pending=h.infer();await h.e.falseAlert.click();resolve({...h.result});await pending;assert.equal(h.e.alertBanner.hidden,true);
 h.setAnalyzeHook(null);h.elapse(30000);let resolveOld;h.setAnalyzeHook(()=>new Promise(r=>resolveOld=r));const delayed=h.infer();h.elapse(3000);resolveOld({...h.result});await delayed;assert.equal(h.e.alertBanner.hidden,true,'Slow result is discarded');
 h.setAnalyzeHook(null);await h.infer();await h.advance(2999);await h.infer();assert.equal(h.e.alertBanner.hidden,true);await h.advance(1);await h.infer();assert.equal(h.e.alertBanner.hidden,false);
});

test('cross-boundary AI and cached phone evidence are discarded after suppression',async()=>{
 const h=await studying();await signal(h,'phone',3100);await h.e.falseAlert.click();
 h.elapse(29900);let resolve;h.setAnalyzeHook(()=>new Promise(r=>resolve=r));const pending=h.infer();h.elapse(100);resolve({...h.result});await pending;assert.equal(h.e.alertBanner.hidden,true);
 h.setAnalyzeHook(null);const resets=h.activityResets();await h.infer();assert.ok(h.activityResets()>resets,'Object evidence restarts at expiry');await h.advance(2999);await h.infer();assert.equal(h.e.alertBanner.hidden,true);await h.advance(1);await h.infer();assert.equal(h.e.alertBanner.hidden,false);
});

test('pause/resume uses fresh samples; finish, reset and next session clear suppression',async()=>{
 const h=await studying();await signal(h,'left');await h.e.falseAlert.click();await h.e.pauseBtn.click();await h.advance(10000);await h.infer();assert.equal(h.e.sessionTime.textContent,'00:02');await h.e.pauseBtn.click();await signal(h,'left');assert.equal(h.e.alertBanner.hidden,true,'Same session retains the remaining wall-clock suppression');
 h.elapse(18000);await h.infer();assert.equal(h.e.alertBanner.hidden,true);await h.advance(1800);await h.infer();assert.equal(h.e.alertBanner.hidden,false);
 await h.e.falseAlert.click();const finish=h.e.finishBtn.click();await h.e.confirmDialog.close('confirm');await finish;await h.e.startBtn.click();await signal(h,'left');assert.equal(h.e.alertBanner.hidden,false,'New session does not inherit suppression');
 await h.e.falseAlert.click();const reset=h.e.resetSessionBtn.click();await h.e.confirmDialog.close('confirm');await reset;await signal(h,'left');assert.equal(h.e.alertBanner.hidden,false,'Reset clears suppression even in preview');
 await h.e.startBtn.click();await signal(h,'left');assert.equal(h.e.alertBanner.hidden,false);
});

test('dismiss, tab warnings and AI failures never count as false-positive feedback',async()=>{
 const h=await studying();await signal(h,'left');await h.e.dismissAlert.click();assert.equal(h.e.alertBanner.hidden,true);await h.e.saveSessionBtn.click();assert.equal(record(h).events[0].falsePositive,false);assert.equal(record(h).distractions,1);
 h.doc.hidden=true;await h.doc.dispatch('visibilitychange');assert.equal(h.e.falseAlert.hidden,true);await h.e.falseAlert.click();await h.e.saveSessionBtn.click();assert.equal(record(h).distractions,2);assert.equal(record(h).events[1].source,'tab');
 const bad=harness({camera:false,ai:false});await bad.settle();assert.equal(bad.e.falseAlert.hidden,true);await bad.e.falseAlert.click();assert.equal(bad.storage.has('denban.history'),false);
});

test('all legacy sensitivities preserve their exact delays and each preference persists independently',async()=>{
 for(const sensitivity of [1,2,3]){
  const old=A.preferences({sensitivity});assert.equal(old.cameraSensitivity.phone,sensitivity);assert.equal(old.cameraSensitivity.turn,sensitivity);assert.equal(old.cameraSensitivity.noface,sensitivity);
  for(const [key,delay] of [['left',{1:3000,2:1800,3:900}[sensitivity]],['phone',3000],['noface',4000],['down',5000],['eyes',Math.max({1:3000,2:1800,3:900}[sensitivity],2200)]])assert.equal(A.delay(old,key),delay);
  assert.deepEqual(A.preferences(JSON.parse(JSON.stringify(old))),old);
 }
 const h=await studying({settings:{sensitivity:1,sound:false}});assert.match(h.e.phoneSensitivityHelp.textContent,/cài đặt cũ/);
 await choose(h,'phone',3);let settings=JSON.parse(h.storage.get('denban.settings'));assert.equal(A.delay(settings,'phone'),2000);assert.equal(A.delay(settings,'noface'),4000);assert.equal(A.delay(settings,'left'),3000);assert.equal(settings.sound,false);
 await choose(h,'turn',3);settings=JSON.parse(h.storage.get('denban.settings'));assert.equal(A.delay(settings,'down'),3000);assert.equal(A.delay(settings,'eyes'),3000,'Eye configuration stays unchanged');
 const reload=harness({settings});await reload.settle();assert.equal(reload.e.phoneSensitivity.value,3);assert.equal(reload.e.turnSensitivity.value,3);
 await h.e.resetCameraSensitivity.click();settings=JSON.parse(h.storage.get('denban.settings'));assert.deepEqual(settings.cameraSensitivity,{phone:2,turn:2,noface:2});assert.deepEqual(settings.legacyCameraDelays,{});assert.equal(settings.sensitivity,1);assert.equal(settings.sound,false);
 for(const key of ['phone','left','down','noface']){const s=A.preferences({cameraSensitivity:{phone:1,turn:1,noface:1}}),m=A.preferences({cameraSensitivity:{phone:2,turn:2,noface:2}}),f=A.preferences({cameraSensitivity:{phone:3,turn:3,noface:3}});assert.ok(A.delay(s,key)>A.delay(m,key));assert.ok(A.delay(m,key)>A.delay(f,key));}
});

test('PiP feedback synchronizes with the main session and rejects obsolete PiP buttons',async()=>{
 const h=await studying({pip:true});h.e.studyMode.value='screen';await h.e.studyMode.dispatch('change');await h.e.pipButton.click();h.doc.hidden=true;await h.doc.dispatch('visibilitychange');await signal(h,'left');
 const oldButton=h.pipPanel().feedback;assert.equal(oldButton.textContent,'Mình đang học');await h.e.saveSessionBtn.click();await oldButton.click();assert.equal(h.e.alertBanner.hidden,true);assert.equal(h.pipPanel().body.dataset.alarm,'false');assert.match(h.pipPanel().notice.textContent,/Đã ghi nhận/);assert.equal(record(h).distractions,0);
 await signal(h,'phone',3100);const nextId=h.e.falseAlert.dataset.eventId;await oldButton.click();assert.equal(h.e.falseAlert.dataset.eventId,nextId);assert.equal(h.e.distractCount.textContent,1);assert.equal(h.pipPanel().body.dataset.alarm,'true');
 await h.e.falseAlert.click();assert.equal(h.pipPanel().feedback,undefined);assert.equal(h.pipPanel().body.dataset.alarm,'false');assert.equal(record(h).events.filter(e=>e.falsePositive).length,2);
});

test('multiple feedback windows do not double-count time, and export/import preserves every annotation',async()=>{
 const h=await studying();await signal(h,'left');await h.advance(500);await h.e.falseAlert.click();await signal(h,'phone',3100);await h.advance(400);await h.e.falseAlert.click();await h.advance(1000);await h.e.saveSessionBtn.click();const s=record(h);
 assert.equal(s.elapsed,s.estimatedFocused+s.userConfirmed+s.distracted);assert.equal(s.distracted,0);assert.equal(s.distractions,0);assert.equal(s.events.length,2);assert.equal(s.userConfirmed,500+3100+400+1000);
 const copy=R.importRecords({sessions:[s]},[])[0];assert.deepEqual(copy,s);assert.equal(R.summarize([copy]).reasons.length,0);assert.equal(copy.longestStreak<=copy.focused,true);
 await h.e.exportBtn.click();assert.equal(h.downloads.length,1);const exported=JSON.parse(await h.blobs.at(-1).text());assert.deepEqual(R.normalize(exported),s);assert.ok(s.events.every(e=>e.id&&e.feedbackAt&&e.falsePositive));
});

test('preview feedback stays outside history and storage errors retain the correction for retry',async()=>{
 const preview=harness({ai:true,camera:true});await preview.settle();await signal(preview,'noface',4100);await preview.e.falseAlert.click();assert.equal(preview.storage.has('denban.history'),false);await signal(preview,'noface',4100);assert.equal(preview.e.alertBanner.hidden,true);await preview.e.startBtn.click();await signal(preview,'noface',4100);assert.equal(preview.e.alertBanner.hidden,false);
 const h=await studying();await signal(h,'eyes',2300);await h.advance(1000);await h.e.saveSessionBtn.click();const write=h.env.localStorage.setItem;h.env.localStorage.setItem=()=>{throw new Error('quota')};await h.e.falseAlert.click();assert.equal(h.e.alertBanner.hidden,true);assert.match(h.e.toast.textContent,/Chưa cập nhật được bản lưu/);assert.equal(record(h).events[0].falsePositive,false,'Failed storage does not pretend to have persisted');h.env.localStorage.setItem=write;await h.e.saveSessionBtn.click();assert.equal(record(h).events[0].falsePositive,true);assert.equal(record(h).distractions,0);
});

test('feedback windows reject tab/errors, remain independent, and reset in memory',()=>{
 const w=new A.FeedbackWindow();assert.equal(w.accept('tab','tab',0),false);assert.equal(w.accept('err','error',0),false);assert.equal(w.accept('one','phone',1000),true);assert.equal(w.accept('one','phone',2000),false);assert.equal(w.until.get('phone'),31000);
 assert.equal(w.suppressed('phone',30999),true);assert.equal(w.suppressed('phone',31000),false);assert.equal(w.allows('phone',32000,30999),false);assert.equal(w.allows('phone',32000,31000),true);
 for(const key of ['left','down','noface','eyes'])assert.equal(w.allows(key,2000,2000),true);
 w.reset();assert.equal(w.allows('phone',2000,2000),true);assert.equal(w.handled.size,0);
});

test('corrected streaks never bridge a pause, and an open history detail refreshes with feedback',async()=>{
 const h=await studying();await h.advance(5000);await h.e.pauseBtn.click();await h.advance(20000);await h.e.pauseBtn.click();await signal(h,'left');await h.advance(1000);await h.e.saveSessionBtn.click();
 const row=h.e.historyList.children[0],actions=row.children.at(-1);await actions.children[0].click();assert.match(h.e.detailSummary.textContent,/1 lần/);
 await h.e.falseAlert.click();const s=record(h);assert.equal(s.longestStreak,5000);assert.equal(h.e.focusStreak.textContent,'00:03');assert.match(h.e.detailSummary.textContent,/0 lần/);assert.match(h.e.detailSummary.textContent,/tự xác nhận 00:01/);assert.match(h.e.detailEvents.children[0].children[0].textContent,/Người dùng báo cảnh báo sai/);
});
