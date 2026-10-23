const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";

const customSelect = document.getElementById("communitySizeSelect");
const trigger = customSelect.querySelector(".select-trigger");
const options = customSelect.querySelectorAll(".select-option");
const hiddenInput = document.getElementById("communitySizeInput");
const selectedText = document.getElementById("selectedSize");

const waitlistForm = document.getElementById("waitlistForm");
const waitlistBtn = waitlistForm.querySelector(".btn.others");
const waitlistEmail = waitlistForm.querySelector("input[name='email']");

const earlyForm = document.getElementById("earlyAccessForm");
const earlyBtn = earlyForm.querySelector(".btn.others");
const requiredFields = earlyForm.querySelectorAll("input[required], textarea[required]");

const IsloadingInit = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"></stop><stop offset=".2" stop-color="currentColor" stop-opacity=".3"></stop><stop offset=".4" stop-color="currentColor" stop-opacity=".6"></stop><stop offset=".7" stop-color="currentColor" stop-opacity=".9"></stop><stop offset="1" stop-color="currentColor"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
`;

/* ---------- Toasts ---------- */

function showToast(msg, type = "error") {
  document.querySelectorAll(".toast").forEach(t => t.remove());

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);

  requestAnimationFrame(() => t.classList.add("show"));

  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

function showError(msg) {
  showToast(msg, "error");
}

function showSuccess(msg) {
  showToast(msg, "success");
}

/* ---------- Custom select ---------- */

trigger.addEventListener("click", () => {
  customSelect.classList.toggle("active");
});

options.forEach(option => {
  option.addEventListener("click", () => {
    selectedText.textContent = option.textContent;
    hiddenInput.value = option.dataset.value;
    selectedText.classList.add("active");
    customSelect.classList.remove("active");
    checkEarlyFormValidity();
  });
});

document.addEventListener("click", (e) => {
  if (!customSelect.contains(e.target)) {
    customSelect.classList.remove("active");
  }
});

/* ---------- Form validity ---------- */

function checkWaitlistValidity() {
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitlistEmail.value.trim());
  waitlistBtn.classList.toggle("active", emailValid);
}

waitlistEmail.addEventListener("input", checkWaitlistValidity);

function checkEarlyFormValidity() {
  let allFilled = true;

  requiredFields.forEach(field => {
    if (!field.value.trim()) allFilled = false;
  });

  if (!hiddenInput.value) allFilled = false;

  earlyBtn.classList.toggle("active", allFilled);
}

requiredFields.forEach(field => {
  field.addEventListener("input", checkEarlyFormValidity);
});

/* ---------- Modals ---------- */

function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.style.display = "none";

  if (id === "earlyModal") {
    earlyForm.reset();
    document.getElementById("earlyFeedback").innerText = "";

    selectedText.textContent = "Community Size";
    selectedText.classList.remove("active");
    hiddenInput.value = "";
    customSelect.classList.remove("active");

    earlyBtn.classList.remove("active");
  }

  if (id === "waitlistModal") {
    waitlistForm.reset();
    document.getElementById("waitlistFeedback").innerText = "";
    waitlistBtn.classList.remove("active");
  }
}

/* ---------- Form submits ---------- */

async function submitForm(form, btn, url, modalId) {
  if (!btn.classList.contains("active")) return;

  const originalContent = btn.innerHTML;
  btn.innerHTML = IsloadingInit;
  btn.disabled = true;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
      body: new FormData(form)
    });

    const result = await response.json();

    btn.innerHTML = originalContent;
    btn.disabled = false;

    if (result.success) {
      closeModal(modalId);
      setTimeout(() => showSuccess(result.message), 200);
    } else {
      showError(result.message);
    }
  } catch {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    showError("Something went wrong.");
  }
}

earlyForm.addEventListener("submit", function (e) {
  e.preventDefault();
  submitForm(this, earlyBtn, "/apply-early-access", "earlyModal");
});

waitlistForm.addEventListener("submit", function (e) {
  e.preventDefault();
  submitForm(this, waitlistBtn, "/join-waitlist", "waitlistModal");
});

/* ---------- Tabs / views ---------- */

const navLinks = document.querySelectorAll(".nav-links a");

function viewFromPath(path) {
  const last = path.split("?")[0].split("#")[0].split("/").filter(Boolean).pop();
  return last || "home";
}

function showView(viewId) {
  if (!document.getElementById(viewId)) viewId = "home";

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });
}

navLinks.forEach(link => {
  link.addEventListener("click", function (e) {
    // let ctrl/cmd-click open in a new tab as normal
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();

    window.history.pushState({}, "", this.getAttribute("href"));
    showView(this.dataset.view);
  });
});

window.addEventListener("popstate", () => {
  showView(viewFromPath(window.location.pathname));
});