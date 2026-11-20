/* PingMe – colourful chat-bubble style for the owner's reply (add-on, display only).
   It only changes how the reply LOOKS. It never touches alert sending, sessions or credits.
   To remove it: delete the <script src="/scan/reply-bubble.js"> line from scan/index.html. */
(function () {
  "use strict";
  var css = [
    "#replyState .owner-reply-card{position:relative!important;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 55%,#db2777 100%)!important;border:0!important;",
    "border-radius:26px 26px 26px 8px!important;color:#fff!important;padding:18px 18px 14px!important;margin-bottom:18px!important;",
    "box-shadow:0 14px 34px rgba(124,58,237,.45),0 0 0 4px rgba(255,255,255,.2)!important;overflow:visible!important}",
    "#replyState .owner-reply-card::after{content:'';position:absolute;left:18px;bottom:-13px;width:0;height:0;border-right:16px solid transparent;border-top:15px solid #db2777}",
    "#replyState .owner-reply-card::before{content:'✨';position:absolute;right:12px;top:-14px;font-size:24px;animation:pmSpark 2.4s ease-in-out infinite}",
    "#replyState .owner-reply-card .reply-card-title,#replyState .owner-reply-card .reply-card-label{color:#fff!important;font-weight:800!important;letter-spacing:.02em}",
    "#replyState .owner-reply-card .whatsapp-dot{background:#25d366!important;color:#fff!important;border-radius:50%!important;box-shadow:0 0 0 3px rgba(255,255,255,.35)}",
    "#replyState .owner-reply-card .reply-message{color:#fff!important;font-size:clamp(21px,6vw,28px)!important;font-weight:800!important;line-height:1.3!important;",
    "text-align:left!important;text-shadow:0 2px 8px rgba(0,0,0,.28);word-break:break-word;margin:6px 0 4px!important;font-family:'Noto Sans Tamil','Plus Jakarta Sans',system-ui,sans-serif}",
    "#replyState .owner-reply-card .reply-time{color:rgba(255,255,255,.85)!important;font-weight:700!important;text-align:right!important;display:block}",
    "#replyState .owner-reply-card .reply-sound-toggle{background:rgba(255,255,255,.22)!important;border:1px solid rgba(255,255,255,.55)!important;color:#fff!important}",
    "#replyState .owner-reply-card.pm-pop{animation:pmPop .6s cubic-bezier(.2,1.5,.4,1) both}",
    "#replyState .owner-reply-card.pm-typing .reply-message,#replyState .owner-reply-card.pm-typing .reply-time{display:none!important}",
    ".pm-dots{display:none;gap:7px;padding:10px 4px 6px}",
    "#replyState .owner-reply-card.pm-typing .pm-dots{display:flex}",
    ".pm-dots i{width:11px;height:11px;border-radius:50%;background:#fff;opacity:.35;animation:pmDot 1s infinite ease-in-out}",
    ".pm-dots i:nth-child(2){animation-delay:.18s}.pm-dots i:nth-child(3){animation-delay:.36s}",
    "@keyframes pmPop{0%{transform:scale(.6) translateY(24px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}",
    "@keyframes pmDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-8px);opacity:1}}",
    "@keyframes pmSpark{0%,100%{transform:rotate(-10deg) scale(1)}50%{transform:rotate(12deg) scale(1.25)}}",
    "@media (prefers-reduced-motion:reduce){#replyState .owner-reply-card,#replyState .owner-reply-card::before,.pm-dots i{animation:none!important}}"
  ].join("");
  var st = document.createElement("style"); st.id = "pmReplyBubbleCss"; st.textContent = css; document.head.appendChild(st);

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
        setTimeout(function () { card.classList.remove("pm-typing"); void card.offsetWidth; card.classList.add("pm-pop"); }, 700);
      }
      wasHidden = hidden;
    }).observe(rs, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
})();
