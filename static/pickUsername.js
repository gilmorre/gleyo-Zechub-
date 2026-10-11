function pickUsername() {
  const input = document.getElementById('username-input');
  const fieldset = document.getElementById('usernameFieldset');
  const errorEl = document.getElementById('username-error');
  const btn = document.getElementById('continueBtn');

  if (!input || !fieldset || !errorEl || !btn) {
    console.error('pickUsername: missing element(s)');
    return;
  }

  const allowedRegex = /^[a-z0-9_]+$/;
  let isSaving = false;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    fieldset.classList.add('error');
    fieldset.classList.remove('valid');
    btn.classList.remove('ready');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    fieldset.classList.remove('error');
  }

  function validate(value, strict) {
    if (value === '') return strict ? 'Username cannot be empty.' : null;
    if (value !== value.toLowerCase()) return 'Username must be all lowercase letters.';
    if (/\s/.test(value)) return 'Username cannot contain spaces.';
    if (!allowedRegex.test(value)) return 'Only letters, numbers and underscores are allowed.';
    if (value.length > 20) return 'Username must be 20 characters or less.';
    if (strict && value.length < 3) return 'Username must be at least 3 characters.';
    return null;
  }

  input.addEventListener('input', () => {
    const value = input.value;
    const msg = validate(value, false);

    if (msg) {
      showError(msg);
      return;
    }

    clearError();

    const ok = validate(value, true) === null;
    btn.classList.toggle('ready', ok);
    fieldset.classList.toggle('valid', ok);
  });

  async function submitUsername() {
    if (isSaving) return;

    const value = input.value.trim();
    const msg = validate(value, true);

    if (msg) {
      showError(msg);
      input.focus();
      return;
    }

    clearError();
    isSaving = true;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await fetch('/api/pick-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ username: value })
      });

      const data = await res.json();

      if (data.error) {
        showError(data.error);
        return;
      }

      if (data.redirect) {
        const response = await fetch(data.redirect, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        const html = await response.text();

        const container = document.getElementById('innerconntect');
        container.innerHTML = html;

        window.history.pushState({}, '', data.redirect);

        await runPageScript();
      }
    } catch (err) {
      console.error('pick-username failed:', err);
      showError('Something went wrong. Please try again.');
    } finally {
      isSaving = false;
      if (document.body.contains(btn)) {
        btn.disabled = false;
        btn.textContent = 'Continue';
      }
    }
  }

  btn.addEventListener('click', submitUsername);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitUsername();
    }
  });

  input.focus();
}


function forceReflow() {
  setTimeout(() => {
    window.scrollTo(0, window.scrollY + 1);
    window.scrollTo(0, window.scrollY - 1);
    document.body.style.minHeight = window.innerHeight + "px";
  }, 50);
}