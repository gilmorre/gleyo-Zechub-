document.addEventListener("DOMContentLoaded", () => {
const tokenSelect = document.getElementById('token');
const networkSelect = document.getElementById('network');
const generateBtn = document.getElementById('generate-btn');
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
const leaderboardUrl = `/${communitySlug}/leaderboard`;


const options = {
  'USDT': ['Polygon', 'BSC', 'Base'],
  'USDC': ['Polygon', 'BSC', 'Base']
};


  const superb = document.getElementById("token");
  const selected = superb.querySelector(".selected");
  const dropdown = superb.querySelector(".dropdown-list");
  const token_net = superb.querySelectorAll(".int-tok");
  const net_superb = document.getElementById("network");
  const selected_network = net_superb.querySelector(".selected_network");  
  const network_dropdown = net_superb.querySelector(".dropdown_network");  




selected.addEventListener("click", (e) => {
  e.stopPropagation();

  // 👇 close network dropdown before opening token
  net_superb.classList.remove("open");
  network_dropdown.style.display = "none";

  superb.classList.toggle("open");
  dropdown.style.display = superb.classList.contains("open") ? "block" : "none";
});


selected_network.addEventListener("click", (e) => {
  e.stopPropagation();

  // 👇 close token dropdown before opening network
  superb.classList.remove("open");
  dropdown.style.display = "none";

  net_superb.classList.toggle("open");
  network_dropdown.style.display = net_superb.classList.contains("open") ? "block" : "none";
});

  
  // Select option
  token_net.forEach(option => {
    option.addEventListener("click", (e) => {
      selected.textContent = option.textContent;
      superb.classList.remove("open");
      dropdown.style.display = "none";
    });
  });

  // Click outside closes
  document.addEventListener("click", () => {
    superb.classList.remove("open");
    dropdown.style.display = "none";
  });



// Handle custom token selection
token_net.forEach(option => {
  option.addEventListener("click", (e) => {
    const selectedToken = option.textContent.trim();
    selected.textContent = selectedToken;
    superb.classList.remove("open");
    dropdown.style.display = "none";

    // Update the network dropdown dynamically
    const availableNetworks = options[selectedToken] || [];
    const networkDropdown = document.querySelector(".dropdown_network");

    networkDropdown.innerHTML = ""; // clear previous items

    if (availableNetworks.length > 0) {
      availableNetworks.forEach(net => {
        const netItem = document.createElement("div");
        netItem.classList.add("int-net");
        netItem.textContent = net;
        networkDropdown.appendChild(netItem);
      });
    } else {
      const emptyItem = document.createElement("div");
      emptyItem.classList.add("int-net");
      emptyItem.textContent = "No network available";
      networkDropdown.appendChild(emptyItem);
    }

    // Add click listeners for newly created network items
    networkDropdown.querySelectorAll(".int-net").forEach(netItem => {
      netItem.addEventListener("click", () => {
        selected_network.textContent = netItem.textContent;
        net_superb.classList.remove("open");
        networkDropdown.style.display = "none";
      });
    });
  });
});


function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

let countdownInterval = null;

function startTimer(secondsRemaining, paymentId) {
  clearInterval(countdownInterval);

  const expirationTime = Date.now() + secondsRemaining * 1000;

  countdownInterval = setInterval(() => {
    const now = Date.now();
    const remainingSeconds = Math.floor((expirationTime - now) / 1000);

    if (remainingSeconds <= 0) {
      clearInterval(countdownInterval);
      timerDiv.innerHTML = '❌ Session expired';
      localStorage.removeItem('payment_session');
      setTimeout(() => {
        window.location.href = leaderboardUrl;
      }, 3000);
    } else {
      timerDiv.innerHTML = `⏳ Time left: ${formatTime(remainingSeconds)}`;
    }
  }, 1000);
}

function saveSession(id, expiresAt, communitySlug) {
  const sessionData = { id, expiresAt, communitySlug };
  localStorage.setItem(`payment_session_${id}`, JSON.stringify(sessionData));
  localStorage.setItem('last_payment_id', id);  // Keep track of last viewed
}


function resumeSession() {
  const lastId = localStorage.getItem('last_payment_id');
  if (!lastId) return;

  const session = JSON.parse(localStorage.getItem(`payment_session_${lastId}`) || '{}');

  // ✅ Check if session is missing or expired
  if (!session.id || !session.expiresAt || session.expiresAt * 1000 < Date.now()) {
    localStorage.removeItem(`payment_session_${lastId}`);
    localStorage.removeItem('last_payment_id');
    return; // Skip resume if expired
  }

  if (!session.communitySlug) return;

  const paymentId = session.id;

  // 👇 Detect the user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const continueUrl = `/${communitySlug}/payment_status/${paymentId}?tz=${encodeURIComponent(userTimezone)}`;

  console.log("🕒 Detected user timezone:", userTimezone);

  // 👇 Send the timezone as a query parameter
  fetch(continueUrl)
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw err });
      }
      return res.json();
    })
    .then(data => {
      console.log("📡 Payment status response:", data);
      console.log("⏱ Server time:", data.server_time);
      const expires_at = data.created_at + 1800;
      console.log("⏱ Expires at:", expires_at);
      console.log("⏱ Time remaining (seconds):", expires_at - data.server_time);

      const now = data.server_time;

      if (data.status === 'expired') {
        document.getElementById('status').innerHTML = '❌ Session expired';
        localStorage.removeItem(`payment_session_${lastId}`);
        localStorage.removeItem('last_payment_id');
        setTimeout(() => {
          window.location.href = leaderboardUrl;
        }, 3000);
        return;
      }

      formPanel.style.display = 'none';
      previewPanel.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: "smooth" });

  
      setTimeout(() => {
        document.body.classList.add("right-panel-active");
      }, 150);


      output.innerHTML = `Send exactly <strong>${Number(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.token}</strong> on <strong>${data.network}</strong>`;
      walletAddress.textContent = data.address;

      document.getElementById('qrcode').innerHTML = '';
      new QRCode(document.getElementById('qrcode'), {
        text: data.address,
        width: 128,
        height: 128
      });

        copyBtn.onclick = () => {
          const textToCopy = walletAddress.textContent.trim();

          // ✅ Modern browsers
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(showCopiedState).catch(fallbackCopy);
          } else {
            fallbackCopy();
          }

            function fallbackCopy() {
              const tempInput = document.createElement("textarea");
              tempInput.value = textToCopy;

              // 🔒 Make it completely invisible and non-interactive
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



      saveSession(session.id, data.expires_at, session.communitySlug);
      const secondsRemaining = Math.max(5, data.expires_at - now);
      startTimer(secondsRemaining, session.id);
      pollStatus(session.id);
    })
    .catch(err => {
      console.error('❌ Resume session error:', err);
      if (err.error === 'Session expired' || err.error === 'Payment not found') {
        localStorage.removeItem(`payment_session_${lastId}`);
        localStorage.removeItem('last_payment_id');
        // Don’t show ❌ expired in the UI at startup
      }
    });
}





window.addEventListener('load', resumeSession);

tokenSelect.addEventListener('change', () => {
  const token = tokenSelect.value;
  networkSelect.innerHTML = '<option value="">Select Network</option>';
  if (options[token]) {
    options[token].forEach(net => {
      const opt = document.createElement('option');
      opt.value = net;
      opt.innerText = net;
      networkSelect.appendChild(opt);
    });
  }
});

generateBtn.addEventListener('click', () => {
  audio.play().then(() => audio.pause()).catch(() => {});

  const amount = parseFloat(document.getElementById('amount').value);
  const token = document.querySelector('#token .selected').textContent.trim();
  const network = document.querySelector('#network .selected_network').textContent.trim();
  const note = document.getElementById('note').value.trim();
  const save_paymentUrl = `/${communitySlug}/save_payment`;


  if (!amount || token === 'Select Token' || network === 'Select Network') {
    alert('Please enter amount, token, and network.');
    return;
  }
  const formData = new FormData();
  formData.append('amount', amount);
  formData.append('token', token);
  formData.append('network', network);
  formData.append('note', note);

  fetch(save_paymentUrl, {
    method: 'POST',
    body: formData
  })
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    })
    .then(data => {
      const { id, address, created_at, server_time } = data;
      const expires_at = created_at + 1800; // 30 mins = 1800 seconds

      if (!id || !address || !expires_at || !server_time) {
        console.error('Missing required data from server:', data);
        return;
      }

      formPanel.style.display = 'none';
      previewPanel.style.display = 'flex';
      paymentInfo.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: "smooth" });

 
    setTimeout(() => {
      document.body.classList.add("right-panel-active");
    }, 150);

      output.innerHTML = `Send exactly <strong>${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${token}</strong> on <strong>${network}</strong>`;
      walletAddress.textContent = address;

      document.getElementById('qrcode').innerHTML = '';
      new QRCode(document.getElementById('qrcode'), {
        text: address,
        width: 128,
        height: 128
      });

      copyBtn.onclick = () => {
        const textToCopy = walletAddress.textContent.trim();

        // ✅ Modern browsers
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(textToCopy).then(showCopiedState).catch(fallbackCopy);
        } else {
          fallbackCopy();
        }

        function fallbackCopy() {
          const tempInput = document.createElement("textarea");
          tempInput.value = textToCopy;

          // 🔒 Make it completely invisible and non-interactive
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

      // ✅ Strictly use server time to calculate countdown
      const secondsRemaining = expires_at - server_time;

      console.log("⏱ server_time:", server_time);
      console.log("⏱ expires_at:", expires_at);
      console.log("⏱ secondsRemaining:", secondsRemaining);

      saveSession(id, expires_at, communitySlug);
      startTimer(expires_at - server_time, id);

      pollStatus(id);
    })

    .catch(err => {
      console.error('❌ Fetch error:', err);
      alert('❌ Error sending payment data.');
    });
});

function pollStatus(paymentId) {
  const statusDiv = document.getElementById('status');
  const paymentStatusUrl = `/${communitySlug}/payment_status/${paymentId}`;


  const interval = setInterval(() => {
    fetch(paymentStatusUrl)
      .then(res => res.json())
      .then(payment => {
        if (payment.status === 'paid') {
          clearInterval(interval);
          clearInterval(countdownInterval);
          localStorage.removeItem('payment_session');

          sessionStorage.setItem("paid_payment_id", paymentId);

          statusDiv.innerHTML = `
            <span class="pop-status">
              <span class="check-circle">✔️</span> Payment received!
            </span>
          `;

          if (typeof confetti === 'function') {
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.6 }
            });
          }

          setTimeout(() => {
            window.location.href = leaderboardUrl;
          }, 2000);
        } else if (payment.error === 'Session expired') {
          statusDiv.innerHTML = '❌ Session expired! Redirecting...';
          clearInterval(interval);
          clearInterval(countdownInterval);
          localStorage.removeItem('payment_session');

          setTimeout(() => {
            window.location.href = leaderboardUrl;
          }, 3000);
        } else {
          statusDiv.innerHTML = `
            <span class="payment-waiting">
              <span class="spinner"></span> Waiting for payment...
            </span>
          `;
        }
      })
      .catch(err => {
        console.error('❌ Polling error:', err);
        statusDiv.innerHTML = '❌ Error checking status.';
      });
  }, 5000);
}





document.addEventListener("click", (e) => {
  // Close token dropdown if click is outside
  if (!superb.contains(e.target)) {
    superb.classList.remove("open");
    dropdown.style.display = "none";
  }

  // Close network dropdown if click is outside
  if (!net_superb.contains(e.target)) {
    net_superb.classList.remove("open");
    network_dropdown.style.display = "none";
  }
});


});


