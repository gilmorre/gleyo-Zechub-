(function () {
let CURRENT_BAL = 0;
let LAST_WITHDRAW = 0;
const MIN_WITHDRAW = 1;
const MAX_WITHDRAW = 300;


function updateWithdrawButton(){
  const btn = document.querySelector('.btn-p');

  if (!btn) return;

  if (CURRENT_BAL <= 0){
    btn.disabled = true;
    btn.style.opacity = 0.5;
    btn.style.cursor = "not-allowed";
  } else {
    btn.disabled = false;
    btn.style.opacity = 1;
    btn.style.cursor = "pointer";
  }
}


const TX={
  tx1:{type:'in',label:'Reward Payment · Q2 Final',amt:'+500.00 USDC',usd:'≈ $500.00 USD',hash:'0xab3f8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9e219',date:'March 15, 2026 · 10:42 AM',block:'67,234,891',from:'0x5f3a…reward_pool',to:'0x3a9f…c482',gas:'0.000021 MATIC',conf:'142',status:'Confirmed'},
  tx2:{type:'in',label:'Reward Payment · Q2 Mid',amt:'+400.00 USDC',usd:'≈ $400.00 USD',hash:'0x7c12f3e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a034',date:'March 01, 2026 · 09:15 AM',block:'67,012,443',from:'0x5f3a…reward_pool',to:'0x3a9f…c482',gas:'0.000019 MATIC',conf:'3,012',status:'Confirmed'},
  tx3:{type:'in',label:'Reward Payment · Q2 Start',amt:'+240.00 USDC',usd:'≈ $240.00 USD',hash:'0xf491b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9b77c',date:'February 15, 2026 · 08:00 AM',block:'66,789,120',from:'0x5f3a…reward_pool',to:'0x3a9f…c482',gas:'0.000018 MATIC',conf:'8,441',status:'Confirmed'},
  tx4:{type:'pend',label:'Deduction · Platform Fee',amt:'−60.00 USDC',usd:'≈ $60.00 USD',hash:'0xd820a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e3f11',date:'March 15, 2026 · 10:42 AM',block:'Pending',from:'0x3a9f…c482',to:'0xfee1…platform',gas:'0.000021 MATIC',conf:'Pending',status:'Pending'}
};

const root = document.querySelector('.reward-conte-inner');
let tfaEnabled = root?.dataset?.tfaEnabled === 'true';
function revealID(el) {
  if (el.classList.contains('revealed')) return;
  
  const cover = el.querySelector('.id-cover');
  const rect = cover.getBoundingClientRect();
  
  // 🔥 Create particles that scatter in all directions
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    
    // Random start position within the cover
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    p.style.left = startX + '%';
    p.style.top = startY + '%';
    
    // 🔥 Safari-style scatter: radial outward motion with variation
    const angle = Math.random() * Math.PI * 2; // Random direction
    const distance = 40 + Math.random() * 80; // Random distance
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance - Math.random() * 20; // Slight upward bias
    
    p.style.setProperty('--dx', driftX + 'px');
    p.style.setProperty('--dy', driftY + 'px');
    
    // 🔥 Stagger particle animations slightly
    p.style.animationDelay = Math.random() * 0.1 + 's';
    
    cover.appendChild(p);
  }
  
  el.classList.add('revealing');
  
  setTimeout(() => {
    el.classList.add('revealed');
    // Clean up particles after animation
    cover.innerHTML = '';
  }, 900);
}


function doCopy(b){
  const el = document.querySelector('.wa-val');
  const text = el?.dataset?.full || '';

  if (!text) {
    showToast("No wallet address to copy.", "error");
    return;
  }

  const fallbackCopy = () => {
    const ta = document.createElement("textarea");
    ta.value = text;

    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.left = "-9999px";

    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    try {
      document.execCommand("copy");
    } catch (e) {}

    document.body.removeChild(ta);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }

  // UI feedback (unchanged)
  b.classList.add('ok');
  b.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg> Copied
  `;

  setTimeout(()=>{
    b.classList.remove('ok');
    b.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="3.5" y="3.5" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.1"/>
        <path d="M1.5 7.5V2C1.5 1.72 1.72 1.5 2 1.5H7.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg> Copy
    `;
  }, 1600);
}

/* WITHDRAW */
function openWithdraw(){
  if (CURRENT_BAL <= 0) {
    showToast("You don’t have any funds to withdraw.", "error");
    return;
  }
  ['w1','w2','w3'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.style.display=i===0?'':'none';});
  const r=id=>document.getElementById(id);
  if(r('amtIn')) r('amtIn').value='';
  if(r('destIn')) r('destIn').value='';
  if(r('rcv')) r('rcv').textContent='—';
  if(r('procBtn')) r('procBtn').disabled=true;
  if(r('balRemain')){r('balRemain').textContent='Balance: 0.00 USDC';r('balRemain').className='bal-remain';}
  if(r('remainAfter')){r('remainAfter').textContent='—';r('remainAfter').style.color='var(--sub)';}
  if(r('amtErr')) r('amtErr').textContent='';
  if(r('addrErr')) r('addrErr').textContent='';
  r('wOv').classList.add('open');
}
function closeW(){document.getElementById('wOv').classList.remove('open');}
function setMax(){const a=document.getElementById('amtIn');if(a){a.value='1140.00';calcFee();}}
function calcFee(){
  const BAL=1140;
  const v=parseFloat(document.getElementById('amtIn')?.value)||0;
  const dest=document.getElementById('destIn')?.value?.trim()||'';
  const r=id=>document.getElementById(id);
  if(r('balRemain')){
    if(v<=0){r('balRemain').textContent='Balance: '+BAL.toFixed(2)+' USDC';r('balRemain').className='bal-remain';}
    else{const left=BAL-v;
      if(v>BAL){r('balRemain').textContent='Insufficient balance';r('balRemain').className='bal-remain danger';}
      else if(left<50){r('balRemain').textContent='Remaining: '+left.toFixed(2)+' USDC';r('balRemain').className='bal-remain warn';}
      else{r('balRemain').textContent='Remaining: '+left.toFixed(2)+' USDC';r('balRemain').className='bal-remain';}
    }
  }
  if(r('remainAfter')){
    if(v>0&&v<=BAL){const left=BAL-v;r('remainAfter').textContent=left.toFixed(2)+' USDC';r('remainAfter').style.color=left<50?'var(--amber)':'var(--sub)';}
    else{r('remainAfter').textContent='—';r('remainAfter').style.color='var(--sub)';}
  }
  if(r('rcv')) r('rcv').textContent=v>0&&v<=BAL?v.toFixed(2)+' USDC':'—';
  let amtOk=false;
  if(r('amtErr')){
  if (v > BAL) {
    r('amtErr').textContent = 'Amount exceeds your available balance.';
  }
  else if (v > 0 && v < MIN_WITHDRAW) {
    r('amtErr').textContent = 'Minimum withdrawal is 1 USDC.';
  }
  else if (v > MAX_WITHDRAW) {
    r('amtErr').textContent = 'Maximum withdrawal is 300 USDC per transaction.';
  }
  else {
    r('amtErr').textContent = '';
    amtOk = v >= MIN_WITHDRAW && v <= MAX_WITHDRAW && v <= BAL;
  }
  } else {amtOk=v>=1&&v<=BAL;}
  const addrOk=dest.length>=10;
  if(r('addrErr')){if(dest.length>0&&dest.length<10){r('addrErr').textContent='Enter a valid wallet address.';}else{r('addrErr').textContent='';}}
  if(r('procBtn')) r('procBtn').disabled=!(amtOk&&addrOk);
}
function toW2(){
  const v = parseFloat(document.getElementById('amtIn')?.value) || 0;

  if (v < 1) {
    showToast("Minimum withdrawal is 1 USDC.", "error");
    return;
  }

  if (v > 300) {
    showToast("Maximum withdrawal is 300 USDC per transaction.", "error");
    return;
  }

  if (v > CURRENT_BAL) {
    showToast("Insufficient balance.", "error");
    return;
  }

  LAST_WITHDRAW = v;

  const d = document.getElementById('destIn')?.value || '(not specified)';
  const r=id=>document.getElementById(id);

  if(r('cAmt')) r('cAmt').textContent = v.toFixed(2)+' USDC';
  if(r('cDest')) r('cDest').textContent = d.length>22 ? d.slice(0,11)+'…'+d.slice(-7) : d;
  if(r('cRcv')) r('cRcv').textContent = v.toFixed(2)+' USDC';

  r('w1').style.display='none';
  r('w2').style.display='';
}


function toW1(){document.getElementById('w2').style.display='none';document.getElementById('w1').style.display='';}

function doSend(){
  if(!tfaEnabled){
    goToSettings();  
    return;
  }

  open2FA();  
}
/* 2FA */
function open2FA(){
  const blocked=document.getElementById('tfaBlocked');
  const verify=document.getElementById('tfaVerify');
  if(blocked) blocked.style.display=tfaEnabled?'none':'';
  if(verify) verify.style.display=tfaEnabled?'':'none';
  for(let i=0;i<6;i++){const c=document.getElementById('otp'+i);if(c){c.value='';c.classList.remove('err','ok');}}
  setupOTPInputs();
  const errEl=document.getElementById('otpErr');if(errEl)errEl.textContent='';
  const vBtn=document.getElementById('verifyBtn');if(vBtn)vBtn.disabled=true;
  document.getElementById('tfaOv').classList.add('open');
  if(tfaEnabled) setTimeout(()=>document.getElementById('otp0')?.focus(),350);
}
function closeTFA(){document.getElementById('tfaOv').classList.remove('open');}

function goToSettings(){
  closeTFA();
  closeW();

  let path = window.location.pathname + window.location.search;

  if (path.includes("/settings")) {
    path = "/";
  }

  sessionStorage.setItem("accountBackRoute", path);

  const toast = document.createElement('div');
  toast.className = 'toast pending';
  toast.textContent = 'Redirecting to Settings › Security…';

  document.body.appendChild(toast);

  requestAnimationFrame(()=>{
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(()=>{
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(6px)';

    setTimeout(()=>{
      window.location.href = '/settings/security';
    }, 300);

  }, 1800);
}



function setupOTPInputs() {
  const inputs = Array.from({ length: 6 }, (_, i) =>
    document.getElementById('otp' + i)
  );

  function distributeFrom(startIndex, value) {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');

    for (let i = 0; i < digits.length; i++) {
      const target = inputs[startIndex + i];
      if (target) {
        target.value = digits[i];
        target.classList.remove('err');
      }
    }

    const next = Math.min(startIndex + digits.length, inputs.length - 1);
    inputs[next]?.focus();

    checkFull();
  }

  inputs.forEach((input, idx) => {
    if (!input || input._r) return;
    input._r = true;

    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');

      // 🔥 FIX: handle keyboard autofill ANYWHERE
      if (v.length > 1) {
        distributeFrom(idx, v);
        return;
      }

      // normal single digit
      input.value = v ? v[0] : '';
      input.classList.remove('err');

      if (v && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }

      checkFull();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();

      const paste = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '');

      if (!paste) return;

      distributeFrom(idx, paste);
    });
  });
}


document.addEventListener('DOMContentLoaded',setupOTPInputs);
function checkFull(){
  const code = Array.from({length:6},(_,i)=>
    document.getElementById('otp'+i)?.value || ''
  ).join('');

  if(code.length === 6){
    autoVerify(code);  
  }
}


async function autoVerify(code){
  const errEl = document.getElementById('otpErr');

  try{
    const res = await fetch('/api/verify-totp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ code })
    });

    const data = await res.json();

    if(!res.ok){
      handleOTPError(data.error);
      return;
    }

    // ✅ SUCCESS FLOW
    handleOTPSuccess();

  }catch(err){
    handleOTPError('network');
  }
}


function handleOTPSuccess(){
  for(let i=0;i<6;i++){
    document.getElementById('otp'+i)?.classList.add('ok');
  }

  setTimeout(()=>{
    closeTFA();

    // 🔥 FAKE BALANCE REDUCTION
    CURRENT_BAL -= LAST_WITHDRAW;

    // 🔥 UPDATE UI BALANCE
    const balEl = document.querySelector('.w-bal');
    const usdEl = document.querySelector('.w-usd');

    if(balEl){
      balEl.innerHTML = `${CURRENT_BAL.toFixed(2)} <em>USDC</em>`;
    }

    if(usdEl){
      usdEl.innerHTML = `≈ $${CURRENT_BAL.toFixed(2)} USD · <b>on Polygon</b>`;
    }

    const id = 'tx' + (Object.keys(TX).length + 1);

    TX[id] = {
      type:'pend',
      label:'Withdrawal',
      amt:`−${LAST_WITHDRAW.toFixed(2)} USDC`,
      usd:`≈ $${LAST_WITHDRAW.toFixed(2)} USD`,
      hash:'0x'+Array.from({length:64},()=> '0123456789abcdef'[Math.random()*16|0]).join(''),
      date:new Date().toLocaleString(),
      block:'Pending',
      from:'0x3a9f…c482',
      to:document.getElementById('cDest')?.textContent || 'External',
      gas:'0.000021 MATIC',
      conf:'Pending',
      status:'Pending'
    };

 

    document.getElementById('w2').style.display='none';

    const hb = document.getElementById('txHashBox');
    if(hb){
      const h = TX[id].hash;
      hb.textContent = 'Tx: ' + h.slice(0,18)+'…'+h.slice(-6);
    }

    document.getElementById('w3').style.display='';

  }, 500);
}


function handleOTPError(type){
  const errEl = document.getElementById('otpErr');

  let msg = 'Something went wrong';

  if(type === 'invalid') msg = 'Incorrect code — try again.';
  if(type === 'no_2fa' || type === 'not_enabled'){
    goToSettings();
    return;
  }

  if(errEl) errEl.textContent = msg;

  for(let i=0;i<6;i++){
    const c = document.getElementById('otp'+i);
    if(c){
      c.classList.add('err');
      c.classList.remove('ok');
    }
  }

  setTimeout(()=>{
    for(let i=0;i<6;i++){
      const c = document.getElementById('otp'+i);
      if(c){
        c.value='';
        c.classList.remove('err');
      }
    }

    if(errEl) errEl.textContent='';
    document.getElementById('otp0')?.focus();

  }, 900);
}
let ALL_TX = []; // 🔥 global source of truth

async function loadTransactions() {
  const container = document.getElementById("txContainer");
  if (!container) return;



  try {
    const res = await fetch("/api/user/transactions");
    const txs = await res.json();

    ALL_TX = txs; // ✅ store for openAll

    if (!txs.length) {
      container.innerHTML = `
        <div class="no-tx">
          No transaction history
        </div>
      `;
      return;
    }

    let totalEarned = 0;

    container.innerHTML = txs.map(tx => {
      const isIn = tx.type === "in";
      const isPending = tx.status === "pending";

      if (isIn && tx.status === "confirmed") {
        totalEarned += tx.amount;
      }

      return `
        <div class="tx-row">
          <div class="tx-dot ${isPending ? "pend" : "in"}"></div>

          <div class="tx-info">
            <div class="tx-desc">${tx.remark || "Transaction"}</div>
            <div class="tx-time">${tx.date}</div>
          </div>

          <div class="tx-right">
            <div class="tx-amt ${isIn ? "in" : "pend"}">
              ${isIn ? "+" : "−"}${tx.amount.toFixed(2)} ${tx.token}
            </div>
          </div>
        </div>
      `;
    }).join("");

    updateStats(txs, totalEarned);

  } catch (err) {
    container.innerHTML = "Failed to load transactions";
  }
}

function updateStats(txs, totalEarned) {
  const earnedEl = document.getElementById("totalEarned");
  const txCountEl = document.getElementById("txCount");

  if (earnedEl) {
    earnedEl.textContent = totalEarned.toFixed(2);
  }

  if (txCountEl) {
    txCountEl.textContent = txs.length;
  }
}

setupOTPInputs();


/* TX DETAIL */
function openTx(id){
  const t=TX[id];if(!t)return;
  const cc=t.type==='in'?'g':t.type==='pend'?'a':'';
  const color=t.type==='in'?'var(--green)':t.type==='pend'?'var(--amber)':'var(--red)';
  const statusLabel=t.status==='Confirmed'?`<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Confirmed`:`<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 2.5V4.5L5.8 5.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg> Pending`;
  document.getElementById('txContent').innerHTML=`<div class="sbadge ${t.type}">${statusLabel}</div><div class="d-amt" style="color:${color}">${t.amt}</div><div class="d-usd">${t.usd}</div><div class="dg"><div class="dr"><span class="dk">Description</span><span class="dv">${t.label}</span></div><div class="dr"><span class="dk">Date</span><span class="dv">${t.date}</span></div><div class="dr"><span class="dk">Block</span><span class="dv">${t.block}</span></div><div class="dr"><span class="dk">Confirmations</span><span class="dv ${cc}">${t.conf}</span></div><div class="dr"><span class="dk">From</span><span class="dv">${t.from}</span></div><div class="dr"><span class="dk">To</span><span class="dv">${t.to}</span></div><div class="dr"><span class="dk">Gas</span><span class="dv">${t.gas}</span></div><div class="dr"><span class="dk">Network</span><span class="dv">Polygon Mainnet</span></div><div class="dr"><span class="dk">Tx Hash</span><span class="dv" style="font-size:.62rem">${t.hash}</span></div></div><button class="exp-btn" onclick="alert('Opens PolygonScan in production')"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2.5H2.5C2.22 2.5 2 2.72 2 3V10.5C2 10.78 2.22 11 2.5 11H10C10.28 11 10.5 10.78 10.5 10.5V8" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"/><path d="M7.5 2H11V5.5M11 2L6 7" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>View on PolygonScan</button>`;
  document.getElementById('txOv').classList.add('open');
}


function openAll() {
  const content = document.getElementById('txContent');

  // 🔥 EMPTY STATE
  if (!ALL_TX.length) {
    content.innerHTML = `
      <div class="s-title">All Transactions</div>

      <div class="no-tx">
        No transaction history
      </div>
    `;

    document.getElementById('txOv').classList.add('open');
    return;
  }

  // 🔥 NORMAL STATE
  content.innerHTML = `
    <div class="s-title">All Transactions</div>
    <div class="s-sub" style="margin-bottom:14px">
      Complete history · #P-0011
    </div>

    ${ALL_TX.map((tx, i) => {
      const isIn = tx.type === "in";
      const isPending = tx.status === "pending";

      return `
        <div class="stx" onclick="openTxFromAPI(${i})">
          
          <div class="tx-dot ${isPending ? "pend" : "in"}"></div>

          <div class="tx-info">
            <div class="tx-desc">${tx.remark || "Transaction"}</div>
            <div class="tx-time">${tx.date}</div>
          </div>

          <div class="tx-right">
            <div class="tx-amt ${isIn ? "in" : "pend"}">
              ${isIn ? "+" : "−"}${tx.amount.toFixed(2)} ${tx.token}
            </div>
            <div class="tx-usd">
              ≈ $${tx.amount.toFixed(2)} USD
            </div>
          </div>

          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M1 1L5 5L1 9" stroke="currentColor" stroke-width="1.4"/>
          </svg>

        </div>
      `;
    }).join("")}
  `;

  document.getElementById('txOv').classList.add('open');
}
function switchTx(id){document.getElementById('txOv').classList.remove('open');setTimeout(()=>openTx(id),220);}
function bgClose(e,id){if(e.target===document.getElementById(id))document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){['wOv','txOv'].forEach(id=>document.getElementById(id)?.classList.remove('open'));closeTFA();}});
Object.assign(window, {
  doCopy,
  bgClose,
  openWithdraw,
  revealID,
  setMax,
  openAll,
  calcFee,
  toW2,
  toW1,
  doSend,
  closeW,
  closeTFA,
  goToSettings
});
  window.ReviewModule = {
    init: loadTransactions
  };
})();
