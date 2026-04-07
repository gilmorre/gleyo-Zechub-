document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createBtn');
  if (!createBtn) return;               // no button found, nothing to guard

  createBtn.addEventListener('click', e => {
    // helper → first selector that exists wins
    const grab = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return (el.value || '').trim();
      }
      return '';
    };

    /* --------- gather field values (robust to ID changes) --------- */
    const nameVal = grab([
      '#nameInput',           // preferred
      'input[name="name"]',
      '#emailInput',
      'input[type="text"]',
      'input[type="email"]'
    ]);

    const aboutVal = grab([
      '#aboutBox',
      '#description',
      'textarea[name="description"]',
      'textarea'
    ]);

    const chainVal = grab([
      '#blockchainSelect',
      'select[name="blockchain"]',
      'select'
    ]);

    /* --------- build list of missing fields --------- */
    const missing = [];
    if (!nameVal)  missing.push('Name');
    if (!aboutVal) missing.push('About');
    if (!chainVal) missing.push('Blockchain');

    /* --------- block navigation if any missing --------- */
    if (missing.length) {
      e.preventDefault();  // stop the default link / button action
      alert('Please fill in: ' + missing.join(', '));
      return;
    }

  });
});