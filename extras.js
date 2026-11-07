/* MediQueue extras — animated background, nav motion, language switcher,
   profile menu, "Are you human?" check, counters, back-to-top. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const T = (s) => (window.MQ_I18N ? window.MQ_I18N.t(s) : s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getUser = () => { try { return JSON.parse(localStorage.getItem("mediqueue_user")); } catch (e) { return null; } };

  /* ---------- animated background (floating crosses + bubbles) ---------- */
  function initBg() {
    if (reduce || $(".fx-bg")) return;
    const bg = document.createElement("div");
    bg.className = "fx-bg"; bg.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 16; i++) {
      const s = document.createElement("i");
      const size = 14 + Math.random() * 34;
      s.className = i % 3 === 0 ? "ring" : "plus";
      s.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${14 + Math.random() * 18}s;animation-delay:${-Math.random() * 20}s;--sway:${(Math.random() * 80 - 40).toFixed(0)}px`;
      bg.appendChild(s);
    }
    document.body.prepend(bg);
  }

  /* ---------- navigation motion ---------- */
  function initNav() {
    $$(".nav-links").forEach((ul) => {
      const pill = document.createElement("span");
      pill.className = "nav-pill"; pill.setAttribute("aria-hidden", "true");
      ul.prepend(pill);
      const links = $$("a", ul);
      const place = (a, instant) => {
        if (!a) { pill.style.opacity = 0; return; }
        const u = ul.getBoundingClientRect(), r = a.getBoundingClientRect();
        if (instant) pill.style.transition = "none";
        pill.style.width = r.width + "px";
        pill.style.transform = `translate(${r.left - u.left}px,-50%)`;
        pill.style.opacity = 1;
        if (instant) { void pill.offsetWidth; pill.style.transition = ""; }
      };
      const home = () => $("a[aria-current]", ul);
      links.forEach((a) => {
        a.addEventListener("mouseenter", () => place(a));
        a.addEventListener("focus", () => place(a));
      });
      ul.addEventListener("mouseleave", () => place(home()));
      ul.addEventListener("focusout", () => place(home()));
      addEventListener("resize", () => place(home(), true));
      /* settle on the current page after fonts/layout are ready */
      requestAnimationFrame(() => place(home(), true));
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(home(), true));
      /* press feedback: pill jumps to the clicked link before the page wipes away */
      links.forEach((a) => a.addEventListener("click", () => { place(a); ul.classList.add("is-pressed"); }));
    });

    /* ripple on every button / nav link press */
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".btn, .wz-btn, .nav-links a, .lang-btn, .profile-btn, .wz-slot");
      if (!el || reduce) return;
      const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6;
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.classList.add("has-ripple");
      el.appendChild(s);
      setTimeout(() => s.remove(), 650);
    });

    /* branded page-transition wipe */
    const wipe = $(".wipe");
    if (wipe && !$(".wipe-mark", wipe)) {
      wipe.innerHTML = '<div class="wipe-center"><span class="wipe-mark"><i></i><i></i></span><span class="wipe-text" data-no-i18n>MediQueue</span><span class="wipe-line"></span></div>';
    }
  }

  /* ---------- language switcher + profile menu ---------- */
  function buildTools() {
    const inner = $(".nav-inner") || $(".lp-nav");
    if (!inner || $(".nav-tools")) return;
    const tools = document.createElement("div");
    tools.className = "nav-tools" + (inner.classList.contains("lp-nav") ? " on-dark" : "");
    const I = window.MQ_I18N;

    /* language */
    if (I) {
      const cur = I.LANGS.find((l) => l.code === I.lang) || I.LANGS[0];
      const wrap = document.createElement("div");
      wrap.className = "lang";
      wrap.innerHTML = `<button type="button" class="lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language" title="Language">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.7 4 5.7 4 9s-1.200 6.300-4 9c-2.800-2.700-4-5.700-4-9s1.200-6.300 4-9z"/></svg>
          <span class="lang-code" data-no-i18n>${esc(cur.short)}</span></button>
        <ul class="menu lang-menu" role="listbox" hidden>${I.LANGS.map((l) => `<li role="option" aria-selected="${l.code === I.lang}"><button type="button" data-lang="${l.code}" data-no-i18n><span>${esc(l.name)}</span><i class="tick">✓</i></button></li>`).join("")}</ul>`;
      tools.appendChild(wrap);
      const btn = $(".lang-btn", wrap), menu = $(".lang-menu", wrap);
      btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(menu, btn); });
      menu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-lang]"); if (!b) return;
        I.setLang(b.dataset.lang);
        const l = I.LANGS.find((x) => x.code === b.dataset.lang);
        $(".lang-code", wrap).textContent = l.short;
        $$("li", menu).forEach((li) => li.setAttribute("aria-selected", String(li.firstElementChild.dataset.lang === b.dataset.lang)));
        closeMenus();
      });
    }

    /* profile (only when signed in) */
    const u = getUser();
    if (u && !inner.classList.contains("lp-nav")) {
      const name = String(u.label || u.id || "Patient").trim();
      const shown = name.includes("@") ? name.split("@")[0] : name;
      const initial = (shown[0] || "P").toUpperCase();
      const wrap = document.createElement("div");
      wrap.className = "profile";
      wrap.innerHTML = `<button type="button" class="profile-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Your profile" title="${esc(shown)}"><span class="avatar" data-no-i18n>${esc(initial)}</span><span class="online" aria-hidden="true"></span></button>
        <div class="menu profile-menu" role="menu" hidden>
          <div class="pm-head"><span class="avatar lg" data-no-i18n>${esc(initial)}</span><div><small>Signed in as</small><strong data-no-i18n>${esc(shown)}</strong>${u.mrn ? `<em data-no-i18n><span>Patient ID</span> · ${esc(u.mrn)}</em>` : ""}</div></div>
          <a role="menuitem" href="appointment.html">Book Appointment</a>
          <a role="menuitem" href="appointment-list.html">My appointments</a>
          <a role="menuitem" href="appointment-history.html">Appointment history</a>
          <button type="button" role="menuitem" class="pm-out">Log out</button>
        </div>`;
      tools.appendChild(wrap);
      const btn = $(".profile-btn", wrap), menu = $(".profile-menu", wrap);
      btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(menu, btn); });
      $(".pm-out", wrap).addEventListener("click", () => {
        try { localStorage.removeItem("mediqueue_user"); } catch (e) {}
        document.body.classList.add("leaving");
        setTimeout(() => (location.href = "landing.html"), reduce ? 0 : 480);
      });
      /* the plain "Log out" button in the bar is redundant now */
      $$(".nav-cta .js-auth-link").forEach((a) => { a.style.display = "none"; a.dataset.hidden = "1"; });
    }

    const toggleBtn = $(".nav-toggle", inner);
    const cta = $(".nav-cta", inner);
    if (inner.classList.contains("lp-nav")) {
      /* landing: language sits right beside Log in, Log in stays at the far right */
      const right = inner.lastElementChild;
      right.insertBefore(tools, right.firstChild);
    } else if (cta && !u) {
      /* signed out: language first, then Log in / Register at the far right */
      inner.insertBefore(tools, cta);
      cta.style.marginLeft = "0";
    } else if (toggleBtn) inner.insertBefore(tools, toggleBtn); else inner.appendChild(tools);
  }

  function toggle(menu, btn) {
    const open = menu.hidden;
    closeMenus();
    if (open) { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); requestAnimationFrame(() => menu.classList.add("open")); }
  }
  function closeMenus() {
    $$(".menu").forEach((m) => { m.classList.remove("open"); m.hidden = true; });
    $$("[aria-expanded=true]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".lang, .profile")) closeMenus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

  /* ---------- count-up numbers ---------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const run = (el) => {
      const to = Number(el.dataset.count), t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e);
        if (p < 1) requestAnimationFrame(step);
      };
      reduce ? (el.textContent = to) : requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- back to top ---------- */
  function initTop() {
    $$("[data-top]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }));
  }

  /* =====================================================================
     "Are you human?" — shown after pressing Confirm Appointment, before
     the booking is saved.
     NOTE: this runs in the browser only, so it stops casual bots and
     accidental double-submits, not a determined attacker. A real site
     needs a server-checked service (reCAPTCHA / Cloudflare Turnstile).
     ===================================================================== */
  const ICONS = {
    heart: '<path d="M12 21s-7.500-4.600-9.700-9.400C.9 8.500 2.800 5 6.200 5c2.100 0 3.700 1.200 5.800 3.400C14.100 6.200 15.700 5 17.800 5c3.400 0 5.300 3.500 3.900 6.600C19.500 16.400 12 21 12 21z"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    drop: '<path d="M12 2.500s6.500 6.800 6.500 11.700a6.500 6.500 0 0 1-13 0C5.500 9.300 12 2.500 12 2.500z"/>',
    tooth: '<path d="M7.500 3C4.800 3 3 5.100 3 7.700c0 2 .9 3.500 1.500 5.300.7 2.100.6 8 2.600 8 1.400 0 1.200-4.300 2-5.700.3-.5.600-.8.900-.8s.6.300.9.800c.8 1.400.6 5.700 2 5.700 2 0 1.900-5.900 2.600-8 .6-1.800 1.500-3.300 1.500-5.300C21 5.100 19.200 3 16.500 3c-1.700 0-2.600.8-4.500.8S9.200 3 7.500 3z"/>',
    pill: '<g transform="rotate(-40 12 12)"><rect x="2" y="7.500" width="20" height="9" rx="4.500"/><path d="M12 7.500v9" stroke="#fff" stroke-width="1.600"/></g>',
  };
  const icon = (k, cls = "") => `<svg class="hc-ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[k]}</svg>`;

  let humanOpen = false, lockUntil = 0, fails = 0;

  function openHuman(onPass) {
    if (humanOpen) return;
    humanOpen = true;
    const prev = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "hc-overlay";
    ov.innerHTML = `
      <div class="hc-card" role="dialog" aria-modal="true" aria-labelledby="hcTitle">
        <div class="hc-head">
          <span class="hc-shield" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.500-3 8.300-7 10-4-1.700-7-5.500-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></span>
          <div><h2 id="hcTitle">Are you human?</h2><p>A quick check before we book your appointment.</p></div>
        </div>
        <div class="hc-stage" id="hcStage"></div>
        <input class="hc-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="hc-foot"><span class="hc-brand"><i></i><span>Protected by MediQueue Verify</span></span><button type="button" class="hc-cancel" id="hcCancel">Cancel</button></div>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("in"));
    const stage = $("#hcStage", ov), hp = $(".hc-hp", ov);

    const close = () => {
      humanOpen = false; document.removeEventListener("keydown", onKey);
      ov.classList.remove("in"); setTimeout(() => ov.remove(), 260);
      if (prev && prev.focus) prev.focus();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    $("#hcCancel", ov).addEventListener("click", close);
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });

    /* stage 1: checkbox */
    function stageCheck() {
      stage.innerHTML = `<button type="button" class="hc-box" id="hcBox" aria-pressed="false"><span class="hc-tick"><i></i></span><span class="hc-label">I'm not a robot</span><span class="hc-logo" aria-hidden="true">${icon("cross")}</span></button>`;
      const box = $("#hcBox", stage);
      box.focus();
      box.addEventListener("click", (e) => {
        if (!e.isTrusted) return;                      // scripted clicks don't count
        if (Date.now() < lockUntil) return stageLocked();
        box.classList.add("busy"); box.setAttribute("aria-pressed", "true");
        $(".hc-label", box).textContent = T("Verifying…");
        setTimeout(stageChallenge, reduce ? 0 : 900);
      }, { once: true });
    }

    /* stage 2: pick the matching icons */
    function stageChallenge() {
      const kinds = Object.keys(ICONS);
      const target = kinds[Math.floor(Math.random() * kinds.length)];
      const others = kinds.filter((k) => k !== target);
      const cells = Array.from({ length: 9 }, () => others[Math.floor(Math.random() * others.length)]);
      const n = 2 + Math.floor(Math.random() * 3);              // 2–4 correct tiles
      const pos = [...Array(9).keys()].sort(() => Math.random() - 0.5).slice(0, n);
      pos.forEach((p) => (cells[p] = target));
      const shownAt = Date.now();
      stage.innerHTML = `
        <div class="hc-ask"><span class="hc-target">${icon(target)}</span><p>Select all squares that match this icon</p></div>
        <div class="hc-grid" role="group">${cells.map((k, i) => `<button type="button" class="hc-cell" data-i="${i}" aria-pressed="false" style="--r:${(Math.random() * 16 - 8).toFixed(0)}deg">${icon(k)}</button>`).join("")}</div>
        <p class="hc-msg" id="hcMsg" aria-live="polite"></p>
        <button type="button" class="hc-verify" id="hcVerify" disabled>Verify</button>`;
      const picked = new Set(), btn = $("#hcVerify", stage), msg = $("#hcMsg", stage);
      stage.addEventListener("click", function h(e) {
        const c = e.target.closest(".hc-cell");
        if (!c || !e.isTrusted) return;
        const i = Number(c.dataset.i);
        picked.has(i) ? picked.delete(i) : picked.add(i);
        c.setAttribute("aria-pressed", String(picked.has(i)));
        btn.disabled = picked.size === 0;
        msg.textContent = "";
        if (!stage.contains(c)) stage.removeEventListener("click", h);
      });
      btn.addEventListener("click", (e) => {
        if (!e.isTrusted) return;
        const ok = picked.size === pos.length && pos.every((p) => picked.has(p));
        const tooFast = Date.now() - shownAt < 700;     // a human needs a moment to look
        if (hp.value || tooFast) { return fail(true); }
        ok ? pass() : fail(false);
      });
      function fail(silent) {
        fails++;
        $$(".hc-cell", stage).forEach((c) => c.classList.add("wrong"));
        if (fails >= 3) { fails = 0; lockUntil = Date.now() + 30000; return setTimeout(stageLocked, 450); }
        msg.textContent = T("Not quite. Try again."); msg.className = "hc-msg bad";
        setTimeout(stageChallenge, 650);
      }
    }

    function stageLocked() {
      const tick = () => {
        const s = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
        stage.innerHTML = `<div class="hc-locked"><p><span>Too many attempts. Try again in</span> <b>${s}</b> <span>seconds</span></p></div>`;
        if (s > 0 && humanOpen) setTimeout(tick, 1000); else if (humanOpen) stageCheck();
      };
      tick();
    }

    function pass() {
      fails = 0;
      stage.innerHTML = `<div class="hc-ok"><span class="hc-okmark"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg></span><p>Verified! Booking your appointment…</p></div>`;
      setTimeout(() => { close(); onPass(); }, reduce ? 0 : 1000);
    }

    Date.now() < lockUntil ? stageLocked() : stageCheck();
  }

  /* intercept the booking submit (document capture beats script.js's handler) */
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form || form.id !== "bookingForm") return;
    if (form.dataset.humanOk === "1") { delete form.dataset.humanOk; return; }   // verified → let it through once
    if (window.wizardCanSubmit && !window.wizardCanSubmit()) return;               // not ready: script.js ignores it anyway
    e.preventDefault(); e.stopImmediatePropagation();
    openHuman(() => { form.dataset.humanOk = "1"; form.requestSubmit(); });
  }, true);

  /* ---------- go ---------- */
  function init() {
    initBg(); initNav(); buildTools(); initCounters(); initTop();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
