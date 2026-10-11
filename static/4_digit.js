function CalledIniter4_digit() {

  /* ----------------------- ICONS ----------------------- */

  // clock
  const WaitSvg = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 7v5l3 2"></path>
    </svg>
  `;

  // check
  const NewCodeSvgSent = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12.5l4.5 4.5L19 7.5"></path>
    </svg>
  `;

  const IsloadingInit = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"></stop><stop offset=".2" stop-color="currentColor" stop-opacity=".3"></stop><stop offset=".4" stop-color="currentColor" stop-opacity=".6"></stop><stop offset=".7" stop-color="currentColor" stop-opacity=".9"></stop><stop offset="1" stop-color="currentColor"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
  `;

  const inputs = document.querySelectorAll('.code-input');
  const form = document.querySelector('form');
  const resendBtn = document.getElementById("resendBtn");
  const resendStatus = document.getElementById("resendStatus");
  const errorMsg = document.querySelector('p[style*="color:red"]');

  const RESEND_LABEL = "Resend";

  let reflowTimer = null;
  let statusTimer = null;
  let isResending = false;
  let waitUntil = 0; // timestamp (ms) until which resend is on cooldown

  /* ----------------------- iOS SMART REFLOW ----------------------- */

  function forceReflow() {
    window.scrollTo(0, window.scrollY + 1);
    window.scrollTo(0, window.scrollY - 1);
    document.body.style.minHeight = window.innerHeight + "px";
  }

  function handleFocusOut(e) {
    const el = e.target;

    if (
      el.tagName !== "INPUT" &&
      el.tagName !== "TEXTAREA" &&
      !el.isContentEditable
    ) return;

    clearTimeout(reflowTimer);

    reflowTimer = setTimeout(() => {
      const active = document.activeElement;

      // If focus jumped to another OTP input → DO NOTHING
      if (
        active &&
        (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable)
      ) return;

      // Otherwise keyboard closed → fix layout
      forceReflow();
    }, 120);
  }

  document.addEventListener("focusout", handleFocusOut);

  /* ----------------------- OTP LOGIC ----------------------- */

  function getCode() {
    return Array.from(inputs).map(i => i.value).join("");
  }

  function setErrorState() {
    inputs.forEach(i => i.classList.add("error"));
  }

  function clearErrorState() {
    inputs.forEach(i => i.classList.remove("error"));
  }

  async function verifyCode() {
    const code = getCode();
    if (code.length !== inputs.length) return;

    const res = await fetch("/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({ code })
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    const data = await res.json();

    if (data.error === "wrong") {
      setErrorState();
      setTimeout(() => {
        inputs.forEach(i => i.value = "");
        clearErrorState();
        inputs[0].focus();
      }, 400);
    }

    if (data.error === "expired") {
      setErrorState();
    }
    if (data.hard) {
      window.location.href = data.redirect;
      return;
    }
    if (data.redirect) {
      const response = await fetch(data.redirect, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      const html = await response.text();

      const container = document.getElementById("innerconntect");
      container.innerHTML = html;

      window.history.pushState({}, "", data.redirect);

      await runPageScript();
    }
  }

  inputs.forEach((input, idx) => {

    input.addEventListener("input", () => {

      if (errorMsg) errorMsg.style.display = 'none';
      clearErrorState();

      let value = input.value.replace(/\D/g, "");

      // detect autofill (Android / Gmail / SMS)
      if (idx === 0 && value.length > 1) {
        value.split('').forEach((char, i) => {
          if (i < inputs.length) {
            inputs[i].value = char;
          }
        });

        inputs[Math.min(value.length, inputs.length) - 1].focus();

        if (value.length >= inputs.length) {
          verifyCode();
        }
        return;
      }

      input.value = value;

      // normal typing
      if (value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }

      if (getCode().length === inputs.length) {
        verifyCode();
      }
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (getCode().length === inputs.length) {
          verifyCode();
        }
      }
    });

    input.addEventListener("paste", e => {
      e.preventDefault();

      const paste = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '');

      if (!paste) return;

      paste.split('').forEach((char, i) => {
        if (idx + i < inputs.length) {
          inputs[idx + i].value = char;
        }
      });

      const last = Math.min(idx + paste.length - 1, inputs.length - 1);
      inputs[last].focus();

      if (getCode().length === inputs.length) {
        verifyCode();
      }
    });

  });

  /* ----------------------- RESEND ----------------------- */

  function showStatus(type, message, icon) {
    clearTimeout(statusTimer);

    resendStatus.className = "resend-status show " + type;
    resendStatus.innerHTML = icon + `<span>${message}</span>`;

    statusTimer = setTimeout(() => {
      resendStatus.classList.remove("show");
    }, 3000);
  }

  function setResendLoading(on) {
    isResending = on;
    resendBtn.classList.toggle("loading", on);
    resendBtn.setAttribute("aria-busy", on ? "true" : "false");
    resendBtn.innerHTML = on ? IsloadingInit : RESEND_LABEL;
  }

  async function resendCode(e) {
    e.preventDefault();

    if (isResending) return;

    // Still on cooldown → show wait message instantly, NO spinner, NO request
    const remaining = Math.ceil((waitUntil - Date.now()) / 1000);
    if (remaining > 0) {
      showStatus("wait", `Wait ${remaining}s`, WaitSvg);
      return;
    }

    setResendLoading(true);

    try {
      const res = await fetch("/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        }
      });

      const data = await res.json();

      if (data.status === "wait") {
        const left = Number(data.left) || 0;
        waitUntil = Date.now() + left * 1000;
        showStatus("wait", `Wait ${left}s`, WaitSvg);
      }

      if (data.status === "sent") {
        showStatus("sent", "New code sent", NewCodeSvgSent);
      }
    } catch (err) {
      // network error: just fall through and restore the button
    } finally {
      setResendLoading(false); // back to "Resend" text
    }
  }

  resendBtn.addEventListener("click", resendCode);

  resendBtn.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") resendCode(e);
  });

  inputs[0].focus();
}