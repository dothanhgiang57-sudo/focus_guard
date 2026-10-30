'use strict';
(() => {
class BrowserFaceAI {
 constructor(){this.worker=null;this.pending=new Map();this.sequence=0;this.loading=null;}
 call(type,payload={},transfer=[],timeout=15000){
  return new Promise((resolve,reject)=>{
   const id=++this.sequence;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('AI phản hồi quá chậm. Hãy tải lại trang.'));},timeout);
   this.pending.set(id,{resolve,reject,timer});
   try{this.worker.postMessage({id,type,...payload},transfer);}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
  });
 }
 init(){
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   this.worker=new Worker(new URL('./ai-worker.js',document.baseURI));
   this.worker.onmessage=({data})=>{const item=this.pending.get(data.id);if(!item)return;this.pending.delete(data.id);clearTimeout(item.timer);data.error?item.reject(new Error(data.error)):item.resolve(data.result);};
   this.worker.onerror=()=>{for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(new Error('Không tải được AI. Mở index.html bằng Live Server, giữ nguyên thư mục vendor và models.'));}this.pending.clear();};
   return await this.call('init',{},[],90000);
  })();
  return this.loading;
 }
 reset(){if(this.worker)return this.call('reset');return Promise.resolve();}
 resetActivity(){if(this.worker)return this.call('resetActivity');return Promise.resolve();}
 learnCalculator(box,width=640,height=480){if(this.worker)return this.call('learnCalculator',{box,width,height});return Promise.resolve();}
 async analyze(video,timestamp,options={}){const frame=await createImageBitmap(video,{resizeWidth:640,resizeHeight:Math.round(640*video.videoHeight/video.videoWidth)});return this.call('analyze',{frame,timestamp,options},[frame]);}
 close(){this.worker?.terminate();for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(new Error('AI đã đóng'));}this.pending.clear();}
}
window.BrowserFaceAI=BrowserFaceAI;
})();
