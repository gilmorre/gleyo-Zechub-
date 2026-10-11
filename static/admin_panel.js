const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");

document.addEventListener("DOMContentLoaded", () => {
  const IsloadingInit = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"></stop><stop offset=".2" stop-color="currentColor" stop-opacity=".3"></stop><stop offset=".4" stop-color="currentColor" stop-opacity=".6"></stop><stop offset=".7" stop-color="currentColor" stop-opacity=".9"></stop><stop offset="1" stop-color="currentColor"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>
  `;

  const form = document.getElementById("setupForm");
  const websiteInput = document.getElementById("website");
  const fieldset = document.getElementById("websiteFieldset");
  const legend = document.getElementById("websiteLegend");
  const urlError = document.getElementById("urlError");
  const nextBtn = document.getElementById("nextBtn");

  if (!form || !websiteInput || !nextBtn) return;

  const startsWithOk = /^(https?:\/\/|www\.)/i;

  function go(url) {
    if (typeof navigateTo === "function") {
      navigateTo(url);
    } else {
      window.location.href = url;
    }
  }

  function showError(message) {
    urlError.textContent = message;
    urlError.classList.add("showed");
    fieldset.classList.add("error");
  }

  function clearError() {
    urlError.textContent = "";
    urlError.classList.remove("showed");
    fieldset.classList.remove("error");
  }

  function checkWebsite(value) {
    if (!value) {
      return { ok: false, message: "Website URL required" };
    }

    if (!startsWithOk.test(value)) {
      return { ok: false, message: 'Website URL must start with "https://" or "www."' };
    }

    try {
      new URL(/^https?:/i.test(value) ? value : "https://" + value);
    } catch {
      return { ok: false, message: "Please enter a valid website address." };
    }

    return { ok: true };
  }

  function resetButton(originalHTML) {
    nextBtn.innerHTML = originalHTML;
    nextBtn.disabled = false;
  }

  websiteInput.addEventListener("input", () => {
    clearError();
    nextBtn.classList.toggle("valid", checkWebsite(websiteInput.value.trim()).ok);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#nextBtn")) return;
    clearError();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const website = websiteInput.value.trim();
    const result = checkWebsite(website);

    if (!result.ok) {
      showError(result.message);
      websiteInput.focus();
      return;
    }

    clearError();

    const originalHTML = nextBtn.innerHTML;
    nextBtn.innerHTML = IsloadingInit;
    nextBtn.disabled = true;

    try {
      const res = await fetch("/api/adminlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ website })
      });

      let data = {};
      try { data = await res.json(); } catch (_) {}

      if (!res.ok || !data.redirect_url) {
        showError(data.error || "Something went wrong");
        resetButton(originalHTML);
        return;
      }

      go(data.redirect_url);
    } catch (err) {
      showError("Network error. Check your connection.");
      resetButton(originalHTML);
    }
  });
});