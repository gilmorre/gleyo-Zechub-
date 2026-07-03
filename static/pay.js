document.addEventListener("DOMContentLoaded", () => {
const generateBtn = document.getElementById('generate-btn');
const generateBtnContent = document.getElementById('generate-btn-content');
const generateBtnOriginalHTML = generateBtnContent.innerHTML;
const output = document.getElementById('output');
const paymentInfo = document.getElementById('payment-info');
const walletAddress = document.getElementById('wallet-address');
const copyBtn = document.getElementById('copy-btn');
const copyIcon = document.getElementById('copy-icon');
const checkIcon = document.getElementById('check-icon');
const copyText = document.getElementById('copy-text');
const formPanel = document.getElementById('form-panel');
const previewPanel = document.getElementById('preview-panel');
const timerDiv = document.getElementById('timer');
const audio = document.getElementById('payment-sound');
const communitySlug = document.getElementById('community-data')?.dataset?.slug;
const locationdUrl = `/community/${communitySlug}/settings/subscription`;
const checkPaidBtn = document.getElementById('check-paid-btn');
const checkPaidCooldown = document.getElementById('check-paid-cooldown');

const TOKEN = 'ZEC';
const NETWORK = 'Zcash';


function setGenerateLoading(isLoading) {
  generateBtn.disabled = isLoading;
  if (isLoading) {
    generateBtnContent.innerHTML = `<span class="btn-spinner"></span> Generating...`;
  } else {
    generateBtnContent.innerHTML = generateBtnOriginalHTML;
  }
}

// ── "I've Paid" button cycle: 10s active, 30s disabled ──
const ACTIVE_DURATION = 10;
const COOLDOWN_DURATION = 30;

let checkPaidCycleInterval = null;
let checkPaidPhaseEndTime = null;
let currentPaymentId = null;
let countdownInterval = null;

function startCheckPaidCycle() {
  clearInterval(checkPaidCycleInterval);
  enterActivePhase();
}

function enterActivePhase() {
  clearInterval(checkPaidCycleInterval);

  checkPaidBtn.disabled = false;
  checkPaidBtn.textContent = "I've Paid — Check Status";
  checkPaidPhaseEndTime = Date.now() + ACTIVE_DURATION * 1000;

  checkPaidCycleInterval = setInterval(() => {
    const remaining = Math.ceil((checkPaidPhaseEndTime - Date.now()) / 1000);
    if (remaining <= 0) {
      enterCooldownPhase();
      return;
    }
    checkPaidCooldown.textContent = `Click within ${remaining}s`;
  }, 250);
}

function enterCooldownPhase() {
  clearInterval(checkPaidCycleInterval);
  checkPaidBtn.disabled = true;
  checkPaidPhaseEndTime = Date.now() + COOLDOWN_DURATION * 1000;

  checkPaidCycleInterval = setInterval(() => {
    const remaining = Math.ceil((checkPaidPhaseEndTime - Date.now()) / 1000);
    if (remaining <= 0) {
      enterActivePhase();
      return;
    }
    checkPaidBtn.textContent = `Checking available in ${remaining}s`;
    checkPaidCooldown.textContent = '';
  }, 250);
}

function stopCheckPaidCycle() {
  clearInterval(checkPaidCycleInterval);
  checkPaidBtn.disabled = true;
  checkPaidCooldown.textContent = '';
}

checkPaidBtn.addEventListener('click', () => {
  if (checkPaidBtn.disabled || !currentPaymentId) return;

  const checkUrl = `/${communitySlug}/verify_payment/${currentPaymentId}`;
  const statusDiv = document.getElementById('status');

  checkPaidBtn.disabled = true;
  statusDiv.innerHTML = `
    <span class="payment-waiting">
      <span class="spinner"></span> Checking payment...
    </span>
  `;

  fetch(checkUrl, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'paid') {
        stopCheckPaidCycle();
        clearInterval(countdownInterval);

        localStorage.removeItem(`payment_session_${currentPaymentId}`);
        localStorage.removeItem('last_payment_id');

        sessionStorage.setItem("paid_payment_id", currentPaymentId);
        audio.currentTime = 0;
        audio.play().catch(() => {});
        statusDiv.innerHTML = `
          <span class="pop-status">
            <span class="check-circle">✔️</span> Payment received!
          </span>
        `;

        if (typeof confetti === 'function') {
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        }

        setTimeout(() => {
          window.location.href = locationdUrl;
        }, 2000);
        } else if (data.status === 'expired') {
          stopCheckPaidCycle();
          clearInterval(countdownInterval);

          statusDiv.innerHTML = '❌ Session expired';

          localStorage.removeItem(`payment_session_${currentPaymentId}`);
          localStorage.removeItem('last_payment_id');

          setTimeout(() => {
          window.location.href = locationdUrl;
        }, 3000);
      } else {
        statusDiv.innerHTML = `❌ Payment not detected yet. Try again shortly.`;

        setTimeout(() => {
          if (
            statusDiv.innerHTML.includes('Payment not detected')
          ) {
            statusDiv.innerHTML = '';
          }
        }, 5000);

        enterCooldownPhase();
      }
    })
    .catch(err => {
      console.error('❌ Check payment error:', err);
      statusDiv.innerHTML = '❌ Error checking payment.';
      enterCooldownPhase();
    });
});


function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer(secondsRemaining, paymentId) {
  clearInterval(countdownInterval);

  const expirationTime = Date.now() + secondsRemaining * 1000;

  countdownInterval = setInterval(() => {
    const now = Date.now();
    const remainingSeconds = Math.floor((expirationTime - now) / 1000);

    if (remainingSeconds <= 0) {
      clearInterval(countdownInterval);
      stopCheckPaidCycle();

      timerDiv.innerHTML = '❌ Payment expired';
      document.getElementById('status').innerHTML =
        '<span style="color:#ff7777">Session expired</span>';

      localStorage.removeItem(`payment_session_${paymentId}`);
      localStorage.removeItem('last_payment_id');

      fetch(`/${communitySlug}/verify_payment/${paymentId}`, {
        method: 'POST'
      }).catch(console.error);

      setTimeout(() => {
        previewPanel.style.display = 'none';
        paymentInfo.style.display = 'none';

        formPanel.style.display = 'flex';

        document.body.classList.remove('right-panel-active');

        currentPaymentId = null;

        document.getElementById('amount').value = '';
        document.getElementById('note').value = '';

        timerDiv.innerHTML = '';
        document.getElementById('status').innerHTML = '';

        setGenerateLoading(false);

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

      }, 1500);
    } else {
      timerDiv.innerHTML = `⏳ Time left: ${formatTime(remainingSeconds)}`;
    }
  }, 1000);
}

function saveSession(id, expiresAt, communitySlug) {
  const sessionData = { id, expiresAt, communitySlug };
  localStorage.setItem(`payment_session_${id}`, JSON.stringify(sessionData));
  localStorage.setItem('last_payment_id', id);
}

function setupCopyBtn(addressText) {
  copyBtn.onclick = () => {
    const textToCopy = addressText.trim();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(showCopiedState).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const tempInput = document.createElement("textarea");
      tempInput.value = textToCopy;
      tempInput.setAttribute("readonly", "");
      tempInput.style.position = "absolute";
      tempInput.style.left = "-9999px";
      tempInput.style.top = "0";
      tempInput.style.opacity = "0";
      tempInput.style.pointerEvents = "none";
      tempInput.style.height = "0";
      tempInput.style.zIndex = "-1";

      document.body.appendChild(tempInput);
      tempInput.select();

      try {
        const successful = document.execCommand("copy");
        if (successful) showCopiedState();
      } catch (err) {
        alert("Copy failed. Please copy manually.");
      }

      document.body.removeChild(tempInput);
    }

    function showCopiedState() {
      copyIcon.style.display = "none";
      checkIcon.style.display = "inline";
      copyText.textContent = "Copied";
      setTimeout(() => {
        copyIcon.style.display = "inline";
        checkIcon.style.display = "none";
        copyText.textContent = "Copy";
      }, 1500);
    }
  };
}

function renderQR(address, amount) {
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';

  const zecUri = `zcash:${address}?amount=${amount}`;

  const qr = new QRCodeStyling({
    width: 305,
    height: 305,
    type: "svg",
    data: zecUri,
    qrOptions: {
      errorCorrectionLevel: "H"
    },
    dotsOptions: {
      color: "#000000",
      type: "rounded"
    },
    backgroundOptions: {
      color: "#d9d8d8"
    },
    cornersSquareOptions: {
      type: "extra-rounded"
    },
    cornersDotOptions: {
      type: "square"
    }
  });

  qr.append(qrContainer);
}


function showToast(msg, type = "error") {
  document.querySelectorAll(".toast").forEach(t => t.remove());

  const t = document.createElement("div");
  t.className = `toast ${type}`;

  t.innerHTML = msg;

  document.body.appendChild(t);

  requestAnimationFrame(() => t.classList.add("show"));

  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

function showError(msg) {
  showToast(msg, "error");
}

function showPreviewPanel(amount, address) {
  formPanel.style.display = 'none';
  previewPanel.style.display = 'flex';
  paymentInfo.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    document.body.classList.add("right-panel-active");
  }, 150);

  output.innerHTML = `Send exactly <strong>${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${TOKEN}</strong> on <strong>${NETWORK}</strong>`;
  walletAddress.textContent = address;

  renderQR(address, amount);
  setupCopyBtn(address);
}


generateBtn.addEventListener('click', () => {

  const amount = parseFloat(document.getElementById('amount').value);
  const note = document.getElementById('note').value.trim();
  const save_paymentUrl = `/${communitySlug}/save_payment`;

  const MIN_ZEC_AMOUNT = 0.001;

  if (!amount || amount <= 0) {
    showError('Please enter a valid ZEC amount.');
    return;
  }

  if (amount < MIN_ZEC_AMOUNT) {
    showError(`Minimum payment is ${MIN_ZEC_AMOUNT} ZEC`);
    return;
  }

  setGenerateLoading(true);

  const formData = new FormData();
  formData.append('amount', amount);
  formData.append('token', TOKEN);
  formData.append('network', NETWORK);
  formData.append('note', note);

  fetch(save_paymentUrl, {
    method: 'POST',
    body: formData
  })
    .then(async res => {
      const data = await res.json();

      if (!res.ok) {
        if (
          data.payment_id &&
          data.expires_at &&
          data.error?.toLowerCase().includes('pending')
        ) {

          const expiresIn =
            Math.max(
              5,
              data.expires_at - Math.floor(Date.now() / 1000)
            );

            currentPaymentId = data.payment_id;

            saveSession(
              data.payment_id,
              data.expires_at,
              communitySlug
            );

            showPreviewPanel(data.amount, data.address);

            startTimer(
              Math.max(5, data.expires_at - data.server_time),
              data.payment_id
            );

            startCheckPaidCycle();

            setGenerateLoading(false);

            showToast(
              "⚠️ Restored active payment",
              "warning"
            );

          return Promise.reject('__SESSION_RESTORED__');
        }

        throw data;
      }

      return data;
    })
    .then(data => {
      const { id, address, created_at, server_time } = data;
      const expires_at = created_at + 1800;

      if (!id || !address || !expires_at || !server_time) {
        console.error('Missing required data from server:', data);
        setGenerateLoading(false);
        return;
      }

      currentPaymentId = id;
      showPreviewPanel(amount, address);

      const secondsRemaining = expires_at - server_time;

      saveSession(id, expires_at, communitySlug);
      startTimer(secondsRemaining, id);
      startCheckPaidCycle();
    })
    .catch(err => {
      if (err === '__SESSION_RESTORED__') {
        return;
      }

      console.error('❌ Fetch error:', err);

      const msg =
        err?.error ||
        err?.message ||
        'Unable to generate payment';

      showError(`❌ ${msg}`);

      setGenerateLoading(false);
    });
});

});


(function initFromParams() {
  const params = new URLSearchParams(window.location.search);
  const initAmount = params.get('prefillAmount');
  if (initAmount) {
    const parsed = parseFloat(initAmount);
    if (!isNaN(parsed) && parsed > 0) {
      document.getElementById('amount').value = parsed;
    }
  }
})();