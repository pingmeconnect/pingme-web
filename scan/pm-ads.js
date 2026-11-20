/* PingMe scan page: ads on the second screen + editable kit price.
   Ads are managed in Admin > Scan-page ads. If no ad is live, the Starter Kit picture is shown. */
(function () {
  var API = (window.CONFIG && CONFIG.BACKEND_URL) || "https://pingme-api.pingmeconnect.workers.dev";
  var slot, ads = [], idx = 0, timer = null, prices = {}, started = false;

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ev(id, type) { try { fetch(API + "/api/ad-event", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ id: id, type: type }), keepalive: true }); } catch (e) {} }
  function ta() { return window.currentLang === "ta"; }

  function kitCard() {
    var price = prices.kit ? "₹" + esc(prices.kit) : "";
    slot.innerHTML =
      '<div style="background:linear-gradient(135deg,#eaf1ff,#fff 55%,#f6e9ff);border:1px solid #c9d6ee;border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:12px;cursor:pointer" id="pmKitAd">' +
      '<img src="/assets/pingme-starter-kit.png" alt="PingMe Smart Connect Kit" style="height:64px;width:auto;object-fit:contain">' +
      '<div style="flex:1;text-align:left"><div style="font-weight:900;color:#0b1f44;font-size:14px">' + (ta() ? "உங்களுக்கான PingMe கிட் வாங்குங்கள்" : "Get your own PingMe kit") + '</div>' +
      '<div style="font-size:12px;color:#475569">' + (ta() ? "ஒரு QR. உடனடி இணைப்பு." : "One QR. Instant connection.") + (price ? " · <b>" + price + "</b>" : "") + '</div></div>' +
      '<span style="background:#1764df;color:#fff;border-radius:999px;padding:7px 12px;font-weight:800;font-size:12px">' + (ta() ? "மேலும்" : "KNOW MORE") + '</span></div>';
    var c = document.getElementById("pmKitAd");
    if (c) c.onclick = function () { if (typeof openBuyModal === "function") openBuyModal(); };
  }

  function adCard(a) {
    var inner = a.image
      ? '<img src="' + esc(a.image) + '" alt="" style="width:100%;max-height:150px;object-fit:cover;border-radius:12px;display:block">' +
        (a.title || a.body ? '<div style="padding:8px 4px 2px;text-align:left"><div style="font-weight:900;color:#0b1f44;font-size:14px">' + esc(a.title) + '</div>' + (a.body ? '<div style="font-size:12px;color:#475569">' + esc(a.body) + '</div>' : "") + '</div>' : "")
      : '<div style="background:linear-gradient(135deg,#0b1f44,#1764df);color:#fff;border-radius:12px;padding:16px 14px;text-align:center"><div style="font-weight:900;font-size:18px;line-height:1.25">' + esc(a.title) + '</div>' + (a.body ? '<div style="margin-top:6px;font-size:13px;opacity:.92">' + esc(a.body) + '</div>' : "") + '</div>';
    slot.innerHTML = '<div id="pmAdBox" style="background:#fff;border:1px solid #c9d6ee;border-radius:16px;padding:8px;position:relative;' + (a.link ? "cursor:pointer" : "") + '">' +
      '<span style="position:absolute;top:12px;right:14px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;font-size:9px;font-weight:800;padding:1px 6px;letter-spacing:.5px">' + (ta() ? "விளம்பரம்" : "AD") + '</span>' + inner + '</div>';
    var box = document.getElementById("pmAdBox");
    if (box && a.link) box.onclick = function () { ev(a.id, "click"); window.open(a.link, "_blank", "noopener"); };
    ev(a.id, "view");
  }

  function visible() { var s = document.getElementById("screen2"); return s && !s.classList.contains("hidden"); }

  function tick() {
    clearTimeout(timer);
    if (!slot || !visible()) { started = false; return; }
    if (!ads.length) { kitCard(); return; }
    var a = ads[idx % ads.length]; idx++;
    adCard(a);
    if (ads.length > 1) timer = setTimeout(tick, Math.max(2, a.seconds || 6) * 1000);
  }

  function start() { if (started) return; started = true; idx = 0; tick(); }

  function applyPrice() {
    var p = document.getElementById("buyPrice"), n = document.getElementById("buyPriceNote");
    window.PM_KIT_PRICE = prices.kit || "";
    if (p) { if (prices.kit) { p.textContent = "₹" + prices.kit; p.style.display = ""; if (n) n.style.display = ""; } else { p.textContent = ""; p.style.display = "none"; if (n) n.style.display = "none"; } }
  }

  function init() {
    slot = document.getElementById("pmAdSlot");
    Promise.all([
      fetch(API + "/api/prices").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch(API + "/api/ads").then(function (r) { return r.json(); }).catch(function () { return []; })
    ]).then(function (r) {
      prices = r[0] || {}; ads = Array.isArray(r[1]) ? r[1] : []; applyPrice();
      var s2 = document.getElementById("screen2");
      if (s2) new MutationObserver(function () { if (visible()) start(); else { started = false; clearTimeout(timer); } }).observe(s2, { attributes: true, attributeFilter: ["class"] });
      if (visible()) start();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
