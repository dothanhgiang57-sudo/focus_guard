'use strict';
(() => {
const category=key=>({left:'turn',right:'turn',down:'turn',phone:'phone',noface:'noface',eyes:'eyes'})[key]||null;
const levels=[1,2,3], base={1:3000,2:1800,3:900};
const delays={phone:{1:5000,2:3000,3:2000},turn:base,down:{1:7000,2:5000,3:3000},noface:{1:6000,2:4000,3:2500}};
function preferences(value={}){
 const sensitivity=levels.includes(+value.sensitivity)?+value.sensitivity:2;
 const separate=value.cameraSensitivity&&typeof value.cameraSensitivity==='object';
 const cameraSensitivity=Object.fromEntries(['phone','turn','noface'].map(k=>[k,levels.includes(+value.cameraSensitivity?.[k])?+value.cameraSensitivity[k]:sensitivity]));
 // Old general sensitivity had fixed floors for phone, no-face and looking down.
 // Preserve those exact waits until that individual preference is edited/reset.
 const legacyCameraDelays=separate?Object.fromEntries(Object.entries(value.legacyCameraDelays||{}).filter(([k,v])=>['phone','down','noface'].includes(k)&&v===({phone:3000,down:5000,noface:4000})[k])):(Object.hasOwn(value,'sensitivity')?{phone:3000,down:5000,noface:4000}:{});
 return {sensitivity,cameraSensitivity,legacyCameraDelays};
}
function delay(settings,key){
 if(key==='eyes')return Math.max(base[settings.sensitivity]||1800,2200);
 const group=category(key),level=settings.cameraSensitivity[group]||2;
 return settings.legacyCameraDelays[key]??delays[key==='down'?'down':group]?.[level]??1800;
}
class FeedbackWindow {
 constructor(){this.reset();}
 reset(){this.until=new Map();this.handled=new Set();this.expired=new Set();}
 accept(id,key,now){if(!id||!category(key)||this.handled.has(id))return false;this.handled.add(id);this.until.set(category(key),now+30000);this.expired.delete(category(key));return true;}
 takeExpired(now){const expired=[...this.until].filter(([key,end])=>end<=now&&!this.expired.has(key)).map(([key])=>key);for(const key of expired)this.expired.add(key);return expired;}
 suppressed(key,now){return now<(this.until.get(category(key))??-Infinity);}
 allows(key,now,sampleAt){const end=this.until.get(category(key));return end===undefined||(now>=end&&sampleAt>=end);}
}
globalThis.FocusAlerts={category,preferences,delay,FeedbackWindow};
})();
