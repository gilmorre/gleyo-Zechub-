


<script>
document.addEventListener("DOMContentLoaded", () => {
  const claimBtn = document.getElementById("claim-task");
  const uploaderStatus = new Map(); // track files & completion for each uploader
  const taskRoots = document.querySelectorAll(".link-root, .discord-root, .telegram-root, .youtube-root");

  // ---------------- FILE UPLOAD LOGIC ----------------
  document.querySelectorAll('.uploader-root').forEach(root => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";

    const outerBox = root.querySelector('.outer-boxs');
    const dragPrompt = root.querySelector('.dragPrompt');
    const fileInput = root.querySelector('.fileUpload');
    const fileBtn = root.querySelector('.custom-file-btn');
    const chosenFilesContainer = root.querySelector('.chosenFilesContainer');

    let selectedFiles = [];
    const limit = parseInt(root.dataset.fileCount || "1", 10);
    const allowedTypes = (root.dataset.fileTypes || "").split(",").map(t => t.trim()).filter(Boolean);

    const typeMap = {
      "Document": ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Presentation": ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Spreadsheet": ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Image": "image/*",
      "Drawing": ".svg,.ai,.psd",
      "Video": "video/*",
      "Audio": "audio/*",
      "Archive": ".zip,.rar,.7z,application/zip"
    };

    let acceptList = [];
    allowedTypes.forEach(label => { if(typeMap[label]) acceptList.push(typeMap[label]); });
    if (acceptList.length > 0) fileInput.setAttribute("accept", acceptList.join(",")), fileInput.disabled = false;
    else fileInput.disabled = true;

    if(limit > 1) fileInput.setAttribute("multiple","multiple");

    uploaderStatus.set(root, { files: [], done: false });

    function updateUI() {
      if(selectedFiles.length === 0) {
        dragPrompt.style.display = "block";
        fileBtn.style.display = "none";
      } else {
        dragPrompt.style.display = "none";
        fileBtn.style.display = (selectedFiles.length < limit) ? "inline-block" : "none";
      }
    }

    function updateFileInput() {
      const dt = new DataTransfer();
      selectedFiles.forEach(f => dt.items.add(f));
      fileInput.files = dt.files;
    }

    function addFilePreview(file) {
      const boxerDiv = document.createElement('div'); 
      boxerDiv.classList.add('boxerstyle');

      const previewBox = document.createElement('div'); 
      previewBox.classList.add('chosenimg');

      const removeBtn = document.createElement('button'); 
      removeBtn.classList.add('removeFileBtn');
      removeBtn.innerHTML = "&times;"; 
      removeBtn.onclick = () => {
        selectedFiles = selectedFiles.filter(f => f !== file);
        boxerDiv.remove();
        updateFileInput();
        updateUI();

        const progressBars = Array.from(chosenFilesContainer.querySelectorAll('.progress-bar'));
        const allFilesDone = progressBars.every(pb => pb.style.width === "100%");
        uploaderStatus.set(root, { files: selectedFiles, done: allFilesDone });
        validateAll(); // unified validator
      };

      const progressBar = document.createElement('div'); 
      progressBar.classList.add('progress-bar');

      if(file.type.startsWith('image/')) {
        const img = document.createElement('img'); 
        img.src = URL.createObjectURL(file); 
        previewBox.appendChild(img);
      } else {
        const div = document.createElement('div');
        div.className = 'file-icon';
        div.textContent = file.name;
        previewBox.appendChild(div);
      }

      previewBox.appendChild(removeBtn);
      previewBox.appendChild(progressBar);
      boxerDiv.appendChild(previewBox);
      chosenFilesContainer.appendChild(boxerDiv);

      uploaderStatus.set(root, { files: selectedFiles, done: false });
      validateAll();

      let percent = 0;
      const interval = setInterval(() => {
        percent += 5;
        progressBar.style.width = percent + "%";
        if(percent >= 100) {
          clearInterval(interval);
          progressBar.style.backgroundColor = "#1cc88a";
          uploaderStatus.set(root, { files: selectedFiles, done: true });
          validateAll();
        }
      }, 100);
    }

    function isValidFile(file) {
      // If no allowed types, accept nothing
      if (acceptList.length === 0) return false;

      // Check extension & MIME against acceptList
      return acceptList.some(pattern => {
        if (pattern.includes("/*")) {
          // e.g. "image/*" → check MIME category
          return file.type.startsWith(pattern.split("/")[0] + "/");
        } else if (pattern.startsWith(".")) {
          // e.g. ".pdf"
          return file.name.toLowerCase().endsWith(pattern.toLowerCase());
        } else {
          // Exact MIME type
          return file.type === pattern;
        }
      });
    }

    function handleFiles(files) {
      const remainingSlots = limit - selectedFiles.length;
      files.slice(0, remainingSlots).forEach(file => {
        if (isValidFile(file)) {
          selectedFiles.push(file);
          addFilePreview(file);
        } else {
          // ❌ Invalid → mark outer box red + alert
          outerBox.classList.add("invalid-drop");
          alert(`Invalid file: ${file.name}. Allowed types: ${allowedTypes.join(", ")}`);

          // Reset border after 2s
          setTimeout(() => outerBox.classList.remove("invalid-drop"), 2000);
        }
      });

      updateFileInput();
      updateUI();
      fileInput.value = "";
    }


    fileBtn.addEventListener('click', () => { if(!fileInput.disabled) fileInput.click(); });
    dragPrompt.addEventListener('click', () => { if(!fileInput.disabled) fileInput.click(); });
outerBox.addEventListener("dragover", e => {
  e.preventDefault();
  outerBox.classList.add("dragover");

  let invalid = false;
  const items = e.dataTransfer.items;

  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === "file") {
      const file = items[i].getAsFile();
      // safer: check type if available
      if (file && !isValidFile(file)) invalid = true;
      else if (!file && items[i].type) {
        // fallback check just by MIME string
        if (!acceptList.some(pattern => {
          if (pattern.includes("/*")) {
            return items[i].type.startsWith(pattern.split("/")[0] + "/");
          } else {
            return items[i].type === pattern;
          }
        })) {
          invalid = true;
        }
      }
    }
  }

  if (invalid) {
    outerBox.classList.add("invalid-drop");
  } else {
    outerBox.classList.remove("invalid-drop");
  }
});

outerBox.addEventListener("dragleave", e => {
  e.preventDefault();
  outerBox.classList.remove("dragover", "invalid-drop");
});

outerBox.addEventListener("drop", e => {
  e.preventDefault();
  outerBox.classList.remove("dragover", "invalid-drop");
  handleFiles(Array.from(e.dataTransfer.files));
});


    fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));

    const chooseFileSpan = dragPrompt.querySelector(".choose-file");
    if(chooseFileSpan) {
      chooseFileSpan.style.cursor = "pointer";
      chooseFileSpan.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        if(!fileInput.disabled) fileInput.click();
      });
    }

    updateUI();
  });

  // ---------------- TASK VALIDATION ----------------
  taskRoots.forEach(root => {
    root.dataset.visited = "false";
    const link = root.querySelector("a");
    if (link) {
      link.addEventListener("click", () => { root.dataset.visited = "true"; validateAll(); });
    } else {
      root.addEventListener("click", () => { root.dataset.visited = "true"; validateAll(); });
    }
  });

  document.querySelectorAll(".js-number-container").forEach(container => {
    container.querySelectorAll(".number-box").forEach(box => {
      box.addEventListener("click", () => {
        container.dataset.selected = "true";
        container.querySelectorAll(".number-box").forEach(b => b.classList.remove("active"));
        box.classList.add("active");
        validateAll();
      });
    });
  });

  document.querySelectorAll(".js-stars-container").forEach(container => {
    container.querySelectorAll("i").forEach((star, index) => {
      star.addEventListener("click", () => {
        container.dataset.selected = "true";
        container.querySelectorAll("i").forEach((s, i) => s.classList.toggle("active", i <= index));
        validateAll();
      });
    });
  });

  document.querySelectorAll(".poll-task").forEach(poll => {
    const inputs = poll.querySelectorAll("input[type='radio'], input[type='checkbox']");
    const otherInput = poll.querySelector(".other-input");

    inputs.forEach(input => {
      input.addEventListener("change", () => { poll.dataset.selected = "true"; validateAll(); });
    });

    if (otherInput) {
      otherInput.addEventListener("input", validateAll);
    }
  });

  document.querySelectorAll(".quiz-root").forEach(quiz => {
    const inputs = quiz.querySelectorAll("input[type='radio'], input[type='checkbox']");
    inputs.forEach(input => {
      input.addEventListener("change", () => { quiz.dataset.selected = "true"; validateAll(); });
    });
  });

  document.querySelectorAll(".js-url-input, .js-number-input, .js-text-input")
    .forEach(input => { input.addEventListener("input", validateAll); });

  // ---------------- UNIFIED VALIDATOR ----------------
  function validateAll() {
    let allValid = true;

    // File uploads
    uploaderStatus.forEach(status => {
      if(status.files.length === 0 || !status.done) allValid = false;
    });

    // URL inputs
    document.querySelectorAll(".js-url-input").forEach(input => {
      try {
        if (!input.value.trim() || !new URL(input.value)) allValid = false;
      } catch { allValid = false; }
    });

    // Numbers
    document.querySelectorAll(".js-number-input").forEach(input => {
      if (!input.value.trim() || isNaN(input.value)) allValid = false;
    });

    // Texts
    document.querySelectorAll(".js-text-input").forEach(input => {
      if (input.value.trim() === "") allValid = false;
    });

    // Visits
    taskRoots.forEach(root => { if (root.dataset.visited !== "true") allValid = false; });

    // Scales
    document.querySelectorAll(".js-number-container, .js-stars-container").forEach(container => {
      if (container.dataset.selected !== "true") allValid = false;
    });

    // Polls
    document.querySelectorAll(".poll-task").forEach(poll => {
      const checkedOptions = poll.querySelectorAll("input[type='radio']:checked, input[type='checkbox']:checked");
      if (checkedOptions.length === 0) allValid = false;
      else {
        const otherChecked = Array.from(checkedOptions).some(opt => opt.value === "other");
        if (otherChecked) {
          const otherInput = poll.querySelector(".other-input");
          if (!otherInput || otherInput.value.trim() === "") allValid = false;
        }
      }
    });

    // Quizzes
    document.querySelectorAll(".quiz-root").forEach(quiz => {
      const checkedOptions = quiz.querySelectorAll("input[type='radio']:checked, input[type='checkbox']:checked");
      if (checkedOptions.length === 0) allValid = false;
    });

    // Update claim button
    if (allValid) {
      claimBtn.classList.add("enabled");
      claimBtn.style.background = "#4285F4";
      claimBtn.style.cursor = "pointer";
      claimBtn.removeAttribute("disabled");
    } else {
      claimBtn.classList.remove("enabled");
      claimBtn.style.background = "#313149";
      claimBtn.style.cursor = "not-allowed";
      claimBtn.setAttribute("disabled", "true");
    }
  }
claimBtn.addEventListener("click", async () => {
  if (!claimBtn.classList.contains("enabled")) return;

  const quizRoot = document.querySelector(".quiz-root");
  const wrongMsg = quizRoot?.querySelector(".wrong-anser");

  if (quizRoot) {
    const inputs = quizRoot.querySelectorAll("input[type='radio'], input[type='checkbox']");
    const selectedIndexes = Array.from(inputs)
      .filter(i => i.checked)
      .map(i => parseInt(i.value.replace("option","")) - 1);

    // 🔹 Don't auto-hide wrongMsg here anymore
    // wrongMsg.style.display = "none"; <-- removed

    // Show spinner
    claimBtn.innerHTML = '<span class="spinner"></span>';
    claimBtn.setAttribute("disabled", "true");
    claimBtn.style.cursor = "wait";

    try {
      const taskId = quizRoot.dataset.taskId;
      const res = await fetch(`/check_quiz/${taskId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ selected: selectedIndexes })
      });
      const result = await res.json();

      if (result.success) {
        alert("Quest Completed ✅");
        claimBtn.innerHTML = "Claim";
        claimBtn.style.cursor = "pointer";
      } else {
        // 🔹 Show wrong answer message, but don’t reset it next click
        if (wrongMsg) wrongMsg.style.display = "block";

        claimBtn.innerHTML = "Claim";
        claimBtn.removeAttribute("disabled");
        claimBtn.style.cursor = "pointer";
      }
    } catch (err) {
      console.error(err);
      claimBtn.innerHTML = "Claim";
      claimBtn.removeAttribute("disabled");
      claimBtn.style.cursor = "pointer";
      alert("Error checking quiz. Try again.");
    }
  } else {
    // Non-quiz tasks
    claimBtn.innerHTML = '<span class="spinner"></span>';
    claimBtn.setAttribute("disabled", "true");
    claimBtn.style.cursor = "wait";

    setTimeout(() => {
      alert("Quest Completed ✅");
      claimBtn.innerHTML = "Claim";
      claimBtn.removeAttribute("disabled");
      claimBtn.style.cursor = "pointer";
    }, 2000);
  }
});

// 🔹 Extra: Hide wrong message when user changes their answer
document.querySelectorAll(".quiz-root input[type='radio'], .quiz-root input[type='checkbox']")
  .forEach(input => {
    input.addEventListener("change", () => {
      const wrongMsg = document.querySelector(".quiz-root .wrong-anser");
      if (wrongMsg) wrongMsg.style.display = "none";
    });
  });


  // Initial check
  validateAll();
});

</script>




<script>
document.addEventListener("DOMContentLoaded", () => {
  const communitySlug = "{{ community_slug }}"; // passed from Flask template

  const socialMessages = {
    twitter: "Twitter connection is enabled. Turn it off in ",
    discord: "Discord connection is enabled. Turn it off in ",
    youtube: "YouTube connection is enabled. Turn it off in ",
    telegram: "Telegram connection is enabled. Turn it off in "
  };

  document.querySelectorAll('.connect-card').forEach(card => {
    const info = card.querySelector('.info');
    const btn = card.querySelector('.connect-btn');

    if (!info || !btn) return;

    // Determine which social platform
    let social = ["twitter", "discord", "youtube", "telegram"]
      .find(s => btn.classList.contains(s));
    if (!social) social = "twitter"; // fallback

    // Create tooltip div
    const tooltip = document.createElement("div");
    tooltip.className = "info-tooltip";

    // Add message text
    const msgSpan = document.createElement("span");
    msgSpan.textContent = socialMessages[social];
    tooltip.appendChild(msgSpan);

    // Add clickable "Settings" link
    const settingsLink = document.createElement("a");
    settingsLink.href = `/${communitySlug}/community_settings?tab=security`;
    settingsLink.textContent = "settings.";
    settingsLink.className = "settings-link";
    tooltip.appendChild(settingsLink);

    info.appendChild(tooltip);
  });
});
</script>






















 






<script>
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-number-container").forEach(container => {
    container.querySelectorAll(".number-box").forEach(box => {
      box.addEventListener("click", () => {
        // remove active from all
        container.querySelectorAll(".number-box").forEach(b => b.classList.remove("active"));
        // add active to clicked
        box.classList.add("active");
      });
    });
  });
});

</script>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const boxes = document.querySelectorAll(".preview-box");

  boxes.forEach(box => {
    box.addEventListener("click", () => {
      const questUuid = box.dataset.quest;
      const subquestUuid = box.dataset.subquest;

      if (questUuid && subquestUuid) {
        const targetUrl = `/${"{{ community.slug }}"}/quest/${questUuid}/${subquestUuid}`;
        window.location.href = targetUrl;
      }
    });
  });
});
</script>


<script>
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-stars-container").forEach(container => {
    const stars = container.querySelectorAll("i");

    stars.forEach((star, index) => {
      star.addEventListener("click", () => {
        // remove active from all
        stars.forEach(s => s.classList.remove("active"));

        // add active up to the clicked star
        for (let i = 0; i <= index; i++) {
          stars[i].classList.add("active");
        }

        // optional: save the value as dataset
        container.dataset.value = index + 1;
      });
    });
  });
});
document.addEventListener("click", (e) => {
  const linkRoot = e.target.closest(".link-root");
  if (linkRoot && linkRoot.dataset.link) {
    window.open(linkRoot.dataset.link, "_blank");
  }
});

</script>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const otherOption = document.querySelector(".custom-radio-other");
  if (!otherOption) return;

  const radioBtn = otherOption.querySelector(".radio-btn");
  const textInput = otherOption.querySelector(".other-input");

  if (radioBtn && textInput) {
    // place the dot on the left, vertically centered
    radioBtn.style.position = "absolute";
    radioBtn.style.left = "6px";
    radioBtn.style.top = "50%";
    radioBtn.style.transform = "translateY(-50%)";

    // push the input text so it doesn’t overlap the dot
    textInput.style.paddingLeft = "26px";
  }
});
</script>

<!-- <script>
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const popup = document.getElementById('reward-popup');
    const body = document.getElementById('popup-body');

    // Example: Grab details from the card
    const title = card.querySelector('.distribution-type')?.innerText || "Reward";
    const value = card.querySelector('.xp-value')?.innerText || "";
    const image = card.querySelector('img')?.src || "";

    // Build popup HTML
    body.innerHTML = `
      <h2 style="font-weight:bold; font-size:18px;">${title}</h2>
      ${image ? `<img src="${image}" style="width:100%; border-radius:8px; margin:15px 0;">` : ""}
      <div style="font-size:16px;">${value}</div>
    `;

    popup.style.display = "flex";
  });
});

// Close button
document.querySelector('.popup-close').addEventListener('click', () => {
  document.getElementById('reward-popup').style.display = "none";
});

</script> -->

{% endblock %}
