const socialView = document.getElementById("social-view");
const emailView = document.getElementById("email-view");
const continueEmailBtn = document.getElementById("continueEmailBtn");
const backFromEmail = document.getElementById("backFromEmail");
const logoLink = document.getElementById("logo-link");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEROES = {
  default: {
    img: 'https://picsum.photos/seed/gleyo-auth/1400/1800',
    title: 'Build a retention-first community',
    text: 'Build with communities you care about — rewards follow naturally.'
  },
  secure: {
    img: 'https://xpcqiovfesvllsljxhac.supabase.co/storage/v1/object/public/uploads/hero/4f93381e-063b-4626-b230-64d65167c2ce.jpg',
    title: 'Secure your account',
    text: 'A 6-digit passcode keeps your account and your rewards protected.'
  }
};

let heroBusy = false;
let pendingHero = null;

function buildHero(key) {
  const data = HEROES[key];

  const hero = document.createElement('div');
  hero.className = 'auth-hero hero-layer';
  hero.dataset.hero = key;
  hero.style.setProperty('--hero-img', `url('${data.img}')`);

  const caption = document.createElement('div');
  caption.className = 'auth-hero-caption';

  const title = document.createElement('h2');
  title.textContent = data.title;

  const text = document.createElement('p');
  text.textContent = data.text;

  caption.appendChild(title);
  caption.appendChild(text);
  hero.appendChild(caption);

  return hero;
}

function swapHero(key) {
  const side = document.querySelector('.auth-right');
  if (!side || !HEROES[key]) return;

  if (heroBusy) {
    pendingHero = key;
    return;
  }

  const current = side.querySelector('.auth-hero');
  const currentKey = (current && current.dataset.hero) || 'default';
  if (key === currentKey) return;

  heroBusy = true;

  const run = () => {
    const next = buildHero(key);

    if (!current) {
      side.appendChild(next);
      heroBusy = false;
      return;
    }

    current.classList.add('hero-layer', 'hero-exit');
    next.classList.add('hero-enter');
    side.appendChild(next);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      current.remove();
      next.classList.remove('hero-enter');
      heroBusy = false;

      if (pendingHero && pendingHero !== key) {
        const queued = pendingHero;
        pendingHero = null;
        swapHero(queued);
      } else {
        pendingHero = null;
      }
    };

    next.addEventListener('animationend', (e) => {
      if (e.target === next) finish();
    });
    setTimeout(finish, 1200);
  };

  const preload = new Image();
  preload.onload = run;
  preload.onerror = run;
  preload.src = HEROES[key].img;
}

function getCSRFToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

let __CURRENT_AUTH_PATH__ = null;
let isLoadingAuth = false;

async function loadAuth(path, push = true) {
  if (isLoadingAuth) return;
  isLoadingAuth = true;

  try {
    const res = await fetch(path, {
      headers: { "X-Partial": "1" }
    });

    if (!res.ok) {
      document.getElementById("auth-content").innerHTML = "Something went wrong. Please refresh.";
      return;
    }

    const html = await res.text();
    document.getElementById("auth-content").innerHTML = html;

    if (push && window.location.pathname !== path) {
      history.pushState({ path }, "", path);
    }

    CalledIniter();
    initViewSwitcher();
    CloseBackfromemail();
    updateTopButton(path);
  } finally {
    isLoadingAuth = false;
  }
}

function updateTopButton(path) {
  const btn = document.querySelector(".top-right a");
  if (!btn) return;

  stopNudge();

  if (path === "/login") {
    btn.textContent = "Create Account";
    document.title = "Log In";
    btn.dataset.path = "/create-account";
    btn.href = "/create-account";
  } else if (path === "/create-account") {
    btn.textContent = "Log In";
    document.title = "Create Account";
    btn.dataset.path = "/login";
    btn.href = "/login";
  }
}

function nudgeTopButton() {
  const btn = document.querySelector(".top-right a");
  if (!btn) return;

  btn.classList.remove("nudge");
  void btn.offsetWidth;
  btn.classList.add("nudge");

  btn.addEventListener("animationend", function handler(e) {
    if (e.animationName === "nudgeBounce") {
      btn.classList.remove("nudge");
      btn.removeEventListener("animationend", handler);
    }
  });
}

function stopNudge() {
  const btn = document.querySelector(".top-right a");
  if (btn) btn.classList.remove("nudge");
}

function clearEmailError() {
  const fieldset = document.getElementById("emailFieldset");
  const legend = document.getElementById("legend");
  const errorMsg = document.querySelector(".inavid-email");

  if (fieldset) fieldset.classList.remove("error");
  if (legend) legend.classList.remove("error-legend");
  if (errorMsg) errorMsg.textContent = "";
}

document.addEventListener("click", function (e) {
  if (e.target.closest("#loginBtn")) return;
  clearEmailError();
});

document.addEventListener("click", async function (e) {
  const link = e.target.closest(".auth-link");
  if (!link) return;

  e.preventDefault();

  const currentInput = document.getElementById("aboutBox");
  const carriedEmail = currentInput ? currentInput.value.trim().toLowerCase() : "";

  await loadAuth(link.dataset.path);

  if (carriedEmail) {
    openEmailView();

    const input = document.getElementById("aboutBox");
    if (input) {
      input.value = carriedEmail;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }
});

window.addEventListener("popstate", function () {
  const path = window.location.pathname;
  loadAuth(path, false);
});

function openEmailView() {
  clearEmailError();

  const socialView = document.getElementById("social-view");
  const emailView = document.getElementById("email-view");
  const backFromEmail = document.getElementById("backFromEmail");
  const logoLink = document.getElementById("logo-link");

  if (!socialView || !emailView) return;

  socialView.style.display = "none";
  emailView.style.display = "block";

  if (logoLink) logoLink.classList.add("hiding");
  if (backFromEmail) backFromEmail.classList.add("showing");
}

function closeEmailView() {
  clearEmailError();

  const socialView = document.getElementById("social-view");
  const emailView = document.getElementById("email-view");
  const backFromEmail = document.getElementById("backFromEmail");
  const logoLink = document.getElementById("logo-link");

  if (!socialView || !emailView) return;

  emailView.style.display = "none";
  socialView.style.display = "block";

  if (backFromEmail) backFromEmail.classList.remove("showing");
  if (logoLink) logoLink.classList.remove("hiding");
}

function initViewSwitcher() {
  if (!socialView || !emailView) return;
}

function CloseBackfromemail() {
  clearEmailError();

  const socialView = document.getElementById("social-view");
  const emailView = document.getElementById("email-view");
  const backFromEmail = document.getElementById("backFromEmail");
  const logoLink = document.getElementById("logo-link");

  if (backFromEmail) backFromEmail.classList.remove("showing");
  if (logoLink) logoLink.classList.remove("hiding");

  if (!socialView || !emailView) return;

  emailView.style.display = "none";
  socialView.style.display = "block";
}

const IsloadingInit = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"></stop><stop offset=".2" stop-color="currentColor" stop-opacity=".3"></stop><stop offset=".4" stop-color="currentColor" stop-opacity=".6"></stop><stop offset=".7" stop-color="currentColor" stop-opacity=".9"></stop><stop offset="1" stop-color="currentColor"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
`;

function CalledIniter() {
  const emailInput = document.getElementById("aboutBox");
  const fieldset = document.getElementById("emailFieldset");
  const legend = document.getElementById("legend");
  const errorMsg = document.querySelector(".inavid-email");
  const loginBtn = document.getElementById("loginBtn");

  if (!emailInput || !loginBtn) return;

  function showEmailError(data) {
    fieldset.classList.add("error");
    legend.classList.add("error-legend");

    if (data.error === "no_account") {
      errorMsg.textContent = "No account found with this email. Tap Create Account above to sign up with it.";
      nudgeTopButton();
    } else {
      errorMsg.textContent = data.message || "Something went wrong.";
    }
  }

  emailInput.addEventListener("input", () => {
    const email = emailInput.value.trim().toLowerCase();

    const flashContainer = document.querySelector(".flash-container");
    if (flashContainer) {
      flashContainer.style.display = "none";
    }

    fieldset.classList.remove("error");
    legend.classList.remove("error-legend");
    errorMsg.textContent = "";
    stopNudge();

    if (email && EMAIL_REGEX.test(email)) {
      loginBtn.classList.add("valid-email");
    } else {
      loginBtn.classList.remove("valid-email");
    }
  });

  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim().toLowerCase();
    const originalText = loginBtn.innerHTML;

    if (!email) {
      fieldset.classList.add("error");
      legend.classList.add("error-legend");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      fieldset.classList.add("error");
      legend.classList.add("error-legend");
      errorMsg.textContent = "Please enter a valid email address";
      return;
    }

    const mode = window.location.pathname.startsWith("/create-account") ? "signup" : "login";

    loginBtn.disabled = true;
    loginBtn.innerHTML = IsloadingInit;

    const nextValue = document.querySelector('input[name="next"]').value;

    try {
      const response = await fetch("/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": getCSRFToken(),
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({ box: email, next: nextValue, mode })
      });

      if (!response.ok) {
        let data = {};
        try { data = await response.json(); } catch (_) {}

        if (data.error) {
          showEmailError(data);
          loginBtn.disabled = false;
          loginBtn.innerHTML = originalText;
          return;
        }
        throw new Error("Server error");
      }

      const html = await response.text();

      const container = document.getElementById("innerconntect");
      container.innerHTML = html;
      runPageScript();
    } catch (err) {
      console.error("Error sending email:", err);

      loginBtn.disabled = false;
      loginBtn.innerHTML = originalText;

      errorMsg.textContent = "Something went wrong. Check your connection.";
    }
  });

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loginBtn.click();
    }
  });

  (async () => {
    if (localStorage.getItem("tzSet")) return;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (!tz) return;

      const res = await fetch("/set_timezone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken()
        },
        body: JSON.stringify({ tz })
      });

      if (res.ok) {
        localStorage.setItem("tzSet", "1");
      }
    } catch (err) {
      console.error("Timezone setup failed:", err);
    }
  })();
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

async function runPageScript() {
  if (document.querySelector("#loginBtn")) {
    await loadScript("/static/login.js");
    CalledIniter();
  }

  if (document.querySelector(".code-input")) {
    document.title = "OTP Verification";
    await loadScript("/static/4_digit.js");
    CalledIniter4_digit();
  }

  if (document.querySelector("#username-error")) {
    document.title = "Create Username";
    await loadScript("/static/pickUsername.js");
    pickUsername();
  }

  if (document.querySelector("#card")) {
    document.title = "Set Passcode";
    await loadScript("/static/createpasscode.js");
  }

  swapHero(document.querySelector("#card") ? "secure" : "default");
}

function callSpaceflash() {
  const flash = document.querySelector(".flash");
  if (!flash) return;

  const isNoAccount = flash.classList.contains("no_account");

  setTimeout(() => {
    flash.classList.add("show");
  }, 50);

  if (isNoAccount) {
    setTimeout(nudgeTopButton, 500);
  }

  setTimeout(() => {
    hideFlash(flash);
  }, isNoAccount ? 8000 : 4000);
}

function closeFlash(el) {
  const flash = el.closest(".flash");
  hideFlash(flash);
}

function hideFlash(flash) {
  if (!flash) return;

  flash.classList.remove("show");
  flash.classList.add("hide");

  setTimeout(() => {
    const container = flash.closest(".flash-container");
    if (container) container.remove();
  }, 300);
}

CalledIniter();
initViewSwitcher();
callSpaceflash();