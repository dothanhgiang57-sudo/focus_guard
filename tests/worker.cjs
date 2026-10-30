const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness({initFail=false,detectFail=false,direction='down',phoneY=300}={}){
 const replies=[];let calls=0,closed=0;
 const env={URL,importScripts(){},FocusPose:{PoseTracker:class{reset(){}analyze(){return {face_detected:true,calibrated:true,direction,key:null,face_bounds:{x:.5,y:.25,width:.2,height:.3}};}}}};
 env.self=env;env.location={href:'http://localhost/ai-worker.js'};env.postMessage=data=>replies.push(data);
 env.vision={FilesetResolver:{forVisionTasks:async directory=>{assert.equal(directory,'http://localhost/vendor/wasm');return {};}},FaceLandmarker:{createFromOptions:async()=>({detectForVideo:()=>({})})},ObjectDetector:{createFromOptions:async()=>{if(initFail)throw Error('missing model');return {detectForVideo(){calls++;if(detectFail)throw Error('inference failed');return {detections:[{boundingBox:{originX:280,originY:phoneY,width:80,height:100},categories:[{categoryName:'cell phone',score:.9}]}]};},close(){closed++;}};}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../activity-core.js'),'utf8'),env);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ai-worker.js'),'utf8'),env);
 let framesClosed=0;
 return {calls:()=>calls,closed:()=>closed,framesClosed:()=>framesClosed,async call(type,timestamp=0){await env.onmessage({data:{id:replies.length+1,type,timestamp,options:{allowWriting:true},...(type==='analyze'?{frame:{width:640,height:480,close(){framesClosed++;}}}:{})}});return replies.at(-1);}};
}
(async()=>{
 const h=harness();assert.equal((await h.call('init')).result.objectsReady,true);
 assert.equal((await h.call('analyze',0)).result.key,null);
 assert.equal((await h.call('analyze',350)).result.key,null);assert.equal(h.calls(),1);
 assert.equal((await h.call('analyze',1050)).result.key,'phone');assert.equal(h.calls(),2);
 await h.call('resetActivity');assert.equal((await h.call('analyze',1400)).result.key,null,'Foreground reset removes old phone evidence');
 assert.equal((await h.call('learnCalculator')).result.ok,true,'Worker accepts learnCalculator message');
 await h.call('reset');assert.equal((await h.call('analyze',1750)).result.key,null);
 assert.equal(h.framesClosed(),5,'Every transferred frame is released');
 for(const phoneY of [300,50]){
  const upright=harness({direction:'center',phoneY});await upright.call('init');
  assert.equal((await upright.call('analyze',0)).result.activity.state,'checking');
  assert.equal((await upright.call('analyze',350)).result.key,null,'Worker does not count a cached upright frame as a second detection');
  assert.equal((await upright.call('analyze',1050)).result.key,'phone','Worker confirms a visible phone while looking straight');
  assert.equal(upright.calls(),2);assert.equal(upright.framesClosed(),3);
 }
 const missing=harness({initFail:true});const init=(await missing.call('init')).result;
 assert.equal(init.ready,true);assert.equal(init.objectsReady,false);assert.equal(init.objectsError,'missing model');
 assert.equal((await missing.call('analyze',0)).result.activity.state,'unavailable');
 const failed=harness({detectFail:true});await failed.call('init');const r=await failed.call('analyze',0);
 assert.equal(r.result.face_detected,true);assert.equal(r.result.activity.available,false);assert.equal(failed.closed(),1);assert.equal(failed.framesClosed(),1);
 console.log('PASS: worker sampling cadence, activity reset, frame cleanup, missing object model and inference failure preserve face AI.');
})().catch(e=>{console.error(e);process.exit(1)});
