(function () {

const CONNECT_ENDPOINT = '/api/wallet/zec/connect';
const WALLET_GUIDE_URL = 'https://gleyo.app/wallet-guide';

let _userAddress = null;
let _walletName = 'Zodl'; // 🔒 Zodl-only for now — see note at bottom of file

function inject() {
  if (document.getElementById('zec-modal-overlay')) return;

  const CSS = `
  #zec-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: none;
    align-items: flex-end;
    justify-content: center;
  }
  #zec-modal-overlay.zec-open {
    display: flex;
  }
  @media (min-width: 600px) {
    #zec-modal-overlay {
      align-items: center;
    }
  }
  #zec-sheet {
    background: #08080e;
    border: 0.9px solid #2f2f4aec;
    width: 100%;
    max-width: 440px;
    border-radius: 22px 22px 0 0;
    max-height: 88dvh;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    transform: translateY(100%);
    transition: transform .38s cubic-bezier(.32,.72,0,1);
    scrollbar-width: none;
  }
  #zec-sheet::-webkit-scrollbar {
    display: none;
  }
  @media (min-width: 600px) {
    #zec-sheet {
      border-radius: 22px;
      height: auto;
      max-height: 84vh;
      overflow-y: auto;
      transform: none;
      animation: zecFadeIn .22s ease;
    }
  }
  @keyframes zecFadeIn {
    from { opacity: 0; transform: scale(.97); }
    to { opacity: 1; transform: scale(1); }
  }
  #zec-modal-overlay.zec-open #zec-sheet {
    transform: translateY(0);
  }
  .zec-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,.1);
    margin: 14px auto 0;
    flex-shrink: 0;
  }
  @media (min-width: 600px) {
    .zec-handle { display: none; }
  }
  .zec-head {
    padding: 18px 20px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .zec-head h2 {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -.01em;
    color: #eeeef5;
    margin: 0;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-close {
    width: 28px;
    height: 28px;
    padding: 0;
    flex: none;
    border-radius: 50%;
    border: 0.9px solid #2f2f4a;
    background: #2a2a449c;
    color: #8888aa;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .15s, color .15s;
    appearance: none;
    -webkit-appearance: none;
  }
  .zec-close:hover {
    background: #222230;
    color: #eeeef5;
  }
  .zec-sub {
    padding: 3px 20px 14px;
    font-size: 12px;
    color: #5a5a78;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-err {
    margin: 0 14px 10px;
    background: rgba(239,68,68,.1);
    border: 1px solid rgba(239,68,68,.2);
    border-radius: 9px;
    padding: 9px 12px;
    font-size: 12px;
    color: #fca5a5;
    display: none;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-err.zec-err-show { display: block; }
  .zec-view { display: none; }
  .zec-view.zec-active { display: block; }
  .zec-flex-view { display: none; }
  .zec-flex-view.zec-active {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .zec-addr-wrap { padding: 0 14px 6px; }
  .zec-addr-label {
    font-size: 11px;
    font-weight: 600;
    color: #5a5a78;
    text-transform: uppercase;
    letter-spacing: .06em;
    display: block;
    margin-bottom: 7px;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-addr-input {
    width: 100%;
    box-sizing: border-box;
    background: #111122;
    border: 1px solid #2f2f4a;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 11.5px;
    font-family: 'Courier New', monospace;
    color: #eeeef5;
    outline: none;
    transition: border-color .15s;
  }
  .zec-addr-input:focus { border-color: rgba(244,183,40,.5); }
  .zec-addr-input::placeholder {
    color: #5a5a78;
    font-family: 'DM Sans', sans-serif;
    font-size: 11.5px;
  }
  .zec-addr-err {
    font-size: 11px;
    color: #fca5a5;
    margin-top: 5px;
    min-height: 14px;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-addr-ok {
    font-size: 11px;
    color: #2ecc71;
    margin-top: 5px;
    min-height: 14px;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-guide-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: #F4B728;
    text-decoration: none;
    margin: 8px 0 4px;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-guide-link:hover { text-decoration: underline; }
  .zec-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin: 14px 14px 18px;
    padding: 10px 12px;
    background: rgba(244,183,40,.05);
    border: 1px solid rgba(244,183,40,.15);
    border-radius: 10px;
    font-size: 11.5px;
    color: #8888aa;
    line-height: 1.55;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-note svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: #c89a20;
  }
  .zec-connect-submit {
    display: block;
    width: calc(100% - 28px);
    margin: 4px 14px 20px;
    padding: 13px;
    border-radius: 13px;
    border: none;
    background: linear-gradient(135deg, #F4B728, #c9890a);
    color: #0a0500;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: opacity .2s, transform .1s;
  }
  .zec-connect-submit:hover:not(:disabled) { opacity: .9; }
  .zec-connect-submit:active:not(:disabled) { transform: scale(.98); }
  .zec-connect-submit:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
  .zec-conn-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 12px 0 20px;
  }
  @keyframes zring { to { transform: rotate(360deg); } }
  .zec-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #F4B728;
    border-right-color: rgba(244,183,40,.3);
    animation: zring 1.1s linear infinite;
  }
  .zec-ring-outer {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: rgba(244,183,40,.18);
    border-left-color: rgba(244,183,40,.28);
    animation: zring 1.9s linear infinite reverse;
  }
  .zec-conn-status {
    font-size: 12.5px;
    color: #8888aa;
    max-width: 240px;
    line-height: 1.6;
    margin-bottom: 18px;
    font-family: 'DM Sans', sans-serif;
    text-align: center;
  }
  .zec-cancel {
    font-size: 12px;
    color: #5a5a78;
    cursor: pointer;
    text-decoration: underline;
    font-family: 'DM Sans', sans-serif;
    background: none;
    border: none;
    padding: 0;
  }
  .zec-cancel:hover { color: #8888aa; }
  .zec-done-wrap {
    padding: 48px 24px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }
  .zec-done-icon { font-size: 44px; }
  .zec-done-title {
    font-size: 16px;
    font-weight: 700;
    color: #22c55e;
    font-family: 'DM Sans', sans-serif;
  }
  .zec-done-sub {
    font-size: 12px;
    color: #8888aa;
    font-family: 'DM Sans', sans-serif;
  }
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'zec-modal-overlay';
  overlay.innerHTML = `
<div id="zec-sheet">
  <div class="zec-handle"></div>

  <!-- INPUT VIEW -->
  <div id="zec-view-list" class="zec-view zec-active">
    <div class="zec-err" id="zec-err-bar"></div>
    <div class="zec-head">
      <h2>Connect ZEC Wallet</h2>
      <button class="zec-close" id="zec-close-btn">&#215;</button>
    </div>
    <div class="zec-sub">Native Zcash · shielded privacy</div>

    <div class="zec-addr-wrap">
      <label class="zec-addr-label">Your Shielded Zcash Address</label>
      <input
        class="zec-addr-input"
        id="zec-user-address"
        type="text"
        placeholder="u1..."
        autocomplete="off"
        spellcheck="false"
      />
      <div class="zec-addr-err" id="zec-addr-err"></div>
      <div class="zec-addr-ok" id="zec-addr-ok"></div>
      <a class="zec-guide-link" href="${WALLET_GUIDE_URL}" target="_blank" rel="noopener">
        Don't have a wallet? Get one with Zodl →
      </a>
    </div>

    <div class="zec-note">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.1"/><path d="M6 4v3M6 7.5v.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
      Paste your shielded (u1...) address above. This is where your ZEC rewards will be sent.
    </div>

    <button class="zec-connect-submit" id="zec-connect-submit-btn">Connect</button>
  </div>

  <!-- CONNECTING VIEW -->
  <div id="zec-view-connecting" class="zec-flex-view" style="padding:44px 24px 36px;gap:0;text-align:center">
    <div class="zec-conn-wrap">
      <div class="zec-ring-outer"></div>
      <div class="zec-ring"></div>
    </div>
    <div class="zec-conn-status" id="zec-conn-status">Validating address…</div>
    <button class="zec-cancel" id="zec-cancel-btn">Cancel</button>
  </div>

  <!-- DONE VIEW -->
  <div id="zec-view-done" class="zec-view">
    <div class="zec-done-wrap">
      <div class="zec-done-icon">⚡</div>
      <div class="zec-done-title">Wallet Connected!</div>
      <div class="zec-done-sub" id="zec-done-sub">Wallet connected successfully.</div>
    </div>
  </div>

</div>`;

  document.body.appendChild(overlay);
  bindEvents();
}

function bindEvents() {
  document.getElementById('zec-close-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-cancel-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeZecModal();
  });

  document.getElementById('zec-connect-submit-btn').addEventListener('click', submitConnect);

  let _addrDebounce = null;
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'zec-user-address') return;
    clearTimeout(_addrDebounce);
    const errEl = document.getElementById('zec-addr-err');
    const okEl = document.getElementById('zec-addr-ok');
    const val = e.target.value.trim();

    if (!val) { errEl.textContent = ''; okEl.textContent = ''; return; }

    if (!val.startsWith('u1')) {
      errEl.textContent = 'Must start with u1 (Unified)';
      okEl.textContent = '';
      return;
    }

    errEl.textContent = '';
    okEl.textContent = '';

    _addrDebounce = setTimeout(async () => {
      try {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const res = await fetch('/api/wallet/zec/validate-address', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
          body: JSON.stringify({ address: val })
        });
        const data = await res.json();
        if (data.valid) {
          okEl.textContent = '✓ Valid shielded address';
          errEl.textContent = '';
        } else {
          errEl.textContent = data.error || 'Invalid address';
          okEl.textContent = '';
        }
      } catch (_) {}
    }, 500);
  });

  const sheet = document.getElementById('zec-sheet');
  let startY = 0, currentY = 0, isDragging = false;
  sheet.addEventListener('touchstart', e => {
    if (!e.target.closest('.zec-handle,.zec-head')) return;
    startY = e.touches[0].clientY; isDragging = true; sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    let d = currentY - startY; if (d < 0) d = 0;
    e.preventDefault(); sheet.style.transform = `translateY(${d}px)`;
  }, { passive: false });
  sheet.addEventListener('touchend', () => {
    if (!isDragging) return; isDragging = false;
    sheet.style.transition = 'transform .38s cubic-bezier(.32,.72,0,1)';
    if (currentY - startY > 110) { closeZecModal(); sheet.style.transform = ''; }
    else sheet.style.transform = 'translateY(0)';
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeZecModal(); });
}

async function submitConnect() {
  const addrInput = document.getElementById('zec-user-address');
  const addrErr = document.getElementById('zec-addr-err');
  const userAddress = addrInput ? addrInput.value.trim() : '';

  if (!userAddress) {
    if (addrErr) addrErr.textContent = 'Please enter your shielded Zcash address first.';
    addrInput && addrInput.focus();
    return;
  }

  if (!userAddress.startsWith('u1')) {
    if (addrErr) addrErr.textContent = 'Must start with u1 (Unified)';
    addrInput && addrInput.focus();
    return;
  }

  document.getElementById('zec-conn-status').textContent = 'Validating and connecting…';
  showView('zec-view-connecting');

  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const res = await fetch(CONNECT_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
      body: JSON.stringify({ address: userAddress, wallet: _walletName })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showView('zec-view-list');
      if (addrErr) addrErr.textContent = data.error || 'Could not connect wallet.';
      return;
    }

    _userAddress = data.wallet.address;
    onConnected(data.wallet);

  } catch (err) {
    showView('zec-view-list');
    showErr('Network error. Please try again.');
  }
}

// ── Confirmed — update UI in place ───────────────────

function onConnected(wallet) {
  document.getElementById('zec-done-sub').textContent = 'Wallet connected successfully.';
  showView('zec-view-done');

  setTimeout(() => {
    closeZecModal();

    const stateNc = document.getElementById('zec-state-nc');
    const stateC  = document.getElementById('zec-state-c');
    if (stateNc) stateNc.classList.remove('active');
    if (stateC)  stateC.classList.add('active');

    const walletLbl = document.getElementById('zec-wallet-lbl');
    if (walletLbl) walletLbl.textContent = wallet.wallet_name || '—';

    const addrEl = document.getElementById('zec-addr');
    if (addrEl && wallet.address) {
      addrEl.textContent = `${wallet.address.slice(0, 8)}…${wallet.address.slice(-6)}`;
    }

    // 🔥 no proof-of-ownership step anymore — reflect that honestly in the UI
    const sigStatus = document.getElementById('zec-sig-status');
    if (sigStatus) {
      sigStatus.style.color = 'var(--muted)';
      sigStatus.innerHTML = 'Not verified';
    }

    window.dispatchEvent(new CustomEvent('zecWalletConnected', {
      detail: { address: wallet.address, walletName: wallet.wallet_name }
    }));

  }, 1400);
}

// ── Helpers ──────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('#zec-sheet .zec-view, #zec-sheet .zec-flex-view').forEach(v => {
    v.classList.remove('zec-active');
  });
  document.getElementById(id).classList.add('zec-active');
}

function showErr(msg) {
  const b = document.getElementById('zec-err-bar');
  b.textContent = msg;
  b.classList.add('zec-err-show');
  setTimeout(() => b.classList.remove('zec-err-show'), 6000);
}

function openZecModal() {
  inject();
  document.getElementById('zec-err-bar').classList.remove('zec-err-show');
  showView('zec-view-list');
  const input = document.getElementById('zec-user-address');
  if (input) { input.value = ''; }
  document.getElementById('zec-addr-err').textContent = '';
  document.getElementById('zec-addr-ok').textContent = '';
  document.getElementById('zec-modal-overlay').classList.add('zec-open');
  document.documentElement.style.overflow = 'hidden';
}

function closeZecModal() {
  const overlay = document.getElementById('zec-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('zec-open');
  document.documentElement.style.overflow = '';
}

window.openZecModal = openZecModal;
window.closeZecModal = closeZecModal;

})();

/*
NOTE — Zodl-only for now (per partnership discussion):
_walletName is hardcoded above instead of shown as a picker, since the
wallet-selection list (ZODL / Zkool / Zingo) is no longer needed while
you're only onboarding people through Zodl. If that changes later (multi-wallet
support), swap _walletName back to a UI picker and pass whichever the user
selects instead of the hardcoded default.
*/