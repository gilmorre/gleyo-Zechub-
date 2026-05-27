(function () {

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_LOGIN_FLOW =
  window.location.pathname.includes('/login');

const SESSION_ENDPOINT = IS_LOGIN_FLOW
  ? '/api/zec/login/session'
  : '/api/zec/session';

const POLL_ENDPOINT = IS_LOGIN_FLOW
  ? '/api/zec/login/poll'
  : '/api/zec/poll';


const WALLETS = [
  {
    key: 'ywallet',
    name: 'YWallet',
    desc: 'Privacy wallet · iOS & Android',
    tag: 'RECOMMENDED',
    bg: '#1a0e00',
    icon: `<img src="https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/9d/85/40/9d85403d-1731-6de2-5b70-22c436339e8f/Placeholder.mill/400x400bb-75.webp" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0">`
  },
  {
    key: 'zingo',
    name: 'Zingo!',
    desc: 'Open-source · iOS & Android',
    tag: null,
    bg: '#0a0a0a',
    icon: `<img src="https://global.discourse-cdn.com/zcash/original/3X/6/6/66c4ea553cb3b8347d8b4781a2ab0bd657f0fa6e.png" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0">`
  },
  {
    key: 'zecwallet',
    name: 'ZecWallet Lite',
    desc: 'iOS, Android & Desktop',
    tag: null,
    bg: '#0d0d1a',
    icon: `<img src="https://play-lh.googleusercontent.com/0tPoGDUdDKVQ-T4bpx9vo4X72827KtZySJdVmbbyaGu6CMG9v_7RgRTocvPHJAxdGuH3tLB07RPEd5eVUkUR=w480-h960" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0">`
  }
];

// All three wallets use the standard zcash: URI scheme (ZIP-321).
// None of them register a unique custom scheme, so we cannot force the OS
// to route to a specific app. The zcash: URI will open whichever app the
// device has set as its default handler. The instruction text below the
// button tells the user to open their chosen wallet manually if needed.
function buildZecUri(addr, memoBase64) {
  return `zcash:${addr}?amount=0.00001&memo=${memoBase64}`;
}

let _pollTimer = null;
let _currentSessionId = null;

function inject() {
  if (document.getElementById('zec-modal-overlay')) return;

  const CSS = `
#zec-modal-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:flex-end;justify-content:center}
#zec-modal-overlay.zec-open{display:flex}
@media(min-width:600px){#zec-modal-overlay{align-items:center}}
#zec-sheet{background:#08080e;border:0.9px solid #2f2f4aec;width:100%;max-width:440px;border-radius:22px 22px 0 0;max-height:92vh;overflow-y:auto;transform:translateY(100%);transition:transform .38s cubic-bezier(.32,.72,0,1)}
@media(min-width:600px){#zec-sheet{border-radius:22px;max-height:90vh;transform:none;animation:zecFadeIn .22s ease}}
@keyframes zecFadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
#zec-modal-overlay.zec-open #zec-sheet{transform:translateY(0)}
.zec-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.1);margin:14px auto 0}
@media(min-width:600px){.zec-handle{display:none}}
.zec-head{padding:18px 20px 0;display:flex;justify-content:space-between;align-items:center}
.zec-head h2{font-size:15px;font-weight:700;letter-spacing:-.01em;color:#eeeef5;margin:0;font-family:'DM Sans',sans-serif}
.zec-close{
  width:28px;
  min-width:28px;
  max-width:28px;

  height:28px;
  min-height:28px;
  max-height:28px;

  padding:0;
  flex:none;

  border-radius:50%;
  border:0.9px solid #2f2f4a;

  background:#2a2a449c;
  color:#8888aa;

  font-size:18px;
  line-height:1;

  cursor:pointer;

  display:flex;
  align-items:center;
  justify-content:center;

  transition:.15s;

  appearance:none;
  -webkit-appearance:none;
}


.zec-close:hover{background:#222230;color:#eeeef5}
.zec-sub{padding:3px 20px 14px;font-size:12px;color:#5a5a78;font-family:'DM Sans',sans-serif}
.zec-err{margin:0 14px 10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:9px;padding:9px 12px;font-size:12px;color:#fca5a5;display:none;font-family:'DM Sans',sans-serif}
.zec-err.zec-err-show{display:block}
.zec-view{display:none}
.zec-view.zec-active{display:block}
.zec-flex-view{display:none!important}
.zec-flex-view.zec-active{display:flex!important;flex-direction:column;align-items:center}
.zec-list{padding:0 12px 20px;display:flex;flex-direction:column;gap:5px}
.zec-item{display:flex;align-items:center;gap:13px;padding:12px;border-radius:14px;border:1px solid transparent;cursor:pointer;transition:background .12s,border-color .12s,transform .1s}
.zec-item:hover{background:#2a2a449c;border-color:#2f2f4a}
.zec-item:active{transform:scale(.98)}
.zec-icon{width:44px;height:44px;border-radius:12px;flex-shrink:0;overflow:hidden;border:1px solid #2f2f4a;padding:0!important}
.zec-icon img{width:100%;height:100%;object-fit:cover;display:block;border-radius:0}
.zec-info{flex:1}
.zec-name{font-size:13px;font-weight:600;color:#eeeef5;margin-bottom:2px;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px}
.zec-desc{font-size:11.5px;color:#8888aa;font-family:'DM Sans',sans-serif}
.zec-tag{font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600;background:rgba(244,183,40,.15);color:#f4b728;border:1px solid rgba(244,183,40,.25);letter-spacing:.03em}
.zec-arrow{color:#5a5a78;font-size:16px;flex-shrink:0}
.zec-note{display:flex;align-items:flex-start;gap:7px;margin:0 14px 18px;padding:10px 12px;background:rgba(244,183,40,.05);border:1px solid rgba(244,183,40,.15);border-radius:10px;font-size:11.5px;color:#8888aa;line-height:1.55;font-family:'DM Sans',sans-serif}
.zec-note svg{flex-shrink:0;margin-top:1px;color:#c89a20}
.zec-conn-wrap{position:relative;width:88px;height:88px;display:flex;align-items:center;justify-content:center;margin-bottom:22px}
@keyframes zring{to{transform:rotate(360deg)}}
.zec-ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#F4B728;border-right-color:rgba(244,183,40,.3);animation:zring 1.1s linear infinite}
.zec-ring::after{content:"";position:absolute;top:1px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:#F4B728}
.zec-ring-outer{position:absolute;inset:-8px;border-radius:50%;border:1.5px solid transparent;border-top-color:rgba(244,183,40,.18);border-left-color:rgba(244,183,40,.28);animation:zring 1.9s linear infinite reverse}
.zec-logo-bg{width:64px;height:64px;border-radius:16px;border:1px solid #2f2f4aec;overflow:hidden;z-index:1;position:relative;padding:0!important}
.zec-logo-bg img{width:100%;height:100%;object-fit:cover;display:block;border-radius:0}
.zec-conn-name{font-size:15px;font-weight:700;color:#eeeef5;margin-bottom:6px;font-family:'DM Sans',sans-serif}
.zec-conn-status{font-size:12px;color:#8888aa;max-width:240px;line-height:1.6;margin-bottom:18px;font-family:'DM Sans',sans-serif;text-align:center}
.zec-cancel{font-size:12px;color:#5a5a78;cursor:pointer;text-decoration:underline;font-family:'DM Sans',sans-serif;background:none;border:none;padding:0}
.zec-cancel:hover{color:#8888aa}
.zec-pay-box{background:#111122;border:1px solid #2f2f4a;border-radius:14px;padding:14px;margin:0 20px 16px;display:flex;flex-direction:column;gap:10px}
.zec-pay-row{display:flex;justify-content:space-between;align-items:center}
.zec-pay-lbl{font-size:11px;color:#5a5a78;font-family:'DM Sans',sans-serif}
.zec-pay-val{font-family:'Courier New',monospace;font-size:11px;color:#eeeef5;word-break:break-all;text-align:right;max-width:220px}
.zec-pay-code{font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#F4B728;letter-spacing:.08em}
.zec-pay-amount{font-size:13px;font-weight:700;color:#F4B728}
.zec-waiting{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 20px 14px;font-size:12px;color:#5a5a78;font-family:'DM Sans',sans-serif}
.zec-mini-spin{width:16px;height:16px;border-radius:50%;border:2px solid #2f2f4a;border-top-color:#F4B728;animation:zring .8s linear infinite;flex-shrink:0}
.zec-deeplink-btn{display:none;width:calc(100% - 40px);margin:0 20px 12px;padding:13px;border-radius:13px;border:none;background:linear-gradient(135deg,#F4B728,#c9890a);color:#0a0500;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s}
.zec-deeplink-btn:hover{opacity:.88}
.zec-done-wrap{padding:48px 24px 40px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.zec-done-icon{font-size:44px}
.zec-done-title{font-size:16px;font-weight:700;color:#22c55e;font-family:'DM Sans',sans-serif}
.zec-done-sub{font-size:12px;color:#8888aa;font-family:'DM Sans',sans-serif}
`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'zec-modal-overlay';
  overlay.innerHTML = `
<div id="zec-sheet">
  <div class="zec-handle"></div>

  <!-- LIST VIEW -->
  <div id="zec-view-list" class="zec-view zec-active">
    <div class="zec-err" id="zec-err-bar"></div>
    <div class="zec-head">
      <h2>Connect ZEC Wallet</h2>
      <button class="zec-close" id="zec-close-btn">&#215;</button>
    </div>
    <div class="zec-sub">Native Zcash · shielded privacy</div>
    <div class="zec-list" id="zec-wallet-list"></div>
    <div class="zec-note">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.1"/><path d="M6 4v3M6 7.5v.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
      Send 0.00001 ZEC with a memo code to verify you own the wallet. Expires in 15 min.
    </div>
  </div>

  <!-- CONNECTING / LOADING VIEW -->
  <div id="zec-view-connecting" class="zec-flex-view" style="padding:44px 24px 36px;gap:0;text-align:center">
    <div class="zec-conn-wrap">
      <div class="zec-ring-outer"></div>
      <div class="zec-ring"></div>
      <div class="zec-logo-bg" id="zec-logo-bg"></div>
    </div>
    <div class="zec-conn-name" id="zec-conn-name">YWallet</div>
    <div class="zec-conn-status" id="zec-conn-status">Creating session…</div>
    <button class="zec-cancel" id="zec-cancel-btn">Cancel</button>
  </div>

  <!-- PAYMENT VIEW -->
  <div id="zec-view-pay" class="zec-view" style="padding-top:20px">
    <div class="zec-head" style="margin-bottom:14px">
      <h2 id="zec-pay-title">Send with YWallet</h2>
      <button class="zec-close" id="zec-pay-close-btn">&#215;</button>
    </div>
    <div class="zec-pay-box">
      <div class="zec-pay-row">
        <span class="zec-pay-lbl">To address</span>
        <span class="zec-pay-val" id="zec-pay-addr">—</span>
      </div>
      <div class="zec-pay-row">
        <span class="zec-pay-lbl">Amount</span>
        <span class="zec-pay-amount">0.00001 ZEC</span>
      </div>
      <div class="zec-pay-row">
        <span class="zec-pay-lbl">Memo / code</span>
        <span class="zec-pay-code" id="zec-pay-code">——</span>
      </div>
      <div class="zec-pay-row">
        <span class="zec-pay-lbl">Expires</span>
        <span class="zec-pay-val" id="zec-pay-expires">15:00</span>
      </div>
    </div>
    <div class="zec-waiting">
      <div class="zec-mini-spin"></div>
      Waiting for transaction on-chain…
    </div>
    <button class="zec-deeplink-btn" id="zec-deeplink-btn"></button>
    <p style="font-size:11px;color:#5a5a78;text-align:center;margin:0 20px 18px;font-family:'DM Sans',sans-serif;line-height:1.6" id="zec-pay-hint">
      Open your wallet, paste the address and code into the memo field, then send.
    </p>
    <div style="text-align:center;padding-bottom:20px">
      <button class="zec-cancel" id="zec-pay-cancel-btn">Cancel</button>
    </div>
  </div>

  <!-- DONE VIEW -->
  <div id="zec-view-done" class="zec-view">
    <div class="zec-done-wrap">
      <div class="zec-done-icon">⚡</div>
      <div class="zec-done-title">Payment Confirmed!</div>
      <div class="zec-done-sub" id="zec-done-sub">Wallet verified · logging you in…</div>
    </div>
  </div>

</div>`;

  document.body.appendChild(overlay);
  buildList();
  bindEvents();
}

function buildList() {
  const container = document.getElementById('zec-wallet-list');
  container.innerHTML = '';
  WALLETS.forEach(w => {
    const item = document.createElement('div');
    item.className = 'zec-item';
    item.setAttribute('data-wallet', w.key);
    const tagHtml = w.tag ? `<span class="zec-tag">${w.tag}</span>` : '';
    item.innerHTML = `
      <div class="zec-icon" style="background:${w.bg}">${w.icon}</div>
      <div class="zec-info">
        <div class="zec-name">${w.name}${tagHtml}</div>
        <div class="zec-desc">${w.desc}</div>
      </div>
      <span class="zec-arrow">›</span>`;
    item.addEventListener('click', () => startAuth(w));
    container.appendChild(item);
  });
}

function bindEvents() {
  document.getElementById('zec-close-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-cancel-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-pay-close-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-pay-cancel-btn').addEventListener('click', closeZecModal);
  document.getElementById('zec-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeZecModal();
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


async function startAuth(w) {
  document.getElementById('zec-logo-bg').innerHTML = w.icon;
  document.getElementById('zec-logo-bg').style.background = w.bg;
  document.getElementById('zec-conn-name').textContent = w.name;
  document.getElementById('zec-conn-status').textContent = 'Creating session…';
  showView('zec-view-connecting');

  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await fetch(SESSION_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
      body: JSON.stringify({ wallet: w.key })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create session');

    _currentSessionId = data.session_id;
    showPayView(data, w);
    startPolling(data.session_id);
    startCountdown(data.expires_in || 900);

  } catch (err) {
    showView('zec-view-list');
    showErr(err.message || 'Could not start session. Try again.');
  }
}

function showPayView(data, w) {
  document.getElementById('zec-pay-title').textContent = `Send with ${w.name}`;

  const addr = data.address;
  document.getElementById('zec-pay-addr').textContent = addr.slice(0, 12) + '…' + addr.slice(-8);
  document.getElementById('zec-pay-code').textContent = data.code;

  const memoBase64 = btoa(data.code).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // All Zcash wallets share the zcash: URI scheme (ZIP-321 standard).
  // There is no wallet-specific scheme, so we use the same URI for all.
  // On mobile the button fires the URI; iOS/Android will open whichever
  // wallet app is registered as the zcash: handler on that device.
  const zecUri = buildZecUri(addr, memoBase64);

  const dlBtn = document.getElementById('zec-deeplink-btn');
  const hintEl = document.getElementById('zec-pay-hint');

  dlBtn.onclick = null;

  if (isMobile) {
    dlBtn.style.display = 'block';
    dlBtn.textContent = `Open in ${w.name}`;
    dlBtn.onclick = () => { window.location.href = zecUri; };
    if (hintEl) hintEl.textContent = `If ${w.name} doesn't open automatically, open it manually, paste the address, enter the code in the memo field, then send.`;
  } else {
    dlBtn.style.display = 'none';
    if (hintEl) hintEl.textContent = `Open ${w.name}, paste the address and enter the code in the memo field, then send.`;
  }

  showView('zec-view-pay');
}


let _countdownTimer = null;

function startCountdown(seconds) {
  clearInterval(_countdownTimer);
  let remaining = seconds;
  const el = document.getElementById('zec-pay-expires');
  function tick() {
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    if (el) el.textContent = `${m}:${s}`;
    if (remaining <= 0) { clearInterval(_countdownTimer); if (el) el.textContent = 'Expired'; }
    remaining--;
  }
  tick();
  _countdownTimer = setInterval(tick, 1000);
}


function startPolling(sessionId) {
  stopPolling();
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  _pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${POLL_ENDPOINT}/${sessionId}`, { credentials: 'include', headers: { 'X-CSRFToken': csrf } });
      const data = await res.json();
      if (data.status === 'confirmed') {
        stopPolling();
        clearInterval(_countdownTimer);
        onConfirmed(data);
      } else if (data.status === 'expired') {
        stopPolling();
        clearInterval(_countdownTimer);
        showView('zec-view-list');
        showErr('Session expired. Please try again.');
      }
      // 'pending' → keep polling
    } catch (_) {}
  }, 4000);
}

function stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function onConfirmed(data) {

  document.getElementById('zec-done-sub').textContent =
    IS_LOGIN_FLOW
      ? 'Wallet verified · logging you in...'
      : 'Wallet verified and connected';

  showView('zec-view-done');

  setTimeout(() => {

    if (IS_LOGIN_FLOW && data.redirect) {
      window.location.href = data.redirect;
      return;
    }

    closeZecModal();

    window.dispatchEvent(
      new CustomEvent('zecWalletConnected')
    );

  }, 1800);
}


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
  document.getElementById('zec-modal-overlay').classList.add('zec-open');
  document.documentElement.style.overflow = 'hidden';
}

function closeZecModal() {
  stopPolling();
  clearInterval(_countdownTimer);
  const overlay = document.getElementById('zec-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('zec-open');
  document.documentElement.style.overflow = '';
}

window.openZecModal = openZecModal;
window.closeZecModal = closeZecModal;

})();