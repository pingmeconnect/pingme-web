/* PingMe – lively add-on: (1) colourful reply bubble + confetti, (2) changing mascot during the 180-second wait. Display only.
   It only changes how the reply LOOKS. It never touches alert sending, sessions or credits.
   To remove it: delete the <script src="/scan/reply-bubble.js"> line from scan/index.html. */
(function () {
  "use strict";
  var css = [
    "html body #appShell #replyState .owner-reply-card{position:relative!important;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 55%,#db2777 100%)!important;border:0!important;",
    "border-radius:26px 26px 26px 8px!important;color:#fff!important;padding:18px 18px 14px!important;margin-bottom:18px!important;",
    "box-shadow:0 14px 34px rgba(124,58,237,.45),0 0 0 4px rgba(255,255,255,.2)!important;overflow:visible!important}",
    "html body #appShell #replyState .owner-reply-card::after{content:'';position:absolute;left:18px;bottom:-13px;width:0;height:0;border-right:16px solid transparent;border-top:15px solid #db2777}",
    "html body #appShell #replyState .owner-reply-card .reply-message::before,html body #appShell #replyState .owner-reply-card .reply-message::after{display:none!important}",
    "html body #appShell #replyState .owner-reply-card::before{content:'✨';position:absolute;right:12px;top:-14px;font-size:24px;animation:pmSpark 2.4s ease-in-out infinite}",
    "html body #appShell #replyState .owner-reply-card .reply-card-title,html body #appShell #replyState .owner-reply-card .reply-card-label{color:#fff!important;font-weight:800!important;letter-spacing:.02em}",
    "html body #appShell #replyState .owner-reply-card .whatsapp-dot{background:#25d366!important;color:#fff!important;border-radius:50%!important;box-shadow:0 0 0 3px rgba(255,255,255,.35)}",
    "html body #appShell #replyState .owner-reply-card .reply-message{background:rgba(255,255,255,.14)!important;border:0!important;border-left:0!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)!important;border-radius:16px!important;color:#fff!important;font-size:clamp(21px,6vw,28px)!important;font-weight:800!important;line-height:1.3!important;",
    "text-align:left!important;text-shadow:0 2px 8px rgba(0,0,0,.28);word-break:break-word;margin:6px 0 4px!important;font-family:'Noto Sans Tamil','Plus Jakarta Sans',system-ui,sans-serif}",
    "html body #appShell #replyState .owner-reply-card .reply-time{color:rgba(255,255,255,.85)!important;font-weight:700!important;text-align:right!important;display:block}",
    "html body #appShell #replyState .owner-reply-card .reply-sound-toggle{background:rgba(255,255,255,.22)!important;border:1px solid rgba(255,255,255,.55)!important;color:#fff!important}",
    "html body #appShell #replyState .owner-reply-card.pm-pop{animation:pmPop .6s cubic-bezier(.2,1.5,.4,1) both}",
    "html body #appShell #replyState .owner-reply-card.pm-typing .reply-message,html body #appShell #replyState .owner-reply-card.pm-typing .reply-time{display:none!important}",
    ".pm-dots{display:none;gap:7px;padding:10px 4px 6px}",
    "html body #appShell #replyState .owner-reply-card.pm-typing .pm-dots{display:flex}",
    ".pm-dots i{width:11px;height:11px;border-radius:50%;background:#fff;opacity:.35;animation:pmDot 1s infinite ease-in-out}",
    ".pm-dots i:nth-child(2){animation-delay:.18s}.pm-dots i:nth-child(3){animation-delay:.36s}",
    ".pm-confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999}",
    ".pm-confetti b{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;animation:pmFall linear forwards}",
    "@keyframes pmFall{to{top:105%;transform:translateX(30px) rotate(540deg);opacity:.9}}",
    "@keyframes pmPop{0%{transform:scale(.6) translateY(24px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}",
    "@keyframes pmDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-8px);opacity:1}}",
    "@keyframes pmSpark{0%,100%{transform:rotate(-10deg) scale(1)}50%{transform:rotate(12deg) scale(1.25)}}",
    "@media (prefers-reduced-motion:reduce){.pm-confetti{display:none}#replyState .owner-reply-card,html body #appShell #replyState .owner-reply-card::before,.pm-dots i{animation:none!important}}",
    "html body #appShell .action-button{position:relative;overflow:hidden;border:2px solid rgba(255,255,255,.75)!important;color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.35);box-shadow:0 8px 20px rgba(0,0,60,.4),inset 0 2px 0 rgba(255,255,255,.55),inset 0 -4px 0 rgba(0,0,0,.18)!important;transition:transform .15s}",
    "html body #appShell .action-button:active{transform:translateY(2px) scale(.97)}",
    "html body #appShell .action-buy{background:linear-gradient(115deg,#ff9a1f,#ff4d6d 55%,#d11fb8)!important;animation:pmBuyPulse 2.2s ease-in-out infinite}",
    "html body #appShell .action-share{background:linear-gradient(115deg,#18c8f5,#2861f4 55%,#6d3df0)!important}",
    "html body #appShell .action-rate{background:linear-gradient(115deg,#ffd34f,#ff9a24 55%,#ed6b19)!important}",
    "html body #appShell .action-done{background:linear-gradient(115deg,#35df83,#12ad62 55%,#07844b)!important}",
    "html body #appShell .action-button::after{content:'';position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:pmShineBtn 3.6s ease-in-out infinite}",
    "@keyframes pmShineBtn{0%,60%{left:-70%}100%{left:130%}}",
    "@keyframes pmBuyPulse{0%,100%{box-shadow:0 8px 20px rgba(0,0,60,.4),0 0 0 0 rgba(255,77,109,.55)}50%{box-shadow:0 8px 20px rgba(0,0,60,.4),0 0 0 9px rgba(255,77,109,0)}}",
    "#buyModal button[onclick=\"orderStarterKitWhatsApp()\"]{background:linear-gradient(115deg,#25d366,#0a8f43)!important;color:#fff!important}",
    "@media (prefers-reduced-motion:reduce){html body #appShell .action-button,html body #appShell .action-button::after{animation:none!important}}",
    "html body #appShell .story-image-frame{background:radial-gradient(circle at 50% 40%,#2b3fd1,#10104f)!important;box-shadow:0 18px 38px rgba(0,0,40,.55),0 0 0 3px rgba(255,255,255,.35),inset 0 2px 0 rgba(255,255,255,.4)!important;border-radius:24px!important;overflow:hidden;aspect-ratio:16/9!important;max-height:none!important;height:auto!important;min-height:0!important;flex:0 0 auto!important;align-self:center!important}",
    "html body #appShell #waitingStoryImage,html body #storyDemoImage{object-fit:contain!important;object-position:center!important;width:100%!important;height:100%!important;image-rendering:auto;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35))}",
    "html body #appShell #waitingState .waiting-visual{padding-top:50px!important;margin-bottom:8px!important}",
    "html body #appShell #waitingState .waiting-visual img.waiting-mascot{width:132px!important;height:132px!important;max-width:none!important;border-radius:50%!important;object-fit:contain!important;background:radial-gradient(circle at 35% 30%,#fff,#d6e6ff)!important;box-shadow:0 14px 26px rgba(0,0,50,.5),0 0 0 4px rgba(255,255,255,.85),inset 0 -6px 12px rgba(40,70,200,.25)!important;padding:4px}",
    "html body #appShell img[src*='/assets/']:not(#waitingStoryImage){filter:drop-shadow(0 8px 10px rgba(0,0,40,.4));image-rendering:-webkit-optimize-contrast}",
  ].join("");
  var st = document.createElement("style"); st.id = "pmReplyBubbleCss"; st.textContent = css; document.head.appendChild(st);

  function pmCelebrate() {
    try { if (navigator.vibrate) navigator.vibrate([120, 70, 120]); } catch (e) {}
    try {
      if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
      var box = document.createElement("div"); box.className = "pm-confetti"; box.setAttribute("aria-hidden", "true");
      var colors = ["#facc15", "#22d3ee", "#f472b6", "#a78bfa", "#34d399", "#fb923c"];
      for (var i = 0; i < 28; i++) {
        var p = document.createElement("b");
        p.style.cssText = "left:" + (Math.random() * 100) + "%;background:" + colors[i % colors.length] + ";animation-delay:" + (Math.random() * 0.5) + "s;animation-duration:" + (1.6 + Math.random() * 1.2) + "s;transform:rotate(" + (Math.random() * 360) + "deg)";
        box.appendChild(p);
      }
      document.body.appendChild(box);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3200);
    } catch (e) {}
  }

  function setup() {
    var rs = document.getElementById("replyState");
    if (!rs) return;
    var card = rs.querySelector(".owner-reply-card");
    if (!card) return;
    if (!card.querySelector(".pm-dots")) {
      var d = document.createElement("div"); d.className = "pm-dots"; d.setAttribute("aria-hidden", "true");
      d.innerHTML = "<i></i><i></i><i></i>";
      var title = card.querySelector(".reply-card-title");
      if (title && title.nextSibling) card.insertBefore(d, title.nextSibling); else card.appendChild(d);
    }
    var wasHidden = rs.classList.contains("hidden");
    new MutationObserver(function () {
      var hidden = rs.classList.contains("hidden");
      if (wasHidden && !hidden) {
        card.classList.remove("pm-pop"); card.classList.add("pm-typing");
        // "typing…" for a moment, then the bubble pops in with the message
        setTimeout(function () { card.classList.remove("pm-typing"); void card.offsetWidth; card.classList.add("pm-pop"); pmCelebrate(); }, 700);
      }
      wasHidden = hidden;
    }).observe(rs, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
})();

/* ---------- (2) Changing mascot + speech bubble while waiting ---------- */
(function () {
  "use strict";
  var STEPS = [
    ["/assets/mascot-waiting.png",        false, "Ping sent! The owner is being notified ⏳", "பிங் அனுப்பப்பட்டது! உரிமையாளருக்குத் தெரிவிக்கப்படுகிறது ⏳"],
    ["/assets/boy-waiting.png",           true,  "Your message was delivered ✔",             "உங்கள் செய்தி சென்றடைந்தது ✔"],
    ["/assets/Pingy_Waiting_Reference.png", true, "Replies appear right here, instantly!",    "பதில் இங்கேயே உடனே தெரியும்!"],
    ["/assets/boy-sad.png",               true,  "The owner may be busy… please wait 🙏",    "உரிமையாளர் பிஸியாக இருக்கலாம்… சற்று காத்திருங்கள் 🙏"],
    ["/assets/boy-happy.png",             true,  "Almost there! Stay on this page 👍",       "கிட்டத்தட்ட முடிந்தது! இந்தப் பக்கத்திலேயே இருங்கள் 👍"],
    ["/assets/Pingy_ThankYou_Reference.png", true, "Thank you for helping! 🙏",               "உதவியதற்கு நன்றி! 🙏"]
  ];
  var css = [
    ".pm-bubble{position:absolute;left:50%;top:-6px;transform:translateX(-50%);z-index:5;max-width:92%;width:max-content;padding:8px 14px;border-radius:18px;",
    "background:#fff;color:#1e1b4b;font-weight:800;font-size:clamp(12px,3.4vw,15px);line-height:1.25;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.28);",
    "font-family:'Noto Sans Tamil','Plus Jakarta Sans',system-ui,sans-serif;transition:opacity .35s,transform .35s}",
    ".pm-bubble::after{content:'';position:absolute;left:50%;bottom:-8px;margin-left:-8px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid #fff}",
    ".pm-bubble.pm-out{opacity:0;transform:translateX(-50%) translateY(6px)}",
    ".waiting-mascot.pm-sticker{border:4px solid #fff;border-radius:24px;box-shadow:0 10px 24px rgba(0,0,0,.35);background:#fff;object-fit:cover}",
    ".waiting-mascot.pm-out{opacity:0;transform:scale(.85) rotate(-4deg)}",
    ".waiting-mascot.pm-in{animation:pmMascotIn .55s cubic-bezier(.2,1.5,.4,1) both}",
    ".waiting-mascot{transition:opacity .3s,transform .3s}",
    "@keyframes pmMascotIn{0%{transform:scale(.7) rotate(5deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}",
    "@media (prefers-reduced-motion:reduce){.waiting-mascot,.pm-bubble{transition:none!important;animation:none!important}}"
  ].join("");
  var st = document.createElement("style"); st.id = "pmWaitMascotCss"; st.textContent = css; document.head.appendChild(st);

  var timer = null, idx = 0, started = false;
  function lang() { try { return (typeof currentLang !== "undefined" && currentLang === "ta") ? 3 : 2; } catch (e) { return 2; } }
  function stage() { var img = document.querySelector("#waitingState .waiting-mascot"); return img ? { img: img, host: img.parentNode } : null; }
  function show(i, first) {
    var s = stage(); if (!s) return;
    var step = STEPS[i % STEPS.length], bub = s.host.querySelector(".pm-bubble");
    if (!bub) { s.host.style.position = s.host.style.position || "relative"; bub = document.createElement("div"); bub.className = "pm-bubble"; bub.setAttribute("aria-live", "polite"); s.host.appendChild(bub); }
    function apply() {
      s.img.src = step[0]; s.img.classList.toggle("pm-sticker", !!step[1]);
      s.img.classList.remove("pm-out"); s.img.classList.remove("pm-in"); void s.img.offsetWidth; s.img.classList.add("pm-in");
      bub.textContent = step[lang()]; bub.classList.remove("pm-out");
    }
    if (first) { apply(); return; }
    s.img.classList.add("pm-out"); bub.classList.add("pm-out"); setTimeout(apply, 320);
  }
  function waitingVisible() {
    var scr = document.getElementById("screen2"), w = document.getElementById("waitingState");
    return !!(scr && w && !scr.classList.contains("hidden") && !w.classList.contains("hidden"));
  }
  function tick() { if (!waitingVisible()) { stop(); return; } idx++; show(idx, false); }
  function start() {
    if (started) return; started = true; idx = 0; show(0, true);
    var ms = Number(window.PM_MASCOT_MS) || 6500; timer = setInterval(tick, ms);
    STEPS.forEach(function (s) { var im = new Image(); im.src = s[0]; });
  }
  function stop() { started = false; if (timer) { clearInterval(timer); timer = null; } }
  function watch() {
    var scr = document.getElementById("screen2"), w = document.getElementById("waitingState");
    if (!scr || !w) return;
    var check = function () { if (waitingVisible()) start(); else stop(); };
    var mo = new MutationObserver(check);
    mo.observe(scr, { attributes: true, attributeFilter: ["class"] });
    mo.observe(w, { attributes: true, attributeFilter: ["class"] });
    check();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();

  /* ---- (3) New reply sound: bright 3-note "ding-ding-ding" + clear friendly voice. Only replaces how the alert SOUNDS. ---- */
  window.playPingMeSignatureChime = function () {
    try {
      var ctx = window.pingmeAudioContext || (typeof pingmeAudioContext !== "undefined" ? pingmeAudioContext : null);
      if (!ctx || ctx.state !== "running") return;
      var t0 = ctx.currentTime + 0.04;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.linearRampToValueAtTime(0.32, t0 + 0.02);
      master.gain.setValueAtTime(0.32, t0 + 0.55);
      master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);
      master.connect(ctx.destination);
      [[1046.5, 0.00], [1318.5, 0.16], [1568.0, 0.32], [2093.0, 0.50]].forEach(function (n) {
        [["sine", 1, 0.8], ["triangle", 2, 0.12]].forEach(function (o) {
          var osc = ctx.createOscillator(), g = ctx.createGain();
          osc.type = o[0]; osc.frequency.setValueAtTime(n[0] * o[1] / (o[1] === 2 ? 2 : 1) * (o[1] === 2 ? 2 : 1), t0 + n[1]);
          g.gain.setValueAtTime(0.0001, t0 + n[1]);
          g.gain.linearRampToValueAtTime(o[2], t0 + n[1] + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.55);
          osc.connect(g); g.connect(master);
          osc.start(t0 + n[1]); osc.stop(t0 + n[1] + 0.6);
        });
      });
    } catch (e) {}
  };
  var _origSpeak = window.speakPingMeText;
  window.speakPingMeText = function (text, onEnd) {
    var ta = (typeof currentLang !== "undefined" && currentLang === "ta");
    var line = /Awesome|reply/i.test(String(text)) && !ta ? "Ding ding! Your reply is here!" :
               (ta && /பதில்/.test(String(text)) ? "பதில் வந்தாச்சு! பாருங்க!" : text);
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return false;
    try {
      var u = new SpeechSynthesisUtterance(String(line || ""));
      u.lang = ta ? "ta-IN" : "en-IN"; u.rate = 0.95; u.pitch = 1.08; u.volume = 1;
      var v = speechSynthesis.getVoices();
      var pick = v.find(function (x) { return ta ? /^ta(-|$)/i.test(x.lang) : /^en-IN$/i.test(x.lang); }) ||
                 v.find(function (x) { return ta ? /^ta(-|$)/i.test(x.lang) : /^en(-|$)/i.test(x.lang); });
      if (pick) u.voice = pick;
      if (typeof onEnd === "function") u.onend = onEnd;
      speechSynthesis.cancel(); speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  };

  /* ---- (4) Cinematic welcome intro (theatre style) with "Welcome to PingMe" voice. Display only; tap anywhere to skip. ---- */
  (function () {
    try { if (window.__pmIntroDone) return; window.__pmIntroDone = true; } catch (e) {}
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
    var css2 = [
      "#pmIntro{position:fixed;inset:0;z-index:2147483000;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 38%,#2a2f9e 0%,#120d52 48%,#05041c 100%);perspective:900px;transition:opacity .6s ease,transform .6s ease}",
      "#pmIntro.pm-out{opacity:0;transform:scale(1.08);pointer-events:none}",
      "#pmIntro .pm-beam{position:absolute;left:50%;top:-20%;width:46vmax;height:150%;margin-left:-23vmax;transform-origin:50% 0;background:linear-gradient(180deg,rgba(120,200,255,.35),rgba(120,200,255,0) 70%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);animation:pmBeam 4.5s ease-in-out infinite alternate;mix-blend-mode:screen}",
      "#pmIntro .pm-beam.b2{animation-delay:-2s;background:linear-gradient(180deg,rgba(236,100,255,.3),rgba(236,100,255,0) 70%)}",
      "@keyframes pmBeam{from{transform:rotate(-28deg)}to{transform:rotate(28deg)}}",
      "#pmIntro .pm-stage{position:relative;display:flex;flex-direction:column;align-items:center;transform-style:preserve-3d}",
      "#pmIntro .pm-ring{position:absolute;left:50%;top:50%;width:230px;height:230px;margin:-115px 0 0 -115px;border-radius:50%;border:3px solid rgba(120,220,255,.7);opacity:0;animation:pmRing 2.4s ease-out infinite}",
      "#pmIntro .pm-ring.r2{animation-delay:.8s;border-color:rgba(240,120,255,.7)}",
      "#pmIntro .pm-ring.r3{animation-delay:1.6s}",
      "@keyframes pmRing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.6);opacity:0}}",
      "#pmIntro .pm-logo3d{position:relative;width:min(78vw,320px);padding:26px 22px;border-radius:30px;background:linear-gradient(145deg,#fff,#e4ecff);box-shadow:0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(90,160,255,.55),inset 0 3px 0 #fff,inset 0 -8px 16px rgba(80,100,200,.25);transform:rotateX(14deg) rotateY(-18deg) scale(.6);opacity:0;animation:pmLogoIn 1.2s cubic-bezier(.2,1.2,.3,1) .25s forwards,pmTilt 5s ease-in-out 1.5s infinite alternate;overflow:hidden}",
      "#pmIntro .pm-logo3d img{display:block;width:100%;height:auto;max-height:150px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,60,.3))}",
      "#pmIntro .pm-logo3d::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.9),transparent);transform:skewX(-20deg);animation:pmGlint 2.2s ease-in-out 1.1s infinite}",
      "@keyframes pmGlint{0%{left:-80%}60%,100%{left:140%}}",
      "@keyframes pmLogoIn{0%{opacity:0;transform:rotateX(60deg) rotateY(-40deg) scale(.4) translateZ(-300px)}100%{opacity:1;transform:rotateX(10deg) rotateY(-12deg) scale(1)}}",
      "@keyframes pmTilt{from{transform:rotateX(10deg) rotateY(-12deg) scale(1)}to{transform:rotateX(-6deg) rotateY(12deg) scale(1.03)}}",
      "#pmIntro .pm-welcome{margin-top:34px;font:900 clamp(22px,7vw,32px)/1.1 'Plus Jakarta Sans','Noto Sans Tamil',system-ui,sans-serif;letter-spacing:.02em;text-align:center;background:linear-gradient(90deg,#67e8f9,#fff,#f0abfc,#fde047);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;transform:translateY(16px);animation:pmUp .8s ease 1.1s forwards}",
      "#pmIntro .pm-tag{margin-top:14px;padding:8px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.1);color:#fff;font:800 12px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;opacity:0;transform:translateY(12px);animation:pmUp .8s ease 1.5s forwards;text-align:center}",
      "@keyframes pmUp{to{opacity:1;transform:none}}",
      "#pmIntro .pm-skip{position:absolute;bottom:22px;left:0;right:0;text-align:center;color:rgba(255,255,255,.55);font:700 12px system-ui,sans-serif;letter-spacing:.1em}",
      "#pmIntro .pm-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px rgba(150,210,255,.9);animation:pmFloat linear infinite;opacity:0}",
      "@keyframes pmFloat{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-110vh);opacity:0}}",
      "@media (prefers-reduced-motion:reduce){#pmIntro *{animation-duration:.01s!important;animation-delay:0s!important}}"
    ].join("");
    var st2 = document.createElement("style"); st2.textContent = css2; document.head.appendChild(st2);

    function lang() { return (typeof currentLang !== "undefined" && currentLang === "ta") ? "ta" : "en"; }
    var el = document.createElement("div"); el.id = "pmIntro"; el.setAttribute("role", "presentation");
    var sparks = ""; for (var i = 0; i < 22; i++) sparks += "<i class='pm-spark' style='left:" + Math.round(Math.random() * 100) + "%;bottom:-10px;animation-duration:" + (3 + Math.random() * 3).toFixed(1) + "s;animation-delay:" + (Math.random() * 2.5).toFixed(1) + "s'></i>";
    el.innerHTML = "<div class='pm-beam'></div><div class='pm-beam b2'></div>" + sparks +
      "<div class='pm-stage'><div class='pm-ring'></div><div class='pm-ring r2'></div><div class='pm-ring r3'></div>" +
      "<div class='pm-logo3d'><img src='/assets/pingme-logo.png' alt='PingMe'></div>" +
      "<div class='pm-welcome'>Welcome to PingMe</div><div class='pm-tag'>One Scan. Instant Connection.</div></div>" +
      "<div class='pm-skip'>TAP TO SKIP</div>";
    var spoken = false, gone = false;
    function speak() {
      if (spoken) return;
      try {
        if (typeof pingmeSoundEnabled !== "undefined" && !pingmeSoundEnabled) return;
        if (!("speechSynthesis" in window)) return;
        spoken = true;
        var ta = lang() === "ta";
        var u = new SpeechSynthesisUtterance(ta ? "பிங்மீக்கு வரவேற்கிறோம்" : "Welcome to PingMe");
        u.lang = ta ? "ta-IN" : "en-IN"; u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
        var v = speechSynthesis.getVoices();
        var pick = v.find(function (x) { return ta ? /^ta(-|$)/i.test(x.lang) : /^en-IN$/i.test(x.lang); }) || v.find(function (x) { return ta ? /^ta(-|$)/i.test(x.lang) : /^en(-|$)/i.test(x.lang); });
        if (pick) u.voice = pick;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) {}
    }
    function whoosh() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        var c = new AC(); if (c.state !== "running") { c.close(); return; }
        var t = c.currentTime + .02, g = c.createGain(); g.connect(c.destination);
        g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.18, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1);
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, k) { var o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, t + k * .09); o.connect(g); o.start(t + k * .09); o.stop(t + 1.1); });
        setTimeout(function () { try { c.close(); } catch (e) {} }, 1500);
      } catch (e) {}
    }
    function close() {
      if (gone) return; gone = true;
      el.classList.add("pm-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
    }
    function start() {
      if (!document.body) return;
      document.body.appendChild(el);
      speak(); whoosh();
      /* browsers often block voice until the first touch: if so, speak on the first tap/touch while the intro is visible */
      el.addEventListener("pointerdown", function () { speak(); close(); }, { once: true });
      setTimeout(close, reduce ? 600 : 3000);
    }
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  })();
})();
