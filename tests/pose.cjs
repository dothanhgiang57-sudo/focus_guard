const assert=require('node:assert/strict');require('../pose-core.js');
const {PoseTracker,angles}=globalThis.FocusPose;
function matrix(y,p){y*=Math.PI/180;p*=Math.PI/180;const cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(p),sx=Math.sin(p);return [cy,0,-sy,0,sy*sx,cx,cy*sx,0,sy*cx,-sx,cy*cx,0,0,0,-50,1];}
function result(y=0,p=0,opening=.3){const lm=Array.from({length:478},()=>({x:.5,y:.5,z:0}));for(const ids of [[362,385,387,263,373,380],[33,160,158,133,153,144]]){const xy=[[.4,.5],[.45,.5-opening*.1],[.55,.5-opening*.1],[.6,.5],[.55,.5+opening*.1],[.45,.5+opening*.1]];ids.forEach((id,i)=>lm[id]={x:xy[i][0],y:xy[i][1]});}return {faceLandmarks:[lm],facialTransformationMatrixes:[{data:matrix(y,p)}]};}
for(const [y,p] of [[0,0],[30,0],[-30,0],[25,20]]){const got=angles(matrix(y,p));assert.ok(Math.abs(got.yaw-y)<1e-6);assert.ok(Math.abs(got.pitch-p)<1e-6);}
for(const [y,p,ear,key] of [[30,0,.3,'left'],[-30,0,.3,'right'],[0,25,.3,null],[0,0,.05,'eyes'],[0,0,.3,null]]){const t=new PoseTracker();for(let i=0;i<16;i++)t.analyze(result(),4/3,i*350);let got;for(let i=0;i<3;i++)got=t.analyze(result(y,p,ear),4/3,6000+i*350);assert.equal(got.key,key);assert.equal(got.calibrated,true);t.reset();assert.equal(t.analyze(result(),4/3,9000).calibrated,false);}
const t=new PoseTracker();t.analyze(result(),4/3,0);assert.equal(t.analyze({faceLandmarks:[]},4/3,5000).key,'noface');assert.equal(t.analyze(result(),4/3,6000).calibrated,false);
console.log('PASS: 3D pose angles, left/right/down/eyes, continuous calibration and reset.');

function calibrated(){const t=new PoseTracker();for(let i=0;i<16;i++)t.analyze(result(),4/3,i*350);return t;}
function sample(t,y,p,e=.3,options={}){let r;for(let i=0;i<3;i++)r=t.analyze(result(y,p,e),4/3,6000+i*350,options);return r;}
let writing=calibrated();let r=sample(writing,0,30,.23);assert.equal(r.key,null,'Writing with moderately narrowed open eyes remains allowed');assert.equal(r.observation,'writing');assert.equal(r.direction,'down');
assert.equal(writing.analyze({faceLandmarks:[]},4/3,9000).key,null,'Brief tracking loss after writing gets grace');assert.equal(writing.analyze({faceLandmarks:[]},4/3,16000).key,'noface','Grace must expire');
assert.equal(sample(calibrated(),0,30,.3,{allowWriting:false}).key,'down','Screen-only mode still warns downward pose');
assert.equal(sample(calibrated(),35,30,.04).key,'left','Side turn is still detected while looking down');
let boundary=calibrated();assert.equal(sample(boundary,24,0).key,null);assert.equal(sample(boundary,27,0).key,'left');assert.equal(sample(boundary,21,0).key,'left');assert.equal(sample(boundary,16,0).key,null);
console.log('PASS: writing posture, narrowed eyes, finite no-face grace, screen mode and hysteresis.');
