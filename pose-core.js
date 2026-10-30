/* Face pose matrix is column-major, in MediaPipe metric coordinates. */
(() => {
const median=a=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
const delta=(a,b)=>(a-b+540)%360-180;
const leftEye=[362,385,387,263,373,380],rightEye=[33,160,158,133,153,144];
function eye(lm,ids,aspect){const p=ids.map(i=>lm[i]);const d=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);return(d(p[1],p[5])+d(p[2],p[4]))/(2*d(p[0],p[3]));}
function angles(m){return {yaw:Math.atan2(-m[2],Math.hypot(m[0],m[1]))*180/Math.PI,pitch:Math.atan2(m[6],m[10])*180/Math.PI};}
class PoseTracker {
 constructor(){this.reset();}
 reset(){this.baseline=[];this.window=[];this.startedAt=null;this.ready=false;this.writing=false;this.lastWritingAt=-Infinity;this.turn=null;}
 analyze(result,aspect,now,options={}){
 const allowWriting=options.allowWriting!==false;
 const lm=result.faceLandmarks?.[0],matrix=result.facialTransformationMatrixes?.[0]?.data;
 if(!lm||!matrix){if(!this.ready){this.baseline=[];this.startedAt=null;}this.window=[];this.turn=null;const grace=allowWriting&&this.ready&&now-this.lastWritingAt<8000;return {face_detected:false,calibrated:this.ready,key:grace?null:'noface',reason:grace?'Tạm mất dấu khi cúi xuống · Đang chờ khuôn mặt':'Không thấy khuôn mặt',observation:grace?'writing-gap':'noface',landmarks:[]};}
 const raw={...angles(matrix),ear:(eye(lm,leftEye,aspect)+eye(lm,rightEye,aspect))/2};
 if(!Object.values(raw).every(Number.isFinite))throw new Error('Invalid face pose');
 this.window.push(raw);if(this.window.length>3)this.window.shift();
 const smooth={yaw:median(this.window.map(p=>p.yaw)),pitch:median(this.window.map(p=>p.pitch)),ear:median(this.window.map(p=>p.ear))};
 if(!this.ready){if(this.baseline.length&&(Math.abs(delta(raw.yaw,median(this.baseline.map(p=>p.yaw))))>8||Math.abs(delta(raw.pitch,median(this.baseline.map(p=>p.pitch))))>8)){this.baseline=[];this.startedAt=null;}this.startedAt??=now;this.baseline.push(raw);if(this.baseline.length>100)this.baseline.shift();this.ready=now-this.startedAt>=4000&&this.baseline.length>=12;}
 const base={yaw:median(this.baseline.map(p=>p.yaw)),pitch:median(this.baseline.map(p=>p.pitch)),ear:median(this.baseline.map(p=>p.ear))};
 const yaw=delta(smooth.yaw,base.yaw),pitch=delta(smooth.pitch,base.pitch);
 let key=null,reason=null;
 // Different entry/recovery angles prevent alerts flickering at a boundary.
 if(this.turn==='left'&&yaw<18)this.turn=null;
 if(this.turn==='right'&&yaw> -18)this.turn=null;
 if(yaw>25)this.turn='left';else if(yaw< -25)this.turn='right';
 this.writing=allowWriting&&this.ready&&!this.turn&&Math.abs(yaw)<25&&(pitch>(this.writing?9:12));
 if(this.writing)this.lastWritingAt=now;
 if(this.ready){
  if(this.turn){key=this.turn;reason=key==='left'?'Quay đầu sang trái':'Quay đầu sang phải';}
  // Allow writing posture without masking eye closure, including when looking down.
  // The app still requires multiple samples and the full eye-closure alert delay.
  else if(smooth.ear<base.ear*.65){key='eyes';reason='Mắt nhắm kéo dài';}
  else if(this.writing){reason='Đang nhìn xuống · Cho phép viết bài / đọc sách';}
  else if(!allowWriting&&pitch>20){key='down';reason='Nhìn xuống lâu trong chế độ nhìn màn hình';}
 }

 const xs=lm.map(p=>p.x),ys=lm.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return {face_detected:true,calibrated:this.ready,calibration_progress:Math.min(100,Math.round((now-this.startedAt)/40)),yaw,pitch,ear:smooth.ear,key,reason,observation:this.writing?'writing':'screen',direction:this.turn||(pitch>12?'down':'center'),face_bounds:{x:(minX+maxX)/2,y:(minY+maxY)/2,width:maxX-minX,height:maxY-minY}};
 }
}
globalThis.FocusPose={PoseTracker,angles,delta};
})();
