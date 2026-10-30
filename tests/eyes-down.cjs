const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/app-harness.cjs');
require('../pose-core.js');
require('../activity-core.js');
const {PoseTracker}=globalThis.FocusPose;
const {ActivityTracker}=globalThis.FocusActivity;

// Synthetic face landmarks: change eye opening independently from head pitch.
function face(pitch=0,opening=.3){
 const radians=pitch*Math.PI/180;
 const landmarks=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
 for(const ids of [[362,385,387,263,373,380],[33,160,158,133,153,144]]){
  const points=[[.4,.5],[.45,.5-opening*.1],[.55,.5-opening*.1],[.6,.5],[.55,.5+opening*.1],[.45,.5+opening*.1]];
  ids.forEach((id,index)=>{landmarks[id]={x:points[index][0],y:points[index][1],z:0};});
 }
 return {faceLandmarks:[landmarks],facialTransformationMatrixes:[{data:[1,0,0,0,0,Math.cos(radians),Math.sin(radians),0,0,-Math.sin(radians),Math.cos(radians),0,0,0,-50,1]}]};
}
function calibrated(){const tracker=new PoseTracker();for(let i=0;i<16;i++)tracker.analyze(face(),4/3,i*350);return tracker;}
function pose(tracker,pitch,opening,options){let result;for(let i=0;i<3;i++)result=tracker.analyze(face(pitch,opening),4/3,5600+i*350,options);return result;}

for(const allowWriting of [true,false])test(`closed eyes while looking down are detected in ${allowWriting?'writing':'screen'} mode`,()=>{
 for(const pitch of [13,25,40]){
  const detected=pose(calibrated(),pitch,.05,{allowWriting});
  assert.equal(detected.key,'eyes');assert.equal(detected.reason,'Mắt nhắm kéo dài');assert.equal(detected.direction,'down');
  const activity=new ActivityTracker();
  const objects=[{boundingBox:{originX:280,originY:300,width:80,height:100},categories:[{categoryName:'cell phone',score:.9},{categoryName:'book',score:.9}]}];
  activity.analyze(detected,objects,640,480,7000);
  assert.equal(activity.analyze(detected,objects,640,480,8050).key,'eyes','Phone/book evidence cannot override closed-eye detection');
 }
 const open=pose(calibrated(),30,.3,{allowWriting});
 const narrowed=pose(calibrated(),30,.23,{allowWriting});
 assert.equal(open.key,allowWriting?null:'down');assert.equal(narrowed.key,allowWriting?null:'down');
 const tracker=calibrated();pose(tracker,30,.05,{allowWriting});
 let reopened;for(let i=0;i<3;i++)reopened=tracker.analyze(face(30,.3),4/3,7000+i*350,{allowWriting});
 assert.equal(reopened.key,allowWriting?null:'down','Reopening eyes restores the normal downward-posture rule');
});

for(const studyMode of ['writing','screen'])test(`real pose results trigger a delayed eyes alert, PiP and history in ${studyMode} mode`,async()=>{
 const h=harness({ai:true,camera:true,pip:true,settings:{studyMode}});await h.settle();h.e.faceMode.checked=true;await h.e.startBtn.click();await h.e.pipButton.click();
 const tracker=calibrated();let opening=.05;h.elapse(5600);
 h.setAnalyzeHook(()=>tracker.analyze(face(30,opening),4/3,h.env.performance.now(),{allowWriting:studyMode==='writing'}));
 await h.infer();await h.advance(350);await h.infer();await h.advance(350);await h.infer();
 assert.equal(h.e.headDirection.textContent,'↓ Cúi đầu');assert.equal(h.e.alertBanner.hidden,true,'Eye closure still needs the confirmation period');
 await h.advance(1849);await h.infer();assert.equal(h.e.alertBanner.hidden,true,'No warning before 2.2 seconds');
 await h.advance(1);await h.infer();await h.settle();assert.equal(h.e.alertBanner.hidden,false);assert.equal(h.e.alertBody.textContent,'Mắt nhắm kéo dài');assert.equal(h.e.distractCount.textContent,1);assert.equal(h.tones.length,2);
 assert.equal(h.pipPanel().warning.textContent,'Mắt nhắm kéo dài');assert.equal(h.pipPanel().body.dataset.alarm,'true');
 await h.e.saveSessionBtn.click();const stored=JSON.parse(h.storage.get('denban.history'))[0];assert.equal(stored.events[0].key,'eyes');assert.equal(stored.events[0].reason,'Mắt nhắm kéo dài');
 opening=.3;for(let i=0;i<5;i++){await h.advance(350);await h.infer();}assert.equal(h.e.alertBanner.hidden,true,'Open eyes clear the warning after smoothing/recovery');
 // A brief blink while writing or looking down must not create another alert.
 opening=.05;for(let i=0;i<3;i++){await h.advance(350);await h.infer();}
 opening=.3;for(let i=0;i<4;i++){await h.advance(350);await h.infer();}
 assert.equal(h.e.alertBanner.hidden,true);assert.equal(h.e.distractCount.textContent,1);
});
