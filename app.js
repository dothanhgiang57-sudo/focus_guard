'use strict';
(() => {
const $=id=>document.getElementById(id);
const icons={book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15"/>',lamp:'<path d="M5 21h15M14 21V13L7 6l5-4 9 10H5l2-6"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/>',settings:'<path d="m9 3-.7 2-2 .8-2-.7-2 3.5 1.5 1.5v2.3L2.3 14l2 3.5 2-.5 2 .9L9 20h4l.8-2.1 2-.9 2 .5 2-3.5-1.5-1.6v-2.3L19.8 8l-2-3.5-2 .7-2-.8L13 3Z"/><circle cx="11" cy="11.5" r="3"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',chart:'<path d="M4 3v17h17M8 15l4-5 4 3 5-7"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',leaf:'<path d="M20 3S7 1 4 10s8 13 13 5c3-5 3-12 3-12ZM3 21l12-12"/>',camera:'<path d="M8 6l2-3h4l2 3h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',play:'<path d="m9 5 11 7-11 7V5Z"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'};
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon]||''}</svg>`);
$('today').textContent=new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Trình duyệt chưa cho phép lưu dữ liệu. Phiên học vẫn hoạt động.');return false;}}
let tasks=read('denban.tasks',[]);if(!Array.isArray(tasks))tasks=[];tasks=tasks.filter(t=>t&&typeof t.text==='string').slice(0,30);
let history=read('denban.history',[]);if(!Array.isArray(history))history=[];history=history.flatMap(s=>{try{return [FocusRecords.normalize(s)];}catch{return [];}});
let settings=read('denban.settings',{});if(!settings||typeof settings!=='object')settings={};settings={theme:['system','light','dark'].includes(settings.theme)?settings.theme:'system',studyMode:settings.studyMode==='screen'?'screen':'writing',sound:settings.sound!==false,keepAwake:settings.keepAwake!==false,volume:Number.isFinite(settings.volume)&&settings.volume>=0&&settings.volume<=1?settings.volume:.8,sensitivity:[1,2,3].includes(+settings.sensitivity)?+settings.sensitivity:2,minutes:[25,45,60].includes(+settings.minutes)?+settings.minutes:25,calculatorFilter:settings.calculatorFilter!==false,...FocusAlerts.preferences(settings)};
function isDarkTheme(){if(settings.theme==='dark')return true;if(settings.theme==='light')return false;return typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches;}
function applyTheme(){
 const dark=isDarkTheme();const root=document.documentElement||document.body;
 if(root?.setAttribute){root.setAttribute('data-theme',dark?'dark':'light');}
 const meta=document.querySelector?.('meta[name="theme-color"]');if(meta)meta.setAttribute('content',dark?'#141916':'#355847');
 const toggleBtn=$('themeToggle');
 if(toggleBtn){
  toggleBtn.setAttribute('aria-label',dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối');
  toggleBtn.setAttribute('title',dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối');
  const iconSpan=$('themeToggleIcon');
  if(iconSpan){iconSpan.dataset.icon=dark?'sun':'moon';iconSpan.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[dark?'sun':'moon']}</svg>`;}
 }
 if($('themeSelect'))$('themeSelect').value=settings.theme;
}
$('studyMode').value=settings.studyMode;$('soundToggle').checked=settings.sound;$('sensitivity').value=settings.sensitivity;
if($('keepAwakeToggle'))$('keepAwakeToggle').checked=settings.keepAwake!==false;
$('alertVolume').value=Math.round(settings.volume*100);$('alertVolumeValue').textContent=`${Math.round(settings.volume*100)}%`;
let session=null,stream=null,aiOnline=false,cameraGeneration=0,cameraBusy=false,inferenceBusy=false,cameraReason=null,candidateKey=null,candidateSince=0,recoveringSince=null,calibrated=false,lastAiAt=0,soundContext,inferenceEpoch=0;
const faceAI=new window.BrowserFaceAI();let starting=false;
let latestTracking=null;
const feedbackWindow=new FocusAlerts.FeedbackWindow();
let candidateHits=0,candidateSampleAt=-Infinity,feedbackNoticeUntil=0,lastPhoneBox=null;
const activeTones=new Set();let soundEpoch=0;
function stopAlertSound(){soundEpoch++;for(const tone of activeTones){try{tone.stop();}catch{}}activeTones.clear();}
function resetFeedback(){feedbackWindow.reset();stopAlertSound();feedbackNoticeUntil=0;}
function fmt(ms){const sec=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5500);}
const cameraPiP=typeof window.BrowserCameraPiP==='function'?new window.BrowserCameraPiP({video:$('feed'),button:$('pipButton'),autoToggle:$('autoPipToggle'),status:$('pipStatus'),hasCamera:()=>!!stream&&stream.getVideoTracks().some(track=>track.enabled!==false&&track.readyState!=='ended'),getState:getPiPState,onFeedback:reportFalseAlert,onChange:onPiPChange,notify:toast}):null;
function cameraInView(){return !document.hidden||!!cameraPiP?.isActive();}
function getPiPState(){
 const now=performance.now(),paused=!!session&&!session.running&&!session.finished;
 const elapsed=(session?.elapsed||0)+(session?.running?Math.min(Math.max(0,now-session.lastTick),Math.max(0,session.goal-session.elapsed)):0);
 const remaining=fmt(Math.ceil(Math.max(0,(session?.goal||settings.minutes*60000)-elapsed)/1000)*1000);
 const phase=!session?'Chưa bắt đầu phiên học':session.finished?(session.completed?'Đã hoàn thành phiên học':'Đã kết thúc phiên học'):paused?'Đang tạm dừng':'Đang học';
 const stale=!!stream&&aiOnline&&!paused&&now-lastAiAt>8000;
 const focus=paused?'Đang tạm dừng':!stream?'Camera đang tắt':!aiOnline?'AI chưa sẵn sàng':stale?'Chưa cập nhật camera':!latestTracking?'Đang chờ camera':!latestTracking.faceDetected?'Không thấy khuôn mặt':!latestTracking.calibrated?'Đang hiệu chỉnh':latestTracking.eyesClosed?'Nhắm mắt':latestTracking.activityState==='calculator'?'Dùng máy tính':({center:'Nhìn thẳng',left:'Nhìn sang trái',right:'Nhìn sang phải',down:'Cúi đầu'})[latestTracking.direction]||'Chưa rõ hướng nhìn';
 const reason=paused||session?.finished?null:(session?.running?session.reason:cameraReason);
 return {focus,remaining,phase,warning:stale?'Camera chưa cập nhật. Quay lại tab học để kiểm tra.':reason?.label||'',alertId:!stale&&FocusAlerts.category(reason?.key)?reason.id:null,notice:performance.now()<feedbackNoticeUntil?'Đã ghi nhận. Tạm ngừng nhắc lỗi này trong 30 giây.':''};
}
function onPiPChange(){
 if(!document.hidden)return;
 // Discard old frames when monitoring starts/stops in the floating window.
 inferenceEpoch++;candidateKey=null;cameraReason=null;recoveringSince=null;latestTracking=null;
 clearActivity();lastAiAt=performance.now();
 if(session?.running)reconcile();else presentAlert(null);
}
function status(title,detail,kind=''){$('statusText').textContent=title;$('statusDetail').textContent=detail;$('statusDot').className=`status-dot ${kind}`;}
let lastAlertSound=-Infinity,audioBusy=false,audioEnabledByGesture=false;
async function unlockSound(fromGesture=false){
 if(fromGesture)audioEnabledByGesture=true;
 if(!settings.sound||!audioEnabledByGesture)return false;
 try{soundContext||=new(window.AudioContext||window.webkitAudioContext)();await soundContext.resume();const ready=soundContext.state==='running';$('audioState').textContent=ready?'Tiếng nhắc đã sẵn sàng.':'Bấm Bật / thử tiếng nhắc để cho phép âm thanh.';return ready;}catch{$('audioState').textContent='Chưa phát được tiếng. Kiểm tra âm lượng và quyền âm thanh của trang.';return false;}
}
async function sound(completed=false,force=false){
 if(!settings.sound||audioBusy||(!completed&&!force&&performance.now()-lastAlertSound<12000))return;
 if(settings.volume===0){$('audioState').textContent='Âm lượng tiếng nhắc đang ở 0%. Tăng âm lượng trong Cài đặt.';return;}
 audioBusy=true;const epoch=soundEpoch;
 try{
  if(!await unlockSound()||epoch!==soundEpoch)return;
  if(!completed)lastAlertSound=performance.now();
  const now=soundContext.currentTime;
  for(let i=0;i<(completed?1:2);i++){
   const o=soundContext.createOscillator(),g=soundContext.createGain();o.connect(g);g.connect(soundContext.destination);o.type=completed?'sine':'triangle';o.frequency.value=completed?880:(i?1040:740);const at=now+i*.7;
   const peak=(completed ? .2 : .52)*settings.volume;
   g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+.025);g.gain.setValueAtTime(peak,at+.2);g.gain.exponentialRampToValueAtTime(.001,at+.55);activeTones.add(o);o.start(at);o.stop(at+.58);
   o.onended=()=>{activeTones.delete(o);o.disconnect();g.disconnect();};
  }
 }catch{$('audioState').textContent='Không phát được tiếng. Bấm thử lại và kiểm tra âm lượng.';}finally{audioBusy=false;}
}
$('testSound').addEventListener('click',()=>{settings.sound=true;audioEnabledByGesture=true;$('soundToggle').checked=true;save('denban.settings',settings);sound(false,true);});
$('alertVolume').addEventListener('input',()=>{settings.volume=Math.min(1,Math.max(0,+$('alertVolume').value/100));$('alertVolumeValue').textContent=`${Math.round(settings.volume*100)}%`;save('denban.settings',settings);});
$('settingsTestSound').addEventListener('click',()=>$('testSound').click());
document.addEventListener('pointerdown',()=>{if(settings.sound)unlockSound(true);},{once:true});
document.addEventListener('keydown',()=>{if(settings.sound)unlockSound(true);},{once:true});
$('studyMode').addEventListener('change',()=>{settings.studyMode=$('studyMode').value;save('denban.settings',settings);inferenceEpoch++;clearActivity();cameraReason=null;candidateKey=null;recoveringSince=null;$('alertBanner').hidden=true;reconcile();updateSessionTitle();render();toast(settings.studyMode==='writing'?'Cho phép cúi xuống học; vẫn nhắc khi nghi nhìn điện thoại.':'Được chuyển tab; vẫn nhắc nếu nhìn xuống lâu hoặc nghi nhìn điện thoại.');});
function alertDelay(key){return FocusAlerts.delay(settings,key);}
function ask(title,body,confirm='Đồng ý'){$('dialogTitle').textContent=title;$('dialogBody').textContent=body;$('dialogConfirm').textContent=confirm;const d=$('confirmDialog');d.returnValue='';return new Promise(resolve=>{d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true});d.showModal();});}
function log(reason,duration=null,eventId=null){if(!session)return;session.logs.unshift({time:new Date().toISOString(),reason,duration,eventId});if(session.logs.length>200)session.logs.pop();renderLog();}
function renderLog(){const list=$('logList');list.replaceChildren();if(!session?.logs.length){const li=document.createElement('li');li.className='log-empty';li.textContent='Chưa có hoạt động. Bắt đầu và tạo nhịp học của riêng bạn.';list.append(li);}else session.logs.forEach(item=>{const li=document.createElement('li'),t=document.createElement('span'),r=document.createElement('span');t.className='log-time';t.textContent=new Date(item.time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});r.className='log-reason';r.textContent=item.reason+(item.falsePositive?' · Người dùng báo cảnh báo sai':'');li.append(t,r);if(item.duration!==null){const dur=document.createElement('span');dur.className='log-duration';dur.textContent=`${(item.duration/1000).toFixed(1)} giây`;li.append(dur);}list.append(li);});$('exportBtn').disabled=!session?.logs.length;}
let dismissedAlertKey=null,dismissedAlertEpoch=-1;
function presentAlert(reason){
 $('falseAlert').hidden=!FocusAlerts.category(reason?.key);$('falseAlert').dataset.eventId=reason?.id||'';
 if(!reason){dismissedAlertKey=null;$('alertBanner').hidden=true;return;}
 if(dismissedAlertKey!==(reason.id||reason.key))dismissedAlertKey=null;
 const message=reason.key==='tab'?'Bạn đã rời tab học. Mình quay lại mục tiêu nhé.':reason.label;
 if($('alertBody').textContent!==message)$('alertBody').textContent=message;
 $('alertBanner').hidden=dismissedAlertKey===(reason.id||reason.key)&&dismissedAlertEpoch===inferenceEpoch;
}
function effectiveReason(){if(document.hidden){if(settings.studyMode!=='screen')return {key:'tab',label:'Rời tab học'};if(!cameraPiP?.isActive())return null;}return stream&&aiOnline?cameraReason:null;}
function updateSessionTitle(){if(session?.running)document.title=document.hidden&&settings.studyMode!=='screen'?'Đèn Bàn · Quay lại học nhé!':'Đèn Bàn · Đang tập trung';}
function accumulate(now=performance.now()){if(!session?.running)return;const delta=Math.min(Math.max(0,now-session.lastTick),Math.max(0,session.goal-session.elapsed));session.elapsed+=delta;if(!session.reason){session.focused+=delta;session.userConfirmed+=confirmedOverlap(session.lastTick,session.lastTick+delta);session.streak+=delta;session.longestStreak=Math.max(session.longestStreak||0,session.streak);}else session.distracted+=delta;session.lastTick=now;}
function confirmedOverlap(start,end){
 const intervals=[...feedbackWindow.until.values()].map(until=>[Math.max(start,until-30000),Math.min(end,until)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
 let total=0,last=-Infinity;for(const [a,b] of intervals){total+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b);}return total;
}
function episodeEvent(){const e=session.episode;return {id:e.id,key:e.key,source:e.key==='tab'?'tab':'camera',startElapsed:e.at,reason:e.label,duration:session.elapsed-e.at,time:e.time,falsePositive:!!e.falsePositive,feedbackAt:e.feedbackAt||null};}
function closeEpisode(){if(!session?.episode)return;const e=episodeEvent();session.events.push(e);log(e.reason,e.duration,e.id);if(e.falsePositive)session.logs[0].falsePositive=true;session.episode=null;}
function reconcile(){if(!session?.running)return;accumulate();const next=effectiveReason();if(session.reason?.key!==next?.key||(next?.key!=='tab'&&session.reason?.id!==next?.id)){closeEpisode();session.reason=next;if(next){next.id||=newId();session.streak=0;session.distractions++;if(next.key==='tab')session.tabs++;session.episode={id:next.id,key:next.key,label:next.label,at:session.elapsed,time:new Date().toISOString()};presentAlert(next);sound();}else presentAlert(null);}render();}
function dismissCurrentAlert(id){
 const reason=session?.running?session.reason:cameraReason;
 if(id&&reason?.id!==id)return;
 dismissedAlertKey=reason?.id||reason?.key;dismissedAlertEpoch=inferenceEpoch;$('alertBanner').hidden=true;
}
function restoreStreak(){
 // Rebuild only the current session: it has elapsed offsets and pause boundaries.
 const breaks=session.events.filter(e=>!e.falsePositive).map(e=>[e.startElapsed,e.startElapsed+e.duration]);
 breaks.push(...session.streakBreaks.map(at=>[at,at]));breaks.sort((a,b)=>a[0]-b[0]);
 let cursor=0,longest=0;
 for(const [start,end] of breaks){longest=Math.max(longest,start-cursor);cursor=Math.max(cursor,end);}
 session.streak=session.elapsed-cursor;session.longestStreak=Math.max(longest,session.streak);
}
function reportFalseAlert(id){
 const reason=session?.running?session.reason:(!session||session.finished?cameraReason:null);
 if(!reason||reason.id!==id||!FocusAlerts.category(reason.key)||!feedbackWindow.accept(id,reason.key,performance.now()))return false;
 accumulate();stopAlertSound();
 if(session?.running&&session.episode?.id===id){
  const duration=session.elapsed-session.episode.at;
  session.episode.falsePositive=true;session.episode.feedbackAt=new Date().toISOString();
  session.distractions=Math.max(0,session.distractions-1);session.distracted=Math.max(0,session.distracted-duration);session.focused+=duration;session.userConfirmed+=duration;
  closeEpisode();session.reason=null;restoreStreak();log('Người dùng báo cảnh báo sai',null,id);
 }
 if(reason.key==='phone'&&lastPhoneBox){faceAI.learnCalculator(lastPhoneBox,640,480).catch(()=>{});}
 // Invalidate pending AI work and clear the object evidence before reevaluation.
 inferenceEpoch++;clearActivity();cameraReason=null;candidateKey=null;recoveringSince=null;
 presentAlert(null);feedbackNoticeUntil=performance.now()+5500;
 const message='Đã ghi nhận. Tạm ngừng nhắc lỗi này trong 30 giây.';
 if(session?.running&&session.saved){if(persistSession())toast(message);else toast(message+' Chưa cập nhật được bản lưu; hãy bấm Lưu phiên để thử lại.');}else toast(message);
 renderLog();render();return true;
}
let feedbackIntentId=null;
for(const type of ['pointerdown','keydown'])$('falseAlert').addEventListener(type,()=>{feedbackIntentId=$('falseAlert').dataset.eventId;});
$('falseAlert').addEventListener('click',()=>{const id=feedbackIntentId||$('falseAlert').dataset.eventId;feedbackIntentId=null;reportFalseAlert(id);});

function render(){ cameraPiP?.sync();$('saveSessionBtn').disabled=!session||session.elapsed<1000;$('resetSessionBtn').disabled=!session;const elapsed=session?.elapsed||0,goal=session?.goal||settings.minutes*60000;$('sessionTime').textContent=fmt(elapsed);$('focusStreak').textContent=fmt(session?.streak||0);$('focusPct').textContent=elapsed?`${Math.round(session.focused/elapsed*100)}%`:'—';$('distractCount').textContent=session?.distractions||0;$('tabSwitchCount').textContent=session?.tabs||0;$('countdown').textContent=fmt(Math.ceil((goal-elapsed)/1000)*1000);$('timerRing').style.setProperty('--progress',`${Math.min(360,elapsed/goal*360)}deg`);$('metricSource').textContent=stream&&aiOnline&&calibrated?(settings.studyMode==='screen'?'Ước lượng qua hướng đầu và mắt khi mở tab học':'Ước lượng qua hướng đầu, mắt và rời tab'):(settings.studyMode==='screen'?'Chưa đo sự chú ý qua camera · Không theo dõi rời tab':'Dựa trên việc ở lại tab học');if(session?.userConfirmed)$('metricSource').textContent+=` · Tự xác nhận ${fmt(session.userConfirmed)}`;$('aiLabel').textContent=stream&&aiOnline?(calibrated?(settings.studyMode==='screen'?'CAMERA AI':'CAMERA AI + TAB'):'HIỆU CHỈNH AI'):(settings.studyMode==='screen'?'KHÔNG THEO DÕI TAB':'THEO DÕI TAB');$('startBtn').hidden=!!session&&!session.finished;$('sessionActions').hidden=!session||session.finished;$('startText').textContent=session?.finished?'Bắt đầu phiên mới':'Bắt đầu tập trung';$('pauseBtn').textContent=session?.running?'Tạm dừng':'Tiếp tục';document.querySelectorAll('[data-minutes]').forEach(b=>{const selected=+b.dataset.minutes===settings.minutes;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));b.disabled=!!session&&!session.finished;});if(!session){$('timerSubtitle').textContent='Chưa bắt đầu';}else if(session.finished){$('timerSubtitle').textContent=session.saved?'Đã lưu phiên học':'Đã kết thúc · Chưa lưu';}else if(!session.running){$('timerSubtitle').textContent='Đang tạm dừng';status('Nghỉ một chút nhé.','Bấm Tiếp tục khi bạn sẵn sàng.');}else if(session.reason){$('timerSubtitle').textContent='Quay lại tập trung nhé';status('Mình quay lại bài học nhé.',session.reason.label,'warning');}else{$('timerSubtitle').textContent='Đang tập trung';status(stream&&aiOnline&&!calibrated?'Đang hiệu chỉnh camera…':'Đang giữ nhịp tập trung.',stream&&aiOnline&&!calibrated?'Nhìn thẳng và mở mắt trong khoảng 5 giây.':(stream&&aiOnline?(settings.studyMode==='screen'?'Camera AI theo dõi trong tab học hoặc PiP. Chuyển tab không bị nhắc.':'Nhận diện camera AI và theo dõi rời tab đang bật.'):(settings.studyMode==='screen'?'Không nhắc khi chuyển tab. Chưa đo sự chú ý qua camera.':'Theo dõi việc ở lại tab. Chưa đo sự chú ý qua camera.')),'running');}}
function releaseAI(){faceAI.reset().catch(()=>{});}
function cameraBadge(text,live=false){$('cameraBadge').querySelector('span').textContent=text;$('cameraBadge').classList.toggle('live',live);}
function clearActivity(){faceAI.resetActivity().catch(()=>{});$('activityState').textContent='Chưa đánh giá';$('activityState').dataset.state='unknown';}
function clearTracking(){latestTracking=null;$('faceState').textContent='Chưa theo dõi';$('headDirection').textContent='—';$('yawValue').textContent='—';$('recalibrateBtn').disabled=true;$('activityState').textContent='Chưa đánh giá';$('activityState').dataset.state='unknown';}
function drawTracking(data){
 latestTracking={faceDetected:!!data.face_detected,calibrated:!!data.calibrated,eyesClosed:data.key==='eyes',direction:data.direction||'center',activityState:data.activity?.state};
 if(data.activity?.detectedBox)lastPhoneBox=data.activity.detectedBox;
 $('faceState').textContent=data.face_detected?'Đã tìm thấy':'Không thấy';
 $('headDirection').textContent=!data.face_detected?'—':!data.calibrated?'Hiệu chỉnh…':({left:'← Trái',right:'Phải →',down:'↓ Cúi đầu',center:'Nhìn thẳng'})[data.direction||'center'];
 $('yawValue').textContent=Number.isFinite(data.yaw)?`${data.yaw.toFixed(1)}°`:'—';
 $('recalibrateBtn').disabled=false;
 $('activityState').textContent=data.activity?.label||'Chưa đánh giá';$('activityState').dataset.state=data.activity?.state||'unknown';
 if(data.activity?.available===false)$('objectAiStatus').textContent='AI điện thoại / sách chưa hoạt động. Kiểm tra file models/efficientdet_lite2.tflite rồi tải lại trang. Theo dõi khuôn mặt vẫn hoạt động.';
}
$('recalibrateBtn').addEventListener('click',()=>{if((session&&!session.running&&!session.finished)||!stream||!aiOnline)return;inferenceEpoch++;releaseAI();cameraReason=null;candidateKey=null;calibrated=false;recoveringSince=null;lastAiAt=performance.now();clearTracking();$('cameraCaption').textContent='Nhìn thẳng và mở mắt khoảng 5 giây để hiệu chỉnh lại.';log('Hiệu chỉnh lại tư thế nhìn thẳng');reconcile();});
function stopCamera(){stopAlertSound();cameraPiP?.close();if(session?.running&&$('faceMode').checked)$('pauseBtn').click();clearTracking();cameraGeneration++;inferenceEpoch++;cameraBusy=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('feed').srcObject=null;$('cameraScreen').classList.remove('has-camera');$('cameraPlaceholder').hidden=false;$('liveLabel').hidden=true;$('cameraCaption').hidden=true;$('disableCamera').hidden=true;$('enableCamera').disabled=false;cameraBadge('Camera đang tắt');cameraReason=null;candidateKey=null;recoveringSince=null;calibrated=false;releaseAI(session?.id);reconcile();render();}
async function enableCamera(){if(cameraBusy||stream)return;cameraBusy=true;$('enableCamera').disabled=true;const generation=++cameraGeneration;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('SECURE_CONTEXT');const obtained=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});if(generation!==cameraGeneration){obtained.getTracks().forEach(t=>t.stop());return;}stream=obtained;$('feed').srcObject=obtained;await $('feed').play();if(generation!==cameraGeneration)return;$('cameraScreen').classList.add('has-camera');$('cameraPlaceholder').hidden=true;$('liveLabel').hidden=false;$('disableCamera').hidden=false;cameraBadge(aiOnline?'Camera AI':'Camera xem trước',true);cameraReason=null;candidateKey=null;calibrated=false;latestTracking=null;lastAiAt=performance.now();$('cameraCaption').hidden=false;$('cameraCaption').textContent=aiOnline?'Nhìn thẳng và mở mắt để hiệu chỉnh AI tự động.':'Camera xem trước · AI chưa bật. Hiện chỉ theo dõi việc rời tab.';stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream){stopCamera();toast('Camera đã ngắt. Bật lại camera để tiếp tục theo dõi.');}});if(session&&!session.running&&!session.finished)stream.getTracks().forEach(t=>t.enabled=false);render();}catch(error){if(generation!==cameraGeneration)return;stopCamera();const messages={NotAllowedError:'Quyền camera chưa được cấp. Cho phép camera trong trình duyệt hoặc học không camera.',NotFoundError:'Không tìm thấy camera. Bạn vẫn có thể học không camera.',NotReadableError:'Camera đang được ứng dụng khác sử dụng. Tắt ứng dụng đó rồi thử lại.',SECURE_CONTEXT:'Mở index.html bằng Go Live (localhost hoặc 127.0.0.1) để bật camera. Bạn vẫn có thể học không camera.'};const message=messages[error.name]||messages[error.message]||'Chưa bật được camera. Thử lại hoặc bắt đầu học không camera.';$('cameraHint').textContent=message;toast(message);}finally{if(generation===cameraGeneration){cameraBusy=false;$('enableCamera').disabled=false;}}}
async function checkAI(){
 $('aiStatus').textContent='Đang tải mô hình AI có sẵn trong dự án…';$('aiStatusBadge').textContent='Đang tải';
 if(location.protocol==='file:'){$('aiStatus').textContent='Mở thư mục bằng VS Code và bấm Go Live. Không mở file HTML trực tiếp.';$('aiStatusBadge').textContent='Cần Go Live';$('objectAiStatus').textContent='Mở bằng Go Live để bật AI điện thoại / sách.';$('cameraHint').textContent=$('aiStatus').textContent;return;}
 try{const ready=await faceAI.init();aiOnline=true;$('aiStatus').textContent='AI chạy trong trình duyệt · Không cần Python hoặc backend.';$('aiStatusBadge').textContent='Đang bật';$('objectAiStatus').textContent=ready.objectsReady?'AI nhận diện điện thoại / sách đang bật. Nhận diện điện thoại gần bạn khi nhìn thẳng hoặc cúi đầu.':'AI điện thoại / sách chưa tải được. Kiểm tra file models/efficientdet_lite2.tflite rồi tải lại trang. Theo dõi khuôn mặt vẫn hoạt động.';cameraBadge('AI sẵn sàng');await enableCamera();}
 catch(error){aiOnline=false;$('aiStatus').textContent=error.message;$('aiStatusBadge').textContent='Lỗi tải AI';$('objectAiStatus').textContent='AI điện thoại / sách chưa hoạt động.';$('cameraHint').textContent='Chưa tải được AI. Giữ nguyên thư mục vendor/models rồi tải lại trang.';toast(error.message);}
 render();
}
function aiFailure(){clearTracking();if(session?.running&&$('faceMode').checked)$('pauseBtn').click();aiOnline=false;cameraReason=null;calibrated=false;reconcile();$('aiStatus').textContent='AI chưa hoạt động. Tải lại trang để khởi tạo lại AI.';$('aiStatusBadge').textContent='AI chưa kết nối';$('objectAiStatus').textContent='AI điện thoại / sách chưa hoạt động.';cameraBadge('Camera xem trước',!!stream);$('cameraCaption').textContent='AI mất kết nối · Chưa thể theo dõi khuôn mặt.';toast('AI chưa kết nối được. Chế độ theo dõi khuôn mặt cần kết nối AI để tiếp tục.');}
async function infer(){
 if((session&&!session.running&&!session.finished)||!stream||!aiOnline||inferenceBusy||!cameraInView()||$('feed').readyState<2)return;
 const expired=feedbackWindow.takeExpired(performance.now());
 if(expired.includes('phone'))clearActivity();
 if(expired.includes(FocusAlerts.category(candidateKey)))candidateKey=null;
 inferenceBusy=true;const generation=cameraGeneration,epoch=inferenceEpoch,sampleAt=performance.now();
 try{
  const v=$('feed');if(!v.videoWidth||!v.videoHeight)return;
  const data=await faceAI.analyze(v,performance.now(),{allowWriting:settings.studyMode==='writing',filterCalculator:settings.calculatorFilter});
  if(generation!==cameraGeneration||epoch!==inferenceEpoch||performance.now()-sampleAt>2200){candidateKey=null;return;}
  lastAiAt=performance.now();calibrated=!!data.calibrated;drawTracking(data);
  $('cameraCaption').textContent=!data.face_detected?(data.reason||'Không thấy khuôn mặt · Ngồi trước camera để theo dõi.'):calibrated?(data.reason||'Nhìn thẳng · Theo dõi hướng đầu đang hoạt động.'):`Đang hiệu chỉnh ${data.calibration_progress||0}% · Nhìn thẳng và mở mắt.`;
  const key=calibrated||!data.face_detected?data.key:null,now=performance.now();
  const allowed=key&&feedbackWindow.allows(key,now,sampleAt);
  // Do not keep a closed-eye warning after eyes reopen into a downward pose.
  if(['phone','eyes'].includes(cameraReason?.key)&&key&&key!==cameraReason.key)cameraReason=null;
  if(allowed){recoveringSince=null;if(key!==candidateKey||now-candidateSampleAt>8000){candidateKey=key;candidateSince=now;candidateHits=0;candidateSampleAt=-Infinity;}
   if(sampleAt!==candidateSampleAt)candidateHits++;candidateSampleAt=sampleAt;
   if(candidateHits>=2&&now-candidateSince>=alertDelay(key)&&cameraReason?.key!==key)cameraReason={id:newId(),key,label:data.reason};
  }else{candidateKey=null;if(key&&!allowed&&cameraReason?.key===key)cameraReason=null;
   if(cameraReason){recoveringSince??=now;if(now-recoveringSince>=600){cameraReason=null;recoveringSince=null;}}
  }
  if(session?.running)reconcile();
  else{presentAlert(cameraReason);
   if(cameraReason){status('Quay lại nhìn thẳng nhé.',cameraReason.label,'warning');sound();}
   else status(calibrated?'Camera AI đang theo dõi.':'Đang hiệu chỉnh camera…',calibrated?'Bấm Bắt đầu tập trung để ghi lại phiên học.':'Nhìn thẳng và mở mắt khoảng 4 giây.','running');
   render();
  }
 }catch(error){if(generation===cameraGeneration&&epoch===inferenceEpoch){aiFailure();$('aiStatus').textContent=error.message||'AI chưa hoạt động';console.error('Face AI:',error);}}
 finally{inferenceBusy=false;}
}
function snapshot(){
 accumulate();const events=[...session.events];if(session.episode)events.push(episodeEvent());
 return FocusRecords.normalize({id:session.id,startedAt:session.startedAt,endedAt:session.finished?session.endedAt:null,elapsed:session.elapsed,focused:session.focused,userConfirmed:session.userConfirmed,goal:session.goal,distractions:session.distractions,tabs:session.tabs,longestStreak:session.longestStreak||0,events,hasDetails:true,finished:session.finished,completed:!!session.completed,studyMode:settings.studyMode,sensitivity:settings.sensitivity,cameraSensitivity:settings.cameraSensitivity});
}
let bgWorker=null,wakeLockSentinel=null,keepAliveAudio=null;
function initBackgroundWorker(){
 if(typeof Worker==='undefined'||typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')return;
 try{
  const code=`let t=null;self.onmessage=function(e){if(e.data==='start'){if(!t)t=setInterval(()=>self.postMessage('tick'),250);}else if(e.data==='stop'){if(t){clearInterval(t);t=null;}}};`;
  const blob=new Blob([code],{type:'application/javascript'});
  bgWorker=new Worker(URL.createObjectURL(blob));
  bgWorker.onmessage=function(e){
   if(e.data==='tick'&&session?.running&&!session.finished){
    const now=performance.now();
    if(document.hidden||now-session.lastTick>=240){
     tickSession(now);
    }
   }
  };
 }catch(err){console.warn('Background worker unavailable:',err);}
}
async function requestWakeLock(){
 if(!settings.keepAwake||typeof navigator==='undefined'||!('wakeLock' in navigator)||!session?.running||session.finished)return;
 try{
  if(!wakeLockSentinel||wakeLockSentinel.released){
   wakeLockSentinel=await navigator.wakeLock.request('screen');
   wakeLockSentinel.addEventListener?.('release',()=>{wakeLockSentinel=null;});
  }
 }catch(_){}
}
function releaseWakeLock(){
 if(wakeLockSentinel){try{wakeLockSentinel.release();}catch(_){}wakeLockSentinel=null;}
}
function syncKeepAliveMedia(active){
 if(!settings.keepAwake||!active||!session?.running||session.finished){
  if(keepAliveAudio){try{keepAliveAudio.pause();}catch(_){}}
  return;
 }
 if(typeof window==='undefined'||typeof window.Audio!=='function')return;
 try{
  if(!keepAliveAudio){
   keepAliveAudio=new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
   keepAliveAudio.loop=true;
   keepAliveAudio.volume=0.001;
  }
  const p=keepAliveAudio.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{});
 }catch(_){}
}
function syncKeepAlive(running){
 if(running&&settings.keepAwake){
  if(bgWorker){try{bgWorker.postMessage('start');}catch(_){}}
  requestWakeLock();
  syncKeepAliveMedia(true);
 }else{
  if(bgWorker){try{bgWorker.postMessage('stop');}catch(_){}}
  releaseWakeLock();
  syncKeepAliveMedia(false);
 }
}
function persistSession(){if(!session)return false;try{const updated=FocusRecords.upsert(history,snapshot());if(!save('denban.history',updated))return false;history=updated;session.saved=true;renderHistory();return true;}catch(error){toast(error.message);return false;}}
$('saveSessionBtn').addEventListener('click',()=>{if(!session||session.elapsed<1000)return;if(persistSession())toast('Đã lưu phiên. Lưu lại sẽ cập nhật cùng phiên, không tạo bản trùng.');render();});
$('resetSessionBtn').addEventListener('click',async()=>{if(!session)return;if(!await ask('Đặt lại phiên hiện tại?','Phần học kể từ lần lưu gần nhất sẽ bị bỏ. Các phiên đã lưu vẫn giữ nguyên.','Đặt lại'))return;resetFeedback();syncKeepAlive(false);inferenceEpoch++;releaseAI();session=null;cameraReason=null;candidateKey=null;recoveringSince=null;calibrated=false;latestTracking=null;lastAiAt=performance.now();if(stream)stream.getTracks().forEach(t=>t.enabled=true);$('alertBanner').hidden=true;renderLog();render();status('Đã đặt lại.','Bấm Bắt đầu tập trung để tạo phiên mới.');});
function finish(completed=false){if(!session||session.finished)return;accumulate();closeEpisode();session.running=false;session.finished=true;session.completed=completed;session.endedAt=new Date().toISOString();resetFeedback();syncKeepAlive(false);document.title='Đèn Bàn · Một chút tập trung, mỗi ngày';log(completed?'Hoàn thành thời lượng mục tiêu':'Kết thúc phiên học');const saved=persistSession();session.saved=saved;stopCamera();$('alertBanner').hidden=true;status(saved?'Đã lưu phiên học của bạn.':'Phiên đã kết thúc nhưng chưa lưu được.',saved?'Xem kỷ lục và nhật ký trong Lịch sử.':'Bấm Lưu phiên để thử lại hoặc Xuất nhật ký để giữ dữ liệu.');if(completed)sound(true);toast(saved?'Đã lưu phiên học và cập nhật kỷ lục.':'Chưa lưu được. Bạn có thể xuất nhật ký hoặc bấm Lưu phiên để thử lại.');renderHistory();render();}
function newId(){return crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});}
$('startBtn').addEventListener('click',async()=>{if(starting||(session&&!session.finished))return;unlockSound(true);if($('faceMode').checked){if(!aiOnline){toast('AI đang tải hoặc chưa khởi tạo được. Chờ trạng thái AI sẵn sàng rồi thử lại.');return;}starting=true;try{await enableCamera();}finally{starting=false;}if(!stream)return;}resetFeedback();inferenceEpoch++;releaseAI(session?.id);session={id:newId(),startedAt:new Date().toISOString(),goal:settings.minutes*60000,elapsed:0,focused:0,userConfirmed:0,distracted:0,streak:0,longestStreak:0,events:[],streakBreaks:[],distractions:0,tabs:0,logs:[],running:true,finished:false,lastTick:performance.now(),reason:null,episode:null};cameraReason=null;candidateKey=null;recoveringSince=null;calibrated=false;latestTracking=null;lastAiAt=performance.now();if(stream)stream.getTracks().forEach(t=>t.enabled=true);$('alertBanner').hidden=true;log('Bắt đầu phiên tập trung');syncKeepAlive(true);render();reconcile();});
$('pauseBtn').addEventListener('click',()=>{if(!session||session.finished)return;unlockSound(true);inferenceEpoch++;clearActivity();if(session.running){accumulate();closeEpisode();session.streakBreaks.push(session.elapsed);session.running=false;session.reason=null;cameraReason=null;candidateKey=null;recoveringSince=null;stopAlertSound();session.streak=0;syncKeepAlive(false);log('Tạm dừng phiên học');document.title='Đèn Bàn · Đang tạm dừng';}else{if($('faceMode').checked&&(!stream||!aiOnline)){toast('Bật lại camera và kiểm tra AI trước khi tiếp tục.');return;}session.running=true;session.lastTick=performance.now();cameraReason=null;candidateKey=null;recoveringSince=null;lastAiAt=performance.now();syncKeepAlive(true);log('Tiếp tục phiên học');document.title='Đèn Bàn · Đang tập trung';}if(stream)stream.getTracks().forEach(t=>t.enabled=session.running);$('alertBanner').hidden=true;reconcile();render();if(stream)$('cameraCaption').textContent=session.running?'Phiên học đã tiếp tục.':'Đang tạm dừng · Camera ngừng xử lý.';});
$('finishBtn').addEventListener('click',async()=>{if(await ask('Kết thúc phiên học?','Thời gian học và thống kê của bạn sẽ được lưu. Bạn có thể bắt đầu phiên mới bất cứ lúc nào.','Lưu và kết thúc'))finish();});
$('enableCamera').addEventListener('click',enableCamera);$('disableCamera').addEventListener('click',stopCamera);$('dismissAlert').addEventListener('click',()=>dismissCurrentAlert());
document.querySelectorAll('[data-minutes]').forEach(b=>b.addEventListener('click',()=>{if(session&&!session.finished)return;settings.minutes=+b.dataset.minutes;save('denban.settings',settings);if(session?.finished){session=null;renderLog();status('Sẵn sàng cho một phiên học mới.','Bắt đầu khi bạn sẵn sàng.');}render();}));
function sensitivityLabel(){$('sensitivityLabel').textContent=({1:'Nhẹ nhàng · nhắm mắt sau 3 giây',2:'Vừa phải · nhắm mắt sau 2,2 giây',3:'Nhạy hơn · nhắm mắt sau 2,2 giây'})[settings.sensitivity];}
$('sensitivity').addEventListener('change',()=>{settings.sensitivity=+$('sensitivity').value;sensitivityLabel();save('denban.settings',settings);});$('soundToggle').addEventListener('change',()=>{settings.sound=$('soundToggle').checked;save('denban.settings',settings);unlockSound(true);});
$('themeToggle')?.addEventListener('click',()=>{
 const next=isDarkTheme()?'light':'dark';
 settings.theme=next;save('denban.settings',settings);applyTheme();
 toast(next==='dark'?'Đã chuyển sang giao diện tối.':'Đã chuyển sang giao diện sáng.');
});
$('themeSelect')?.addEventListener('change',()=>{
 settings.theme=$('themeSelect').value;save('denban.settings',settings);applyTheme();
 toast(settings.theme==='system'?'Đã đặt giao diện theo hệ thống.':settings.theme==='dark'?'Đã bật giao diện tối.':'Đã bật giao diện sáng.');
});
if(typeof window.matchMedia==='function'){
 try{
  const mq=window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change',()=>{if(settings.theme==='system')applyTheme();});
 }catch(_){}
}
function renderCameraSensitivity(){
 for(const key of ['phone','turn','noface']){
  $(key+'Sensitivity').value=settings.cameraSensitivity[key];
  const seconds=k=>(alertDelay(k)/1000).toLocaleString('vi-VN');
  $(key+'SensitivityHelp').textContent=key==='turn'?`Quay trái/phải: ${seconds('left')} giây; nhìn xuống ở chế độ màn hình: ${seconds('down')} giây.`:`Chờ tín hiệu kéo dài ${seconds(key)} giây${key==='phone'?' sau ít nhất hai lần nhận diện điện thoại':''}.`;
  if((key==='turn'&&settings.legacyCameraDelays.down)||settings.legacyCameraDelays[key])$(key+'SensitivityHelp').textContent+=' Đang giữ thời gian chờ từ cài đặt cũ; chọn lại mức để áp dụng thời gian mới.';
 }
}
function applyCameraSensitivity(){save('denban.settings',settings);inferenceEpoch++;candidateKey=null;cameraReason=null;recoveringSince=null;clearActivity();presentAlert(null);reconcile();renderCameraSensitivity();render();}
for(const key of ['phone','turn','noface'])$(key+'Sensitivity').addEventListener('change',()=>{settings.cameraSensitivity[key]=+$(key+'Sensitivity').value;delete settings.legacyCameraDelays[key==='turn'?'down':key];applyCameraSensitivity();});
$('resetCameraSensitivity').addEventListener('click',()=>{settings.cameraSensitivity={phone:2,turn:2,noface:2};settings.legacyCameraDelays={};applyCameraSensitivity();toast('Đã khôi phục độ nhạy riêng về Vừa phải.');});
if($('calculatorFilterToggle'))$('calculatorFilterToggle').checked=settings.calculatorFilter!==false;
$('calculatorFilterToggle')?.addEventListener('change',()=>{settings.calculatorFilter=$('calculatorFilterToggle').checked;save('denban.settings',settings);inferenceEpoch++;clearActivity();toast(settings.calculatorFilter?'Đã bật tối ưu phân biệt máy tính cầm tay.':'Đã tắt tối ưu phân biệt máy tính cầm tay.');});
$('keepAwakeToggle')?.addEventListener('change',()=>{settings.keepAwake=$('keepAwakeToggle').checked;save('denban.settings',settings);syncKeepAlive(session?.running);toast(settings.keepAwake?'Đã bật chống ngủ đông và giữ sáng màn hình.':'Đã tắt chống ngủ đông.');});
renderCameraSensitivity();
function renderTasks(){$('taskList').replaceChildren();tasks.forEach((task,index)=>{const li=document.createElement('li'),label=document.createElement('label'),check=document.createElement('input'),span=document.createElement('span'),del=document.createElement('button');check.type='checkbox';check.checked=!!task.done;li.classList.toggle('done',check.checked);span.textContent=task.text;check.addEventListener('change',()=>{task.done=check.checked;save('denban.tasks',tasks);renderTasks();});del.className='task-delete';del.textContent='×';del.setAttribute('aria-label',`Xóa mục tiêu: ${task.text}`);del.addEventListener('click',()=>{tasks.splice(index,1);save('denban.tasks',tasks);renderTasks();});label.append(check,span);li.append(label,del);$('taskList').append(li);});$('taskCount').textContent=`${tasks.filter(t=>t.done).length}/${tasks.length}`;}
$('taskForm').addEventListener('submit',event=>{event.preventDefault();const text=$('taskInput').value.trim();if(!text)return;if(tasks.length>=30)return toast('Hoàn thành vài mục tiêu trước khi thêm nhé. Tối đa 30 mục tiêu.');tasks.push({text,done:false});save('denban.tasks',tasks);$('taskInput').value='';renderTasks();});
function appendText(parent,tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node;}
function renderHistory(){
 const list=$('historyList');list.replaceChildren();$('clearHistory').disabled=!history.length;$('backupBtn').disabled=!history.length;
 const stats=FocusRecords.summarize(history);$('recordsSummary').replaceChildren();
 if(!$('sessionDetail').hidden){const selected=history.find(s=>s.id===$('sessionDetail').dataset.sessionId);if(selected)showDetail(selected);}
 for(const [value,label] of [[stats.count,'Phiên đã lưu'],[(stats.total/3600000).toFixed(1)+' giờ','Tổng thời gian học'],[stats.avg+'%','Tập trung trung bình mỗi phiên'],[stats.best+'%','Tỉ lệ tốt nhất'],[fmt(stats.longest),'Phiên dài nhất'],[fmt(stats.streak),'Chuỗi tập trung dài nhất'],[fmt(stats.userConfirmed),'Thời gian người dùng tự xác nhận'],[fmt(stats.estimatedFocused),'Thời gian tập trung ước lượng']]){const card=document.createElement('article');appendText(card,'strong',String(value));appendText(card,'small',label);$('recordsSummary').append(card);}
 $('topReasons').replaceChildren();for(const item of stats.reasons.slice(0,10)){const li=document.createElement('li');appendText(li,'span',item.reason);appendText(li,'span',`${item.count} lần · ${fmt(item.duration)}`);$('topReasons').append(li);}
 if(!stats.reasons.length)appendText($('topReasons'),'li','Chưa có nhật ký xao nhãng đã lưu.');
 if(!history.length){appendText(list,'div','Chưa có phiên học đã lưu.','history-empty');return;}
 history.forEach(item=>{const row=document.createElement('div');row.className='history-row';
 for(const [value,title] of [[new Date(item.startedAt).toLocaleString('vi-VN'),item.finished?(item.completed?'Đạt mục tiêu':'Đã kết thúc'):'Bản lưu trong phiên'],[fmt(item.elapsed),'Thời gian học'],[item.elapsed?`${Math.round(item.focused/item.elapsed*100)}%`:'—','Tỉ lệ tập trung'],[String(item.distractions),'Lần xao nhãng']]){const cell=document.createElement('div');appendText(cell,'strong',value);appendText(cell,'small',title);row.append(cell);}
 const actions=document.createElement('div');actions.className='history-actions';const detail=appendText(actions,'button','Xem chi tiết','text-button');detail.addEventListener('click',()=>showDetail(item));const del=appendText(actions,'button','Xóa phiên','text-button');del.addEventListener('click',async()=>{if(!await ask('Xóa phiên đã lưu?','Chỉ phiên này và nhật ký của nó sẽ được xóa.','Xóa phiên'))return;const next=history.filter(s=>s.id!==item.id);if(save('denban.history',next)){history=next;$('sessionDetail').hidden=true;renderHistory();}});row.append(actions);list.append(row);
 });
}
function showDetail(item){$('sessionDetail').dataset.sessionId=item.id;$('sessionDetail').hidden=false;$('detailTitle').textContent='Phiên '+new Date(item.startedAt).toLocaleString('vi-VN');$('detailSummary').textContent=`Học ${fmt(item.elapsed)} · Tập trung ${fmt(item.focused)} (ước lượng ${fmt(item.estimatedFocused)}, tự xác nhận ${fmt(item.userConfirmed)}) · Xao nhãng ${fmt(item.distracted)} · ${item.distractions} lần`;$('detailEvents').replaceChildren();for(const e of item.events){const li=document.createElement('li');appendText(li,'span',e.reason+(e.falsePositive?' · Người dùng báo cảnh báo sai (không tính xao nhãng)':''),'log-reason');appendText(li,'span',`${new Date(e.time).toLocaleTimeString('vi-VN')} · ${(e.duration/1000).toFixed(1)} giây`,'log-duration');$('detailEvents').append(li);}if(!item.events.length)appendText($('detailEvents'),'li',item.hasDetails?'Không có lần xao nhãng được ghi nhận.':'Phiên từ bản cũ không có nhật ký chi tiết.');}
$('closeDetail').addEventListener('click',()=>$('sessionDetail').hidden=true);
$('clearHistory').addEventListener('click',async()=>{if(await ask('Xóa lịch sử học tập?','Tất cả phiên đã lưu trong trình duyệt này sẽ bị xóa. Hãy xuất bản sao lưu trước nếu cần.','Xóa lịch sử')){if(save('denban.history',[])){history=[];$('sessionDetail').hidden=true;renderHistory();toast('Đã xóa lịch sử học tập.');}}});
function downloadJSON(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('backupBtn').addEventListener('click',()=>downloadJSON({schema:'denban.records.v1',exportedAt:new Date().toISOString(),sessions:history},'den-ban-sao-luu.json'));
$('importBtn').addEventListener('click',()=>$('importFile').click());
$('importFile').addEventListener('change',async()=>{const file=$('importFile').files?.[0];if(!file)return;try{if(file.size>5000000)throw new Error('File quá lớn. Giới hạn 5 MB.');const merged=FocusRecords.importRecords(JSON.parse(await file.text()),history);if(!await ask('Nhập bản sao lưu?',`${merged.length} phiên sau khi ghép. Phiên trùng mã sẽ được cập nhật bằng bản nhập.`,'Nhập dữ liệu'))return;if(save('denban.history',merged)){history=merged;renderHistory();toast('Đã nhập bản sao lưu.');}}catch(error){toast(error.message||'Không đọc được bản sao lưu JSON.');}finally{$('importFile').value='';}});
$('exportBtn').addEventListener('click',()=>{if(!session)return;const data={...snapshot(),logs:session.logs};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`den-ban-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function setView(view){if(!['study','history','settings'].includes(view))view='study';const page=view;['study','history','settings'].forEach(key=>{const section=$(key+'View');if(section)section.hidden=key!==page;});document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('pageName').textContent=({study:'Phiên tập trung',history:'Lịch sử học tập',settings:'Cài đặt'})[view];}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.view;setView(b.dataset.view);}));window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
document.addEventListener('visibilitychange',()=>{
 // Discard in-flight frames and restart camera thresholds after a tab change.
 inferenceEpoch++;candidateKey=null;cameraReason=null;recoveringSince=null;latestTracking=null;
 clearActivity();
 lastAiAt=performance.now();
 if(!document.hidden&&session?.running&&settings.keepAwake)requestWakeLock();
 if(!session?.running){$('alertBanner').hidden=true;cameraPiP?.sync();return;}
 reconcile();updateSessionTitle();
});
window.addEventListener('beforeunload',event=>{if(session&&!session.finished){event.preventDefault();event.returnValue='';}});window.addEventListener('pagehide',()=>{cameraPiP?.dispose();syncKeepAlive(false);if(stream)stream.getTracks().forEach(t=>t.stop());faceAI.close();});
function tickSession(now=performance.now()){if(!session?.running)return;if(session.reason)sound();accumulate(now);if(session.elapsed>=session.goal){finish(true);return;}if(stream&&aiOnline&&!document.hidden&&performance.now()-lastAiAt>8000)aiFailure();render();}
setInterval(tickSession,250);setInterval(infer,350);
sensitivityLabel();renderTasks();renderHistory();applyTheme();setView(location.hash.slice(1));render();checkAI();initBackgroundWorker();
})();
