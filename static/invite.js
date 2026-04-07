document.querySelectorAll(".custom-select").forEach(select => {
  const selected = select.querySelector(".select-selected");
  const selectedText = selected.querySelector("span"); 
  const items = select.querySelector(".select-items");

  selected.addEventListener("click", () => {
    items.classList.toggle("select-hide");
    selected.classList.toggle("select-arrow-active");
  });

  items.querySelectorAll("div").forEach(option => {
    option.addEventListener("click", () => {
      // ✅ only replace the text inside <span>, keep SVG intact
      selectedText.textContent = option.textContent;

      items.classList.add("select-hide");
      selected.classList.remove("select-arrow-active");
    });
  });
});

// close dropdown when clicking outside
document.addEventListener("click", function(e) {
  document.querySelectorAll(".custom-select").forEach(select => {
    if (!select.contains(e.target)) {
      select.querySelector(".select-items").classList.add("select-hide");
      select.querySelector(".select-selected").classList.remove("select-arrow-active");
    }
  });
});


const infoBtn = document.getElementById("infoBtn");
const rolePopup = document.getElementById("rolePopup");
const popupClose = rolePopup.querySelector(".set-up-invite-icon");

infoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  rolePopup.classList.add("active");
});

popupClose.addEventListener("click", () => {
  rolePopup.classList.remove("active");
});
window.addEventListener("click", (e) => {
  if (
    rolePopup.classList.contains("active") &&
    !rolePopup.contains(e.target) &&
    !infoBtn.contains(e.target)
  ) {
    rolePopup.classList.remove("active");
  }
});










function showToast(message, type = "success", withIcon = false) {
    const toast = document.getElementById("toast");
    toast.innerHTML = "";

    if (withIcon) {
        const img = document.createElement("img");

        if (type === "success") {
            img.src = "/static/sprint.png";
            img.alt = "success";
        } else if (type === "error") {
            img.src = "/static/error-icon.png";
            img.alt = "error";
        }

        img.style.width = "20px";
        img.style.height = "20px";
        img.style.marginRight = "8px";
        img.style.verticalAlign = "middle";
        toast.appendChild(img);
    }

    const span = document.createElement("span");
    span.textContent = message;
    toast.appendChild(span);

    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 6000);
}


function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function updateButtonState() {
    const button = document.querySelector(".add-row");
    const buttonContent = document.querySelector(".button-content");
    const inviteRows = document.querySelectorAll(".invite-row");

    let hasValidEmail = false;
    inviteRows.forEach(row => {
        const emailInput = row.querySelector("input[type='email']");
        if (isValidEmail(emailInput.value)) {
            hasValidEmail = true;
        }
    });

    if (hasValidEmail) {
        buttonContent.classList.add("enable");
        buttonContent.classList.remove("disable");
        button.disabled = false;
    } else {
        buttonContent.classList.remove("enable");
        buttonContent.classList.add("disable");
        button.disabled = true;
    }
}

// Run whenever typing inside email input
document.querySelectorAll(".invite-row input[type='email']").forEach(input => {
    input.addEventListener("input", updateButtonState);
});

// Also run once at page load
updateButtonState();

document.querySelector(".add-row").addEventListener("click", async (e) => {
    e.preventDefault();

    const button = e.currentTarget;
    const buttonContent = document.querySelector(".button-content");

    const inviteRows = document.querySelectorAll(".invite-row");
    const invites = [];

    inviteRows.forEach(row => {
        const emailInput = row.querySelector("input[type='email']");
        const role = row.querySelector(".select-selected span").textContent.trim();

        if (isValidEmail(emailInput.value)) {
            invites.push({ email: emailInput.value, role });
        }
    });

    if (invites.length === 0) {
        showToast(`❌ No valid emails entered`, "error", false);
        return;
    }


    button.disabled = true;
    buttonContent.innerHTML = `<span class="spinner"></span> Sending...`;

    const sentEmails = [];
    const errorMessages = [];

    for (const invite of invites) {
        try {
            const response = await fetch(`/community/${communitySlug}/send_invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_user_id: currentUserId,
                    emails: invite.email,
                    role: invite.role
                })
            });

            const result = await response.json();

            if (result.success && result.sent_emails.length > 0) {
                sentEmails.push(...result.sent_emails);
                inviteRows.forEach(row => row.querySelector("input").value = "");
            } else {
                errorMessages.push(`${invite.email}: ${result.error || "Unknown error"}`);
            }
        } catch (err) {
            console.error(`Error sending to ${invite.email}`, err);
            errorMessages.push(`${invite.email}: Error sending invite`);
        }
    }

    if (sentEmails.length > 0) {
        showToast(`Invitation link sent to: ${sentEmails.join(", ")}`, "success", true);
    }

    if (errorMessages.length > 0) {
        showToast(`❌ Failed: ${errorMessages.join(", ")}`, "error", false);
    }

    button.disabled = false;
    buttonContent.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="size-6">
            <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
            <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
        </svg>
        Send invite link
    `;

    updateButtonState(); // re-check state after sending
});
