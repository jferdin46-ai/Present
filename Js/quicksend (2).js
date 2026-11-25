/*
 * QuickSend (owner only) - finale scene helper.
 *
 * Shows ONLY when the page is opened with ?owner=1 (e.g. .../Present/?owner=1).
 * Without it nothing is added to the page, so K'Vitha never sees this panel.
 *
 * What it does:  recipient number -> fixed Rp100.000 -> confirm -> open the Gojek app
 *                -> you mark COMPLETED / CANCELLED / PENDING.
 * What it never does: send money, ask for a PIN/OTP, call any GoPay API, or claim a
 *                transfer succeeded. The payment is always done by you inside the Gojek app.
 *
 * The amount is fixed here. To change it, edit AMOUNT below and nothing else.
 */
(function () {
  "use strict";

  var AMOUNT = 100000; // IDR - fixed, never asked from the user

  function formatRupiah(n) {
    return "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Accepts 08xxxxxxxxxx, 628xxxxxxxxxx, +628xxxxxxxxxx (spaces / dashes allowed).
  // Returns { ok, number (08 form), error }.
  function validate(raw) {
    var s = String(raw == null ? "" : raw).replace(/[\s\-().]/g, "");
    if (!s) return { ok: false, error: "Enter the recipient's GoPay number." };
    if (!/^\+?\d+$/.test(s)) return { ok: false, error: "Use digits only (08... or 628...)." };
    s = s.replace(/^\+/, "");
    if (s.indexOf("62") === 0) s = "0" + s.slice(2);
    if (!/^08\d{8,11}$/.test(s)) {
      return { ok: false, error: "Not a valid Indonesian mobile number. Example: 081234567890." };
    }
    return { ok: true, number: s };
  }

  window.QuickSend = { AMOUNT: AMOUNT, formatRupiah: formatRupiah, validate: validate };

  // ---- Owner gate -------------------------------------------------------
  var isOwner = false;
  try { isOwner = new URLSearchParams(window.location.search).get("owner") === "1"; } catch (e) {}
  if (!isOwner) return;

  var GOJEK_PACKAGE = "com.gojek.app";
  var PLAY_URL = "https://play.google.com/store/apps/details?id=" + GOJEK_PACKAGE;
  var STATUS_KEY = "quicksend:lastStatus";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function injectStyles() {
    var css = [
      ".qs-panel{margin:28px auto 0;max-width:360px;padding:16px;border:1px solid var(--line,rgba(236,239,247,.22));border-radius:12px;text-align:left;font-size:15px;color:var(--fg,#ecefF7);background:rgba(7,11,22,.6)}",
      ".qs-title{margin:0 0 4px;font-weight:600;font-size:14px}",
      ".qs-note{margin:0 0 12px;font-size:13px;opacity:.75;line-height:1.4}",
      ".qs-input{box-sizing:border-box;width:100%;min-height:46px;padding:10px 12px;font-size:16px;border-radius:8px;border:1px solid var(--line,#888);background:transparent;color:inherit}",
      ".qs-error{margin:8px 0 0;font-size:13px;color:#ff9b8a}",
      ".qs-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}",
      ".qs-btn{flex:1 1 auto;min-height:46px;padding:10px 14px;font-size:14px;font-weight:600;border-radius:8px;border:1px solid var(--line,#888);background:transparent;color:inherit;cursor:pointer}",
      ".qs-btn.qs-primary{background:var(--btn-bg,#ff8a3d);color:var(--btn-fg,#140a03);border-color:transparent}",
      ".qs-sum{margin:0 0 4px;font-size:16px;line-height:1.5}",
      ".qs-sum strong{font-weight:700}",
      ".qs-result{margin:12px 0 0;font-size:14px;line-height:1.45}"
    ].join("");
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }

  function init() {
    var host = document.querySelector("#scene-finale .finale-copy");
    if (!host) return;
    injectStyles();

    var panel = el("section", "qs-panel");
    panel.setAttribute("aria-label", "QuickSend, owner only");
    var recipient = "";

    function clear() { while (panel.firstChild) panel.removeChild(panel.firstChild); }

    function header(note) {
      panel.appendChild(el("p", "qs-title", "QuickSend (owner only)"));
      panel.appendChild(el("p", "qs-note", note));
    }

    function stepInput(errorMsg, prefill) {
      clear();
      header("Prepare a GoPay transfer. Amount is fixed at " + formatRupiah(AMOUNT) + ".");
      var input = el("input", "qs-input");
      input.type = "tel";
      input.inputMode = "tel";
      input.autocomplete = "off";
      input.placeholder = "GoPay number, e.g. 081234567890";
      input.setAttribute("aria-label", "Recipient GoPay phone number");
      input.value = prefill || "";
      panel.appendChild(input);
      var err = el("p", "qs-error", errorMsg || "");
      err.setAttribute("role", "alert");
      if (!errorMsg) err.hidden = true;
      panel.appendChild(err);
      var row = el("div", "qs-row");
      var next = el("button", "qs-btn qs-primary", "Review transfer");
      next.type = "button";
      next.addEventListener("click", function () {
        var v = validate(input.value);
        if (!v.ok) { stepInput(v.error, input.value); return; }
        recipient = v.number;
        stepConfirm();
      });
      row.appendChild(next);
      panel.appendChild(row);
    }

    function stepConfirm() {
      clear();
      header("Check the details, then continue.");
      var s1 = el("p", "qs-sum");
      s1.appendChild(document.createTextNode("To: "));
      s1.appendChild(el("strong", null, recipient));
      var s2 = el("p", "qs-sum");
      s2.appendChild(document.createTextNode("Amount: "));
      s2.appendChild(el("strong", null, formatRupiah(AMOUNT)));
      panel.appendChild(s1);
      panel.appendChild(s2);
      panel.appendChild(el("p", "qs-note", "Continue copies the number. Then you open the Gojek app, enter the recipient, check their name and the amount, and authorize inside GoPay yourself."));
      var row = el("div", "qs-row");
      var cancel = el("button", "qs-btn", "CANCEL");
      cancel.type = "button";
      cancel.addEventListener("click", function () { recipient = ""; stepInput(); });
      var go = el("button", "qs-btn qs-primary", "CONTINUE");
      go.type = "button";
      go.addEventListener("click", stepOpenApp);
      row.appendChild(cancel);
      row.appendChild(go);
      panel.appendChild(row);
    }

    function stepOpenApp() {
      clear();
      header("Open Gojek yourself");
      var isAndroid = /Android/i.test(navigator.userAgent || "");
      var msg = el("p", "qs-result");
      var copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(recipient).then(function () {
            msg.textContent = "Number " + recipient + " copied. Paste it in GoPay > Pay/Transfer. Check the registered name and " + formatRupiah(AMOUNT) + " before you authorize.";
          }, function () {});
          copied = true;
        }
      } catch (e) {}
      msg.textContent = "Open the Gojek app yourself and go to Pay / Transfer. Recipient: " + recipient + ", amount: " + formatRupiah(AMOUNT) + ". Check the registered name before you authorize.";
      panel.appendChild(msg);
      if (copied) panel.appendChild(el("p", "qs-note", "The number was copied to your clipboard if the browser allowed it."));

      stepStatusButtons();

      // Launching the Gojek app from a web page is not reliable on every phone/browser
      // (it tested as opening the Play Store on an OPPO), so this page does not try.
      // Closest safe alternative: the number is copied and the user opens the app manually.
    }

    function stepStatusButtons() {
      var q = el("p", "qs-title", "After you return from GoPay, mark the result:");
      q.style.marginTop = "14px";
      panel.appendChild(q);
      var row = el("div", "qs-row");
      ["COMPLETED", "CANCELLED", "PENDING"].forEach(function (label) {
        var b = el("button", "qs-btn", label);
        b.type = "button";
        b.addEventListener("click", function () { stepDone(label); });
        row.appendChild(b);
      });
      panel.appendChild(row);
    }

    function stepDone(status) {
      try {
        localStorage.setItem(STATUS_KEY, JSON.stringify({ status: status, at: new Date().toISOString() }));
      } catch (e) {}
      clear();
      header("Marked " + status + " by you.");
      var text = status === "COMPLETED"
        ? "This is your own note. This page cannot verify the payment, so check the receipt in GoPay."
        : status === "PENDING"
          ? "Nothing is confirmed yet. Check GoPay history before you try again."
          : "Nothing was sent from here.";
      panel.appendChild(el("p", "qs-result", text));
      var row = el("div", "qs-row");
      var again = el("button", "qs-btn", "New transfer");
      again.type = "button";
      again.addEventListener("click", function () { recipient = ""; stepInput(); });
      row.appendChild(again);
      panel.appendChild(row);
    }

    stepInput();
    host.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
