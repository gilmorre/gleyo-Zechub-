(function () { 
let qrLibPromise = null;
let ZEC_PRICE_USD = 1000;
const ZEC_NET_FEE  = 0.0004;   
const ZEC_PLATFORM = 0.03;
const ZEC_MIN      = 0.0007;

const balEl             = document.getElementById('zecBalDisplay');
let zecBalance          = parseFloat(balEl?.dataset?.balance    || '0') || 0;
let zecTotalEarned      = parseFloat(balEl?.dataset?.earned     || '0') || 0;
let zecTotalWithdrawn   = parseFloat(balEl?.dataset?.withdrawn  || '0') || 0;
let LAST_WITHDRAW       = 0;
let addrCheckTimer      = null;
let addrVerified        = false;
let lastVerifiedAddr    = '';

let destMode     = 'wallet';
let nameTimer    = null;
let nameReqId    = 0;
let resolvedAddr = '';
let resolvedName = '';

function truncDecimals(n, dp) {
  const s = Number(n).toFixed(8);
  const [whole, frac = ''] = s.split('.');
  return dp > 0 ? whole + '.' + frac.slice(0, dp) : whole;
}

function fmtZec(n)       { return Number(n).toFixed(8); }
function fmtRewardZec(n) { return truncDecimals(n, 4); }

const earnedEl = document.getElementById('totalEarned');
if (earnedEl) earnedEl.textContent = truncDecimals(zecTotalEarned, 2);
  
const sheetEl = document.getElementById('sheetBal');
if (sheetEl) sheetEl.innerHTML = fmtZec(zecBalance) + ' <em>ZEC</em>';

const usdElInit = document.getElementById('zecUsdDisplay');
if (usdElInit) usdElInit.textContent = truncDecimals(zecBalance * ZEC_PRICE_USD, 2);

function updateWithdrawButton() {
  const btn = document.querySelector('.btn-p');
  if (!btn) return;
  btn.disabled      = zecBalance <= 0;
  btn.style.opacity = zecBalance <= 0 ? '0.5' : '1';
  btn.style.cursor  = zecBalance <= 0 ? 'not-allowed' : 'pointer';
}

function fmtLocalDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function ensureQrLib() {
  if (typeof QRCodeStyling !== 'undefined') return Promise.resolve();
  if (qrLibPromise) return qrLibPromise;

  qrLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src   = 'https://unpkg.com/qr-code-styling/lib/qr-code-styling.js';
    s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => { qrLibPromise = null; reject(new Error('QR lib failed to load')); };
    document.head.appendChild(s);
  });

  return qrLibPromise;
}

updateWithdrawButton();

async function fetchZecPrice() {
  try {
    const res   = await fetch('/api/zec-price', { cache: 'no-store' });
    const data  = await res.json();
    const price = data?.price;
    if (price && price > 0 && price !== ZEC_PRICE_USD) {
      ZEC_PRICE_USD = price;
      refreshUsdDisplays();
    }
  } catch (_) {}
}


function txStatusClass(tx) {
  if (tx.status === 'confirmed' || tx.status === 'paid') return 'in';
  if (tx.status === 'failed')  return 'out';
  if (tx.status === 'expired') return 'exp';
  return 'pend';
}

function txUsd(tx) {
  return (tx.token || '').toUpperCase() === 'ZEC'
    ? tx.amount * ZEC_PRICE_USD
    : tx.amount;
}

function txSign(tx) {
  if (tx.status === 'expired') return '';
  return tx.type === 'in' ? '+' : '−';
}

function refreshUsdDisplays() {
  const usdEl = document.getElementById('zecUsdDisplay');
  if (!usdEl) return;
  usdEl.textContent  = truncDecimals(zecBalance * ZEC_PRICE_USD, 2);
  usdEl.style.transition = 'opacity 0.15s ease';
  usdEl.style.opacity    = '0.25';
  setTimeout(() => { usdEl.style.opacity = '1'; }, 150);
}

window.ZecPriceStore.start();

window.__rewardPriceCleanup =
window.ZecPriceStore.subscribe((price) => {
  ZEC_PRICE_USD = price;
  refreshUsdDisplays();
});

const root     = document.querySelector('.reward-conte-inner');
let tfaEnabled = root?.dataset?.tfaEnabled === 'true';

function setBalanceDisplay(bal) {
  zecBalance = bal;
  const balEl   = document.getElementById('zecBalDisplay');
  const usdEl   = document.getElementById('zecUsdDisplay');
  const sheetEl = document.getElementById('sheetBal');
  if (balEl)   balEl.innerHTML   = fmtZec(bal) + ' <em>ZEC</em>';
  if (usdEl)   usdEl.textContent = truncDecimals(bal * ZEC_PRICE_USD, 2);
  if (sheetEl) sheetEl.innerHTML = fmtZec(bal) + ' <em>ZEC</em>';
  updateWithdrawButton();
}

function revealID(el) {
  if (el.classList.contains('revealed')) return;
  const cover = el.querySelector('.id-cover');
  for (let i = 0; i < 50; i++) {
    const p        = document.createElement('span');
    p.className    = 'particle';
    const angle    = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 80;
    p.style.left   = Math.random() * 100 + '%';
    p.style.top    = Math.random() * 100 + '%';
    p.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * distance - Math.random() * 20 + 'px');
    p.style.animationDelay = Math.random() * 0.1 + 's';
    cover.appendChild(p);
  }
  el.classList.add('revealing');
  setTimeout(() => { el.classList.add('revealed'); cover.innerHTML = ''; }, 900);
}

function doCopy(b) {
  const el   = document.querySelector('.wa-val');
  const text = el?.dataset?.full || '';
  if (!text) { showToast('No wallet address to copy.', 'error'); return; }
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else { fallback(); }
  b.classList.add('ok');
  b.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied`;
  setTimeout(() => {
    b.classList.remove('ok');
    b.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.1"/><path d="M1.5 7.5V2C1.5 1.72 1.72 1.5 2 1.5H7.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg> Copy`;
  }, 1600);
}

function showAddrSpinner(r, target, text) {
  const el = r(target || 'addrErr');
  if (el) el.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:5px;color:var(--sub);font-size:11px">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
           style="animation:zec-spin 0.8s linear infinite;flex-shrink:0">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"
                stroke-dasharray="14 8" stroke-linecap="round"/>
      </svg>
      ${text || 'Verifying shielded address…'}
    </span>`;
}

function showAddrOk(r, target) {
  const el = r(target || 'addrErr');
  if (el) el.innerHTML = `
    <span style="color:var(--green);display:inline-flex;align-items:center;gap:4px;font-size:11px">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="-5.0 -10.0 110.0 135.0" fill="currentColor" stroke="currentColor" style="position: relative; top: 2px">
        <path d="m85.652 6.5938c-15.199 4.6992-33.309 28.609-50.668 53.164-7.3672-12.414-15.172-16.559-23.242-12.312-0.99609 0.52344-1.6523 1.5273-1.7344 2.6562-0.082031 1.1406 0.42969 2.2422 1.3555 2.918 5.8516 4.2734 11.922 11.848 19.141 23.84v-0.003906c1.2891 2.1758 3.6328 3.5039 6.1562 3.4883h0.11717c2.6016-0.023438 4.9844-1.4453 6.2461-3.7188 7.0234-12.734 14.738-25.07 23.109-36.957 6.8594-9.75 14.508-18.926 22.867-27.43 1.125-1.1016 1.332-2.8359 0.5-4.1719-0.77734-1.332-2.3789-1.9453-3.8477-1.4727z"/>
      </svg>
      Valid shielded address
    </span>`;
}

function showAddrErr(r, msg, target) {
  const el = r(target || 'addrErr');
  if (el) el.innerHTML = `
    <span style="color:var(--red,#f05070);font-size:11px">${msg}</span>`;
}

function getDest() {
  if (destMode === 'name') return resolvedAddr;
  return document.getElementById('destIn')?.value?.trim() || '';
}

function resetNameState() {
  clearTimeout(nameTimer);
  nameReqId++;
  resolvedAddr = '';
  resolvedName = '';
  const r = id => document.getElementById(id);
  if (r('nameIn'))      r('nameIn').value = '';
  if (r('nameErr'))     r('nameErr').textContent = '';
  if (r('resolvedBox')) r('resolvedBox').style.display = 'none';
  if (r('resolvedAddr')) r('resolvedAddr').textContent = '—';
}

function setDestMode(mode) {
  const r = id => document.getElementById(id);
  destMode = mode === 'name' ? 'name' : 'wallet';

  clearTimeout(addrCheckTimer);
  clearTimeout(nameTimer);
  nameReqId++;
  addrVerified     = false;
  lastVerifiedAddr = '';

  r('tabWallet')?.classList.toggle('on', destMode === 'wallet');
  r('tabName')?.classList.toggle('on', destMode === 'name');
  if (r('destWalletGroup')) r('destWalletGroup').style.display = destMode === 'wallet' ? '' : 'none';
  if (r('destNameGroup'))   r('destNameGroup').style.display   = destMode === 'name' ? '' : 'none';

  if (destMode === 'name') {
    if (r('destIn'))  r('destIn').value = '';
    if (r('addrErr')) r('addrErr').textContent = '';
    resetNameState();
    setTimeout(() => r('nameIn')?.focus(), 50);
  } else {
    resetNameState();
    if (r('destIn'))  r('destIn').value = '';
    if (r('addrErr')) r('addrErr').textContent = '';
  }
  checkProcBtn();
}

function onNameInput() {
  const r   = id => document.getElementById(id);
  const raw = (r('nameIn')?.value || '').trim().toLowerCase();

  clearTimeout(nameTimer);
  nameReqId++;
  addrVerified     = false;
  lastVerifiedAddr = '';
  resolvedAddr     = '';
  resolvedName     = '';
  if (r('resolvedBox')) r('resolvedBox').style.display = 'none';
  if (r('nameErr'))     r('nameErr').textContent = '';
  checkProcBtn();

  if (!raw) return;

  showAddrSpinner(r, 'nameErr', 'Resolving name…');
  nameTimer = setTimeout(() => resolveName(raw), 1000);
}

async function resolveName(raw) {
  const r    = id => document.getElementById(id);
  const myId = ++nameReqId;

  try {
    const res  = await fetch('/api/wallet/zec/resolve-name', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body:    JSON.stringify({ name: raw })
    });
    const data = await res.json();
    if (myId !== nameReqId) return;

    if (!res.ok || !data.valid) {
      showAddrErr(r, data.error || 'Name not found', 'nameErr');
      checkProcBtn();
      return;
    }

    resolvedAddr = data.address;
    resolvedName = data.name;
    if (r('resolvedAddr')) r('resolvedAddr').textContent = resolvedAddr.slice(0, 10) + '…' + resolvedAddr.slice(-6);
    if (r('resolvedBox'))  r('resolvedBox').style.display = '';

    showAddrSpinner(r, 'nameErr');
    checkAddressBackend(resolvedAddr, r, 'nameErr');
  } catch (_) {
    if (myId !== nameReqId) return;
    showAddrErr(r, 'Could not resolve name — check your connection', 'nameErr');
    checkProcBtn();
  }
}

function openWithdraw() {
  if (zecBalance <= 0) {
    showToast("You don't have any funds to withdraw.", 'error');
    return;
  }
  const r = id => document.getElementById(id);
  ['w1','w2','w3'].forEach((id, i) => {
    const el = r(id);
    if (el) el.style.display = i === 0 ? '' : 'none';
  });
  if (r('amtIn'))       r('amtIn').value = '';
  if (r('destIn'))      r('destIn').value = '';
  if (r('rcv'))         r('rcv').textContent = '—';
  if (r('platformFee')) r('platformFee').textContent = '—';
  if (r('remainAfter')) r('remainAfter').textContent = '—';
  if (r('procBtn'))     r('procBtn').disabled = true;
  if (r('amtErr'))      r('amtErr').textContent = '';
  if (r('addrErr'))     r('addrErr').textContent = '';
  if (r('balRemain'))   r('balRemain').textContent = 'Balance: ' + fmtZec(zecBalance) + ' ZEC';
  if (r('sheetBal'))    r('sheetBal').innerHTML = fmtZec(zecBalance) + ' <em>ZEC</em>';

  addrVerified     = false;
  lastVerifiedAddr = '';
  setDestMode('wallet');

  r('wOv').classList.add('open');
}

function closeW() {
  clearTimeout(nameTimer);
  nameReqId++;
  document.getElementById('wOv').classList.remove('open');
}

function bgClose(e, id) {
  if (e.target === document.getElementById(id)) document.getElementById(id).classList.remove('open');
}

function setMax() {
  if (zecBalance <= 0) return;
  const el = document.getElementById('amtIn');
  if (el) {
    el.value = parseFloat(zecBalance.toFixed(8));
    calcFee(true);
  }
}

function checkProcBtn() {
  const amt     = parseFloat(document.getElementById('amtIn')?.value) || 0;
  const procBtn = document.getElementById('procBtn');
  if (!procBtn) return;
  procBtn.disabled = !(amt >= ZEC_MIN && amt <= zecBalance && addrVerified);
}

async function checkAddressBackend(addr, r, target) {
  try {
    const res  = await fetch('/api/wallet/zec/validate-address', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body:    JSON.stringify({ address: addr })
    });
    const data = await res.json();
    if (addr !== getDest()) return;
    if (data.valid) {
      addrVerified     = true;
      lastVerifiedAddr = addr;
      showAddrOk(r, target);
    } else {
      addrVerified     = false;
      lastVerifiedAddr = '';
      showAddrErr(r, data.error || 'Invalid shielded address — not recognized on Zcash mainnet', target);
    }
  } catch (_) {
    if (addr !== getDest()) return;
    addrVerified     = false;
    lastVerifiedAddr = '';
    showAddrErr(r, 'Could not verify address — check your connection', target);
  }
  checkProcBtn();
}

function calcFee(amountOnly) {
  const amt  = parseFloat(document.getElementById('amtIn')?.value) || 0;
  const dest = document.getElementById('destIn')?.value?.trim() || '';
  const r    = id => document.getElementById(id);

  if (r('amtErr'))      r('amtErr').textContent = '';
  if (r('platformFee')) r('platformFee').textContent = '—';
  if (r('remainAfter')) r('remainAfter').textContent = '—';
  if (r('rcv'))         r('rcv').textContent = '—';

  checkProcBtn();

  if (r('balRemain')) {
    if (amt <= 0) {
      r('balRemain').textContent = 'Balance: ' + fmtZec(zecBalance) + ' ZEC';
      r('balRemain').className   = 'bal-remain';
    } else {
      const left = zecBalance - amt;
      if (amt > zecBalance) {
        r('balRemain').textContent = 'Insufficient balance';
        r('balRemain').className   = 'bal-remain danger';
      } else if (left < 0.0004) {
        r('balRemain').textContent = 'Remaining: ' + fmtZec(left) + ' ZEC';
        r('balRemain').className   = 'bal-remain warn';
      } else {
        r('balRemain').textContent = 'Remaining: ' + fmtZec(left) + ' ZEC';
        r('balRemain').className   = 'bal-remain';
      }
    }
  }

  if (amt > 0) {
    if (amt < ZEC_MIN) {
      if (r('amtErr')) r('amtErr').textContent = `Minimum withdrawal is ${ZEC_MIN} ZEC (~$1)`;
    } else if (amt > zecBalance) {
      if (r('amtErr')) r('amtErr').textContent = 'Amount exceeds available balance';
    } else {
      const platformFee = parseFloat((amt * ZEC_PLATFORM).toFixed(8));
      const receive     = parseFloat((amt - platformFee - ZEC_NET_FEE).toFixed(8));
      const remaining   = parseFloat((zecBalance - amt).toFixed(8));
      if (receive <= 0) {
        if (r('amtErr')) r('amtErr').textContent = 'Amount too small after fees';
      } else {
        if (r('platformFee')) r('platformFee').textContent = fmtZec(platformFee) + ' ZEC';
        if (r('remainAfter')) r('remainAfter').textContent = fmtZec(remaining) + ' ZEC';
        if (r('rcv'))         r('rcv').textContent = fmtZec(receive) + ' ZEC';
      }
    }
  }

  if (amountOnly) { checkProcBtn(); return; }

  if (destMode === 'name') { checkProcBtn(); return; }

  if (!dest) {
    addrVerified = false;
    if (r('addrErr')) r('addrErr').textContent = '';
    checkProcBtn();
    return;
  }

  const lower = dest.toLowerCase();

  if (lower.startsWith('t1') || lower.startsWith('t3') ||
      lower.startsWith('zc') || lower.startsWith('0x')) {
    addrVerified     = false;
    lastVerifiedAddr = '';
    showAddrErr(r, '🚫 Only shielded Unified addresses accepted — use a u1… address');
    checkProcBtn();
    return;
  }

  if (lower.startsWith('u1')) {
    if (dest === lastVerifiedAddr && addrVerified) {
      checkProcBtn();
      return;
    }
    addrVerified = false;
    checkProcBtn();
    showAddrSpinner(r);
    if (addrCheckTimer) clearTimeout(addrCheckTimer);
    addrCheckTimer = setTimeout(() => checkAddressBackend(dest, r), 700);
    return;
  }

  addrVerified     = false;
  lastVerifiedAddr = '';
  showAddrErr(r, 'Address must start with u1 (Unified)');
  checkProcBtn();
}

function toW2() {
  const amt   = parseFloat(document.getElementById('amtIn')?.value) || 0;
  const dest  = getDest();
  const lower = dest.toLowerCase();
  const r     = id => document.getElementById(id);

  if (lower.startsWith('t1') || lower.startsWith('t3') ||
      lower.startsWith('zc') || lower.startsWith('0x')) {
    showToast('Transparent addresses not accepted.', 'error');
    return;
  }
  if (!dest) {
    showToast(destMode === 'name' ? 'Please enter a Zcash name.' : 'Please enter a destination address.', 'error');
    return;
  }
  if (r('procBtn')?.disabled) {
    showToast('Please enter a valid shielded ZEC address.', 'error');
    return;
  }

  const platformFee = parseFloat((amt * ZEC_PLATFORM).toFixed(8));
  const receive     = parseFloat((amt - platformFee - ZEC_NET_FEE).toFixed(8));

  LAST_WITHDRAW = amt;

  if (r('cAmt'))  r('cAmt').textContent  = fmtZec(amt) + ' ZEC';
  if (r('cDest')) r('cDest').textContent = dest.slice(0, 10) + '…' + dest.slice(-6);
  if (r('cFee'))  r('cFee').textContent  = fmtZec(platformFee) + ' ZEC';
  if (r('cRcv'))  r('cRcv').textContent  = fmtZec(receive) + ' ZEC';

  if (r('cNameRow')) r('cNameRow').style.display = destMode === 'name' ? '' : 'none';
  if (r('cName'))    r('cName').textContent      = destMode === 'name' ? resolvedName : '—';

  r('w1').style.display = 'none';
  r('w2').style.display = '';
}

function toW1() {
  document.getElementById('w2').style.display = 'none';
  document.getElementById('w1').style.display = '';
}

function doSend() {
  const dest  = getDest();
  const lower = dest.toLowerCase();
  if (lower.startsWith('u1')) { executeWithdraw(); return; }
  if (!tfaEnabled) { goToSettings(); return; }
  open2FA();
}

function prependPendingTx(amt, dest) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }) + ' · ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  const newTx = {
    type:   'out',
    status: 'pending',
    amount: amt,
    token:  'ZEC',
    network: 'Zcash',
    remark: `Withdrawal · ${dest.slice(0, 6)}…${dest.slice(-4)}`,
    date:   dateStr
  };

  ALL_TX.unshift(newTx);
  renderRecentTx();

  const txCountEl = document.getElementById('txCount');
  if (txCountEl) txCountEl.textContent = ALL_TX.length;
}

function renderRecentTx() {
  const container = document.getElementById('txContainer');
  if (!container) return;

  const recent = ALL_TX.slice(0, 4);

  if (!recent.length) {
    container.innerHTML = `<div class="no-tx">No transaction history</div>`;
    return;
  }

  container.innerHTML = recent.map(tx => {
    const isZec  = (tx.token || '').toUpperCase() === 'ZEC';
    const amtStr = isZec ? fmtRewardZec(tx.amount) : truncDecimals(tx.amount, 2);
    return `
      <div class="tx-row">
        ${txDot(tx)}
        <div class="tx-info">
          <div class="tx-desc">${tx.remark || 'Transaction'}</div>
          <div class="tx-time">${fmtLocalDate(tx.date)}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amt ${txStatusClass(tx)}">
            ${txSign(tx)}${amtStr} ${tx.token}
          </div>
        </div>
      </div>`;
  }).join('');
}


async function executeWithdraw() {
  const amt     = parseFloat(document.getElementById('amtIn')?.value) || 0;
  const dest    = getDest();
  const sendBtn = document.querySelector('#w2 .cta:not(.cta-ghost)');

  if (sendBtn) {
    sendBtn.disabled  = true;
    sendBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
           style="animation:zec-spin 0.8s linear infinite;flex-shrink:0">
        <circle cx="7" cy="7" r="5.5" stroke="white" stroke-width="1.5"
                stroke-dasharray="16 8" stroke-linecap="round"/>
      </svg>
      Submitting…`;
  }

  try {
    const res  = await fetch('/api/wallet/zec/withdraw', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body:    JSON.stringify({ address: dest, amount: amt })
    });
    const data = await res.json();

    if (!res.ok) {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = 'Confirm & Send'; }
      showToast(data.error || 'Withdrawal failed', 'error');
      return;
    }

    zecBalance = parseFloat((zecBalance - amt).toFixed(8));
    setBalanceDisplay(zecBalance);
    prependPendingTx(amt, dest);

    document.getElementById('w2').style.display = 'none';
    document.getElementById('w3').style.display = '';

  } catch (_) {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = 'Confirm & Send'; }
    showToast('Network error — withdrawal not sent', 'error');
  }
}

function open2FA() {
  const blocked = document.getElementById('tfaBlocked');
  const verify  = document.getElementById('tfaVerify');
  if (blocked) blocked.style.display = tfaEnabled ? 'none' : '';
  if (verify)  verify.style.display  = tfaEnabled ? '' : 'none';
  for (let i = 0; i < 6; i++) {
    const c = document.getElementById('otp' + i);
    if (c) { c.value = ''; c.classList.remove('err', 'ok'); }
  }
  setupOTPInputs();
  const errEl = document.getElementById('otpErr');
  if (errEl) errEl.textContent = '';
  document.getElementById('tfaOv').classList.add('open');
  if (tfaEnabled) setTimeout(() => document.getElementById('otp0')?.focus(), 350);
}

function closeTFA() { document.getElementById('tfaOv').classList.remove('open'); }

function goToSettings() {
  closeTFA(); closeW();
  let path = window.location.pathname + window.location.search;
  if (path.includes('/settings')) path = '/';
  sessionStorage.setItem('accountBackRoute', path);
  const toast = document.createElement('div');
  toast.className   = 'toast pending';
  toast.textContent = 'Redirecting to Settings › Security…';
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(() => { window.location.href = '/settings/security'; }, 300);
  }, 1800);
}

function setupOTPInputs() {
  const inputs = Array.from({ length: 6 }, (_, i) => document.getElementById('otp' + i));

  function distributeFrom(startIndex, value) {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');
    for (let i = 0; i < digits.length; i++) {
      const target = inputs[startIndex + i];
      if (target) { target.value = digits[i]; target.classList.remove('err'); }
    }
    inputs[Math.min(startIndex + digits.length, inputs.length - 1)]?.focus();
    checkFull();
  }

  inputs.forEach((input, idx) => {
    if (!input || input._r) return;
    input._r = true;
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 1) { distributeFrom(idx, v); return; }
      input.value = v ? v[0] : '';
      input.classList.remove('err');
      if (v && idx < inputs.length - 1) inputs[idx + 1].focus();
      checkFull();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (paste) distributeFrom(idx, paste);
    });
  });
}

function checkFull() {
  const code = Array.from({ length: 6 }, (_, i) => document.getElementById('otp' + i)?.value || '').join('');
  if (code.length === 6) autoVerify(code);
}

async function autoVerify(code) {
  try {
    const res  = await fetch('/api/verify-totp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body:    JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) { handleOTPError(data.error); return; }
    handleOTPSuccess();
  } catch (_) { handleOTPError('network'); }
}

function handleOTPSuccess() {
  for (let i = 0; i < 6; i++) document.getElementById('otp' + i)?.classList.add('ok');
  setTimeout(() => {
    closeTFA();
    zecBalance = parseFloat((zecBalance - LAST_WITHDRAW).toFixed(8));
    setBalanceDisplay(zecBalance);
    const hb   = document.getElementById('txHashBox');
    const hash = 'zec_' + Array.from({ length: 60 }, () => '0123456789abcdef'[Math.random() * 16 | 0]).join('');
    if (hb) hb.textContent = 'Tx: ' + hash.slice(0, 18) + '…' + hash.slice(-6);
    document.getElementById('w2').style.display = 'none';
    document.getElementById('w3').style.display = '';
  }, 500);
}

function handleOTPError(type) {
  const errEl = document.getElementById('otpErr');
  if (type === 'no_2fa' || type === 'not_enabled') { goToSettings(); return; }
  const msg = type === 'invalid' ? 'Incorrect code — try again.' : 'Something went wrong';
  if (errEl) errEl.textContent = msg;
  for (let i = 0; i < 6; i++) {
    const c = document.getElementById('otp' + i);
    if (c) { c.classList.add('err'); c.classList.remove('ok'); }
  }
  setTimeout(() => {
    for (let i = 0; i < 6; i++) {
      const c = document.getElementById('otp' + i);
      if (c) { c.value = ''; c.classList.remove('err'); }
    }
    if (errEl) errEl.textContent = '';
    document.getElementById('otp0')?.focus();
  }, 900);
}

let ALL_TX = [];

function txDot(tx) {
  const cls = txStatusClass(tx);  

  if (cls === 'pend') {
    return `
      <div class="tx-dot pend">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#f5a623" stroke-width="1.8"/>
          <path d="M12 7v5l3 3" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>`;
  }

  if (cls === 'exp') {
    return `
      <div class="tx-dot exp">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#f05070" stroke-width="1.8"/>
          <path d="M8 12h8" stroke="#f05070" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>`;
  }

  if (cls === 'out') {
    return `
      <div class="tx-dot out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M7 7l10 10M17 7L7 17" stroke="#f05070" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>`;
  }

  const isIncoming = tx.type === 'in';
  const arrowPath = isIncoming
    ? 'M12 19V5M5 12l7 7 7-7'    
    : 'M12 5v14M19 12l-7-7-7 7'; 

  return `
    <div class="tx-dot in">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="${arrowPath}" stroke="#12d87a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

async function loadTransactions() {
  const container = document.getElementById('txContainer');
  if (!container) return;
  try {
    const res = await fetch('/api/user/transactions');
    const txs = await res.json();
    ALL_TX = txs;

    if (!txs.length) {
      container.innerHTML = `<div class="no-tx">No transaction history</div>`;
      return;
    }

    renderRecentTx();
    updateStats(txs);

  } catch (_) {
    if (container) container.innerHTML = 'Failed to load transactions';
  }
}

function updateStats(txs) {
  const txCountEl = document.getElementById('txCount');
  if (txCountEl) txCountEl.textContent = txs.length;
}

function openAll() {
  const content = document.getElementById('txContent');
  if (!ALL_TX.length) {
    content.innerHTML = `<div class="s-title">All Transactions</div><div class="no-tx">No transaction history</div>`;
    document.getElementById('txOv').classList.add('open');
    return;
  }
  content.innerHTML = `
    <div class="s-title">All Transactions</div>
    <div class="s-sub" style="margin-bottom:14px">Complete history</div>
    ${ALL_TX.map((tx, i) => {
      const isZec  = (tx.token || '').toUpperCase() === 'ZEC';
      const amtStr = isZec ? fmtRewardZec(tx.amount) : truncDecimals(tx.amount, 2);
      return `
        <div class="stx" onclick="openTxFromAPI(${i})">
          ${txDot(tx)}
          <div class="tx-info">
            <div class="tx-desc">${tx.remark || 'Transaction'}</div>
            <div class="tx-time">${fmtLocalDate(tx.date)}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amt ${txStatusClass(tx)}">
              ${txSign(tx)}${amtStr} ${tx.token}
            </div>
            <div class="tx-usd">≈ $${truncDecimals(txUsd(tx), 2)} USD</div>
          </div>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M1 1L5 5L1 9" stroke="currentColor" stroke-width="1.4"/>
          </svg>
        </div>`;
    }).join('')}`;
  document.getElementById('txOv').classList.add('open');
}

function openTxFromAPI(i) {
  const tx     = ALL_TX[i];
  if (!tx) return;
  const isZec  = (tx.token || '').toUpperCase() === 'ZEC';
  const amtStr = isZec ? fmtRewardZec(tx.amount) : truncDecimals(tx.amount, 2);

  let color;
  if (tx.status === 'confirmed' || tx.status === 'paid') {
    color = 'var(--green)';
  } else if (tx.status === 'failed') {
    color = 'var(--red)';
  } else if (tx.status === 'expired') {
    color = 'var(--sub)';
  } else {
    color = 'var(--amber)';
  }

  const sign   = txSign(tx);
  const usdVal = truncDecimals(txUsd(tx), 2);

  const hashRow = tx.tx_hash
    ? `<div class="dr"><span class="dk">Tx Hash</span><span class="dv" style="font-family:var(--mono);font-size:.7rem">${tx.tx_hash.slice(0, 14)}…${tx.tx_hash.slice(-8)}</span></div>`
    : '';

  document.getElementById('txContent').innerHTML = `
    <div class="sbadge ${txStatusClass(tx)}">${tx.status}</div>
    <div class="d-amt" style="color:${color}">${sign}${amtStr} ${tx.token}</div>
    <div class="d-usd">≈ $${usdVal} USD</div>
    <div class="dg">
      <div class="dr"><span class="dk">Description</span><span class="dv">${tx.remark || 'Transaction'}</span></div>
      <div class="dr"><span class="dk">Date</span><span class="dv">${fmtLocalDate(tx.date)}</span></div>
      <div class="dr"><span class="dk">Status</span><span class="dv">${tx.status}</span></div>
      ${hashRow}
      <div class="dr"><span class="dk">Network</span><span class="dv">${tx.network || 'Zcash'}</span></div>
    </div>`;
  document.getElementById('txOv').classList.add('open');
}

function showToast(msg, type) {
  if (window.showToast && window.showToast !== showToast) { window.showToast(msg, type); return; }
  const t = document.createElement('div');
  t.className   = 'toast ' + (type || '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity   = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

(function injectSpinCSS() {
  if (document.getElementById('zec-spin-style')) return;
  const s = document.createElement('style');
  s.id = 'zec-spin-style';
  s.textContent = '@keyframes zec-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
})();

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['wOv', 'txOv'].forEach(id => document.getElementById(id)?.classList.remove('open'));
    closeTFA();
  }
});


const depTokenSelect   = document.getElementById('depTokenSelect');
const depTokenLabelEl  = document.getElementById('depTokenLabel');
const depTokenOptions  = document.getElementById('depTokenOptions');
const depNetworkSelect = document.getElementById('depNetworkSelect');
const depNetworkLabelEl= document.getElementById('depNetworkLabel');
const depNetworkOptions= document.getElementById('depNetworkOptions');

let selectedDepToken = null, selectedDepNetwork = null, selectedDepNetworkLabel = null;
let currentDepositId = null, depCheckInterval = null, depPhaseEnd = null, depTimerInterval = null;
let depChecking = false, depStatusTimer = null;

const DEP_ACTIVE = 10, DEP_COOLDOWN = 30, DEP_SWAP_RECHECK = 20, DEP_STATUS_CLEAR = 5000;

const DEP_NETWORKS_BY_TOKEN = {
  USDT: [{ value:'Polygon', label:'Polygon' }],
  USDC: [{ value:'Base', label:'Base' }, { value:'Polygon', label:'Polygon' }],
  ZEC:  [{ value:'Zcash', label:'Zcash' }]
};

function depFormatZec(n){
  const s  = Number(n).toFixed(8).replace(/0+$/, '');
  const dp = (s.split('.')[1] || '').length;
  return dp < 4 ? Number(n).toFixed(4) : s;
}
function depConvertToZec(amount, token){ return token === 'ZEC' ? amount : (ZEC_PRICE_USD ? amount / ZEC_PRICE_USD : null); }
function truncateAddrRP(addr, front=10, back=8){
  if (!addr) return '';
  return addr.length <= front+back+3 ? addr : addr.slice(0,front) + '…' + addr.slice(-back);
}

function b64url(s){
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function setDepStatus(html, clearAfter){
  const statusEl = document.getElementById('depStatus');
  clearTimeout(depStatusTimer);
  if (!statusEl) return;
  statusEl.innerHTML = html;
  if (clearAfter) {
    depStatusTimer = setTimeout(() => { statusEl.innerHTML = ''; }, clearAfter);
  }
}

function depCloseAllSelects(){
  depTokenSelect?.classList.remove('open'); depTokenOptions?.classList.remove('open');
  depNetworkSelect?.classList.remove('open'); depNetworkOptions?.classList.remove('open');
}

depTokenSelect?.addEventListener('click', () => {
  const willOpen = !depTokenOptions.classList.contains('open');
  depCloseAllSelects();
  if (willOpen) { depTokenSelect.classList.add('open'); depTokenOptions.classList.add('open'); }
});
depTokenOptions?.querySelectorAll('.rp-option').forEach(opt => {
  opt.addEventListener('click', e => {
    e.stopPropagation();
    selectDepToken(opt.dataset.value, opt.textContent.trim());
    depCloseAllSelects();
  });
});
depNetworkSelect?.addEventListener('click', () => {
  if (depNetworkSelect.classList.contains('disabled')) {
    if (!selectedDepToken) showToast('Select a token first', 'error');
    return;
  }
  const willOpen = !depNetworkOptions.classList.contains('open');
  depCloseAllSelects();
  if (willOpen) { depNetworkSelect.classList.add('open'); depNetworkOptions.classList.add('open'); }
});
document.addEventListener('click', e => {
  if (depTokenSelect && !depTokenSelect.contains(e.target) && !depTokenOptions.contains(e.target) &&
      depNetworkSelect && !depNetworkSelect.contains(e.target) && !depNetworkOptions.contains(e.target)) {
    depCloseAllSelects();
  }
});
document.getElementById('depAmountIn')?.addEventListener('input', () => {
  clearTimeout(window.__depConvDebounce);
  window.__depConvDebounce = setTimeout(depUpdateConversion, 250);
});

function selectDepToken(value, label){
  selectedDepToken = value;
  depTokenLabelEl.textContent = label;
  depTokenOptions.querySelectorAll('.rp-option').forEach(o => o.classList.toggle('active', o.dataset.value === value));

  selectedDepNetwork = null; selectedDepNetworkLabel = null;
  buildDepNetworkOptions(value);

  document.getElementById('depAmountBadge').textContent = value;
  document.getElementById('depAmountLabel').textContent = `Amount (${value})`;

  const refundGroup = document.getElementById('depRefundGroup');
  const noteIn = document.getElementById('depNoteIn');

  if (value === 'ZEC') {
    refundGroup.style.display = 'none';
    noteIn.value = '';
    const only = DEP_NETWORKS_BY_TOKEN.ZEC[0];
    selectDepNetwork(only.value, only.label);
    document.getElementById('depConvertPreview').textContent = '';
  } else {
    refundGroup.style.display = '';
    depNetworkSelect.classList.remove('disabled');
    depNetworkLabelEl.textContent = 'Select network';
    depUpdateConversion();
  }
}

function buildDepNetworkOptions(token){
  const list = DEP_NETWORKS_BY_TOKEN[token] || [];
  depNetworkOptions.innerHTML = '';
  list.forEach(net => {
    const div = document.createElement('div');
    div.className = 'rp-option';
    div.dataset.value = net.value;
    div.textContent = net.label;
    div.addEventListener('click', e => {
      e.stopPropagation();
      selectDepNetwork(net.value, net.label);
      depCloseAllSelects();
    });
    depNetworkOptions.appendChild(div);
  });
}

function selectDepNetwork(value, label){
  selectedDepNetwork = value;
  selectedDepNetworkLabel = label;
  depNetworkLabelEl.textContent = label;
  depNetworkOptions.querySelectorAll('.rp-option').forEach(o => o.classList.toggle('active', o.dataset.value === value));
}

function depUpdateConversion(){
  const preview = document.getElementById('depConvertPreview');
  if (!preview) return;
  if (!selectedDepToken || selectedDepToken === 'ZEC') { preview.textContent = ''; return; }
  const amt = parseFloat(document.getElementById('depAmountIn')?.value);
  if (!amt || amt <= 0) { preview.textContent = ''; return; }
  if (!ZEC_PRICE_USD) { preview.textContent = 'Fetching rate…'; return; }
  const zec = depConvertToZec(amt, selectedDepToken);
  preview.innerHTML = `≈ <strong style="color:var(--p-light)">${depFormatZec(zec)} ZEC</strong> at current rate`;
}

function openDeposit(){
  const r = id => document.getElementById(id);
  r('dep1').style.display = ''; r('dep2').style.display = 'none';
  selectedDepToken = null; selectedDepNetwork = null; selectedDepNetworkLabel = null;
  r('depTokenLabel').textContent = 'Select token';
  depTokenOptions.querySelectorAll('.rp-option').forEach(o => o.classList.remove('active'));
  r('depNetworkLabel').textContent = 'Select token first';
  r('depNetworkSelect').classList.add('disabled');
  r('depNetworkOptions').innerHTML = '';
  r('depAmountIn').value = ''; r('depNoteIn').value = '';
  r('depConvertPreview').textContent = '';
  r('depRefundGroup').style.display = 'none';
  r('depAmountBadge').textContent = 'TOKEN';
  r('depAmountLabel').textContent = 'Amount';
  const mb = r('depMemoBox'); if (mb) mb.style.display = 'none';
  const mv = r('depMemoVal'); if (mv) { mv.textContent = '—'; mv.dataset.full = ''; }
  clearTimeout(depStatusTimer);
  r('depStatus').innerHTML = ''; r('depTimer').textContent = '';
  currentDepositId = null;
  depChecking = false;
  stopDepCheckCycle();
  clearInterval(depTimerInterval);
  r('depOv').classList.add('open');
}

function closeDeposit(){
  document.getElementById('depOv').classList.remove('open');
  clearInterval(depCheckInterval);
  clearInterval(depTimerInterval);
  clearTimeout(depStatusTimer);
  depChecking = false;
  currentDepositId = null;
}

function enterDepositView(payload){
  currentDepositId = payload.id;

  const networkLabel =
    DEP_NETWORKS_BY_TOKEN[payload.token]?.find(n => n.value === payload.network)?.label
    || payload.network;

  showDepositView(
    payload.amount,
    payload.address,
    payload.token,
    networkLabel,
    payload.originAmount ?? payload.amount,
    payload.network,
    payload.memo
  );

  const expiresAt  = payload.expires_at ?? (Math.floor(Date.now() / 1000) + 1800);
  const serverTime = payload.server_time ?? Math.floor(Date.now() / 1000);
  startDepTimer(Math.max(5, expiresAt - serverTime));
  startDepCheckCycle();
}

async function generateDeposit(){
  const btn = document.getElementById('depGenerateBtn');
  const btnContent = document.getElementById('depGenerateBtnContent');
  const rawAmount = parseFloat(document.getElementById('depAmountIn')?.value);
  const refundAddr = document.getElementById('depNoteIn')?.value?.trim() || '';

  if (!selectedDepToken) { showToast('Please select a token.', 'error'); return; }
  if (!selectedDepNetwork) { showToast('Please select a network.', 'error'); return; }
  if (!rawAmount || rawAmount <= 0) { showToast(`Please enter a valid ${selectedDepToken} amount.`, 'error'); return; }
  if (selectedDepToken !== 'ZEC' && !refundAddr) { showToast('Please enter your refundable wallet address.', 'error'); return; }

  let zecAmount = rawAmount;
  if (selectedDepToken !== 'ZEC') {
    if (!ZEC_PRICE_USD) { showToast('Unable to fetch conversion rate right now.', 'error'); return; }
    zecAmount = Math.ceil(Number((depConvertToZec(rawAmount, selectedDepToken) * 10000).toFixed(6))) / 10000;
  }

  btn.disabled = true;
  btnContent.innerHTML = `<span class="spinner"></span> Generating…`;

  try {
    const res = await fetch('/api/wallet/zec/deposit/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({
        token: selectedDepToken,
        network: selectedDepNetwork,
        amount: rawAmount,
        refund_address: selectedDepToken !== 'ZEC' ? refundAddr : undefined
      })
    });
    const data = await res.json();
    if (res.status === 409 && data.payment_id) {
      enterDepositView({
        id: data.payment_id,
        address: data.address,
        amount: data.amount,
        token: data.token,
        network: data.network,
        memo: data.memo,
        expires_at: data.expires_at,
        server_time: data.server_time,
      });
      showToast('You already have a deposit in progress — showing it now', 'success');
      return;
    }
    if (!res.ok) throw data;
    currentDepositId = data.id;
    showDepositView(data.amount ?? zecAmount, data.address, selectedDepToken, selectedDepNetworkLabel, rawAmount, selectedDepNetwork, data.memo);

    const expiresAt  = data.expires_at ?? (Math.floor(Date.now()/1000) + 1800);
    const serverTime = data.server_time ?? Math.floor(Date.now()/1000);
    startDepTimer(Math.max(5, expiresAt - serverTime));
    startDepCheckCycle();
  } catch (err) {
    showToast(`❌ ${err?.error || err?.message || 'Unable to generate deposit'}`, 'error');
  } finally {
    btn.disabled = false;
    btnContent.innerHTML = 'Generate Deposit';
  }
}

function showDepositView(zecAmount, address, originToken, originNetworkLabel, originAmount, originNetworkValue, memo){
  document.getElementById('dep1').style.display = 'none';
  document.getElementById('dep2').style.display = '';

  const displayToken  = originToken || 'ZEC';
  const displayAmount = displayToken === 'ZEC' ? zecAmount : originAmount;

  document.getElementById('depAmtValue').innerHTML =
    (displayToken === 'ZEC' ? depFormatZec(zecAmount) : Number(displayAmount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4}))
    + ' <em>' + displayToken + '</em>';

  const addrEl = document.getElementById('depAddrShort');
  addrEl.textContent = truncateAddrRP(address);
  addrEl.dataset.full = address;
  document.getElementById('depNetworkVal').textContent = originNetworkLabel || selectedDepNetworkLabel || '—';

  const memoBox = document.getElementById('depMemoBox');
  const memoVal = document.getElementById('depMemoVal');
  if (memo && displayToken === 'ZEC') {
    memoVal.textContent = memo;
    memoVal.dataset.full = memo;
    memoBox.style.display = '';
  } else {
    memoVal.textContent = '—';
    memoVal.dataset.full = '';
    memoBox.style.display = 'none';
  }

  const instr = document.getElementById('depInstruction');
  instr.innerHTML = displayToken === 'ZEC'
    ? `Use your <b>ZEC</b> wallet on <b>Zcash</b> and add the memo above to your transaction. Payments without the memo can't be matched. Sending other assets may result in loss of funds.`
    : `Use your <b>${displayToken}</b> on <b>${originNetworkLabel}</b> wallet to deposit funds. This settles as <b>${depFormatZec(zecAmount)} ZEC</b> on Zcash.`;

  renderDepQR(address, zecAmount, displayToken, memo);
}

function renderDepQR(address, zecAmount, token, memo){
  const container = document.getElementById('depQrcode');
  if (!container) return;
  container.innerHTML = '';
  if (typeof QRCodeStyling === 'undefined') return;
  let qrData = address;
  if (token === 'ZEC') {
    qrData = `zcash:${address}?amount=${zecAmount}`;
    if (memo) qrData += `&memo=${b64url(memo)}`;
  }
  new QRCodeStyling({
    width: 190, height: 190, type: 'svg', data: qrData, margin: 0,
    qrOptions: { errorCorrectionLevel: 'M' },
    dotsOptions: { color: '#000000', type: 'rounded' },
    backgroundOptions: { color: '#d9d8d8' },
    cornersSquareOptions: { type: 'extra-rounded' },
    cornersDotOptions: { type: 'dot' }
  }).append(container);
}

function copyDepositAddress(){
  const addr = document.getElementById('depAddrShort')?.dataset?.full || '';
  if (!addr) { showToast('No address to copy.', 'error'); return; }
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = addr; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(addr).catch(fallback);
  else fallback();
  showToast('Address copied', 'success');
}

function copyDepositMemo(){
  const memo = document.getElementById('depMemoVal')?.dataset?.full || '';
  if (!memo) { showToast('No memo to copy.', 'error'); return; }
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = memo; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(memo).catch(fallback);
  else fallback();
  showToast('Memo copied', 'success');
}

function shareDeposit(){
  const addr = document.getElementById('depAddrShort')?.dataset?.full || '';
  if (!addr) { showToast('Generate a deposit first.', 'error'); return; }
  const memo = document.getElementById('depMemoVal')?.dataset?.full || '';
  const text = `Deposit address:\n${addr}\n\n` +
    (memo ? `Memo (required): ${memo}\n\n` : '') +
    (document.getElementById('depInstruction')?.textContent || '');
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else copyDepositAddress();
}

function enterDepActive(){
  if (depChecking) return;
  clearInterval(depCheckInterval);
  const btn = document.getElementById('depCheckBtn');
  const cd  = document.getElementById('depCheckCooldown');
  btn.disabled = false; btn.textContent = "I've sent the funds";
  depPhaseEnd = Date.now() + DEP_ACTIVE * 1000;
  depCheckInterval = setInterval(() => {
    if (depChecking) { clearInterval(depCheckInterval); return; }
    const remaining = Math.ceil((depPhaseEnd - Date.now()) / 1000);
    if (remaining <= 0) { enterDepCooldown(); return; }
    cd.textContent = `Click within ${remaining}s`;
  }, 250);
}

function enterDepCooldown(){
  if (depChecking) return;
  clearInterval(depCheckInterval);
  const btn = document.getElementById('depCheckBtn');
  const cd  = document.getElementById('depCheckCooldown');
  btn.disabled = true;
  depPhaseEnd = Date.now() + DEP_COOLDOWN * 1000;
  depCheckInterval = setInterval(() => {
    if (depChecking) { clearInterval(depCheckInterval); return; }
    const remaining = Math.ceil((depPhaseEnd - Date.now()) / 1000);
    if (remaining <= 0) { enterDepActive(); return; }
    btn.textContent = `Checking available in ${remaining}s`;
    cd.textContent = '';
  }, 250);
}

function stopDepCheckCycle(){
  clearInterval(depCheckInterval);
  const btn = document.getElementById('depCheckBtn');
  if (btn) btn.disabled = true;
  const cd = document.getElementById('depCheckCooldown');
  if (cd) cd.textContent = '';
}

function startDepCheckCycle(){ enterDepActive(); }

function startDepTimer(secondsRemaining){
  clearInterval(depTimerInterval);
  const expirationTime = Date.now() + secondsRemaining * 1000;
  const timerEl = document.getElementById('depTimer');
  depTimerInterval = setInterval(() => {
    const remaining = Math.floor((expirationTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(depTimerInterval);
      stopDepCheckCycle();
      timerEl.textContent = '❌ Deposit expired';
      setTimeout(closeDeposit, 1500);
      return;
    }
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    timerEl.textContent = `⏳ Time left: ${m}:${s}`;
  }, 1000);
}

function checkDepositPayment(){
  if (!currentDepositId || depChecking) return;

  const myDepositId = currentDepositId;
  const btn = document.getElementById('depCheckBtn');
  const cd  = document.getElementById('depCheckCooldown');

  depChecking = true;
  clearInterval(depCheckInterval);
  btn.disabled = true;
  btn.textContent = 'Checking…';
  if (cd) cd.textContent = '';

  setDepStatus(`<span class="payment-waiting" style="color:var(--p-light)"><span class="spinner"></span> Checking payment...</span>`);

  fetch(`/api/wallet/zec/deposit/verify/${myDepositId}`, { method: 'POST', headers: { 'X-CSRFToken': csrfToken } })
    .then(res => res.json())
    .then(data => {
      depChecking = false;
      if (myDepositId !== currentDepositId) return;

      if (data.status === 'paid') {
        stopDepCheckCycle();
        clearInterval(depTimerInterval);
        setDepStatus(`<span class="pop-status" style="color:var(--green)"><span class="check-circle">✔️</span> Deposit received!</span>`);
        if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 100, origin: { y: .6 } });
        if (data.new_balance != null) setBalanceDisplay(data.new_balance);
        setTimeout(() => { closeDeposit(); loadTransactions(); }, 2000);
      } else if (data.status === 'expired') {
        stopDepCheckCycle(); clearInterval(depTimerInterval);
        setDepStatus('❌ Deposit expired');
        setTimeout(closeDeposit, 2000);
      } else if (data.stage === 'swapping') {
        btn.disabled = true;
        btn.textContent = 'Checking…';
        setDepStatus(`<span class="payment-waiting" style="color:var(--p-light)"><span class="spinner"></span> Swapping — this will confirm automatically...</span>`);
        clearInterval(depCheckInterval);
        depPhaseEnd = Date.now() + DEP_SWAP_RECHECK * 1000;
        depCheckInterval = setInterval(() => {
          const remaining = Math.ceil((depPhaseEnd - Date.now()) / 1000);
          if (remaining <= 0) { clearInterval(depCheckInterval); checkDepositPayment(); }
        }, 250);
      } else if (data.stage === 'seen') {
        setDepStatus(`<span class="payment-waiting" style="color:var(--p-light)"><span class="spinner"></span> Payment detected, waiting for confirmation…</span>`, DEP_STATUS_CLEAR);
        enterDepCooldown();
      } else {
        setDepStatus('❌ Payment not detected yet. Try again shortly.', DEP_STATUS_CLEAR);
        enterDepCooldown();
      }
    })
    .catch(() => {
      depChecking = false;
      if (myDepositId !== currentDepositId) return;
      setDepStatus('❌ Error checking payment.', DEP_STATUS_CLEAR);
      enterDepCooldown();
    });
}

function openComingSoon() {
  document.getElementById('csOv')?.classList.add('open');
}

function closeComingSoon() {
  document.getElementById('csOv')?.classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['wOv', 'txOv', 'csOv'].forEach(id => document.getElementById(id)?.classList.remove('open'));
    closeTFA();
  }
});

setupOTPInputs();

Object.assign(window, {
  doCopy, bgClose, openWithdraw, revealID, setMax, calcFee,
  toW2, toW1, doSend, closeW, closeTFA, goToSettings, openAll, openTxFromAPI,
  openDeposit, closeDeposit, generateDeposit, copyDepositAddress, copyDepositMemo, shareDeposit, checkDepositPayment,
  setDestMode, onNameInput,
  openComingSoon, closeComingSoon,
});

ensureQrLib().catch(() => {
  console.warn('QR lib failed to preload, will retry on modal open');
});


window.ReviewModule = { init: loadTransactions };

})();