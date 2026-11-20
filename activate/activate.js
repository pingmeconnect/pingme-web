(function () {
  "use strict";
  // Public address of the PingMe Worker (no trailing slash).
  var API_BASE = "https://pingme-api.pingmeconnect.workers.dev";

  var form = document.getElementById("form");
  var msg = document.getElementById("msg");
  var submit = document.getElementById("submit");
  var cid = document.getElementById("cid"), otp = document.getElementById("otp");
  var pw = document.getElementById("pw"), pw2 = document.getElementById("pw2");

  var agree = document.getElementById("agree"), agreeVersion = "";
  function syncBtn() { submit.disabled = !agree.checked || !agreeVersion; }
  agree.addEventListener("change", syncBtn);
  submit.disabled = true;
  fetch(API_BASE + "/api/agreement").then(function (r) { return r.json(); }).then(function (d) {
    agreeVersion = d.version; var ol = document.getElementById("agreeText"); ol.textContent = "";
    d.items.forEach(function (s) { var li = document.createElement("li"); li.textContent = s; ol.appendChild(li); });
    document.getElementById("agreeTa").textContent = d.ta_summary || ""; syncBtn();
  }).catch(function () { document.getElementById("agreeText").innerHTML = "<li>Could not load. Please open the Genuine Use Declaration link above.</li>"; });

  function showError(text) { msg.textContent = text; msg.className = "msg err"; msg.hidden = false; }
  function clearMsg() { msg.hidden = true; msg.textContent = ""; }

  cid.addEventListener("input", function () { cid.value = cid.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); });
  otp.addEventListener("input", function () { otp.value = otp.value.replace(/\D/g, "").slice(0, 6); });

  document.getElementById("toggle").addEventListener("click", function (e) {
    var show = pw.type === "password";
    pw.type = pw2.type = show ? "text" : "password";
    e.target.textContent = show ? "Hide" : "Show";
    e.target.setAttribute("aria-pressed", String(show));
  });

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault(); clearMsg();
    var id = cid.value.trim(), code = otp.value.trim(), p1 = pw.value, p2 = pw2.value;
    if (!/^[A-Z0-9-]{3,40}$/.test(id)) return showError("Please enter your Customer ID, for example PM-A15E3C15.");
    if (!/^\d{6}$/.test(code)) return showError("Please enter the six-digit code sent to your WhatsApp.");
    if (p1.length < 8 || p1.length > 72 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return showError("Password must be at least 8 characters and include a letter and a number.");
    if (p1 !== p2) return showError("The two passwords do not match.");
    if (!agree.checked || !agreeVersion) return showError("Please tick the box to accept the Genuine Use Declaration and Terms.");
    if (/REPLACE-WITH/.test(API_BASE)) return showError("This page is not configured yet (API address missing).");

    submit.disabled = true; submit.textContent = "Activating…";
    try {
      var res = await fetch(API_BASE + "/api/activation/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, otp: code, password: p1, confirm_password: p2, agree: true, agreement_version: agreeVersion })
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.success) {
        form.hidden = true; document.querySelector(".steps").hidden = true;
        document.querySelector("h1").hidden = true; document.getElementById("done").hidden = false;
        pw.value = pw2.value = otp.value = "";
        return;
      }
      showError(data.error || "Activation failed. Please try again.");
    } catch (e) {
      showError("Could not reach PingMe. Check your internet connection and try again.");
    } finally {
      submit.textContent = "Activate Account"; syncBtn();
    }
  });
})();
