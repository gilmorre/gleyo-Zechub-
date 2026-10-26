function initSkills() {
  const root = document.getElementById('skillsRoot');
  if (!root) return;

  const onboarding = root.dataset.mode === 'onboarding';
  const MAX = parseInt(root.dataset.max, 10) || 5;
  const SAVE_URL = root.dataset.saveUrl;

  const chips = Array.from(root.querySelectorAll('.skl-chip'));
  const countEl = document.getElementById('skCount');
  const saveBtn = document.getElementById('skSaveBtn');
  const skipBtn = document.getElementById('skSkipBtn'); // only exists in onboarding
  const msg = document.getElementById('skMsg');
  const notify = document.getElementById('skNotify');
  const csrf = document.querySelector('meta[name="csrf-token"]').content;

  function goNext() {
    window.location.href = window.__NEXT_URL__ || root.dataset.next || '/settings/general';
  }

  function selected() {
    return chips
      .filter((c) => c.getAttribute('aria-pressed') === 'true')
      .map((c) => c.dataset.skill);
  }

  function snapshot() {
    return selected().slice().sort().join('|') + '#' + notify.checked;
  }

  let savedState = snapshot();

  function setMsg(text, type) {
    msg.textContent = text || '';
    msg.className = 'skl-msg' + (type ? ' ' + type : '');
  }

  function refresh() {
    const n = selected().length;
    countEl.textContent = n + ' / ' + MAX;

    // onboarding: need at least one skill. settings: only enable when something changed
    saveBtn.disabled = onboarding ? n === 0 : snapshot() === savedState;

    const full = n >= MAX;
    chips.forEach((c) => {
      c.disabled = full && c.getAttribute('aria-pressed') !== 'true';
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') === 'true';
      if (!on && selected().length >= MAX) {
        setMsg('You can pick up to ' + MAX + ' skills.', 'error');
        return;
      }
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      setMsg('');
      refresh();
    });
  });

  notify.addEventListener('change', () => {
    setMsg('');
    refresh();
  });

  if (skipBtn) skipBtn.addEventListener('click', goNext);

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    setMsg('');

    try {
      const res = await fetch(SAVE_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
        },
        body: JSON.stringify({ skills: selected(), notify: notify.checked })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        if (onboarding) {
          setMsg('Saved. Thank you!', 'success');
          if (skipBtn) skipBtn.disabled = true;
          setTimeout(goNext, 700);
          return; // keep button disabled while we redirect
        }

        savedState = snapshot();
        if (typeof showSuccess === 'function') showSuccess('Skills saved');
        else setMsg('Saved.', 'success');
      } else {
        setMsg((data && data.error) || 'Could not save. Please try again.', 'error');
      }
    } catch (err) {
      console.error('save skills failed:', err);
      setMsg('Something went wrong. Please try again.', 'error');
    }

    saveBtn.textContent = 'Save';
    refresh();
  });

  refresh();
}

window.initSkills = initSkills;