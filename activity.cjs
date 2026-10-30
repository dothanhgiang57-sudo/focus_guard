const assert=require('node:assert/strict');require('../activity-core.js');
const {ActivityTracker}=globalThis.FocusActivity;
const pose={face_detected:true,calibrated:true,direction:'down',key:null,face_bounds:{x:.5,y:.25,width:.2,height:.3}};
function object(name,score=.9,x=280,y=300){return {boundingBox:{originX:x,originY:y,width:80,height:100},categories:[{categoryName:name,score}]};}
const phone=[object('cell phone')],book=[object('book')];
const run=(t,objects,now,p=pose,available=true)=>t.analyze(p,objects,640,480,now,available);
let t=new ActivityTracker();
assert.equal(run(t,phone,0).activity.state,'checking');
assert.equal(run(t,null,350).key,null,'Cached frame cannot count as a second detection');
assert.equal(run(t,phone,1050).key,'phone','Two independent detections plus downward pose');
assert.equal(run(t,null,1400).key,'phone');
assert.equal(run(t,null,3400).key,null,'Stale detections cannot sustain an alert');
assert.equal(run(t,phone,4000).activity.state,'checking','A stale gap restarts evidence');
t.reset();assert.equal(run(t,phone,5000).key,null,'Reset removes previous evidence');
assert.equal(run(t,book,6050).activity.state,'book');assert.equal(run(t,book,7100).key,null);
assert.equal(run(t,[],8150).activity.state,'unknown','No phone does not prove book reading');
assert.equal(run(t,[...book,...phone],9200).activity.state,'checking');
assert.equal(run(t,[...book,...phone],10250).key,'phone','Book does not hide simultaneous phone evidence');
assert.equal(run(t,phone,11300,{...pose,direction:'center'}).key,'phone','Looking straight does not clear visible phone evidence');
assert.equal(run(t,phone,12350).key,'phone','Changing between upright and lowered head keeps fresh evidence');
assert.equal(run(t,[],13400).key,null,'An empty sample clears phone evidence');
assert.equal(run(t,[object('cell phone',.54)],14450).key,null,'Low confidence phone is ignored');
for(const [x,y] of [[0,300],[280,0]]){
 t=new ActivityTracker();run(t,[object('cell phone',.9,x,y)],0);assert.equal(run(t,[object('cell phone',.9,x,y)],1050).key,null,'Ignore phone away from learner');
}
t=new ActivityTracker();assert.equal(run(t,phone,0,{...pose,calibrated:false}).key,null);
assert.equal(run(t,phone,1050,{...pose,face_detected:false}).activity.state,'unknown');
assert.equal(run(t,phone,2100,pose,false).activity.state,'unavailable');
assert.equal(run(t,phone,3150,{...pose,key:'down'}).key,'down','Keep screen-mode downward rule until phone evidence is sufficient');
assert.equal(run(t,phone,4200,{...pose,key:'down'}).key,'phone');
assert.equal(run(t,phone,5250,{...pose,direction:'left',key:'left'}).key,'left','Keep head-turn alerts');
const upright={...pose,direction:'center'};
for(const objects of [phone,[object('cell phone',.9,280,50)]]){
 t=new ActivityTracker();
 assert.equal(run(t,objects,0,upright).activity.state,'checking','A phone below or level with the face is checked while looking straight');
 assert.equal(run(t,null,350,upright).key,null,'Cached upright frames cannot confirm a phone');
 assert.equal(run(t,objects,1050,upright).key,'phone','Two fresh upright detections confirm a phone');
 assert.equal(run(t,null,1400,upright).key,'phone');
 assert.equal(run(t,null,3400,upright).key,null,'Stale upright evidence expires');
 t.reset();assert.equal(run(t,objects,4000,upright).activity.state,'checking');
 assert.equal(run(t,[],5050,upright).key,null,'Removing the phone clears upright evidence');
 assert.equal(run(t,objects,6100,upright).activity.state,'checking','Returning phone needs fresh confirmation');
}
t=new ActivityTracker();assert.equal(run(t,book,0,upright).activity.state,'screen');assert.equal(run(t,book,1050,upright).key,null,'Book alone does not trigger an upright phone warning');
t=new ActivityTracker();run(t,phone,0,upright);assert.equal(run(t,phone,1050,{...upright,face_detected:false}).activity.state,'unknown');assert.equal(run(t,phone,1400,upright).key,null,'Losing the face resets upright evidence');
t=new ActivityTracker();run(t,phone,0,upright);assert.equal(run(t,phone,1050,upright,false).activity.state,'unavailable');assert.equal(run(t,phone,1400,upright).key,null,'Model failure resets upright evidence');
t=new ActivityTracker();run(t,phone,0,{...upright,key:'eyes',reason:'Mắt nhắm kéo dài'});assert.equal(run(t,phone,1050,{...upright,key:'eyes',reason:'Mắt nhắm kéo dài'}).key,'eyes','Keep eye-closure alerts');
const calcRemote=[object('remote',.65,280,300)];t=new ActivityTracker();
assert.equal(run(t,calcRemote,0).activity.state,'calculator','Remote category identifies calculator');
assert.equal(run(t,calcRemote,1050).key,null,'Calculator never triggers phone alert');
const calcDual=[{boundingBox:{originX:280,originY:300,width:80,height:100},categories:[{categoryName:'cell phone',score:.6},{categoryName:'remote',score:.5}]}];
t=new ActivityTracker();assert.equal(run(t,calcDual,0).activity.state,'calculator');assert.equal(run(t,calcDual,1050).key,null);
const calcDesk=[object('cell phone',.65,280,300)];t=new ActivityTracker();
assert.equal(run(t,calcDesk,0,pose,true,{allowWriting:true}).activity.state,'calculator');assert.equal(run(t,calcDesk,1050,pose,true,{allowWriting:true}).key,null);
const calcGrid=[{boundingBox:{originX:280,originY:300,width:80,height:100},categories:[{categoryName:'cell phone',score:.8}],hasButtonGrid:true}];
t=new ActivityTracker();assert.equal(run(t,calcGrid,0).activity.state,'calculator');assert.equal(run(t,calcGrid,1050).key,null);
t=new ActivityTracker();t.learnCalculator({originX:280,originY:300,width:80,height:100},640,480);
assert.equal(run(t,phone,0).activity.state,'calculator','Learned position avoids phone false positive');assert.equal(run(t,phone,1050).key,null);
console.log('PASS: upright and lowered-head phone detection, raised phones, fresh samples, confidence and position filters, books, resets, model failure and existing pose rules.');
