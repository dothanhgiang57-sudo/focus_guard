'use strict';
(() => {
// Distinguishes mobile phones from handheld calculators, books, and study tools.
// A nearby phone is evidence of possible distraction; a calculator on the desk is allowed for study.
class ActivityTracker {
 constructor(){this.reset();}
 reset(){this.objects=[];this.sampleAt=-Infinity;this.phoneHits=0;this.learnedCalculators=[];this.lastDetectedBox=null;}
 learnCalculator(box,width,height){
  if(!box||!width||!height)return;
  const x=(box.originX+box.width/2)/width,y=(box.originY+box.height/2)/height;
  this.learnedCalculators.push({x,y,w:box.width/width,h:box.height/height,at:Date.now()});
  if(this.learnedCalculators.length>10)this.learnedCalculators.shift();
 }
 isLearnedCalculator(x,y){
  return this.learnedCalculators.some(c=>Math.hypot(c.x-x,c.y-y)<0.15);
 }
 analyze(pose,detections,width,height,now,available=true,options={}){
  const fresh=Array.isArray(detections);
  if(fresh){
   if(now-this.sampleAt>2200)this.phoneHits=0;
   this.objects=detections;this.sampleAt=now;
  }
  const face=pose.face_bounds;
  const tracked=pose.face_detected&&pose.calibrated;
  const down=tracked&&pose.direction==='down';
  const canCheck=tracked&&(down||pose.direction==='center')&&available&&face&&now-this.sampleAt<=2200;
  if(!canCheck)this.phoneHits=0;
  let phone=0,book=0,calculator=0,detectedBox=null;
  if(canCheck){
   for(const detection of this.objects){
    const b=detection.boundingBox;
    if(!b||!width||!height||b.width<=0||b.height<=0)continue;
    const x=(b.originX+b.width/2)/width,y=(b.originY+b.height/2)/height;
    // Keep objects near this learner; a raised phone may be level with the face.
    if(Math.abs(x-face.x)>Math.min(.38,Math.max(.16,face.width*1.8)))continue;
    if(y<face.y-face.height*.35)continue;
    const onDesk=y>=face.y+face.height*1.15;
    const aspect=b.height/b.width;
    let phoneScore=0,remoteScore=0,bookScore=0;
    for(const c of detection.categories||[]){
     if(c.categoryName==='cell phone')phoneScore=Math.max(phoneScore,c.score);
     if(c.categoryName==='remote'||c.categoryName==='keyboard')remoteScore=Math.max(remoteScore,c.score);
     if(c.categoryName==='book'&&y>=face.y+face.height*.15)bookScore=Math.max(bookScore,c.score);
    }
    const isLearned=this.isLearnedCalculator(x,y);
    const hasKeypad=!!detection.hasButtonGrid;
    const isRemoteDevice=remoteScore>=.35||(remoteScore>=.25&&remoteScore>=phoneScore*.5);
    // Desk calculator in writing posture has foreshortened aspect ratio (0.7-1.65) and lower/moderate confidence (<0.75)
    const isDeskCalc=options.filterCalculator!==false&&onDesk&&(down||pose.observation==='writing'||options.allowWriting)&&((phoneScore>0&&phoneScore<.75&&aspect>=.7&&aspect<=1.65)||hasKeypad||isRemoteDevice);
    if(isLearned||isRemoteDevice||hasKeypad||isDeskCalc){
     calculator=Math.max(calculator,remoteScore||phoneScore||.8);
     detectedBox=b;
    }else if(phoneScore>=.55){
     phone=Math.max(phone,phoneScore);
     detectedBox=b;
    }
    if(bookScore>=.5)book=Math.max(book,bookScore);
   }
   if(fresh)this.phoneHits=phone?this.phoneHits+1:0;
  }
  this.lastDetectedBox=detectedBox;
  let state='screen',label='Đang nhìn màn hình',confidence=null;
  if(!available){state='unavailable';label='AI điện thoại / sách chưa hoạt động';}
  else if(!pose.face_detected){state='unknown';label='Chưa phân biệt được · Không thấy khuôn mặt';}
  else if(!pose.calibrated){state='calibrating';label='Đang hiệu chỉnh tư thế';}
  else if(phone&&this.phoneHits>=2){state='phone';label='Có thể đang nhìn điện thoại';confidence=phone;}
  else if(phone){state='checking';label='Thấy điện thoại · Đang kiểm tra';confidence=phone;}
  else if(calculator){state='calculator';label='Đang dùng máy tính cầm tay · Phù hợp tự học';confidence=calculator;}
  else if(down){
   if(book){state='book';label='Cúi đầu và thấy sách · Có thể đang đọc';confidence=book;}
   else{state='unknown';label='Đang cúi đầu · Chưa phân biệt được sách / điện thoại';}
  }else if(pose.direction==='left'||pose.direction==='right'){state='away';label='Đang nhìn sang bên';}
  const activity={state,label,confidence,available,detectedBox:this.lastDetectedBox};
  if(state==='phone'&&(!pose.key||pose.key==='down'))return {...pose,key:'phone',reason:label,activity};
  return {...pose,reason:(down||phone||calculator)&&!pose.key&&available?label:pose.reason,activity};
 }
}
globalThis.FocusActivity={ActivityTracker};
})();
