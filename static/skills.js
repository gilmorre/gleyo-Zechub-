(function () {
  const SK_CHIP_SELECTOR = '.sk-chip, [data-skill]';
  const SK_GO_NEXT_DELAY = 1500;  

  function skCsrf() {
    if (typeof window.getCSRFToken === 'function') return window.getCSRFToken();
    const m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
  }

  function skEl() {
    for (let i = 0; i < arguments.length; i++) {
      const el = document.getElementById(arguments[i]);
      if (el) return el;
    }
    return null;
  }

  function skRoot() {
    return document.getElementById('skillsRoot');
  }

  function skChips() {
    return Array.from(document.querySelectorAll(SK_CHIP_SELECTOR));
  }

  function skMax() {
    const root = skRoot();
    return (root && parseInt(root.dataset.max, 10)) || 5;
  }

  function skSelected() {
    return skChips()
      .filter((c) => c.getAttribute('aria-pressed') === 'true')
      .map((c) => c.dataset.skill);
  }

  function skSetMsg(text, type) {
    const msg = skEl('skMsg', 'msg');
    if (!msg) return;

    msg.textContent = text || '';
    msg.className = 'sk-msg' + (type ? ' ' + type : '');

    // Inline colour, so it works even if the stylesheet rule is missing or overridden
    if (type === 'success') {
      msg.style.setProperty('color', '#4ade80', 'important');
    } else if (type === 'error') {
      msg.style.setProperty('color', '#ff5a6e', 'important');
    } else {
      msg.style.removeProperty('color');
    }
  }

  function skRefresh() {
    const countEl = skEl('skCount', 'count');
    const saveBtn = skEl('skSaveBtn', 'saveBtn');
    const max = skMax();
    const n = skSelected().length;

    if (countEl) countEl.textContent = n + ' / ' + max;
    if (saveBtn && !saveBtn.dataset.saving) saveBtn.disabled = n === 0;

    skChips().forEach((c) => {
      c.disabled = n >= max && c.getAttribute('aria-pressed') !== 'true';
    });
  }

  function skGoNext() {
    const root = skRoot();
    const next = window.__NEXT_URL__ || (root && root.dataset.next) || '/settings/general';
    window.location.href = next;
  }

  async function skSave() {
    const root = skRoot();
    const saveBtn = skEl('skSaveBtn', 'saveBtn');
    const skipBtn = skEl('skSkipBtn', 'skipBtn');
    const notify = skEl('skNotify', 'notify');
    if (!saveBtn || saveBtn.disabled) return;

    const url = (root && root.dataset.saveUrl) || '/skills';

    saveBtn.disabled = true;
    saveBtn.dataset.saving = '1';
    saveBtn.textContent = 'Saving...';
    skSetMsg('');

    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': skCsrf()
        },
        body: JSON.stringify({
          skills: skSelected(),
          notify: !!(notify && notify.checked)
        })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        saveBtn.textContent = 'Saved';
        skSetMsg('Saved. Thank you!', 'success');
        if (skipBtn) skipBtn.disabled = true;
        setTimeout(skGoNext, SK_GO_NEXT_DELAY);
        return;
      }

      skSetMsg((data && data.error) || 'Could not save. Please try again.', 'error');
    } catch (err) {
      console.error('save skills failed:', err);
      skSetMsg('Something went wrong. Please try again.', 'error');
    }

    delete saveBtn.dataset.saving;
    saveBtn.textContent = 'Save';
    skRefresh();
  }

  // Click handlers are attached ONCE to the document (event delegation), so they
  // keep working when the skills HTML is injected later. The flag stops double binding.
  if (!window.__skClickBound) {
    window.__skClickBound = true;

    document.addEventListener('click', function (e) {
      const chip = e.target.closest(SK_CHIP_SELECTOR);
      if (chip) {
        if (chip.disabled) return;
        const on = chip.getAttribute('aria-pressed') === 'true';
        if (!on && skSelected().length >= skMax()) {
          skSetMsg('You can pick up to ' + skMax() + ' skills.', 'error');
          return;
        }
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
        skSetMsg('');
        skRefresh();
        return;
      }

      if (e.target.closest('#skSkipBtn, #skipBtn')) {
        skGoNext();
        return;
      }

      if (e.target.closest('#skSaveBtn, #saveBtn')) {
        skSave();
      }
    });
  }

  // Called after the skills HTML is on the page
  window.initSkills = function () {
    skRefresh();
  };
})();