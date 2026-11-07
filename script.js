/* ---- access gate: only landing.html and login.html are public ---- */
(function () {
  const page = location.pathname.split("/").pop() || "index.html";
  if (["landing.html", "login.html"].includes(page)) return;
  let user = null;
  try { user = JSON.parse(localStorage.getItem("mediqueue_user")); } catch (e) {}
  if (!user) location.replace(page === "index.html" ? "landing.html" : "login.html?redirect=" + encodeURIComponent(page));
})();

/* =========================================================
   MediQueue — front-end behaviour (static prototype)
   Uses localStorage to simulate accounts + booking + queue
   lookup; no backend is wired up yet.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* "Welcome" (fresh login) vs "Welcome back": the flag lives only until the patient leaves the home page */
  try { if ((location.pathname.split("/").pop() || "index.html") !== "index.html") sessionStorage.removeItem("mq_fresh"); } catch (e) {}
  migrateBookingStatuses();
  autoCompletePastBookings();
  repairCurrentUserMrn();
  initNavToggle();
  initAuthNav();
  initAuthTabs();
  initLoginForm();
  initRegisterForm();
  initGoogleSignIn();
  initBookingForm();
  initQueueLookup();
  initAppointmentList();
  initAppointmentHistory();
  initHomePage();
});

/* Old demo data saved before a wording change ("Now serving") would otherwise
   keep showing the old label forever, since it's baked into localStorage. */
function migrateBookingStatuses() {
  const bookings = getBookings();
  let changed = false;
  bookings.forEach((b) => {
    if (b.status === "Now serving") {
      b.status = "Current appointment";
      changed = true;
    }
  });
  if (changed) localStorage.setItem("mediqueue_bookings", JSON.stringify(bookings));
}

/* Parses a booking's stored date ("YYYY-MM-DD") + time ("h:mm AM/PM") into a Date. */
function parseApptDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeStr.trim());
  if (!match) return null;
  let hh = Number(match[1]);
  const mm = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hh !== 12) hh += 12;
  if (period === "AM" && hh === 12) hh = 0;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return null;
  d.setHours(hh, mm, 0, 0);
  return d;
}

/* Any booking whose appointment date/time has already passed — and that wasn't
   cancelled — is treated as done and moved to "Completed" automatically. */
function autoCompletePastBookings() {
  const bookings = getBookings();
  const now = new Date();
  let changed = false;
  bookings.forEach((b) => {
    if (b.status === "Cancelled" || b.status === "Completed") return;
    const apptTime = parseApptDateTime(b.date, b.time);
    if (apptTime && apptTime.getTime() < now.getTime()) {
      b.status = "Completed";
      changed = true;
    }
  });
  if (changed) localStorage.setItem("mediqueue_bookings", JSON.stringify(bookings));
}

/* Repairs sessions saved before the MRN field was added to the user record
   (or where it somehow drifted from the patient record), so "Patient ID
   (MRN)" never shows "undefined". */
function repairCurrentUserMrn() {
  const user = getCurrentUser();
  if (!user || !user.id) return;
  const patient = getOrCreatePatient(user.id, user.label || user.id);
  if (user.mrn !== patient.mrn) {
    user.mrn = patient.mrn;
    localStorage.setItem("mediqueue_user", JSON.stringify(user));
  }
}

/* ---------- helpers ---------- */

function setError(fieldEl, isValid) {
  fieldEl.classList.toggle("invalid", !isValid);
  return isValid;
}

function isFilled(input) {
  return input.value.trim().length > 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/* PH mobile only: 09XX XXX XXXX, +63 9XX XXX XXXX or 639XXXXXXXXX -> "09XXXXXXXXX" */
function normalizePHMobile(value) {
  const m = String(value || "").replace(/[\s\-().]/g, "").match(/^(?:\+63|63|0)(9\d{9})$/);
  return m ? "0" + m[1] : null;
}

function isValidPhone(value) {
  return normalizePHMobile(value) !== null;
}

function isValidFullName(value) {
  const s = value.trim().replace(/\s+/g, " ");
  return s.length <= 60 && /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-]*(?: [A-Za-zÀ-ÿ.'\-]+)+$/.test(s);
}

function setFieldMsg(fieldId, msg) {
  const el = document.getElementById(fieldId);
  const e = el && el.querySelector(".field-error");
  if (e && msg) e.textContent = msg;
}

function isValidAge(value) {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 120;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

/* ---------- nav toggle (mobile) ---------- */

function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const cta = document.querySelector(".nav-cta");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const open = links.style.display === "flex";
    links.style.display = open ? "" : "flex";
    links.style.flexDirection = "column";
    links.style.gap = "14px";
    if (cta) {
      cta.style.display = open ? "" : "flex";
      cta.style.flexDirection = "column";
    }
  });
}

/* ---------- account / session (simulated) ---------- */

/* Patient records — one per person, created once on their first
   registration/sign-in. This is where the Patient ID (MRN) lives,
   separate from the per-visit Encounter Number below. */
function getPatients() {
  try {
    return JSON.parse(localStorage.getItem("mediqueue_patients")) || {};
  } catch {
    return {};
  }
}

function savePatients(patients) {
  localStorage.setItem("mediqueue_patients", JSON.stringify(patients));
}

function getOrCreatePatient(id, label) {
  const key = id.trim().toLowerCase();
  const patients = getPatients();

  if (patients[key]) {
    patients[key].label = label.trim(); // keep display name current
    savePatients(patients);
    return patients[key];
  }

  const year = new Date().getFullYear();
  const mrn = `MRN-${year}-${pad4(Object.keys(patients).length + 1)}`;
  patients[key] = { mrn, label: label.trim() };
  savePatients(patients);
  return patients[key];
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("mediqueue_user"));
  } catch {
    return null;
  }
}

function setCurrentUser(id, label) {
  try { sessionStorage.setItem("mq_fresh", "1"); } catch (e) {}
  const patient = getOrCreatePatient(id, label);
  localStorage.setItem(
    "mediqueue_user",
    JSON.stringify({ id: id.trim().toLowerCase(), label: label.trim(), mrn: patient.mrn })
  );
}

function clearCurrentUser() {
  localStorage.removeItem("mediqueue_user");
}

const ALLOWED_REDIRECTS = ["appointment.html", "appointment-history.html", "queue.html", "index.html"];

function getSafeRedirect() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("redirect");
  return ALLOWED_REDIRECTS.includes(target) ? target : "index.html";
}

/* Toggles the "Log in" nav link into "Log out" when a session exists. */
function initAuthNav() {
  const links = document.querySelectorAll(".js-auth-link");
  if (!links.length) return;

  const user = getCurrentUser();

  /* once signed in, the Register button has no job: hide it everywhere */
  document.querySelectorAll('a[href*="tab=register"]').forEach((a) => {
    if (a.closest(".nav-cta")) a.style.display = user ? "none" : "";
  });

  links.forEach((link) => {
    if (user) {
      link.textContent = "Log out";
      link.setAttribute("href", "#");
      link.addEventListener("click", (e) => {
        e.preventDefault();
        clearCurrentUser();
        window.location.href = "landing.html";
      });
    } else {
      link.textContent = "Log in";
      link.setAttribute("href", "login.html");
    }
  });
}

/* ---------- auth tabs (login.html) ---------- */

function initAuthTabs() {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const panelLogin = document.getElementById("panel-login");
  const panelRegister = document.getElementById("panel-register");
  if (!tabLogin || !tabRegister) return;

  function show(which) {
    const loginActive = which === "login";
    tabLogin.setAttribute("aria-selected", loginActive);
    tabRegister.setAttribute("aria-selected", !loginActive);
    panelLogin.hidden = !loginActive;
    panelRegister.hidden = loginActive;
  }

  tabLogin.addEventListener("click", () => show("login"));
  tabRegister.addEventListener("click", () => show("register"));

  document.querySelectorAll("[data-switch-to]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      show(link.dataset.switchTo);
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "register") show("register");
}

/* ---------- login form (simulated) ---------- */

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    setFieldMsg("f-username", "Enter the email address you registered with.");
    setFieldMsg("f-password", "Enter your password.");

    const okUser = setError(document.getElementById("f-username"), isValidEmail(username.value));
    const okPass = setError(document.getElementById("f-password"), isFilled(password));
    if (!(okUser && okPass)) return;

    const acct = getAccounts()[username.value.trim().toLowerCase()];
    if (!acct) {
      setFieldMsg("f-username", "No account found with that email. Create one first.");
      setError(document.getElementById("f-username"), false);
      return;
    }
    if ((await hashPassword(acct.email, password.value)) !== acct.pw) {
      setFieldMsg("f-password", "Incorrect password.");
      setError(document.getElementById("f-password"), false);
      return;
    }
    startVerification({
      email: acct.email,
      name: acct.name,
      onVerified: () => { setCurrentUser(acct.email, acct.name); window.location.href = getSafeRedirect(); },
    });
  });
}

/* ---------- register form (simulated) ---------- */

function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullname = document.getElementById("fullname");
    const email = document.getElementById("email");
    const contact = document.getElementById("contact");
    const password = document.getElementById("rpassword");
    setFieldMsg("r-email", "Enter a valid email address.");

    const okName = setError(document.getElementById("r-fullname"), isValidFullName(fullname.value));
    const okEmail = setError(document.getElementById("r-email"), isValidEmail(email.value));
    const okContact = setError(document.getElementById("r-contact"), isValidPhone(contact.value));
    const okPass = setError(document.getElementById("r-password"), password.value.length >= 8);
    if (!(okName && okEmail && okContact && okPass)) return;

    const key = email.value.trim().toLowerCase();
    if (getAccounts()[key]) {
      setFieldMsg("r-email", "That email is already registered. Log in instead.");
      setError(document.getElementById("r-email"), false);
      return;
    }
    const name = fullname.value.trim().replace(/\s+/g, " ");
    const pw = await hashPassword(key, password.value);
    startVerification({
      email: key,
      name,
      onVerified: () => {
        const all = getAccounts();
        all[key] = { email: key, name, contact: normalizePHMobile(contact.value), pw };
        saveAccounts(all);
        setCurrentUser(key, name);
        window.location.href = getSafeRedirect();
      },
    });
  });
}

/* ---------- clinic schedule / 30-minute slot generation ---------- */

/* days: 0=Sun … 6=Sat (matches Date#getDay) */
const DEPARTMENTS = {
  "OB-GYNE — Dr. Canono": {
    days: [1, 2, 3, 4, 5],
    ranges: [["08:00", "12:00"], ["13:00", "16:00"]],
    short: "OB-GYNE",
    icon: "heart",
    blurb: "Women's health care, from prenatal checkups to gynecologic consultations.",
    offers: ["Prenatal checkups", "Pap smear & screening", "Family planning"],
  },
  "Pediatrics — Dr. Jimenez": {
    days: [1, 3, 5],
    ranges: [["09:00", "12:00"], ["13:00", "15:00"]],
    short: "Pediatrics",
    icon: "smile",
    blurb: "Gentle care for infants, children and teens, from checkups to common childhood illnesses.",
    offers: ["Child checkups", "Immunization advice", "Growth monitoring"],
  },
  "Dental — Dr. Labisa": {
    days: [2, 4],
    ranges: [["08:00", "12:00"]],
    short: "Dental",
    icon: "tooth",
    blurb: "Keep your smile healthy with routine dental care and treatment.",
    offers: ["Oral exam", "Cleaning", "Extraction & fillings"],
  },
  "General Check-up — Dr. Jose": {
    days: [1, 2, 3, 4, 5, 6],
    ranges: [["08:00", "16:00"]],
    short: "General Check-up",
    icon: "clipboard",
    blurb: "A quick overall health review — the most flexible schedule, including Saturdays.",
    offers: ["Physical exam", "Vital signs", "Health certificate"],
  },
};

const SLOT_MINUTES = 30; // each appointment is 30 minutes so doctors get a breather between patients

function parseHM(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function formatTime12(totalMinutes) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const period = hh >= 12 ? "PM" : "AM";
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(mm)} ${period}`;
}

/* Returns { slots: string[], closed: boolean } for a department on a given date. */
function generateTimeSlots(department, dateStr) {
  const config = DEPARTMENTS[department];
  if (!config || !dateStr) return { slots: [], closed: false };

  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return { slots: [], closed: false };

  const day = d.getDay();
  if (!config.days.includes(day)) return { slots: [], closed: true };

  const slots = [];
  config.ranges.forEach(([start, end]) => {
    let t = parseHM(start);
    const endT = parseHM(end);
    while (t + SLOT_MINUTES <= endT) {
      slots.push(formatTime12(t));
      t += SLOT_MINUTES;
    }
  });

  return { slots, closed: false };
}

/* Time slots for a department + date that are already taken by an active (non-cancelled) booking. */
function getTakenSlots(department, dateStr) {
  return getBookings()
    .filter((b) => b.department === department && b.date === dateStr && b.status !== "Cancelled")
    .map((b) => b.time);
}

function refreshTimeOptions() {
  const deptSel = document.getElementById("b-department");
  const dateInput = document.getElementById("b-date");
  const timeSel = document.getElementById("b-time");
  if (!deptSel || !dateInput || !timeSel) return;

  const dept = deptSel.value;
  const dateStr = dateInput.value;
  const previousValue = timeSel.value;

  timeSel.innerHTML = "";

  if (!dept || !dateStr) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Select a department and date first";
    timeSel.appendChild(opt);
    timeSel.disabled = true;
    return;
  }

  const { slots, closed } = generateTimeSlots(dept, dateStr);

  if (closed) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Clinic closed for this department on that date";
    timeSel.appendChild(opt);
    timeSel.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a time";
  timeSel.appendChild(placeholder);

  const taken = getTakenSlots(dept, dateStr);

  slots.forEach((slot) => {
    const opt = document.createElement("option");
    opt.value = slot;
    const slotAt = parseApptDateTime(dateStr, slot);
    if (taken.includes(slot)) {
      opt.textContent = `${slot} — already booked`;
      opt.disabled = true;
    } else if (slotAt && slotAt.getTime() <= Date.now()) {
      opt.textContent = `${slot} — already passed`;
      opt.disabled = true;
    } else {
      opt.textContent = slot;
    }
    timeSel.appendChild(opt);
  });

  if (!slots.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No slots available";
    timeSel.appendChild(opt);
    timeSel.disabled = true;
    return;
  }

  timeSel.disabled = false;
  if (previousValue && !taken.includes(previousValue) && slots.includes(previousValue)) {
    timeSel.value = previousValue;
  }
}

/* ---------- "Continue with Google" (simulated — no real OAuth/backend) ---------- */

const GOOGLE_ACCOUNTS_KEY = "mediqueue_google_accounts";

function getGoogleAccounts() {
  try {
    return JSON.parse(localStorage.getItem(GOOGLE_ACCOUNTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveGoogleAccount(account) {
  const accounts = getGoogleAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
  if (idx === -1) accounts.push(account);
  else accounts[idx] = account;
  localStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

function initGoogleSignIn() {
  const trigger = document.getElementById("googleSignInBtn");
  const overlay = document.getElementById("googleModalOverlay");
  if (!trigger || !overlay) return;

  const list = document.getElementById("googleAccountList");
  const addBtn = document.getElementById("googleAddAccountBtn");
  const addForm = document.getElementById("googleAddForm");
  const addConfirm = document.getElementById("googleAddConfirmBtn");
  const closeBtn = document.getElementById("googleModalClose");
  const nameInput = document.getElementById("gname");
  const emailInput = document.getElementById("gemail");

  function renderAccounts() {
    const accounts = getGoogleAccounts();
    list.innerHTML = accounts
      .map(
        (a) => `
        <li>
          <button type="button" class="google-account-row" data-account-email="${a.email}">
            <span class="google-account-avatar">${a.name.trim().charAt(0).toUpperCase() || "?"}</span>
            <span class="google-account-text">
              <strong>${a.name}</strong>
              <span>${a.email}</span>
            </span>
          </button>
        </li>
      `
      )
      .join("");

    list.querySelectorAll("[data-account-email]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const email = btn.dataset.accountEmail;
        const account = accounts.find((a) => a.email === email);
        if (account) chooseAccount(account);
      });
    });
  }

  function openModal() {
    renderAccounts();
    addForm.hidden = true;
    overlay.hidden = false;
  }

  function closeModal() {
    overlay.hidden = true;
    addForm.hidden = true;
    nameInput.value = "";
    emailInput.value = "";
  }

  function chooseAccount(account) {
    saveGoogleAccount(account);
    closeModal();
    startVerification({
      email: account.email,
      name: account.name,
      onVerified: () => { setCurrentUser(account.email, account.name); window.location.href = getSafeRedirect(); },
    });
  }

  trigger.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  addBtn.addEventListener("click", () => {
    addForm.hidden = false;
    nameInput.focus();
  });

  addConfirm.addEventListener("click", () => {
    const okName = setError(document.getElementById("f-gname"), isFilled(nameInput));
    const okEmail = setError(document.getElementById("f-gemail"), isValidEmail(emailInput.value));
    if (!(okName && okEmail)) return;
    chooseAccount({ name: nameInput.value.trim(), email: emailInput.value.trim() });
  });
}

/* ---------- booking form ---------- */

function initBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const deptSel = document.getElementById("b-department");
  const dateInput = document.getElementById("b-date");

  const preDept = new URLSearchParams(window.location.search).get("dept");
  if (deptSel && preDept && DEPARTMENTS[preDept]) deptSel.value = preDept;
  refreshTimeOptions();

  if (deptSel) deptSel.addEventListener("change", refreshTimeOptions);
  if (dateInput) dateInput.addEventListener("change", refreshTimeOptions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (form.hasAttribute("data-wizard") && window.wizardCanSubmit && !window.wizardCanSubmit()) return;

    const fullname = document.getElementById("b-fullname");
    const contact = document.getElementById("b-contact");
    const age = document.getElementById("b-age");
    const gender = document.getElementById("b-gender");
    const department = document.getElementById("b-department");
    const date = document.getElementById("b-date");
    const time = document.getElementById("b-time");
    const notes = document.getElementById("b-notes");

    const todayStr = localDateStr();
    const maxStr = localDateStr(new Date(Date.now() + 60 * 86400000));
    const cfg = DEPARTMENTS[department.value];

    /* date: real, not past, within 60 days, and the doctor is in that day */
    let dateMsg = "Choose a preferred date.";
    let dateOk = isFilled(date);
    if (dateOk) {
      const dObj = new Date(date.value + "T00:00:00");
      if (isNaN(dObj)) { dateOk = false; dateMsg = "That date isn't valid."; }
      else if (date.value < todayStr) { dateOk = false; dateMsg = "That date has already passed. Pick today or a later date."; }
      else if (date.value > maxStr) { dateOk = false; dateMsg = "Appointments can be booked up to 60 days ahead."; }
      else if (cfg && !cfg.days.includes(dObj.getDay())) { dateOk = false; dateMsg = `${cfg.short} is only open ${formatDays(cfg.days)}.`; }
    }
    let timeMsg = "Choose an available time.";
    let timeOk = isFilled(time) && !time.selectedOptions[0]?.disabled;
    if (timeOk && dateOk) {
      const when = parseApptDateTime(date.value, time.value);
      if (when && when.getTime() < Date.now()) { timeOk = false; timeMsg = "That time has already passed today."; }
    }
    setFieldMsg("f-fullname", "Enter your first and last name (letters only).");
    setFieldMsg("f-contact", "Enter a valid PH mobile number, e.g. 0917 123 4567.");
    setFieldMsg("f-age", "Enter your age as a whole number from 1 to 120.");
    setFieldMsg("f-date", dateMsg);
    setFieldMsg("f-time", timeMsg);

    const okName = setError(document.getElementById("f-fullname"), isValidFullName(fullname.value));
    const okContact = setError(document.getElementById("f-contact"), isValidPhone(contact.value));
    const okAge = setError(document.getElementById("f-age"), isValidAge(age.value));
    const okGender = setError(document.getElementById("f-gender"), isFilled(gender));
    const okDept = setError(document.getElementById("f-department"), isFilled(department));
    const okDate = setError(document.getElementById("f-date"), dateOk);
    const okTime = setError(document.getElementById("f-time"), timeOk);
    const okNotes = setError(document.getElementById("f-notes"), isFilled(notes));

    if (!(okName && okContact && okAge && okGender && okDept && okDate && okTime && okNotes)) return;

    const details = {
      fullname: fullname.value.trim().replace(/\s+/g, " "),
      contact: normalizePHMobile(contact.value),
      age: String(Number(age.value)),
      gender: gender.value,
      department: department.value,
      date: date.value,
      time: time.value,
      notes: notes.value.trim().replace(/\s+/g, " "),
      service: (document.getElementById("b-service") || {}).value || "",
    };

    const proceed = () => {
      // a slot can be taken between selection and confirmation
      if (getTakenSlots(details.department, details.date).includes(details.time)) {
        setFieldMsg("f-time", "Someone just took that slot. Please pick another time.");
        setError(document.getElementById("f-time"), false);
        refreshTimeOptions();
        if (window.wizardGoTo) window.wizardGoTo(2);
        return;
      }
      const user = getCurrentUser();
      const booking = createBooking({ ...details, owner: user ? user.id : null, mrn: user ? user.mrn : null });
      showConfirmation(booking);
      showToast(
        `Appointment confirmed — queue number ${booking.queueNumber}`,
        `${DEPARTMENTS[details.department].short} · ${formatDate(details.date)} at ${details.time}. Find it on Queue Status.`
      );
      form.reset();
      prefillBookingForm();
      refreshTimeOptions();
    };
    /* the wizard already collects consent on its Terms step, so skip the extra pop-up there */
    if (form.hasAttribute("data-wizard")) proceed(); else confirmBookingModal(details, proceed);
  });

  prefillBookingForm();
}

/* fill the patient's own details from their account (still editable) */
function prefillBookingForm() {
  const user = getCurrentUser();
  const dateInput = document.getElementById("b-date");
  if (dateInput) {
    dateInput.min = localDateStr();
    dateInput.max = localDateStr(new Date(Date.now() + 60 * 86400000));
  }
  if (!user) return;
  const acct = getAccounts()[user.id];
  const name = document.getElementById("b-fullname");
  const contact = document.getElementById("b-contact");
  if (name && !name.value) name.value = acct ? acct.name : (user.label && !user.label.includes("@") ? user.label : "");
  if (contact && !contact.value && acct && acct.contact) contact.value = formatPHMobile(acct.contact);
}

function generateVisitNumber() {
  // Random and independent of the queue number on purpose — the queue
  // number is public (shown on the ticket board), so the encounter
  // number must NOT be guessable from it, or the "privacy" ID is pointless.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const year = new Date().getFullYear();
  return `ENC-${year}-${code}`;
}

function createBooking(details) {
  const bookings = getBookings();
  const queueNumber = bookings.length + 1;

  let visitNumber = generateVisitNumber();
  while (bookings.some((b) => b.visitNumber === visitNumber)) {
    visitNumber = generateVisitNumber(); // guard against the rare collision
  }

  const booking = {
    queueNumber,
    visitNumber,
    status: queueNumber === 1 ? "Current appointment" : "In queue",
    position: Math.max(queueNumber - 1, 0),
    waitMinutes: Math.max(queueNumber - 1, 0) * 8,
    ...details,
  };

  bookings.push(booking);
  localStorage.setItem("mediqueue_bookings", JSON.stringify(bookings));
  return booking;
}

function getBookings() {
  try {
    const list = JSON.parse(localStorage.getItem("mediqueue_bookings")) || [];
    list.forEach((b) => { if (b && typeof b.department === "string") b.department = b.department.replace("Family Medicine", "OB-GYNE"); });
    return list;
  } catch {
    return [];
  }
}

function completeBooking(queueNumber) {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => String(b.queueNumber) === String(queueNumber));
  if (idx === -1) return;
  bookings[idx].status = "Completed";
  localStorage.setItem("mediqueue_bookings", JSON.stringify(bookings));
}

function cancelBooking(queueNumber) {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => String(b.queueNumber) === String(queueNumber));
  if (idx === -1) return false;
  const b = bookings[idx];
  b.status = "Cancelled";
  b.cancelledAt = new Date().toISOString();
  const mins = minutesUntilAppt(b);
  if (mins !== null) b.cancelMinutesBefore = Math.max(mins, 0);
  localStorage.setItem("mediqueue_bookings", JSON.stringify(bookings));
  return true;
}

/* ---------- cancellation policy ---------- */

const CANCEL_CUTOFF_MINUTES = 30; // online cancellation closes 30 min before the appointment

function minutesUntilAppt(booking) {
  const t = parseApptDateTime(booking.date, booking.time);
  return t ? Math.round((t.getTime() - Date.now()) / 60000) : null;
}

/* { ok, reason } — whether this booking can still be cancelled online. */
function checkCancellable(booking) {
  if (booking.status === "Cancelled") return { ok: false, reason: "This appointment has been cancelled." };
  if (booking.status === "Completed") return { ok: false, reason: "This appointment has already been completed." };
  const mins = minutesUntilAppt(booking);
  if (mins !== null && mins < CANCEL_CUTOFF_MINUTES) {
    return {
      ok: false,
      reason: `Online cancellation closes ${CANCEL_CUTOFF_MINUTES} minutes before your appointment so the slot can still be offered to someone else. Please call the clinic at (045) 982-0110.`,
    };
  }
  return { ok: true, reason: `You can cancel online until ${CANCEL_CUTOFF_MINUTES} minutes before your appointment. You'll be asked for the contact number used when booking.` };
}

/* "45 mins", "2 hrs 30 mins", "1 day" */
function formatLead(mins) {
  if (mins === undefined || mins === null) return "—";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  if (mins < 1440) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} hr${h === 1 ? "" : "s"}${m ? ` ${m} mins` : ""}`;
  }
  const d = Math.floor(mins / 1440);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/* Queue wait shown as a range (e.g. 15–20 mins) instead of a single number. */
function formatWaitRange(minutes) {
  if (!minutes || minutes <= 0) return "No wait — you're up next";
  const lo = Math.max(5, Math.floor(minutes / 5) * 5);
  return `${lo}–${lo + 5} mins`;
}

function showConfirmation(booking) {
  const banner = document.getElementById("confirmBanner");
  const title = document.getElementById("confirmTitle");
  const detail = document.getElementById("confirmDetail");
  if (!banner) return;

  title.textContent = `Appointment booked — queue number ${booking.queueNumber}`;
  const mrnLine = booking.mrn ? ` Patient ID: ${booking.mrn}.` : " Log in next time to get a Patient ID (MRN) tied to your account.";
  detail.innerHTML = `Visit number ${booking.visitNumber}.${mrnLine} <a href="queue.html?queue=${encodeURIComponent(booking.queueNumber)}" style="color:inherit; text-decoration:underline;">View it on the Queue Status page</a>.`;
  banner.classList.add("show");
  if (window.wizardGoTo) window.wizardGoTo(5);
  else banner.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- queue lookup ---------- */

function initQueueLookup() {
  const form = document.getElementById("queueSearchForm");
  if (!form) return;

  const input = document.getElementById("queueInput");
  const ticket = document.getElementById("ticket");
  const empty = document.getElementById("queueEmpty");
  const cancelBtn = document.getElementById("ticketCancelBtn");

  let currentQueueNumber = null;

  /* quick picks: the patient's own active bookings */
  const mine = document.getElementById("myQueue");
  if (mine) {
    const active = myBookings().filter((b) => b.status !== "Cancelled" && b.status !== "Completed").reverse();
    mine.innerHTML = active.length
      ? `<h3>Your bookings</h3><div class="my-queue-chips">${active.map((b) => `<button type="button" class="my-chip" data-q="${b.queueNumber}"><b>#${pad2(b.queueNumber)}</b><span>${escapeHTML(String(b.department).split(" — ")[0])}</span><small>${formatDate(b.date)} · ${escapeHTML(b.time)}</small></button>`).join("")}</div>`
      : "";
    mine.addEventListener("click", (e) => {
      const c = e.target.closest("[data-q]");
      if (!c) return;
      input.value = c.dataset.q;
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    const bookings = myBookings();
    const match = bookings.find((b) =>
      String(b.queueNumber).toLowerCase() === query ||
      (b.visitNumber && b.visitNumber.toLowerCase() === query)
    );

    if (match) {
      currentQueueNumber = match.queueNumber;
      renderTicket(match);
      ticket.classList.add("show");
      empty.style.display = "none";
    } else {
      currentQueueNumber = null;
      ticket.classList.remove("show");
      empty.style.display = "block";
      empty.textContent = "No appointment under your account matches that number. Double-check your queue number or visit number.";
    }
  });

  const params = new URLSearchParams(window.location.search);
  const queueParam = params.get("queue");
  if (queueParam) {
    input.value = queueParam;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (!currentQueueNumber) return;
      const booking = myBookings().find((b) => b.queueNumber === currentQueueNumber);
      if (!booking) return;

      const policy = checkCancellable(booking);
      if (!policy.ok) {
        window.alert(policy.reason);
        return;
      }

      const entered = window.prompt("To cancel, enter the contact number used when booking this appointment:");
      if (entered === null) return; // they backed out of the prompt

      const normalize = (v) => normalizePHMobile(v) || String(v || "").replace(/[\s\-]/g, "");
      if (normalize(entered) !== normalize(booking.contact)) {
        window.alert("That contact number doesn't match our records for this appointment. It wasn't cancelled.");
        return;
      }

      if (!window.confirm("Cancel this appointment? This can't be undone.")) return;
      cancelBooking(currentQueueNumber);
      const updated = getBookings().find((b) => b.queueNumber === currentQueueNumber);
      if (updated) renderTicket(updated);
    });
  }
}

/* ---------- appointment list (other patients, demo) ---------- */

function demoAppointments() {
  return [
    { queueNumber: 1, fullname: "Maria Lopez", department: "OB-GYNE — Dr. Canono", date: "2026-09-02", time: "8:00 AM", status: "Current appointment" },
    { queueNumber: 2, fullname: "Josef Cruz", department: "Pediatrics — Dr. Jimenez", date: "2026-09-02", time: "9:00 AM", status: "In queue" },
    { queueNumber: 3, fullname: "Angela Reyes", department: "Dental — Dr. Labisa", date: "2026-09-02", time: "10:00 AM", status: "In queue" },
    { queueNumber: 4, fullname: "Ramon Bautista", department: "General Check-up — Dr. Jose", date: "2026-09-02", time: "10:30 AM", status: "In queue" },
    { queueNumber: 5, fullname: "Carla Mendoza", department: "OB-GYNE — Dr. Canono", date: "2026-09-02", time: "1:00 PM", status: "In queue" },
  ];
}

function maskName(fullname) {
  // Privacy-safe display for other patients — initials only, GCash-style
  // (e.g. "Maria Lopez" -> "M. L.") so identities aren't fully exposed.
  if (!fullname) return "—";
  return fullname
    .trim()
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  if (isNaN(d)) return value;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function initAppointmentList() {
  const body = document.getElementById("apptListBody");
  if (!body) return;

  const rows = myBookings().filter((b) => b.status !== "Cancelled" && b.status !== "Completed");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6">You have no upcoming appointments. <a href="appointment.html">Book one now</a>.</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map((r) => `
      <tr>
        <td>${pad2(r.queueNumber)}</td>
        <td class="dept">${escapeHTML(r.fullname)}</td>
        <td>${r.department}</td>
        <td>${formatDate(r.date)}</td>
        <td>${r.time}</td>
        <td>${r.status}</td>
      </tr>
    `)
    .join("");
}

/* ---------- analytics (services served + cancellations) ---------- */

const CANCEL_BUCKETS = [
  { key: "30–60 mins", min: 0, max: 60 },
  { key: "1–3 hrs", min: 60, max: 180 },
  { key: "3–24 hrs", min: 180, max: 1440 },
  { key: "1+ day", min: 1440, max: Infinity },
];

/* Baseline history so the charts mean something before many bookings exist.
   Live bookings made in this browser are added on top of these numbers. */
const DEMO_STATS = {
  served: { "OB-GYNE": 128, "General Check-up": 96, "Pediatrics": 74, "Dental": 52 },
  cancelled: { "OB-GYNE": 14, "General Check-up": 11, "Pediatrics": 9, "Dental": 12 },
  buckets: [7, 12, 15, 12],
};

function shortDept(name) {
  return DEPARTMENTS[name] ? DEPARTMENTS[name].short : String(name || "").split(" — ")[0];
}

function computeStats() {
  const stats = {
    served: { ...DEMO_STATS.served },
    cancelled: { ...DEMO_STATS.cancelled },
    buckets: DEMO_STATS.buckets.slice(),
  };
  getBookings().forEach((b) => {
    const d = shortDept(b.department);
    if (b.status === "Completed") stats.served[d] = (stats.served[d] || 0) + 1;
    if (b.status === "Cancelled") {
      stats.cancelled[d] = (stats.cancelled[d] || 0) + 1;
      const m = b.cancelMinutesBefore;
      if (m !== undefined && m !== null) {
        const idx = CANCEL_BUCKETS.findIndex((x) => m >= x.min && m < x.max);
        if (idx !== -1) stats.buckets[idx] += 1;
      }
    }
  });
  stats.totalServed = Object.values(stats.served).reduce((a, n) => a + n, 0);
  stats.totalCancelled = Object.values(stats.cancelled).reduce((a, n) => a + n, 0);
  return stats;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function barRowsHTML(rows, opts = {}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return rows
    .map((r, i) => `
      <li class="bar-row${opts.alt ? " alt" : ""}">
        <span class="bar-label">${escapeHTML(r.label)}</span>
        <span class="bar-track" role="img" aria-label="${escapeHTML(r.label)}: ${r.value}">
          <span class="bar-fill" style="--w:${(r.value / max) * 100}%; --d:${i * 90}ms"></span>
        </span>
        <span class="bar-value">${r.value}<small>${Math.round((r.value / total) * 100)}%</small></span>
      </li>`)
    .join("");
}

function renderServiceBars(el, stats) {
  if (!el) return;
  const rows = Object.entries(stats.served)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  el.innerHTML = barRowsHTML(rows);
  const top = document.querySelectorAll("[data-top-service]");
  top.forEach((n) => (n.textContent = rows[0] ? rows[0].label : "—"));
}

function renderCancelBuckets(el, stats) {
  if (!el) return;
  el.innerHTML = barRowsHTML(
    CANCEL_BUCKETS.map((b, i) => ({ label: b.key + " before", value: stats.buckets[i] })),
    { alt: true }
  );
}

/* ---------- appointment history (current account only) ---------- */

function initAppointmentHistory() {
  const completedBody = document.getElementById("historyBody");
  if (!completedBody) return;

  const user = getCurrentUser();
  const all = user ? myBookings() : [];
  const completed = all.filter((b) => b.status === "Completed").reverse();
  const cancelled = all.filter((b) => b.status === "Cancelled").reverse();
  const upcoming = all.filter((b) => b.status !== "Completed" && b.status !== "Cancelled").reverse();

  const setText = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  setText("hCompleted", completed.length);
  setText("hCancelled", cancelled.length);
  setText("hUpcoming", upcoming.length);
  setText("hTotal", all.length);
  if (user) {
    setText("hWho", (getAccounts()[user.id] || {}).name || user.label);
    setText("hMrn", user.mrn ? `Patient ID: ${user.mrn}` : "");
  }

  const rowHTML = (r, extra) => {
    const [dept, doc] = String(r.department).split(" — ");
    return `
      <tr>
        <td>${escapeHTML(r.visitNumber || "—")}</td>
        <td class="dept">${escapeHTML(dept)}${doc ? `<br><small class="muted-doc">${escapeHTML(doc)}</small>` : ""}</td>
        <td>${formatDate(r.date)}</td>
        <td>${escapeHTML(r.time)}</td>
        ${extra}
      </tr>`;
  };
  const fill = (bodyId, groupId, rows, extra) => {
    const body = document.getElementById(bodyId), group = document.getElementById(groupId);
    if (body) body.innerHTML = rows.map((r) => rowHTML(r, extra(r))).join("");
    if (group) group.style.display = rows.length ? "" : "none";
  };
  fill("upcomingBody", "upcomingGroup", upcoming, () => `<td class="status-cell"><span class="chip">Upcoming</span></td>`);
  fill("historyBody", "completedGroup", completed, () => `<td class="status-cell"><span class="chip chip-done">Completed</span></td>`);
  fill("cancelledBody", "cancelledGroup", cancelled, (r) => `<td class="status-cell"><span class="chip chip-cancel">Cancelled</span></td><td class="status-cell">${r.cancelMinutesBefore !== undefined ? formatLead(r.cancelMinutesBefore) + " before" : "—"}</td>`);

  const empty = document.getElementById("historyEmpty");
  if (empty) empty.style.display = all.length ? "none" : "block";
}

/* ---------- home page (dynamic sections) ---------- */

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDays(days) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sorted = days.slice().sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `${names[sorted[0]]}–${names[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => names[d]).join(", ");
}

function formatHours(ranges) {
  return ranges.map(([a, b]) => `${formatTime12(parseHM(a))} – ${formatTime12(parseHM(b))}`).join(" · ");
}

/* Slots still open today for a department (future + not booked). */
function slotsLeftToday(dept) {
  const today = localDateStr();
  const { slots, closed } = generateTimeSlots(dept, today);
  if (closed) return { closed: true, left: 0, next: null };
  const taken = getTakenSlots(dept, today);
  const now = Date.now();
  const open = slots.filter((t) => {
    const at = parseApptDateTime(today, t);
    return at && at.getTime() > now && !taken.includes(t);
  });
  const anyFuture = slots.some((t) => { const at = parseApptDateTime(today, t); return at && at.getTime() > now; });
  return { closed: false, left: open.length, next: open[0] || null, total: slots.length, over: !anyFuture };
}

/* Live "today" snapshot: recomputed from the clock + saved bookings, so it never goes stale. */
function liveToday() {
  let open = 0, slots = 0;
  const rows = [];
  Object.entries(DEPARTMENTS).forEach(([name, cfg]) => {
    const st = slotsLeftToday(name);
    const stillOpen = !st.closed && !st.over;
    if (stillOpen) open += 1;
    slots += st.left;
    let badge, cls;
    if (st.closed) { badge = "Closed today"; cls = "off"; }
    else if (st.left === 0) { badge = st.over ? "Done for today" : "Fully booked"; cls = st.over ? "off" : "full"; }
    else { badge = `${st.left} slot${st.left === 1 ? "" : "s"} left`; cls = "open"; }
    rows.push(`
      <li class="today-row">
        <span class="today-dot ${cls}" aria-hidden="true"></span>
        <span class="today-name"><strong>${escapeHTML(cfg.short)}</strong><small>${st.closed ? formatDays(cfg.days) : st.next ? "Next open: " + st.next : st.over ? "Opens again " + formatDays(cfg.days) : "Try another day"}</small></span>
        <span class="today-badge ${cls}">${badge}</span>
      </li>`);
  });
  return { open, slots, rows: rows.join("") };
}

const ICONS = {
  heart: '<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3.2A5 5 0 0 1 21 11c-2 4.600-9 9-9 9z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14.500s1.500 2 4 2 4-2 4-2M9 9.500h.01M15 9.500h.01"/>',
  tooth: '<path d="M7 3.500c-2.200 0-3.500 1.800-3.500 4 0 2.800 1.500 3.700 2 6.500.4 2.300.9 6.500 2.300 6.500 1.200 0 1.300-3 1.900-4.800.3-.9.8-1.200 1.300-1.200s1 .3 1.300 1.200c.6 1.800.7 4.800 1.900 4.800 1.400 0 1.900-4.200 2.300-6.500.5-2.800 2-3.700 2-6.500 0-2.200-1.300-4-3.500-4-1.700 0-2.600 1-4.300 1S8.700 3.500 7 3.500z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
};

function iconSVG(name) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function animateCount(el, target) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { el.textContent = target; return; }
  const start = performance.now();
  const dur = 1100;
  const tick = (now) => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---- reviews ---- */

const REVIEWS_KEY = "mediqueue_reviews";
const SEED_REVIEWS = [
  { name: "Maria L.", role: "Student", rating: 5, text: "Booked from my dorm and just walked in at my time. No more standing in line under the sun." },
  { name: "Josef C.", role: "Parent", rating: 5, text: "I could see the estimated wait before leaving home, so my daughter never had to sit around for long." },
  { name: "Angela R.", role: "Faculty", rating: 4, text: "Simple to use. Seeing the wait as a range is realistic and helps me plan my break." },
  { name: "Ramon B.", role: "Staff", rating: 5, text: "Cancelling was easy, and the 30-minute rule is fair. Someone else got my slot." },
];

function getReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem(REVIEWS_KEY)) || [];
    return [...saved, ...SEED_REVIEWS];
  } catch {
    return SEED_REVIEWS.slice();
  }
}

function saveReview(r) {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; } catch {}
  saved.unshift(r);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(saved.slice(0, 20)));
}

function starsHTML(n) {
  return `<span class="stars" role="img" aria-label="${n} out of 5 stars">${"★".repeat(n)}<span class="off">${"★".repeat(5 - n)}</span></span>`;
}

function renderReviews() {
  const track = document.getElementById("reviewTrack");
  if (!track) return;
  const reviews = getReviews();
  track.innerHTML = reviews
    .map((r) => `
      <figure class="review-card">
        ${starsHTML(r.rating)}
        <blockquote>“${escapeHTML(r.text)}”</blockquote>
        <figcaption>
          <span class="avatar">${escapeHTML(r.name.trim().charAt(0).toUpperCase() || "?")}</span>
          <span><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.role || "Patient")}</small></span>
        </figcaption>
      </figure>`)
    .join("");

  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  const avgEl = document.getElementById("reviewAvg");
  const cntEl = document.getElementById("reviewCount");
  if (avgEl) avgEl.textContent = avg.toFixed(1);
  if (cntEl) cntEl.textContent = reviews.length;
}

function initReviews() {
  const track = document.getElementById("reviewTrack");
  if (!track) return;
  renderReviews();

  const step = () => {
    const card = track.querySelector(".review-card");
    return card ? card.getBoundingClientRect().width + 20 : 320;
  };
  const go = (dir) => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    if (dir > 0 && atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    else track.scrollBy({ left: dir * step(), behavior: "smooth" });
  };
  document.getElementById("reviewPrev").addEventListener("click", () => go(-1));
  document.getElementById("reviewNext").addEventListener("click", () => go(1));

  let paused = false;
  ["mouseenter", "focusin", "touchstart"].forEach((e) => track.parentElement.addEventListener(e, () => (paused = true), { passive: true }));
  ["mouseleave", "focusout"].forEach((e) => track.parentElement.addEventListener(e, () => (paused = false)));
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(() => { if (!paused && !document.hidden) go(1); }, 6000);
  }

  const form = document.getElementById("reviewForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("rv-name");
    const rating = document.getElementById("rv-rating");
    const text = document.getElementById("rv-text");
    const okName = setError(document.getElementById("f-rv-name"), isFilled(name));
    const okText = setError(document.getElementById("f-rv-text"), text.value.trim().length >= 10);
    if (!(okName && okText)) return;
    saveReview({ name: name.value.trim().slice(0, 40), role: "Patient", rating: Number(rating.value), text: text.value.trim().slice(0, 280) });
    form.reset();
    renderReviews();
    track.scrollTo({ left: 0, behavior: "smooth" });
    const thanks = document.getElementById("reviewThanks");
    if (thanks) { thanks.hidden = false; setTimeout(() => (thanks.hidden = true), 4000); }
  });
}

function initHomePage() {
  const home = document.getElementById("homePage");
  if (!home) return;

  /* scroll reveal */
  document.documentElement.classList.add("js");
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach((n) => io.observe(n));
  } else {
    reveals.forEach((n) => n.classList.add("in"));
  }

  /* services + today's clinics */
  const now = new Date();
  const todayLabel = document.getElementById("todayLabel");
  if (todayLabel) todayLabel.textContent = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

  const todayList = document.getElementById("todayList");
  const svcGrid = document.getElementById("servicesGrid");
  let openCount = 0;
  let slotsTotal = 0;
  const todayRows = [];
  const cards = [];

  Object.entries(DEPARTMENTS).forEach(([name, cfg]) => {
    const st = slotsLeftToday(name);
    if (!st.closed) openCount += 1;
    slotsTotal += st.left;

    let badge, cls;
    if (st.closed) { badge = "Closed today"; cls = "off"; }
    else if (st.left === 0) { badge = st.over ? "Done for today" : "Fully booked"; cls = st.over ? "off" : "full"; }
    else { badge = `${st.left} slot${st.left === 1 ? "" : "s"} left`; cls = "open"; }

    todayRows.push(`
      <li class="today-row">
        <span class="today-dot ${cls}" aria-hidden="true"></span>
        <span class="today-name"><strong>${escapeHTML(cfg.short)}</strong><small>${st.closed ? formatDays(cfg.days) : st.next ? "Next open: " + st.next : st.over ? "Opens again " + formatDays(cfg.days) : "Try another day"}</small></span>
        <span class="today-badge ${cls}">${badge}</span>
      </li>`);

    const docKey = ["canono", "jimenez", "labisa", "jose"].find((k) => name.toLowerCase().includes(k));
    cards.push(`
      <article class="service-card reveal">
        <div class="service-photo"><img src="assets/img/doc-${docKey}-card.jpg" alt="Photo of ${escapeHTML(name.split(" — ")[1] || "the doctor")}" loading="lazy"><span class="service-icon">${iconSVG(cfg.icon)}</span><span class="service-live"><i></i>Accepting patients</span></div>
        <h3>${escapeHTML(cfg.short)}</h3>
        <p class="service-doc">${escapeHTML(name.split(" — ")[1] || "")}</p>
        <p>${escapeHTML(cfg.blurb)}</p>
        <ul class="service-offers">${cfg.offers.map((o) => `<li>${escapeHTML(o)}</li>`).join("")}</ul>
        <dl class="service-meta">
          <div><dt>Days</dt><dd>${formatDays(cfg.days)}</dd></div>
          <div><dt>Hours</dt><dd>${formatHours(cfg.ranges)}</dd></div>
        </dl>
        <a class="btn btn-outline btn-block" href="appointment.html?dept=${encodeURIComponent(name)}">Book ${escapeHTML(cfg.short)}</a>
      </article>`);
  });

  const live = liveToday();
  openCount = live.open;
  slotsTotal = live.slots;
  if (todayList) todayList.innerHTML = live.rows;
  if (svcGrid) {
    svcGrid.innerHTML = cards.join("");
    svcGrid.querySelectorAll(".reveal").forEach((n, i) => {
      n.style.transitionDelay = `${i * 70}ms`;
      if ("IntersectionObserver" in window) {
        const io2 = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io2.unobserve(x.target); } }), { threshold: 0.12 });
        io2.observe(n);
      } else n.classList.add("in");
    });
  }

  /* analytics */
  const stats = computeStats();
  renderServiceBars(document.getElementById("svcBars"), stats);
  renderCancelBuckets(document.getElementById("cancelBars"), stats);

  const counters = {
    statServed: stats.totalServed,
    statOpen: openCount,
    statSlots: slotsTotal,
  };
  Object.entries(counters).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el) animateCount(el, v);
  });
  const rate = document.getElementById("statCancelRate");
  if (rate) rate.textContent = Math.round((stats.totalCancelled / (stats.totalServed + stats.totalCancelled)) * 100) + "%";

  /* keep the numbers honest while the page stays open */
  const refreshLive = () => {
    const l = liveToday();
    if (todayList) todayList.innerHTML = l.rows;
    const o = document.getElementById("statOpen"), sl = document.getElementById("statSlots");
    if (o) o.textContent = l.open;
    if (sl) sl.textContent = l.slots;
  };
  setInterval(refreshLive, 30000);
  window.addEventListener("storage", refreshLive);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLive(); });

  initReviews();
}

/* ---------- ticket rendering (queue.html) ---------- */

function renderTicket(booking) {
  document.getElementById("ticketNumber").textContent = pad2(booking.queueNumber);
  const visitEl = document.getElementById("ticketVisit");
  if (visitEl) visitEl.textContent = `Visit number: ${booking.visitNumber || "—"}`;

  const mrnRow = document.getElementById("ticketMrnRow");
  const mrnEl = document.getElementById("ticketMrn");
  if (mrnRow && mrnEl) {
    if (booking.mrn) {
      mrnEl.textContent = booking.mrn;
      mrnRow.style.display = "";
    } else {
      mrnRow.style.display = "none"; // guest booking — no account, no MRN
    }
  }

  const statusEl = document.getElementById("ticketStatus");
  statusEl.textContent = booking.status;
  statusEl.classList.toggle("cancelled", booking.status === "Cancelled");

  document.getElementById("ticketPosition").textContent = booking.status === "Cancelled" ? "—" : booking.position;
  const finished = booking.status === "Cancelled" || booking.status === "Completed";
  document.getElementById("ticketWait").textContent = finished ? "—" : formatWaitRange(booking.waitMinutes);
  const [deptName, docName] = String(booking.department).split(" — ");
  document.getElementById("ticketAppt").innerHTML = `<span class="appt-lines"><b>${escapeHTML(deptName)}</b>${docName ? `<span class="appt-doc">${escapeHTML(docName)}</span>` : ""}<span class="appt-when">${formatDate(booking.date)} · ${escapeHTML(booking.time)}</span></span>`;

  const cancelBtn = document.getElementById("ticketCancelBtn");
  const cancelNote = document.getElementById("ticketCancelNote");
  if (!cancelBtn || !cancelNote) return;

  const policy = checkCancellable(booking);
  cancelNote.style.display = "block";
  cancelNote.textContent = policy.reason;
  if (booking.status === "Cancelled" || booking.status === "Completed") {
    cancelBtn.style.display = "none";
  } else {
    cancelBtn.style.display = "inline-flex";
    cancelBtn.disabled = !policy.ok;
    cancelBtn.classList.toggle("is-disabled", !policy.ok);
  }
}

/* =========================================================
   Accounts + email verification (sign-in / sign-up)
   ---------------------------------------------------------
   A static site has no mail server, so by default the "email"
   appears as an on-screen demo inbox. To send REAL emails, create
   a free EmailJS account and fill in EMAILJS_CONFIG below. The
   template can use: {{to_email}} {{to_name}} {{code}} {{time}}.
   ========================================================= */

const EMAILJS_CONFIG = { serviceId: "", templateId: "", publicKey: "" };
const ACCOUNTS_KEY = "mediqueue_accounts";

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; } catch { return {}; }
}
function saveAccounts(a) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); }

async function hashPassword(email, pw) {
  const text = email.toLowerCase() + ":" + pw;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return "x" + (h >>> 0).toString(16);
}

function maskEmail(e) {
  const [u, d] = e.split("@");
  return u.slice(0, 1) + "•".repeat(Math.max(2, Math.min(u.length - 1, 5))) + "@" + d;
}

async function sendVerificationEmail(to, name, code) {
  const c = EMAILJS_CONFIG;
  if (!(c.serviceId && c.templateId && c.publicKey)) return { demo: true };
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: c.serviceId, template_id: c.templateId, user_id: c.publicKey,
      template_params: { to_email: to, to_name: name, code, time: new Date().toLocaleString("en-PH") },
    }),
  });
  if (!res.ok) throw new Error("send failed");
  return { demo: false };
}

/* Shows the "enter your 6-digit number" dialog. onVerified() runs only after the right code. */
function startVerification({ email, name, onVerified }) {
  let code = "", expires = 0, attempts = 0, cooldownUntil = 0, mail = null;

  const overlay = document.createElement("div");
  overlay.className = "vf-overlay";
  overlay.innerHTML = `
    <div class="vf-card" role="dialog" aria-modal="true" aria-labelledby="vfTitle">
      <div class="vf-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div>
      <h2 id="vfTitle">Check your email</h2>
      <p class="vf-sub">You're signing in to MediQueue. We sent a 6-digit verification number to <strong>${escapeHTML(maskEmail(email))}</strong>.</p>
      <div class="vf-boxes" id="vfBoxes">${[1, 2, 3, 4, 5, 6].map((n) => `<input inputmode="numeric" maxlength="1" autocomplete="${n === 1 ? "one-time-code" : "off"}" aria-label="Digit ${n}">`).join("")}</div>
      <p class="vf-msg" id="vfMsg" role="alert"></p>
      <button type="button" class="btn btn-primary btn-block" id="vfVerify">Verify and continue</button>
      <div class="vf-foot"><span id="vfTimer"></span><span><button type="button" class="vf-link" id="vfResend" disabled>Resend number</button><button type="button" class="vf-link" id="vfCancel">Cancel</button></span></div>
    </div>`;
  document.body.appendChild(overlay);

  const boxes = [...overlay.querySelectorAll("#vfBoxes input")];
  const msg = overlay.querySelector("#vfMsg");
  const timer = overlay.querySelector("#vfTimer");
  const resend = overlay.querySelector("#vfResend");
  const say = (t, bad = true) => { msg.textContent = t; msg.classList.toggle("ok", !bad); };

  function showInbox() {
    if (mail) mail.remove();
    mail = document.createElement("div");
    mail.className = "vf-mail";
    mail.innerHTML = `
      <div class="vf-mail-head"><span class="vf-mail-dot"></span><b>MediQueue</b><small>now</small></div>
      <strong>Your MediQueue verification number</strong>
      <p>Hi ${escapeHTML(name)}, someone is signing in to MediQueue with this email (${escapeHTML(new Date().toLocaleString("en-PH"))}). Your verification number is</p>
      <div class="vf-code">${code}</div>
      <p>It expires in 5 minutes. If this wasn't you, ignore this email.</p>
      <small>Demo inbox: this prototype can't send real email, so the message shows here.</small>`;
    document.body.appendChild(mail);
    requestAnimationFrame(() => mail.classList.add("in"));
  }

  async function send() {
    code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    expires = Date.now() + 5 * 60000;
    attempts = 0;
    cooldownUntil = Date.now() + 30000;
    resend.disabled = true;
    boxes.forEach((b) => (b.value = ""));
    boxes[0].focus();
    say("Sending…", false);
    try {
      const r = await sendVerificationEmail(email, name, code);
      if (r.demo) { showInbox(); say("", false); }
      else say("Sent! Check your inbox (and spam folder).", false);
    } catch {
      code = "";
      say("We couldn't send the email. Check your connection and press Resend.");
      cooldownUntil = 0;
    }
  }

  function tick() {
    const left = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    timer.textContent = code ? (left ? `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Number expired") : "";
    resend.disabled = Date.now() < cooldownUntil;
    resend.textContent = resend.disabled ? `Resend in ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s` : "Resend number";
  }
  const interval = setInterval(tick, 1000);

  function close() {
    clearInterval(interval);
    overlay.remove();
    if (mail) mail.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);

  function verify() {
    const entered = boxes.map((b) => b.value).join("");
    if (!code) return say("Press Resend to get a new number first.");
    if (entered.length < 6) return say("Enter all 6 digits.");
    if (Date.now() > expires) return say("This number expired. Press Resend for a new one.");
    if (attempts >= 5) return say("Too many wrong tries. Press Resend for a new number.");
    if (entered !== code) {
      attempts += 1;
      overlay.querySelector(".vf-card").classList.remove("shake");
      void overlay.offsetWidth;
      overlay.querySelector(".vf-card").classList.add("shake");
      boxes.forEach((x) => (x.value = ""));   // clear so retyping doesn't re-submit and burn tries
      boxes[0].focus();
      return say(`That number isn't right. ${5 - attempts} ${5 - attempts === 1 ? "try" : "tries"} left.`);
    }
    code = "";
    close();
    onVerified();
  }

  boxes.forEach((b, i) => {
    b.addEventListener("input", () => {
      b.value = b.value.replace(/\D/g, "").slice(-1);
      if (b.value && boxes[i + 1]) boxes[i + 1].focus();
      if (boxes.every((x) => x.value)) verify();
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus();
      if (e.key === "Enter") verify();
    });
    b.addEventListener("paste", (e) => {
      const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!d) return;
      e.preventDefault();
      d.split("").forEach((ch, k) => { if (boxes[k]) boxes[k].value = ch; });
      (boxes[Math.min(d.length, 5)]).focus();
      if (d.length === 6) verify();
    });
  });
  overlay.querySelector("#vfVerify").addEventListener("click", verify);
  overlay.querySelector("#vfCancel").addEventListener("click", close);
  resend.addEventListener("click", send);
  send();
}

/* ---------- on-screen notifications + booking confirmation ---------- */

function showToast(title, text) {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<span class="toast-ico">✓</span><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(text)}</span></div>`;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 500); }, 8000);
}

function formatPHMobile(n) { return n.length === 11 ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : n; }

function confirmBookingModal(d, onConfirm) {
  const prev = document.activeElement;
  const [deptName, doc] = d.department.split(" — ");
  const dateLong = new Date(d.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const rows = [
    ["Patient", d.fullname], ["Contact number", formatPHMobile(d.contact)], ["Age · Gender", `${d.age} · ${d.gender}`],
    ["Clinic", deptName], ["Doctor", doc || "—"], ["Date", dateLong], ["Time", d.time], ["Estimated time", "15–30 minutes"], ["Reason", d.notes],
  ];
  const ov = document.createElement("div");
  ov.className = "bk-overlay";
  ov.innerHTML = `
    <div class="bk-card" role="dialog" aria-modal="true" aria-labelledby="bkTitle">
      <span class="kicker">One last check</span>
      <h2 id="bkTitle">Confirm your appointment</h2>
      <dl class="bk-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(v)}</dd></div>`).join("")}</dl>
      <label class="bk-check"><input type="checkbox" id="bkOk"> I confirm these details are correct. The clinic will use this contact number to reach me.</label>
      <div class="bk-actions"><button type="button" class="btn btn-outline" id="bkEdit">Edit details</button><button type="button" class="btn btn-primary" id="bkGo" disabled>Confirm booking</button></div>
    </div>`;
  document.body.appendChild(ov);
  const ok = ov.querySelector("#bkOk"), go = ov.querySelector("#bkGo");
  ok.addEventListener("change", () => { go.disabled = !ok.checked; });
  const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  function onKey(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  ov.querySelector("#bkEdit").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  go.addEventListener("click", () => { close(); onConfirm(); });
  ok.focus();
}

/* only the signed-in patient's own bookings are ever shown */
function myBookings() {
  const u = getCurrentUser();
  return u ? getBookings().filter((b) => b.owner === u.id) : [];
}
