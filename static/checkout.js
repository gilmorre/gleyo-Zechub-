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

const options = {
  'USDT': ['Polygon', 'BSC', 'Base'],
  'USDC': ['Polygon', 'BSC', 'Base']
};

let countdownInterval = null;
let secondsRemaining = 0;

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

// ✅ Timer helpers
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer(seconds) {
  clearInterval(countdownInterval);
  secondsRemaining = seconds;
  countdownInterval = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      timerDiv.innerHTML = '❌ Session expired';
      document.getElementById('status').innerHTML = `
        <span style="color: red; font-weight: bold;">
          ❌ Session expired
        </span>
      `;
    } else {
      timerDiv.innerHTML = `⏳ Time left: ${formatTime(secondsRemaining)}`;
    }
  }, 1000);
}

// ✅ Generate Payment Info
generateBtn.addEventListener('click', async () => {
  const token = document.querySelector('#token .selected').textContent.trim();
  const network = document.querySelector('#network .selected_network').textContent.trim();
  const amount = document.getElementById('amount').value;
  const statusDiv = document.getElementById('status');
  const refCode = document.getElementById("payment-data").dataset.ref;



  if (!token || !network || !amount) {
    alert("Please enter amount, token, and network.");
    return;
  }

  // ✅ Tell backend we’re starting payment
  const res = await fetch("/api/start-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference_code: refCode, token, network })
  });

  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }

  const fixedAddress = data.address;

  // Hide form, show preview
  formPanel.style.display = 'none';
  previewPanel.style.display = 'flex';
  paymentInfo.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: "smooth" });

  
      setTimeout(() => {
        document.body.classList.add("right-panel-active");
      }, 150);


  // Show instructions
  output.innerHTML = `Send exactly <strong>${amount} ${token}</strong> on <strong>${network}</strong>`;
  walletAddress.textContent = fixedAddress;

  // Waiting for payment
  statusDiv.innerHTML = `
    <span class="payment-waiting">
      <span class="spinner"></span>
      Waiting for payment...
    </span>
  `;

  // QR code
  document.getElementById('qrcode').innerHTML = '';
  new QRCode(document.getElementById('qrcode'), { text: fixedAddress, width: 128, height: 128 });

  // Copy button
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

  // ✅ Get initial timer value from backend
  const firstCheck = await fetch(`/api/check-payment/${refCode}`);
  const firstData = await firstCheck.json();
  if (firstData.time_left !== null) {
    startTimer(firstData.time_left);
  }

  // ✅ Poll backend for payment every 5s
  const poll = setInterval(async () => {
    const checkRes = await fetch(`/api/check-payment/${refCode}`);
    const checkData = await checkRes.json();

    // ⏳ Sync timer with backend
    if (checkData.time_left !== null) {
      if (Math.abs(checkData.time_left - secondsRemaining) > 2) {
        startTimer(checkData.time_left);
      }
    }

    if (checkData.payment_state === "paid") {
      clearInterval(poll);
      clearInterval(countdownInterval);

      timerDiv.innerHTML = "";

      statusDiv.innerHTML = `
        <span class="pop-status">
            <span class="check-circle">✔️</span> Payment received!
        </span>
      `;
      document.getElementById('payment-sound').play();
      confetti();

      // ✅ Wait 10 seconds then redirect
      setTimeout(() => {
        if (checkData.community_slug) {
          window.location.href = `/${checkData.community_slug}/community_settings`;
        } else {
          window.location.href = "/dashboard"; // fallback
        }
      }, 10000);
    }
    else if (checkData.payment_state === "expired") {
      clearInterval(poll);
      statusDiv.innerHTML = `
        <span style="color: red; font-weight: bold;">
          ❌ Session expired
        </span>
      `;

      // ✅ Redirect to dashboard after 3s
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
    }
  }, 5000);
});


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
