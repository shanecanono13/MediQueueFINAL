/* MediQueue — booking wizard controller.
   Splits the existing booking form (same field ids, same validation helpers
   and submit handler in script.js) into steps. */
(function () {
  const form = document.getElementById("bookingForm");
  if (!form || !form.hasAttribute("data-wizard")) return;

  const TOTAL = 5;
  let cur = 1;

  /* estimated time with the doctor (shown to the patient), min–max in minutes */
  const EST_MIN = 15, EST_MAX = 30;
  const EST_TEXT = EST_MIN + "–" + EST_MAX;

  const $ = (id) => document.getElementById(id);
  const deptInput = $("b-department"), serviceInput = $("b-service");
  const specSel = $("w-spec"), docSel = $("w-doc"), avatar = $("w-avatar");
  const servicesBox = $("wzServices");
  const back = $("wzBack"), next = $("wzNext"), confirmBtn = $("wzConfirm"), footer = $("wzFooter");
  const agree = $("wzAgree");
  const stepEls = [...document.querySelectorAll("#wzSteps li")];
  const panels = [...document.querySelectorAll(".wz-panel")];
  const STEP_NAMES = ["Doctor & Consultation", "Date & Time", "Personal Information", "Pre-Appointment Terms", "Confirmation"];

  const docName = (key) => key.split(" — ")[1] || "";
  const docImg = (key) => {
    const last = docName(key).replace(/^Dr\.\s*/i, "").split(" ")[0].toLowerCase();
    return "assets/img/doc-" + last + ".svg";
  };

  /* ---------- step 1: specialization / doctor / consultation ---------- */
  function buildSpecs() {
    specSel.innerHTML = '<option value="">Select a specialization</option>' +
      Object.entries(DEPARTMENTS).map(([key, c]) => `<option value="${key}">${c.short}</option>`).join("");
  }

  function renderDoctor(key) {
    const wrap = docSel.parentElement;
    if (!key) {
      docSel.innerHTML = "<option>Select a specialization first</option>";
      docSel.disabled = true;
      avatar.hidden = true; wrap.classList.remove("with-img");
      return;
    }
    docSel.innerHTML = `<option value="${key}">${docName(key)}</option>`;
    docSel.disabled = false;
    avatar.src = docImg(key); avatar.hidden = false; wrap.classList.add("with-img");
  }

  function renderServices(key) {
    serviceInput.value = "";
    if (!key) { servicesBox.innerHTML = '<p class="wz-empty">Choose a specialization to see the available consultations.</p>'; return; }
    servicesBox.innerHTML = DEPARTMENTS[key].offers.map((o, i) =>
      `<label class="wz-opt" style="--i:${i}"><input type="radio" name="wz-service" value="${o}"><span class="wz-radio"></span>` +
      `<span class="wz-opt-body"><span class="wz-opt-name">${o}</span>` +
      `<span class="wz-est"><i class="wz-clock" aria-hidden="true"></i><span>Estimated time:</span> <strong>${EST_TEXT}</strong> <span>minutes</span></span></span></label>`
    ).join("");
  }

  function setDept(key, silent) {
    specSel.value = key || "";
    deptInput.value = key || "";
    renderDoctor(key);
    renderServices(key);
    if (!silent) deptInput.dispatchEvent(new Event("change", { bubbles: true })); // refreshes time slots
    const hrs = $("wzHours");
    if (hrs) {
      const c = key && DEPARTMENTS[key];
      hrs.textContent = c
        ? `${c.short} is open ${formatDays(c.days)}, ${formatHours(c.ranges)}. Each slot is 30 minutes.`
        : "Pick a preferred date and an open 30-minute slot.";
    }
    updateButtons();
  }

  specSel.addEventListener("change", () => setDept(specSel.value));
  servicesBox.addEventListener("change", (e) => {
    if (e.target.name === "wz-service") { serviceInput.value = e.target.value; updateButtons(); }
  });

  /* ---------- step 2: visual time-slot picker (kept in sync with the real <select>) ---------- */
  const timeSel = $("b-time"), slotsBox = $("wzSlots"), dateInput = $("b-date");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function slotHour(v) {
    const m = /^(\d+):(\d+)\s*(AM|PM)/i.exec(v || "");
    if (!m) return 0;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    return h;
  }

  function buildSlots() {
    const opts = [...timeSel.options];
    const real = opts.filter((o) => o.value);
    if (timeSel.disabled || !real.length) {
      slotsBox.innerHTML = `<p class="wz-empty">${esc(opts[0] ? opts[0].textContent : "")}</p>`;
      return;
    }
    const groups = { Morning: [], Afternoon: [] };
    real.forEach((o) => groups[slotHour(o.value) < 12 ? "Morning" : "Afternoon"].push(o));
    slotsBox.innerHTML = Object.entries(groups).filter(([, a]) => a.length).map(([name, arr]) =>
      `<div class="wz-slot-group"><h4>${name}</h4><div class="wz-slot-grid">` +
      arr.map((o) => {
        const bad = o.disabled;
        const why = bad ? (/passed/i.test(o.textContent) ? "Passed" : "Booked") : "";
        return `<button type="button" class="wz-slot${bad ? " is-off" : ""}" data-v="${esc(o.value)}" aria-pressed="${timeSel.value === o.value}"${bad ? " disabled" : ""}>` +
          `<span>${esc(o.value)}</span>${why ? `<small>${why}</small>` : ""}</button>`;
      }).join("") + `</div></div>`
    ).join("");
  }

  function syncSlots() {
    slotsBox.querySelectorAll(".wz-slot").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === timeSel.value)));
  }

  slotsBox.addEventListener("click", (e) => {
    const b = e.target.closest(".wz-slot");
    if (!b || b.disabled) return;
    timeSel.value = b.dataset.v;
    timeSel.dispatchEvent(new Event("change", { bubbles: true }));
    syncSlots();
    $("f-time").classList.remove("invalid");
  });
  timeSel.addEventListener("change", syncSlots);
  let slotTimer = 0;
  new MutationObserver(() => { cancelAnimationFrame(slotTimer); slotTimer = requestAnimationFrame(buildSlots); })
    .observe(timeSel, { childList: true });
  buildSlots();

  /* only allow today … +60 days in the native picker (validation still enforces it) */
  if (dateInput) {
    dateInput.min = localDateStr();
    dateInput.max = localDateStr(new Date(Date.now() + 60 * 86400000));
  }

  /* ---------- validation per step (same rules as the final submit) ---------- */
  function validate(n) {
    if (n === 1) return !!(deptInput.value && serviceInput.value);

    if (n === 2) {
      const date = $("b-date"), time = $("b-time");
      const cfg = DEPARTMENTS[deptInput.value];
      const todayStr = localDateStr();
      const maxStr = localDateStr(new Date(Date.now() + 60 * 86400000));
      let dateMsg = "Choose a preferred date.", dateOk = isFilled(date);
      if (dateOk) {
        const d = new Date(date.value + "T00:00:00");
        if (isNaN(d)) { dateOk = false; dateMsg = "That date isn't valid."; }
        else if (date.value < todayStr) { dateOk = false; dateMsg = "That date has already passed. Pick today or a later date."; }
        else if (date.value > maxStr) { dateOk = false; dateMsg = "Appointments can be booked up to 60 days ahead."; }
        else if (cfg && !cfg.days.includes(d.getDay())) { dateOk = false; dateMsg = `${cfg.short} is only open ${formatDays(cfg.days)}.`; }
      }
      let timeMsg = "Choose an available time.";
      let timeOk = isFilled(time) && !time.selectedOptions[0]?.disabled;
      if (timeOk && dateOk) {
        const when = parseApptDateTime(date.value, time.value);
        if (when && when.getTime() < Date.now()) { timeOk = false; timeMsg = "That time has already passed today."; }
      }
      setFieldMsg("f-date", dateMsg); setFieldMsg("f-time", timeMsg);
      const a = setError($("f-date"), dateOk), b = setError($("f-time"), timeOk);
      return a && b;
    }

    if (n === 3) {
      const r = [
        setError($("f-fullname"), isValidFullName($("b-fullname").value)),
        setError($("f-contact"), isValidPhone($("b-contact").value)),
        setError($("f-age"), isValidAge($("b-age").value)),
        setError($("f-gender"), isFilled($("b-gender"))),
        setError($("f-notes"), isFilled($("b-notes"))),
      ];
      return r.every(Boolean);
    }
    return true;
  }

  /* ---------- summary on the terms step (grouped, with divider lines) ---------- */
  function renderSummary() {
    const d = $("b-date").value;
    const dateLong = d ? new Date(d + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—";
    const key = deptInput.value;
    const groups = [
      ["Appointment details", [
        ["Specialization", key ? DEPARTMENTS[key].short : "—"],
        ["Doctor", key ? docName(key) : "—"],
        ["Consultation", serviceInput.value || "—"],
        ["Date", dateLong],
        ["Time", $("b-time").value || "—"],
        ["Estimated time", EST_TEXT + " minutes"],
      ]],
      ["Patient details", [
        ["Patient", $("b-fullname").value.trim()],
        ["Contact number", formatPHMobile(normalizePHMobile($("b-contact").value) || $("b-contact").value)],
        ["Age · Gender", `${$("b-age").value} · ${$("b-gender").value}`],
        ["Reason", $("b-notes").value.trim()],
      ]],
    ];
    $("wzSummary").innerHTML = groups.map(([title, rows]) =>
      `<section class="wz-sum-group"><h3>${title}</h3><dl>` +
      rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(v)}</dd></div>`).join("") +
      `</dl></section>`).join("");
  }

  /* ---------- navigation ---------- */
  function updateButtons() {
    if (cur === 1) next.disabled = !validate(1);
    if (cur === 4) confirmBtn.disabled = !agree.checked;
  }

  function go(n, initial) {
    const prev = cur;
    cur = Math.max(1, Math.min(TOTAL, n));
    const dir = cur >= prev ? "fwd" : "back";
    panels.forEach((p) => {
      const on = Number(p.dataset.step) === cur;
      p.hidden = !on;
      if (on && !initial) { p.dataset.dir = dir; p.style.animation = "none"; void p.offsetWidth; p.style.animation = ""; }
    });
    stepEls.forEach((li, i) => {
      li.classList.toggle("active", i + 1 === cur);
      li.classList.toggle("done", i + 1 < cur);
      li.classList.toggle("clickable", i + 1 < cur && cur < TOTAL);
    });
    /* progress line + "Step X of 5" */
    const curEl = $("wzCur"), nameEl = $("wzName"), fill = $("wzFill");
    if (curEl) curEl.textContent = cur;
    if (nameEl) { nameEl.textContent = STEP_NAMES[cur - 1]; }
    if (fill) fill.style.width = ((cur - 1) / (TOTAL - 1)) * 100 + "%";

    footer.hidden = cur === TOTAL;
    back.hidden = cur === 1;
    next.hidden = cur >= 4;
    confirmBtn.hidden = cur !== 4;
    if (cur === 4) { renderSummary(); agree.checked = false; }
    updateButtons();
    const first = panels[cur - 1].querySelector("input:not([type=hidden]):not([type=radio]), select:not(:disabled)");
    if (!initial && cur !== 1 && first && cur !== TOTAL) first.focus({ preventScroll: true });
    if (!initial) document.querySelector(".wz").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  next.addEventListener("click", () => { if (validate(cur)) go(cur + 1); });
  back.addEventListener("click", () => go(cur - 1));
  agree.addEventListener("change", updateButtons);
  stepEls.forEach((li, i) => li.addEventListener("click", () => { if (cur < TOTAL && i + 1 < cur) go(i + 1); }));

  /* Enter inside a field moves forward instead of submitting early */
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
    e.preventDefault();
    if (cur < 4) next.click();
  });

  $("wzAnother").addEventListener("click", () => {
    $("confirmBanner").classList.remove("show");
    go(1);
  });

  /* hooks used by script.js */
  window.wizardGoTo = go;
  window.wizardCanSubmit = () => cur === 4 && agree.checked;

  /* form.reset() (after a successful booking) clears the fields, so rebuild the step-1 UI */
  form.addEventListener("reset", () => setTimeout(() => { buildSpecs(); setDept("", true); buildSlots(); }, 0));

  /* ---------- init (after script.js has read ?dept= on DOMContentLoaded) ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    buildSpecs();
    const pre = deptInput.value;
    setDept(pre && DEPARTMENTS[pre] ? pre : "", true);
    go(1, true);
  });
})();
