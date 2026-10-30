importScripts('./vendor/vision_bundle.worker.js','./pose-core.js','./activity-core.js');
const {FaceLandmarker,ObjectDetector,FilesetResolver}=self.vision;
let detector,objectDetector,objectError=null,lastObjectsAt=-Infinity;
const tracker=new globalThis.FocusPose.PoseTracker();
const activityTracker=new globalThis.FocusActivity.ActivityTracker();
let offCanvas=null,offCtx=null;
function checkButtonGrid(frame,box){
 if(!frame||!box||typeof OffscreenCanvas==='undefined'||!box.width||!box.height)return false;
 try{
  offCanvas||=new OffscreenCanvas(32,32);
  offCtx||=offCanvas.getContext('2d',{willReadFrequently:true});
  const keyY=box.originY+box.height*.35,keyH=box.height*.65;
  offCtx.drawImage(frame,box.originX,keyY,box.width,keyH,0,0,32,32);
  const data=offCtx.getImageData(0,0,32,32).data;
  let edges=0,rowTransitions=0;
  const lum=new Float32Array(1024);
  for(let i=0,j=0;i<data.length;i+=4,j++)lum[j]=.299*data[i]+.587*data[i+1]+.114*data[i+2];
  for(let y=4;y<28;y+=2){
   let trans=0;
   for(let x=2;x<30;x++){if(Math.abs(lum[y*32+x]-lum[y*32+x-1])>28){edges++;trans++;}}
   if(trans>=4)rowTransitions++;
  }
  return edges>45&&rowTransitions>=5;
 }catch{return false;}
}
self.onmessage=async({data})=>{
 const {id,type,frame,timestamp}=data;
 try{
  if(type==='init'){
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',self.location.href).href);
   detector=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./models/face_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFacialTransformationMatrixes:true,minFaceDetectionConfidence:.6,minTrackingConfidence:.6});
   try{
    objectDetector=await ObjectDetector.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./models/efficientdet_lite2.tflite',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',categoryAllowlist:['cell phone','book','remote'],scoreThreshold:.45,maxResults:10});
   }catch(error){objectError=error.message||'Không tải được AI nhận diện điện thoại / sách';}
   self.postMessage({id,result:{ready:true,objectsReady:!!objectDetector,objectsError:objectError}});
  }else if(type==='reset'){tracker.reset();activityTracker.reset();lastObjectsAt=-Infinity;self.postMessage({id,result:{reset:true}});}
  else if(type==='resetActivity'){activityTracker.reset();lastObjectsAt=-Infinity;self.postMessage({id,result:{reset:true}});}
  else if(type==='learnCalculator'){activityTracker.learnCalculator(data.box,data.width,data.height);self.postMessage({id,result:{ok:true}});}
  else if(type==='analyze'){
   if(!detector)throw new Error('AI chưa sẵn sàng');
   const pose=tracker.analyze(detector.detectForVideo(frame,timestamp),frame.width/frame.height,timestamp,data.options);
   let objects=null;
   // The second model runs at most once a second, in this worker, off the UI thread.
   if(objectDetector&&timestamp-lastObjectsAt>=1000){
    try{
     objects=objectDetector.detectForVideo(frame,timestamp).detections;
     lastObjectsAt=timestamp;
     if(objects&&objects.length&&typeof OffscreenCanvas!=='undefined'){
      for(const det of objects)det.hasButtonGrid=checkButtonGrid(frame,det.boundingBox);
     }
    }
    catch(error){objectError=error.message||'AI vật thể ngừng hoạt động';objectDetector.close();objectDetector=null;activityTracker.reset();}
   }
   const result=activityTracker.analyze(pose,objects,frame.width,frame.height,timestamp,!!objectDetector,data.options);
   result.objectsError=objectError;
   self.postMessage({id,result});
  }
 }catch(error){self.postMessage({id,error:error.message||'AI không chạy được'});}
 finally{frame?.close();}
};
