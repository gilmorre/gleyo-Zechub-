(function () {

let walletDepsPromise = null;
async function loadWalletDeps() {
  if (walletDepsPromise) return walletDepsPromise;
  walletDepsPromise = (async () => {
    if (!window.QRCodeStyling) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    if (!window._WCSignClient) {
      const m = await import('https://esm.sh/@walletconnect/sign-client@2.13.3');
      window._WCSignClient = m.SignClient;
    }
  })();
  return walletDepsPromise;
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const PROJECT_ID = '682e6293e0b2e46d9300f58949ebb2d6';

const WALLETS = [
  { key:'metamask', name:'MetaMask',       descDefault:'Browser extension or mobile', descMobile:'Tap to open wallet app', iconBg:'var(--text-main)', iconHTML:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.83 470.86"><defs><style>.a{fill:#e2761b;stroke:#e2761b}.a,.b,.c,.d,.e,.f,.g,.h,.i,.j{stroke-linecap:round;stroke-linejoin:round}.b{fill:#e4761b;stroke:#e4761b}.c{fill:#d7c1b3;stroke:#d7c1b3}.d{fill:#233447;stroke:#233447}.e{fill:#cd6116;stroke:#cd6116}.f{fill:#e4751f;stroke:#e4751f}.g{fill:#f6851b;stroke:#f6851b}.h{fill:#c0ad9e;stroke:#c0ad9e}.i{fill:#161616;stroke:#161616}.j{fill:#763d16;stroke:#763d16}</style></defs><polygon class="a" points="482.09 0.5 284.32 147.38 320.9 60.72 482.09 0.5"/><polygon class="b" points="25.54 0.5 221.72 148.77 186.93 60.72 25.54 0.5"/><polygon class="b" points="410.93 340.97 358.26 421.67 470.96 452.67 503.36 342.76 410.93 340.97"/><polygon class="b" points="4.67 342.76 36.87 452.67 149.57 421.67 96.9 340.97 4.67 342.76"/><polygon class="b" points="143.21 204.62 111.8 252.13 223.7 257.1 219.73 136.85 143.21 204.62"/><polygon class="b" points="364.42 204.62 286.91 135.46 284.32 257.1 396.03 252.13 364.42 204.62"/><polygon class="b" points="149.57 421.67 216.75 388.87 158.71 343.55 149.57 421.67"/><polygon class="b" points="290.88 388.87 358.26 421.67 348.92 343.55 290.88 388.87"/><polygon class="c" points="358.26 421.67 290.88 388.87 296.25 432.8 295.65 451.28 358.26 421.67"/><polygon class="c" points="149.57 421.67 212.18 451.28 211.78 432.8 216.75 388.87 149.57 421.67"/><polygon class="d" points="213.17 314.54 157.12 298.04 196.67 279.95 213.17 314.54"/><polygon class="d" points="294.46 314.54 310.96 279.95 350.71 298.04 294.46 314.54"/><polygon class="e" points="149.57 421.67 159.11 340.97 96.9 342.76 149.57 421.67"/><polygon class="e" points="348.72 340.97 358.26 421.67 410.93 342.76 348.72 340.97"/><polygon class="e" points="396.03 252.13 284.32 257.1 294.66 314.54 311.16 279.95 350.91 298.04 396.03 252.13"/><polygon class="e" points="157.12 298.04 196.87 279.95 213.17 314.54 223.7 257.1 111.8 252.13 157.12 298.04"/><polygon class="f" points="111.8 252.13 158.71 343.55 157.12 298.04 111.8 252.13"/><polygon class="f" points="350.91 298.04 348.92 343.55 396.03 252.13 350.91 298.04"/><polygon class="f" points="223.7 257.1 213.17 314.54 226.29 382.31 229.27 293.07 223.7 257.1"/><polygon class="f" points="284.32 257.1 278.96 292.87 281.34 382.31 294.66 314.54 284.32 257.1"/><polygon class="g" points="294.66 314.54 281.34 382.31 290.88 388.87 348.92 343.55 350.91 298.04 294.66 314.54"/><polygon class="g" points="157.12 298.04 158.71 343.55 216.75 388.87 226.29 382.31 213.17 314.54 157.12 298.04"/><polygon class="h" points="295.65 451.28 296.25 432.8 291.28 428.42 216.35 428.42 211.78 432.8 212.18 451.28 149.57 421.67 171.43 439.55 215.75 470.36 291.88 470.36 336.4 439.55 358.26 421.67 295.65 451.28"/><polygon class="i" points="290.88 388.87 281.34 382.31 226.29 382.31 216.75 388.87 211.78 432.8 216.35 428.42 291.28 428.42 296.25 432.8 290.88 388.87"/><polygon class="j" points="490.44 156.92 507.33 75.83 482.09 0.5 290.88 142.41 364.42 204.62 468.37 235.03 491.43 208.2 481.49 201.05 497.39 186.54 485.07 177 500.97 164.87 490.44 156.92"/><polygon class="j" points="0.5 75.83 17.39 156.92 6.66 164.87 22.56 177 10.44 186.54 26.34 201.05 16.4 208.2 39.26 235.03 143.21 204.62 216.75 142.41 25.54 0.5 0.5 75.83"/><polygon class="g" points="468.37 235.03 364.42 204.62 396.03 252.13 348.92 343.55 410.93 342.76 503.36 342.76 468.37 235.03"/><polygon class="g" points="143.21 204.62 39.26 235.03 4.67 342.76 96.9 342.76 158.71 343.55 111.8 252.13 143.21 204.62"/><polygon class="g" points="284.32 257.1 290.88 142.41 321.1 60.72 186.93 60.72 216.75 142.41 223.7 257.1 226.09 293.27 226.29 382.31 281.34 382.31 281.74 293.27 284.32 257.1"/></svg>` },
  { key:'trust',    name:'Trust Wallet',   descDefault:'Mobile · by Binance',         descMobile:'Tap to open wallet app', iconBg:'var(--text-main)', iconHTML:`<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M37.523 83.593L255.21 13.046v488.371C99.709 436.301 37.523 311.5 37.523 240.964V83.593z" fill="#0500ff"/><path d="M38.154 6.673L19.433.606v42c13.372-5.6 18.721-16.333 18.721-22.399V6.673z" fill="url(#tw2)" transform="matrix(11.62788 0 0 11.62788 29.256 6)"/><defs><linearGradient id="tw2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(107.581 17.445 10.98) scale(46.5663)"><stop offset="0" stop-color="#00f"/><stop offset=".08" stop-color="#0094ff"/><stop offset=".16" stop-color="#48ff91"/><stop offset=".42" stop-color="#0094ff"/><stop offset=".68" stop-color="#0038ff"/><stop offset="1" stop-color="#0500ff"/></linearGradient></defs></svg>` },
  { key:'coinbase', name:'Coinbase Wallet', descDefault:'Browser extension or mobile', descMobile:'Tap to open wallet app', iconBg:'#0052ff', iconHTML:`<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><circle cx="512" cy="512" r="512" fill="#0052ff"/><path d="M516.3 361.83c60.28 0 108.1 37.18 126.26 92.47H764C742 336.09 644.47 256 517.27 256 372.82 256 260 365.65 260 512.49S370 768 517.27 768c124.35 0 223.82-80.09 245.84-199.28H642.55c-17.22 55.3-65 93.45-125.32 93.45-83.23 0-141.56-63.89-141.56-149.68.04-86.77 57.43-150.66 140.63-150.66z" fill="#fff"/></svg>` },
  { key:'okx',     name:'OKX Wallet',      descDefault:'Browser extension or mobile', descMobile:'Tap to open wallet app', iconBg:'#000', iconHTML:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="13.81 13.57 123.98 123.98"><path d="M40.63 42.21c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.58.71 1.58 1.58v20.3c0 .88-.71 1.59-1.58 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3zm23.46 66.7c0 .87-.71 1.58-1.58 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.58.71 1.58 1.59v20.3zm21.86-21.62h-20.3c-.87 0-1.59-.71-1.59-1.59v-20.3c0-.87.71-1.59 1.59-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3c0 .87-.71 1.59-1.59 1.59zm25.05 21.62c0 .87-.71 1.58-1.59 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3zm0-46.41c0 .88-.71 1.59-1.59 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.59.71 1.59 1.58v20.3z" fill="#fff"/></svg>` },
  { key:'bitget',  name:'Bitget Wallet',   descDefault:'Browser extension or mobile', descMobile:'Tap to open wallet app', iconBg:'#022f34', iconHTML:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path d="M150 110 Q140 100 155 100 L220 100 Q235 100 250 120 L300 180 Q315 200 300 220 L250 280 Q235 300 220 300 L155 300 Q140 300 150 290 L230 200 Z" fill="#1fcad3"/></svg>` },
];

const WALLET_BG = { metamask:'var(--text-main)', trust:'var(--text-main)', coinbase:'#0052ff', okx:'#000', bitget:'#022f34', universal:'var(--text-main)' };

const WC_NAMESPACES = {
  requiredNamespaces: { eip155: { methods:['personal_sign'], chains:['eip155:1'], events:['accountsChanged','chainChanged'] } },
  optionalNamespaces: { eip155: { methods:['eth_sign','eth_sendTransaction','eth_signTypedData_v4'], chains:['eip155:1','eip155:56','eip155:137','eip155:42161','eip155:10','eip155:8453','eip155:43114'], events:['accountsChanged','chainChanged'] } }
};

const DEEP_LINKS = {
  metamask: u=>`https://metamask.app.link/wc?uri=${encodeURIComponent(u)}`,
  trust:    u=>`https://link.trustwallet.com/wc?uri=${encodeURIComponent(u)}`,
  coinbase: u=>`https://go.cb-w.com/wc?uri=${encodeURIComponent(u)}`,
  okx:      u=>`okx://main/wc?uri=${encodeURIComponent(u)}`,
  bitget:   u=>`bitkeep://wc?uri=${encodeURIComponent(u)}`
};

const injectedChecks = {
  metamask: p=>!!(p.isMetaMask&&!p.isCoinbaseWallet&&!p.isBitKeep&&!p.isBitget&&!p.isOKX&&!p.isOKExWallet&&!p.isTrust&&!p.isBraveWallet&&!p.isRabby),
  coinbase: p=>!!(p.isCoinbaseWallet),
  okx:      p=>!!(p.isOKX||p.isOKExWallet),
  bitget:   p=>!!(p.isBitKeep||p.isBitget),
  trust:    p=>!!(p.isTrust)
};

function getProvider(k) {
  if (!window.ethereum) return null;
  if (window.ethereum.providers?.length) return window.ethereum.providers.find(injectedChecks[k])||null;
  if (k==='metamask') { const p=window.ethereum; if(p.isOKX||p.isOKExWallet||p.isBitKeep||p.isBitget||p.isTrust||p.isCoinbaseWallet) return null; }
  return injectedChecks[k](window.ethereum) ? window.ethereum : null;
}

function detectWallets() {
  const d=new Set();
  WALLETS.forEach(w=>{ if(getProvider(w.key)) d.add(w.key); });
  return d;
}

let signClient=null, session=null, pendingUri=null, pendingWalletKey=null;

async function resetAndInitWC() {
  if (session&&signClient) { signClient.disconnect({topic:session.topic,reason:{code:6000,message:'Reset'}}).catch(()=>{}); }
  session=null; signClient=null;
  for(let i=0;i<60;i++){if(window._WCSignClient)break;await new Promise(r=>setTimeout(r,100));}
  if(!window._WCSignClient) throw new Error('WC not loaded');
  signClient = await window._WCSignClient.init({ projectId:PROJECT_ID, metadata:{name:'Gleyo',description:'Secure wallet connection',url:window.location.origin||'https://gleyo.app',icons:['https://gleyo.app/static/my_logo.png']} });
}

const IsloadingInit=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".2" stop-color="currentColor" stop-opacity=".3"/><stop offset=".4" stop-color="currentColor" stop-opacity=".6"/><stop offset=".7" stop-color="currentColor" stop-opacity=".9"/><stop offset="1" stop-color="currentColor"/></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"/></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"/></svg>`;


async function openEvmModal() {
  const btn=document.getElementById('connect-btn');
  btn.innerHTML=IsloadingInit;
  try { await loadWalletDeps(); } catch(e){ btn.innerHTML='Connect EVM Wallet'; return; }
  btn.innerHTML='Connect EVM Wallet';
  buildWalletList();
  document.getElementById('evm-modal-overlay').classList.add('open');
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  showEvmView('view-list');
}

function closeEvmModal() {
  document.getElementById('evm-modal-overlay').classList.remove('open');
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
}

function evmOverlayClick(e){ if(e.target===document.getElementById('evm-modal-overlay')) closeEvmModal(); }
function evmBackToList(){ showEvmView('view-list'); }
function showEvmView(id){ document.querySelectorAll('#evm-sheet .view').forEach(v=>v.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function showErr(msg){ const b=document.getElementById('err-bar'); b.textContent=msg; b.classList.add('show'); setTimeout(()=>b.classList.remove('show'),6000); }

function setLogo(key) {
  const el=document.getElementById('conn-logo-bg');
  const w=WALLETS.find(w=>w.key===key);
  el.innerHTML=w?w.iconHTML:'';
  el.style.background=WALLET_BG[key]||'var(--text-main)';
}

function buildWalletList() {
  const detectedKeys=detectWallets();
  const container=document.getElementById('wallet-list-container');
  container.innerHTML='';
  const detected=WALLETS.filter(w=>detectedKeys.has(w.key));
  const others=WALLETS.filter(w=>!detectedKeys.has(w.key));
  if(detected.length>0){
    const lbl=document.createElement('div'); lbl.className='section-label'; lbl.textContent='Detected'; container.appendChild(lbl);
    detected.forEach(w=>container.appendChild(makeWalletItem(w,true)));
    if(others.length>0){
      const div=document.createElement('div'); div.className='divider'; container.appendChild(div);
      const lbl2=document.createElement('div'); lbl2.className='section-label'; lbl2.textContent='Other wallets'; container.appendChild(lbl2);
    }
  }
  others.forEach(w=>container.appendChild(makeWalletItem(w,false)));
  const div2=document.createElement('div'); div2.className='divider'; container.appendChild(div2);
  const qrRow=document.createElement('div');
  qrRow.className='wallet-item qr-row'; qrRow.onclick=showUniversalQR;
  qrRow.innerHTML=`<div class="w-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><rect x="3" y="3" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/><rect x="5" y="5" width="3" height="3" rx=".4" fill="#818cf8"/><rect x="16" y="5" width="3" height="3" rx=".4" fill="#818cf8"/><rect x="5" y="16" width="3" height="3" rx=".4" fill="#818cf8"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round"/></svg></div><div class="w-info"><div class="w-name" style="color:var(--accent2)">Scan QR Code <span class="w-tag">ANY WALLET</span></div><div class="w-desc">Works with any WalletConnect app</div></div><span class="w-arrow" style="color:var(--accent2)">›</span>`;
  container.appendChild(qrRow);
}

function makeWalletItem(w,isDetected){
  const item=document.createElement('div');
  item.className='wallet-item'+(isDetected?' detected':'');
  item.onclick=()=>pick(w.name,w.key);
  const desc=isMobile?w.descMobile:(isDetected?'Ready to connect':w.descDefault);
  const tag=isDetected?`<span class="w-tag detected-tag">DETECTED</span>`:'';
  item.innerHTML=`<div class="w-icon" style="background-color:${w.iconBg};border-color:${w.iconBg}">${w.iconHTML}</div><div class="w-info"><div class="w-name">${w.name}${tag}</div><div class="w-desc">${desc}</div></div><span class="w-arrow">›</span>`;
  return item;
}

async function pick(name,key){
  const p=getProvider(key);
  if(p) return connectInjected(p,name,key);
  return connectViaWC(name,key);
}

async function connectInjected(provider,name,key){
  setLogo(key);
  document.getElementById('conn-name').textContent=name;
  document.getElementById('conn-status').textContent='Approve in your wallet extension…';
  showEvmView('view-connecting');
  try { const accs=await provider.request({method:'eth_requestAccounts'}); await signInjected(provider,accs[0],name); }
  catch(e){ showEvmView('view-list'); showErr('Connection rejected.'); }
}

async function signInjected(provider,address,name){
  document.getElementById('sign-name').textContent=name;
  let nonce;
  try { nonce=await getNonce(address); } catch(e){ showEvmView('view-list'); showErr('Failed to get nonce.'); return; }
  const msg=`Welcome to Gleyo\n\nSign this message to verify your wallet.\n\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;
  document.getElementById('sign-preview').textContent=msg;
  showEvmView('view-sign');
  try { const sig=await provider.request({method:'personal_sign',params:[msg,address]}); onEvmConnected(name,address,sig,msg); }
  catch(e){ showEvmView('view-list'); showErr('Signature rejected.'); }
}

async function connectViaWC(name,key){
  setLogo(key);
  document.getElementById('conn-name').textContent=name;
  document.getElementById('conn-status').textContent='Initialising WalletConnect…';
  showEvmView('view-connecting');
  try { await resetAndInitWC(); } catch(e){ showEvmView('view-list'); showErr('Could not load WalletConnect.'); return; }
  document.getElementById('conn-status').textContent='Generating connection…';
  try {
    const {uri,approval}=await signClient.connect(WC_NAMESPACES);
    if(!uri){ showEvmView('view-list'); showErr('Failed to get URI.'); return; }
    pendingUri=uri; pendingWalletKey=key;
    await renderQRView(uri,name,key);
    Promise.race([approval(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),120000))]).then(async sess=>{
      session=sess;
      const accounts=sess.namespaces.eip155?.accounts||[];
      if(!accounts.length){ showEvmView('view-list'); showErr('No accounts returned.'); return; }
      const addr=accounts[0].split(':')[2];
      try { await signWC(addr,name); } catch(e){ showEvmView('view-list'); showErr('Signing failed.'); }
    }).catch(e=>{ showEvmView('view-list'); showErr(e?.message==='timeout'?'Timed out. Try again.':'Session rejected.'); });
  } catch(e){ showEvmView('view-list'); showErr('WalletConnect error: '+(e.message||'Unknown')); }
}

async function showUniversalQR(){
  setLogo('universal');
  document.getElementById('conn-name').textContent='WalletConnect';
  document.getElementById('conn-status').textContent='Generating QR code…';
  showEvmView('view-connecting');
  try { await resetAndInitWC(); } catch(e){ showEvmView('view-list'); showErr('Could not load WalletConnect.'); return; }
  try {
    const {uri,approval}=await signClient.connect(WC_NAMESPACES);
    if(!uri){ showEvmView('view-list'); showErr('Failed.'); return; }
    pendingUri=uri; pendingWalletKey=null;
    await renderQRView(uri,'any wallet',null);
    Promise.race([approval(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),120000))]).then(async sess=>{
      session=sess;
      const accounts=sess.namespaces.eip155?.accounts||[];
      if(!accounts.length){ showEvmView('view-list'); showErr('No accounts returned.'); return; }
      const addr=accounts[0].split(':')[2];
      try { await signWC(addr,'WalletConnect'); } catch(e){ showEvmView('view-list'); showErr('Signing failed.'); }
    }).catch(e=>{ showEvmView('view-list'); showErr(e?.message==='timeout'?'Timed out.':'Session timed out.'); });
  } catch(e){ showEvmView('view-list'); showErr('Error: '+(e.message||'Unknown')); }
}

async function svgToPngDataUrl(svgString,size=120){
  return new Promise(resolve=>{
    let svg=svgString.trim();
    svg=svg.replace(/<svg([^>]*)>/,(match,attrs)=>{ const cleaned=attrs.replace(/\s*(width|height)="[^"]*"/g,''); return `<svg${cleaned} width="${size}" height="${size}">`; });
    if(svg.includes('<style>')&&svg.includes('.a{')){
      const styleMatch=svg.match(/<style>([\s\S]*?)<\/style>/);
      if(styleMatch){ const styleText=styleMatch[1]; const classMap={}; const ruleRe=/\.(\w+)\{([^}]+)\}/g; let m; while((m=ruleRe.exec(styleText))!==null){ classMap[m[1]]=m[2].replace(/stroke-linecap:[^;]+;?/g,'').replace(/stroke-linejoin:[^;]+;?/g,''); } svg=svg.replace(/<style>[\s\S]*?<\/style>/,''); svg=svg.replace(/class="([^"]+)"/g,(match,cls)=>{ const style=classMap[cls]||''; return style?`style="${style}"`:''; }); }
    }
    const encoded=btoa(unescape(encodeURIComponent(svg)));
    const dataUrl=`data:image/svg+xml;base64,${encoded}`;
    const img=new Image();
    img.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d'); try{ ctx.drawImage(img,0,0,size,size); const result=canvas.toDataURL('image/png'); resolve(result.length<200?null:result); }catch(e){ resolve(null); } };
    img.onerror=()=>resolve(null);
    img.src=dataUrl;
  });
}

async function renderQRView(uri,walletName,walletKey){
  document.getElementById('qr-title').textContent=walletKey?`Connect with ${walletName}`:'Scan with any wallet';
  document.getElementById('qr-desc').textContent=walletKey?`Open ${walletName} and scan this code`:'Open any WalletConnect wallet and scan';
  const canvasWrap=document.querySelector('.qr-wrap');
  canvasWrap.innerHTML='';
  try{
    const size=240,dpr=window.devicePixelRatio||1;
    const w=WALLETS.find(w=>w.key===walletKey);
    const svgString=w?w.iconHTML:'';
    const pngDataUrl=svgString?await svgToPngDataUrl(svgString,120):null;
    const qr=new QRCodeStyling({ width:size*dpr,height:size*dpr,type:'canvas',data:uri,qrOptions:{errorCorrectionLevel:'H'},dotsOptions:{color:'#000',type:'rounded'},backgroundOptions:{color:'transparent'},...(pngDataUrl?{image:pngDataUrl,imageOptions:{imageSize:0.20,margin:6}}:{}),cornersSquareOptions:{type:'extra-rounded',color:'#000'},cornersDotOptions:{type:'dot',color:'#000'} });
    qr.append(canvasWrap);
    const canvas=canvasWrap.querySelector('canvas');
    canvas.style.width=size+'px'; canvas.style.height=size+'px';
  }catch(e){ const canvas=document.createElement('canvas'); canvas.width=220; canvas.height=220; canvasWrap.appendChild(canvas); const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,220,220); }
  document.getElementById('qr-uri-text').textContent=uri.slice(0,90)+'…';
  const dlBtn=document.getElementById('deep-link-btn');
  if(isMobile&&walletKey&&DEEP_LINKS[walletKey]){ dlBtn.style.display='block'; dlBtn.textContent=`Open in ${walletName}`; } else dlBtn.style.display='none';
  showEvmView('view-qr');
}

function openDeepLink(){ if(!pendingUri||!pendingWalletKey) return; const fn=DEEP_LINKS[pendingWalletKey]; if(fn) window.open(fn(pendingUri),'_blank'); }

async function signWC(address,name){
  document.getElementById('sign-name').textContent=name;
  const nonce=await getNonce(address);
  const msg=`Welcome to Gleyo\n\nSign this message to verify your wallet.\n\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;
  document.getElementById('sign-preview').textContent=msg;
  showEvmView('view-sign');
  const accounts=session.namespaces.eip155?.accounts||[];
  const firstAccount=accounts[0]||'eip155:1:0x0000000000000000000000000000000000000000';
  const parts=firstAccount.split(':');
  const chainId=`eip155:${parts[1]}`;
  let sig;
  try { sig=await signClient.request({topic:session.topic,chainId,request:{method:'personal_sign',params:[msg,address]}}); }
  catch(e){ showEvmView('view-list'); showErr('Signature rejected.'); throw e; }
  onEvmConnected(name,address,sig,msg);
}

function onEvmConnected(name,address,sig,message){
  const walletLbl=document.getElementById('conn-wallet-lbl');
  if(walletLbl) walletLbl.textContent=name;
  const addrEl=document.getElementById('conn-addr');
  if(addrEl) addrEl.textContent=address.slice(0,6)+'...'+address.slice(-4);
  const sigStatus=document.getElementById('conn-sig-status');
  if(sigStatus){ sigStatus.innerHTML='✓ Verified'; sigStatus.style.color='var(--green)'; }
  const sigEl=document.getElementById('sig-display');
  if(sigEl){ sigEl.textContent=sig.slice(0,12)+'...'+sig.slice(-8); sigEl.classList.remove('hidden'); }
  const discBtn=document.getElementById('disc-btn');
  if(discBtn) discBtn.classList.remove('hidden');
  document.getElementById('evm-state-nc').classList.remove('active');
  document.getElementById('evm-state-c').classList.add('active');
  sendWalletToBackend(name,address,sig,message);
  closeEvmModal();
}

function onEvmDisconnectUI(){
  const sigStatus=document.getElementById('conn-sig-status');
  if(sigStatus){ sigStatus.textContent='Not verified'; sigStatus.style.color='#999'; }
  const sigEl=document.getElementById('sig-display');
  if(sigEl) sigEl.classList.add('hidden');
  const discBtn=document.getElementById('disc-btn');
  if(discBtn) discBtn.classList.add('hidden');
  document.getElementById('evm-state-c').classList.remove('active');
  document.getElementById('evm-state-nc').classList.add('active');
}

async function disconnect(){
  try {
    const res=await fetch('/api/wallet/disconnect',{method:'POST',credentials:'include',headers:{'X-CSRFToken':csrfToken}});
    const data=await res.json();
    if(!res.ok){ alert(data.error||'Failed to disconnect'); return; }
    if(session&&signClient){ signClient.disconnect({topic:session.topic,reason:{code:6000,message:'User disconnected'}}).catch(()=>{}); }
    session=null;
    onEvmDisconnectUI();
  } catch(e){ alert('Network error'); }
}

async function getNonce(address){
  const res=await fetch('/api/wallet/nonce',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRFToken':csrfToken},body:JSON.stringify({address})});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||'Failed to get nonce');
  return data.nonce;
}

async function sendWalletToBackend(name,address,signature,message){
  try {
    const res=await fetch('/api/wallet/connect',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRFToken':csrfToken},body:JSON.stringify({address,signature,message,wallet_name:name})});
    const data=await res.json();
    if(!res.ok){ console.error(data); alert(data.error||'Failed to save wallet'); }
  } catch(e){ console.error(e); alert('Network error'); }
}


const SOL = {
  connected: false,
  wallet: null,
  address: null,
};

const SOL_LOGOS = {
  solflare: `<svg style="width:100%;height:100%" viewBox="0 0 290 290" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_146_299)"><path d="M63.2951 1H226.705C261.11 1 289 28.8905 289 63.2951V226.705C289 261.11 261.11 289 226.705 289H63.2951C28.8905 289 1 261.11 1 226.705V63.2951C1 28.8905 28.8905 1 63.2951 1Z" fill="#FFEF46" stroke="#EEDA0F" stroke-width="2"/><path d="M140.548 153.231L154.832 139.432L181.462 148.147C198.893 153.958 207.609 164.61 207.609 179.62C207.609 190.999 203.251 198.504 194.536 208.188L191.873 211.093L192.841 204.314C196.714 179.62 189.452 168.968 165.484 161.22L140.548 153.231ZM104.717 68.739L177.347 92.9488L161.61 107.959L123.843 95.3698C110.77 91.012 106.412 83.9911 104.717 69.2232V68.739ZM100.359 191.725L116.822 175.988L147.811 186.157C164.031 191.483 169.599 198.504 167.905 216.177L100.359 191.725ZM79.539 121.516C79.539 116.917 81.9599 112.559 86.0756 108.927C90.4334 115.222 97.9384 120.79 109.801 124.664L135.464 133.137L121.18 146.937L96.0016 138.705C84.3809 134.832 79.539 129.021 79.539 121.516ZM155.558 248.618C208.819 213.272 237.387 189.304 237.387 159.768C237.387 140.158 225.766 129.263 200.104 120.79L180.736 114.253L233.756 63.4128L223.103 52.0342L207.367 65.8337L133.043 41.3818C110.043 48.8869 80.9916 70.9178 80.9916 92.9487C80.9916 95.3697 81.2337 97.7907 81.96 100.454C62.8342 111.348 55.0871 121.516 55.0871 134.105C55.0871 145.968 61.3816 157.831 81.4758 164.368L97.4542 169.694L42.2559 222.713L52.9082 234.092L70.0972 218.356L155.558 248.618Z" fill="#02050A"/></g><defs><clipPath id="clip0_146_299"><rect width="290" height="290" fill="white"/></clipPath></defs></svg>`,
  phantom:  `<svg xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%" viewBox="0 0 128 128" fill="none"><rect width="128" height="128" fill="#AB9FF2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M55.6416 82.1477C50.8744 89.4525 42.8862 98.6966 32.2568 98.6966C27.232 98.6966 22.4004 96.628 22.4004 87.6424C22.4004 64.7584 53.6445 29.3335 82.6339 29.3335C99.1257 29.3335 105.697 40.7755 105.697 53.7689C105.697 70.4471 94.8739 89.5171 84.1156 89.5171C80.7013 89.5171 79.0264 87.6424 79.0264 84.6688C79.0264 83.8931 79.1552 83.0527 79.4129 82.1477C75.7409 88.4182 68.6546 94.2361 62.0192 94.2361C57.1877 94.2361 54.7397 91.1979 54.7397 86.9314C54.7397 85.3799 55.0618 83.7638 55.6416 82.1477ZM80.6133 53.3182C80.6133 57.1044 78.3795 58.9975 75.8806 58.9975C73.3438 58.9975 71.1479 57.1044 71.1479 53.3182C71.1479 49.532 73.3438 47.6389 75.8806 47.6389C78.3795 47.6389 80.6133 49.532 80.6133 53.3182ZM94.8102 53.3184C94.8102 57.1046 92.5763 58.9977 90.0775 58.9977C87.5407 58.9977 85.3447 57.1046 85.3447 53.3184C85.3447 49.5323 87.5407 47.6392 90.0775 47.6392C92.5763 47.6392 94.8102 49.5323 94.8102 53.3184Z" fill="#FFFDF8"/></svg>`,
};

function shortenSol(addr){ return addr?addr.slice(0,4)+'…'+addr.slice(-4):'—'; }


async function openSolModal() {
  const btn = document.querySelector('.sol-connect-btn');
  if (btn) { btn.innerHTML = IsloadingInit; btn.disabled = true; }

  try {
    updateSolDetectionBadges();
    document.getElementById('sol-err-bar').textContent = '';
    document.getElementById('sol-err-bar').classList.remove('show');
    showSolView('sol-view-list');
    document.getElementById('sol-modal-overlay').classList.add('open');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  } catch(e) { console.error(e); }

  if (btn) { btn.innerHTML = 'Connect Solana Wallet'; btn.disabled = false; }
}

function closeSolModal(){
  document.getElementById('sol-modal-overlay').classList.remove('open');
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
}

function solOverlayClick(e){ if(e.target===document.getElementById('sol-modal-overlay')) closeSolModal(); }
function showSolView(id){ document.querySelectorAll('#sol-sheet .view').forEach(v=>v.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function showSolErr(msg){ const b=document.getElementById('sol-err-bar'); b.textContent=msg; b.classList.add('show'); setTimeout(()=>b.classList.remove('show'),6000); }

function updateSolDetectionBadges(){
  const hasSolflare = !!window.solflare;
  const hasPhantom  = !!(window.phantom?.solana || window.solana?.isPhantom);
  const sfIcon = document.getElementById('sf-status-icon');
  const phIcon = document.getElementById('ph-status-icon');
  const sfDesc = document.getElementById('sf-desc');
  const phDesc = document.getElementById('ph-desc');
  if(sfIcon){ sfIcon.innerHTML = hasSolflare ? `<span class="det-dot green"></span>` : `›`; sfIcon.style.color = hasSolflare ? '#14F195' : ''; }
  if(sfDesc) sfDesc.textContent = hasSolflare ? 'Detected · Ready to connect' : 'Best Solana wallet · browser & mobile';
  if(phIcon){ phIcon.innerHTML = hasPhantom ? `<span class="det-dot green"></span>` : `›`; phIcon.style.color = hasPhantom ? '#14F195' : ''; }
  if(phDesc) phDesc.textContent = hasPhantom ? 'Detected · Ready to connect' : 'Popular multi-chain wallet';
}


async function connectSolanaWallet(walletName) {
  const logoEl = document.getElementById('sol-conn-logo-bg');
  if (logoEl) {
    logoEl.innerHTML = SOL_LOGOS[walletName];
    logoEl.style.background = walletName === 'solflare' ? '#1a1200' : 'transparent';
  }
  document.getElementById('sol-conn-name').textContent = walletName === 'solflare' ? 'Solflare' : 'Phantom';
  document.getElementById('sol-conn-status').textContent = 'Opening wallet…';
  showSolView('sol-view-connecting');

  try {
    let provider, address;

    if (walletName === 'solflare') {
      provider = window.solflare || window.Solflare;
      if (!provider) {
        showSolView('sol-view-list');
        showSolErr('Solflare not installed');
        window.open('https://solflare.com', '_blank');
        return;
      }
    } else {
      provider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
      if (!provider) {
        showSolView('sol-view-list');
        showSolErr('Phantom not installed');
        window.open('https://phantom.app', '_blank');
        return;
      }
    }

    // ── clear stale session without blocking the service worker ──
    if (provider.isConnected || provider.publicKey) {
      try { provider.disconnect(); } catch (_) {}   
      await new Promise(r => setTimeout(r, 150));   
    }

    const resp = await provider.connect({ onlyIfTrusted: false });
    address = resp?.publicKey?.toString() || provider.publicKey?.toString();

    if (!address) throw new Error('Wallet returned no address');

    document.getElementById('sol-conn-status').textContent = 'Requesting nonce…';
    const nonceRes = await fetch('/api/wallet/solana/nonce', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ address })
    });
    const nonceData = await nonceRes.json();
    if (!nonceRes.ok) throw new Error(nonceData.error || 'Failed to get nonce');

    document.getElementById('sol-conn-status').textContent = 'Sign in your wallet…';
    const message = `Welcome to Gleyo\n\nSign this message to verify your Solana wallet.\n\nNonce: ${nonceData.nonce}\nTime: ${new Date().toISOString()}`;
    const msgBytes = new TextEncoder().encode(message);

    let signatureBytes;
    try {
      const result = await provider.signMessage(msgBytes, 'utf8');
      signatureBytes = result?.signature instanceof Uint8Array
        ? result.signature
        : result instanceof Uint8Array
          ? result
          : new Uint8Array(Object.values(result?.signature ?? result));
    } catch (signErr) {
      showSolView('sol-view-list');
      showSolErr('Signature cancelled.');
      return;
    }

    // ── Step 3: verify ──
    document.getElementById('sol-conn-status').textContent = 'Verifying…';
    const connectRes = await fetch('/api/wallet/solana/connect', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ address, signature: Array.from(signatureBytes), message, wallet_name: walletName })
    });
    const connectData = await connectRes.json();
    if (!connectRes.ok) throw new Error(connectData.error || 'Verification failed');

    document.getElementById('sol-conn-status').textContent = 'Connected!';
    setTimeout(() => {
      SOL.connected = true;
      SOL.wallet    = walletName;
      SOL.address   = address;
      onSolanaConnected(walletName, address);
      closeSolModal();
    }, 400);

  } catch (err) {
    console.error('[Solana connect error]', err);
    showSolView('sol-view-list');
    const msg = err?.message || '';
    if (msg.includes('User rejected') || msg.includes('cancelled') || msg.includes('rejected')) {
      showSolErr('Connection cancelled.');
    } else {
      showSolErr(msg || 'Could not connect — please try again.');
    }
  }
}

function disconnectSolana() {
  try {
    if (SOL.wallet === 'solflare' && window.solflare?.disconnect) window.solflare.disconnect();
    else if (SOL.wallet === 'phantom') {
      const ph = window.phantom?.solana || window.solana;
      if (ph?.disconnect) ph.disconnect();
    }
  } catch (_) {}

  fetch('/api/wallet/solana/disconnect', {
    method: 'POST', credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken }
  }).catch(() => {});

  SOL.connected = false;
  SOL.wallet    = null;
  SOL.address   = null;

  document.getElementById('sol-state-c').classList.remove('active');
  document.getElementById('sol-state-nc').classList.add('active');

  try { sessionStorage.removeItem('sol_wallet'); sessionStorage.removeItem('sol_address'); } catch (_) {}
}

function onSolanaConnected(walletName, address) {
  const walletLbl = document.getElementById('sol-wallet-lbl');
  if (walletLbl) walletLbl.textContent = walletName.charAt(0).toUpperCase() + walletName.slice(1);

  const addrEl = document.getElementById('sol-addr');
  if (addrEl) addrEl.textContent = address.slice(0,4) + '…' + address.slice(-4);

  const sigStatus = document.getElementById('sol-sig-status');
  if (sigStatus) {
    sigStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="-5 -10 110 135" fill="currentColor" stroke="currentColor"><path d="m85.652 6.5938c-15.199 4.6992-33.309 28.609-50.668 53.164-7.3672-12.414-15.172-16.559-23.242-12.312-0.99609 0.52344-1.6523 1.5273-1.7344 2.6562-0.082031 1.1406 0.42969 2.2422 1.3555 2.918 5.8516 4.2734 11.922 11.848 19.141 23.84v-0.003906c1.2891 2.1758 3.6328 3.5039 6.1562 3.4883h0.11719c2.6016-0.023438 4.9844-1.4453 6.2461-3.7188 7.0234-12.734 14.738-25.07 23.109-36.957 6.8594-9.75 14.508-18.926 22.867-27.43 1.125-1.1016 1.332-2.8359 0.5-4.1719-0.77734-1.332-2.3789-1.9453-3.8477-1.4727z"/></svg> Verified`;
    sigStatus.style.color = 'var(--green)';
  }

  document.getElementById('sol-state-nc').classList.remove('active');
  document.getElementById('sol-state-c').classList.add('active');
}


['evm-sheet','sol-sheet'].forEach(sheetId => {
  const s = document.getElementById(sheetId);
  if (!s) return;
  let startY=0, currentY=0, isDragging=false;
  s.addEventListener('touchstart', e=>{ if(!e.target.closest('.sheet-handle,.sheet-head')) return; startY=e.touches[0].clientY; isDragging=true; s.style.transition='none'; },{passive:true});
  s.addEventListener('touchmove', e=>{ if(!isDragging) return; currentY=e.touches[0].clientY; let d=currentY-startY; if(d<0)d=0; e.preventDefault(); s.style.transform=`translateY(${d}px)`; },{passive:false});
  s.addEventListener('touchend', ()=>{ if(!isDragging) return; isDragging=false; s.style.transition='transform .3s ease'; if(currentY-startY>120){ s.id==='evm-sheet'?closeEvmModal():closeSolModal(); s.style.transform=''; } else s.style.transform='translateY(0)'; });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeEvmModal(); closeSolModal(); }
});
async function loadAuth(path) {

  return new Promise((resolve, reject) => {

    if (document.querySelector(`script[src="${path}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src = path;

    script.onload = () => {
      resolve();
    };

    script.onerror = (err) => {
      reject(err);
    };

    document.body.appendChild(script);
  });
}

let __zecLoaded = false;

async function loadZecModal(btn) {

  if (!btn) return;

  if (btn.dataset.loading === "1") return;

  const original = btn.innerHTML;

  if (!__zecLoaded) {

    btn.dataset.loading = "1";
    btn.style.pointerEvents = "none";

    btn.innerHTML = IsloadingInit;

    try {

      await loadAuth("/static/z-cash.js");

      __zecLoaded = true;

    } catch (err) {

      console.error("Failed loading ZEC modal:", err);

      btn.innerHTML = original;

      btn.style.pointerEvents = "";
      btn.dataset.loading = "0";

      return;
    }

    btn.innerHTML = original;

    btn.style.pointerEvents = "";
    btn.dataset.loading = "0";
  }

  openZecModal();
}

Object.assign(window, {
  openModal: openEvmModal,
  openEvmModal, closeEvmModal, evmOverlayClick, evmBackToList,
  openSolModal, closeSolModal, solOverlayClick, loadZecModal,
  connectSolanaWallet, disconnectSolana,
  pick, showUniversalQR, openDeepLink, disconnect,
  overlayClick: evmOverlayClick,
  backToList: evmBackToList,
});

})();