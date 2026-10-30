'use strict';
(() => {
 const AUTO_KEY = 'denban.pip.auto';
 const PANEL_STYLE = `
  :root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#264733;background:#f2f6ed;color-scheme:light;font-synthesis:none}
  *{box-sizing:border-box}body{margin:0;min-width:180px;min-height:100vh;padding:14px;background:#f2f6ed}
  main{display:grid;grid-template-rows:auto 1fr auto;gap:12px;min-height:calc(100vh - 28px)}
  section{background:#fffefa;border:1px solid #dce6d6;border-radius:16px;padding:16px 18px;overflow-wrap:anywhere}
  h2{margin:0 0 10px;font-size:11px;line-height:1.5;font-weight:650;letter-spacing:1.2px}
  .focus-value{margin:0;font-size:clamp(22px,8vw,32px);line-height:1.25;font-weight:650;letter-spacing:-.6px}
  .timer{text-align:center;display:flex;flex-direction:column;justify-content:center}.timer h2{margin-bottom:4px}
  .time-value{display:block;font-size:clamp(40px,17vw,68px);font-weight:600;line-height:1.15;font-variant-numeric:tabular-nums;letter-spacing:-2px}
  .phase{font-size:12px;line-height:1.6;margin:5px 0 0;color:#62745f}
  .alert h2{display:flex;align-items:center;gap:7px}.mark{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;background:#e4edde;font-size:14px;letter-spacing:0}
  .alert-value{margin:0;font-size:15px;font-weight:550;line-height:1.55}
  body[data-alarm="true"]{background:#981b2b;color:#fff4f4}
  body[data-alarm="true"] section{background:#ffffff0f;border-color:#ffffff55}
  body[data-alarm="true"] .alert{background:#c62a3e;border:2px solid #ffd5d5}
  body[data-alarm="true"] h2,body[data-alarm="true"] .phase{color:#ffdedf}
  body[data-alarm="true"] .mark{background:#fff4f4;color:#981b2b}
  .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}button{font:inherit;font-size:14px;font-weight:650;background:#fffefa;color:#355847;border:1px solid #dce6d6;padding:10px 14px;border-radius:9px;min-height:44px;cursor:pointer}button:focus-visible{outline:3px solid #e0b353;outline-offset:3px}.notice{font-size:12px;line-height:1.6;margin:8px 0 0}.notice:empty{display:none}
  @media(max-height:330px){body{padding:9px}main{gap:7px;min-height:calc(100vh - 18px)}section{padding:9px 13px;border-radius:11px}h2{font-size:9px;margin-bottom:5px}.time-value{font-size:42px}.focus-value{font-size:22px}.alert-value{font-size:13px}.phase{font-size:10px;margin-top:1px}}
 `;

 class BrowserCameraPiP {
  constructor({ video, button, autoToggle, status, hasCamera, getState = () => ({}), onFeedback = () => {}, onChange = () => {}, notify = () => {} }) {
   this.cameraVideo = video;
   this.button = button;
   this.autoToggle = autoToggle;
   this.status = status;
   this.hasCamera = hasCamera;
   this.getState = getState;
   this.onFeedback = onFeedback;
   this.onChange = onChange;
   this.notify = notify;
   this.doc = video.ownerDocument || document;
   this.win = this.doc.defaultView || window;
   this.mediaSession = this.win.navigator?.mediaSession;
   this.documentPiP = this.win.documentPictureInPicture;
   this.useDocument = typeof this.documentPiP?.requestWindow === 'function';
   this.pipWindow = null;
   this.panel = null;
   this.video = null;
   this.canvas = null;
   this.capture = null;
   this.lastActive = false;
   this.fallbackError = false;
   this.frameKey = null;
   this.supported = this.useDocument || this.createCanvasVideo();
   this.autoUnsupported = typeof this.mediaSession?.setActionHandler !== 'function';
   this.autoEnabled = true;
   try {
    const saved = this.win.localStorage.getItem(AUTO_KEY);
    this.autoEnabled = saved !== 'false' && saved !== '0';
   } catch { /* Storage can be unavailable in private or file-based contexts. */ }
   this.disposed = false;
   this.registered = false;
   this.generation = 0;
   this.pending = null;
   this.openedAutomatically = false;
   this.onClick = () => this.isActive() ? this.close() : this.request(false);
   this.onToggle = () => {
    this.autoEnabled = Boolean(this.autoToggle.checked);
    try { this.win.localStorage.setItem(AUTO_KEY, String(this.autoEnabled)); } catch {}
    if (!this.autoEnabled && (this.openedAutomatically || this.pending?.automatic)) this.close();
    this.sync();
   };
   // The browser grants the activation needed for eligible camera-capture apps.
   // A generic visibilitychange callback cannot grant that activation.
   this.onNativeEnter = () => this.registered && this.autoEnabled ? this.request(Boolean(this.doc.hidden)) : Promise.resolve(false);
   this.onVisibility = () => {
    if (!this.doc.hidden && (this.openedAutomatically || this.pending?.automatic)) this.close();
    else this.refresh();
   };
   this.onEnter = () => {
    this.openedAutomatically = Boolean(this.pending?.automatic);
    this.sync();
   };
   this.onLeave = () => {
    this.openedAutomatically = false;
    this.sync();
   };
   this.onVideoState = () => this.sync();
   this.videoStateEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'pause', 'emptied'];
   button.addEventListener('click', this.onClick);
   autoToggle.addEventListener('change', this.onToggle);
   this.doc.addEventListener('visibilitychange', this.onVisibility);
   if (this.video) {
    this.video.addEventListener('enterpictureinpicture', this.onEnter);
    this.video.addEventListener('leavepictureinpicture', this.onLeave);
    for (const event of this.videoStateEvents) this.video.addEventListener(event, this.onVideoState);
    this.refresh();
    // A muted canvas stream can be prepared before the PiP click grants activation.
    try { Promise.resolve(this.video.play()).catch(() => { this.fallbackError = true; this.sync(); }); } catch { this.fallbackError = true; }
   }
   this.sync();
  }

  createCanvasVideo() {
   if (this.doc.pictureInPictureEnabled !== true || typeof this.doc.createElement !== 'function') return false;
   try {
    const canvas = this.doc.createElement('canvas');
    const video = this.doc.createElement('video');
    if (typeof canvas.captureStream !== 'function' || typeof video.requestPictureInPicture !== 'function') return false;
    canvas.width = 640; canvas.height = 660;
    this.context = canvas.getContext('2d');
    if (!this.context) return false;
    this.canvas = canvas;
    this.capture = canvas.captureStream(4);
    this.video = video;
    video.muted = true; video.autoplay = true; video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.className = 'pip-render-source';
    video.srcObject = this.capture;
    // Keep it attached and playing so video PiP has frames, including in Safari.
    this.doc.body.append(video);
    return true;
   } catch {
    this.releaseCanvas();
    return false;
   }
  }

  releaseCanvas() {
   if (this.capture) for (const track of this.capture.getTracks()) track.stop();
   if (this.video) {
    try { this.video.pause(); } catch {}
    this.video.srcObject = null;
    this.video.remove();
   }
   this.capture = null;
  }

  snapshot() {
   let state;
   try { state = this.getState() || {}; } catch { state = {}; }
   return {
    focus: String(state.focus || 'Đang chờ camera'),
    remaining: String(state.remaining || '00:00'),
    phase: String(state.phase || 'Chưa bắt đầu phiên học'),
    warning: typeof state.warning === 'string' ? state.warning : '',
    alertId: typeof state.alertId==='string'?state.alertId:null,notice:typeof state.notice==='string'?state.notice:''
   };
  }

  createPanel(pipWindow) {
   const doc = pipWindow.document;
   doc.title = 'Đèn Bàn · Trạng thái tập trung';
   doc.documentElement.lang = 'vi';
   const style = doc.createElement('style'); style.textContent = PANEL_STYLE; doc.head.append(style);
   const main = doc.createElement('main');
   const make = (className, title, valueTag, valueClass) => {
    const section = doc.createElement('section'); section.className = className;
    const heading = doc.createElement('h2'); heading.textContent = title;
    const value = doc.createElement(valueTag); value.className = valueClass;
    section.append(heading, value); main.append(section);
    return { section, heading, value };
   };
   const focus = make('focus', 'TRẠNG THÁI TẬP TRUNG', 'p', 'focus-value');
   const timer = make('timer', 'THỜI GIAN CÒN LẠI', 'strong', 'time-value');
   const phase = doc.createElement('p'); phase.className = 'phase'; timer.section.append(phase);
   const alert = make('alert', 'CẢNH BÁO', 'p', 'alert-value');
   const mark = doc.createElement('span'); mark.className = 'mark'; mark.setAttribute('aria-hidden', 'true'); alert.heading.prepend(mark);
   alert.section.setAttribute('role', 'status'); alert.section.setAttribute('aria-live', 'polite');
   const actions=doc.createElement('div');actions.className='actions';alert.section.append(actions);
   const notice=doc.createElement('p');notice.className='notice';notice.setAttribute('role','status');alert.section.append(notice);
   doc.body.replaceChildren(main);
   this.panel = { body: doc.body, focus: focus.value, remaining: timer.value, phase, warning: alert.value, mark, actions, notice, alertId:undefined };
  }

  refresh() {
   if (this.disposed) return;
   const state = this.snapshot();
   if (this.panel && this.isActive()) {
    const panel = this.panel;
    panel.body.dataset.alarm = String(Boolean(state.warning));
    for (const key of ['focus', 'remaining', 'phase']) if (panel[key].textContent !== state[key]) panel[key].textContent = state[key];
    const message = state.warning || 'Chưa có cảnh báo';
    if (panel.warning.textContent !== message) panel.warning.textContent = message;
    panel.mark.textContent = state.warning ? '!' : '✓';
    panel.notice.textContent=state.notice;
    if(panel.alertId!==state.alertId){
     panel.alertId=state.alertId;panel.actions.replaceChildren();panel.feedback=null;
     if(state.alertId){const id=state.alertId;const button=this.pipWindow.document.createElement('button');button.textContent='Mình đang học';button.addEventListener('click',()=>this.onFeedback(id));panel.actions.append(button);panel.feedback=button;}
    }
   }
   if (this.canvas) this.drawCanvas(state);
  }

  drawCanvas(state) {
   const key = JSON.stringify(state);
   if (this.frameKey === key) return;
   this.frameKey = key;
   const ctx = this.context, alarm = Boolean(state.warning);
   ctx.fillStyle = alarm ? '#981b2b' : '#f2f6ed'; ctx.fillRect(0, 0, 640, 660);
   const text = (value, x, y, size, weight = 600, color = alarm ? '#fff4f4' : '#264733') => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif`; ctx.fillText(value, x, y, 568);
   };
   text('TRẠNG THÁI TẬP TRUNG', 36, 52, 23);
   text(state.focus, 36, 116, 44);
   ctx.fillStyle = alarm ? '#ffffff55' : '#dce6d6'; ctx.fillRect(36, 155, 568, 2);
   text('THỜI GIAN CÒN LẠI', 36, 205, 23);
   text(state.remaining, 36, 328, 112);
   text(state.phase, 36, 376, 26, 500);
   ctx.fillStyle = alarm ? '#c62a3e' : '#e4edde'; ctx.fillRect(20, 414, 600, 226);
   text(alarm ? '!  CẢNH BÁO' : '✓  CẢNH BÁO', 36, 458, 23);
   const words = (state.warning || 'Chưa có cảnh báo').split(/\s+/);
   let line = '', y = 511;
   ctx.font = '550 31px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
   for (const word of words) {
    if (line && ctx.measureText(`${line} ${word}`).width > 568) { text(line, 36, y, 31, 550); line = ''; y += 42; }
    line += `${line ? ' ' : ''}${word}`;
   }
   if (line) text(line, 36, y, 31, 550);
   if(state.alertId)text('Báo nhầm: quay lại trang học',36,615,24,500);
   else if(state.notice)text('Đã ghi nhận phản hồi của bạn.',36,615,24,500);
   try { this.capture?.getVideoTracks()[0]?.requestFrame?.(); } catch {}
  }

  activeChanged() {
   const active = this.isActive();
   if (active === this.lastActive) return;
   this.lastActive = active;
   try { this.onChange(active); } catch {}
  }

  cameraAvailable() {
   if (this.disposed) return false;
   try { return Boolean(this.hasCamera()); } catch { return false; }
  }

  videoReady() {
   return this.cameraVideo.readyState >= 2 && this.cameraVideo.paused !== true && (this.useDocument || (this.video?.readyState >= 2 && this.video.paused !== true));
  }

  isActive() {
   return this.useDocument ? Boolean(this.pipWindow && !this.pipWindow.closed) : Boolean(this.video && this.doc.pictureInPictureElement === this.video);
  }

  sync() {
   if (this.disposed) return;
   const camera = this.cameraAvailable();
   const shouldRegister = this.supported && this.autoEnabled && camera && !this.autoUnsupported;
   if (shouldRegister && !this.registered) {
    try {
     this.mediaSession.setActionHandler('enterpictureinpicture', this.onNativeEnter);
     this.registered = true;
    } catch {
     // Some browsers expose MediaSession but do not recognize this action.
     this.autoUnsupported = true;
    }
   } else if (!shouldRegister && this.registered) {
    this.unregister();
   }
   if (!camera && (this.isActive() || this.pending?.generation === this.generation)) this.close();
   this.activeChanged();
   this.render(camera);
   this.refresh();
  }

  render(camera = this.cameraAvailable()) {
   if (this.disposed) return;
   this.button.textContent = this.isActive() ? 'Đóng cửa sổ nổi' : 'Mở cửa sổ nổi';
   this.button.disabled = !this.supported || this.fallbackError || Boolean(this.pending) || (!this.isActive() && (!camera || !this.videoReady()));
   this.button.setAttribute('aria-pressed', String(this.isActive()));
   this.autoToggle.checked = this.autoEnabled;
   this.autoToggle.disabled = !this.supported || this.autoUnsupported;
   this.status.textContent = !this.supported ? 'Trình duyệt chưa hỗ trợ cửa sổ nổi.'
    : this.fallbackError ? 'Chưa tạo được bảng trạng thái nổi. Tải lại trang để thử lại.'
    : !camera ? 'Bật camera để xem trạng thái và thời gian trong cửa sổ nổi.'
    : !this.useDocument ? 'PiP video chỉ xem được chữ. Quay lại trang học để bấm Mình đang học; trình duyệt này không hỗ trợ nút trong PiP.'
    : this.autoUnsupported ? 'Mở thủ công bằng nút bên trên; trình duyệt chưa hỗ trợ tự mở khi đổi tab.'
    : this.autoEnabled ? 'Trạng thái · Thời gian còn lại · Cảnh báo đỏ. Tự mở khi đổi tab nếu trình duyệt cho phép.'
    : 'Bấm nút để xem trạng thái, thời gian còn lại và cảnh báo.';
  }

  unregister() {
   if (!this.registered) return;
   this.registered = false;
   try { this.mediaSession.setActionHandler('enterpictureinpicture', null); } catch {}
  }

  request(automatic) {
   if (!this.supported || this.fallbackError || !this.cameraAvailable() || !this.videoReady() || this.pending || this.isActive()) return Promise.resolve(false);
   if (automatic && (!this.autoEnabled || !this.doc.hidden || this.doc.pictureInPictureElement)) return Promise.resolve(false);
   const pending = { generation: this.generation, automatic };
   this.pending = pending;
   let operation;
   try {
    // Call immediately, before any await, to preserve manual button activation.
    this.refresh();
    operation = this.useDocument ? this.documentPiP.requestWindow({ width: 360, height: 410 }) : this.video.requestPictureInPicture();
   } catch (error) {
    operation = Promise.reject(error);
   }
   this.sync();
   return Promise.resolve(operation).then(result => {
    const valid = !this.disposed && pending.generation === this.generation && this.cameraAvailable() && this.videoReady()
     && (!automatic || (this.autoEnabled && this.doc.hidden));
    if (!valid) {
     if (this.useDocument) { try { result.close(); } catch {} return false; }
     return this.closeOwned().then(() => false);
    }
    if (this.useDocument) {
     this.pipWindow = result;
     try { this.createPanel(result); } catch {
      try { result.close(); } catch {}
      this.pipWindow = null; this.panel = null;
      this.notify('Chưa hiển thị được bảng trạng thái nổi. Bấm mở lại để thử lại.');
      return false;
     }
     result.addEventListener('pagehide', () => {
      if (this.pipWindow !== result) return;
      this.pipWindow = null; this.panel = null; this.openedAutomatically = false;
      if (this.refreshTimer) result.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      this.activeChanged(); this.sync();
     }, { once: true });
     this.refreshTimer = result.setInterval(() => this.refresh(), 500);
    }
    this.openedAutomatically = automatic;
    return true;
   }, () => {
    if (!this.disposed && pending.generation === this.generation) {
     try { this.notify('Không mở được cửa sổ nổi. Hãy bấm lại hoặc kiểm tra quyền Picture-in-Picture của trình duyệt.'); } catch {}
    }
    return false;
   }).finally(() => {
    if (this.pending === pending) this.pending = null;
    this.sync();
   });
  }

  closeOwned() {
   if (this.useDocument) {
    if (this.pipWindow) { try { this.pipWindow.close(); } catch {} }
    return Promise.resolve();
   }
   if (!this.isActive() || typeof this.doc.exitPictureInPicture !== 'function') return Promise.resolve();
   try { return Promise.resolve(this.doc.exitPictureInPicture()).catch(() => {}); } catch { return Promise.resolve(); }
  }

  close() {
   this.generation++;
   this.openedAutomatically = false;
   // Refresh controls without starting another close if the browser rejects exit.
   return this.closeOwned().then(() => { this.activeChanged(); this.render(); });
  }

  dispose() {
   if (this.disposed) return;
   this.disposed = true;
   this.unregister();
   this.button.removeEventListener('click', this.onClick);
   this.autoToggle.removeEventListener('change', this.onToggle);
   this.doc.removeEventListener('visibilitychange', this.onVisibility);
   if (this.video) {
    this.video.removeEventListener('enterpictureinpicture', this.onEnter);
    this.video.removeEventListener('leavepictureinpicture', this.onLeave);
    for (const event of this.videoStateEvents) this.video.removeEventListener(event, this.onVideoState);
   }
   return this.close().finally(() => this.releaseCanvas());
  }
 }

 window.BrowserCameraPiP = BrowserCameraPiP;
})();
