
const pollButton = document.getElementById("pollitems");
const timingDiv = document.getElementById("addingtiming");
const chevron = pollButton.querySelector("i");

pollButton.addEventListener("click", () => {
  const isHidden = window.getComputedStyle(timingDiv).display === "none";

  if (isHidden) {
    timingDiv.style.display = "block";
    chevron.classList.replace("fa-chevron-down", "fa-chevron-up");
  } else {
    timingDiv.style.display = "none";
    chevron.classList.replace("fa-chevron-up", "fa-chevron-down");
  }
});

const optionsContainer = document.getElementById("options");
const addOptionBtn = document.getElementById("addOptionBtn");
const radioGroup = document.querySelector(".radio-group");
const toggle = document.getElementById('customopt');
const otherOption = document.getElementById('otherOption');
const multiToggle = document.getElementById("multiToggle");

// 🔄 Re-label placeholders + enforce input type
function renumberOptions() {
  const inputs = optionsContainer.querySelectorAll(".option input");
  const labels = radioGroup.querySelectorAll(".custom-radio span:last-child");

  inputs.forEach((input, index) => {
    input.placeholder = `Option ${index + 1}`;
    if (labels[index]) {
      labels[index].textContent = input.value || `Option ${index + 1}`;
    }
  });

  enforceSelectionType(); // make sure toggle applies
}

// 🔀 Enforce single vs multiple choice
function enforceSelectionType() {
  const allInputs = radioGroup.querySelectorAll(".custom-radio input");
  allInputs.forEach(inp => {
    inp.type = multiToggle.checked ? "checkbox" : "radio";
    inp.name = multiToggle.checked ? "" : "single-choice"; 
  });

  // Handle 'Other' input separately
  const otherRadio = document.querySelector("#otherOption > input");
  if (multiToggle.checked) {
    otherRadio.type = "checkbox";   // allow unchecking freely
    otherRadio.name = "";
  } else {
    otherRadio.type = "radio";      // single-choice radio
    otherRadio.name = "single-choice";
  }
}

// ➕ Add new option
addOptionBtn.addEventListener("click", () => {
  const optionIndex = optionsContainer.querySelectorAll(".option").length + 1;
  const isMultiple = quizToggle.checked; // check current mode

  let optionDiv = document.createElement("div");
  optionDiv.classList.add("radiotext"); 

  optionDiv.innerHTML = `
    <input type="${isMultiple ? "checkbox" : "radio"}" 
           name="${isMultiple ? "correct[]" : "correct"}" 
           class="correct-answer">
    <div class="option">
      <input type="text" class="optn" placeholder="Option ${optionIndex}" 
        style="background-color: transparent; border: 0.1px solid #cccccc57;" />
      <button class="remove-option">&times;</button>
    </div>
  `;

  optionsContainer.appendChild(optionDiv);

  // also add mirror label
  const checkboxLabel = document.createElement("label");
  checkboxLabel.classList.add("custom-radio");
  checkboxLabel.innerHTML = `
    <input type="${isMultiple ? "checkbox" : "radio"}" 
           name="${isMultiple ? "" : "single-choice"}"
           value="option${optionIndex}">
    <span class="radio-btn"></span>
    <span>Option ${optionIndex}</span>
  `;
  radioGroup.appendChild(checkboxLabel);

  renumberOptions();
});


// ❌ Remove option
optionsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-option")) {
    const radiotextDiv = e.target.closest(".radiotext"); // find the wrapper
    if (radiotextDiv) {
      radiotextDiv.remove(); // remove whole block
    }
    renumberOptions();
  }
});


// ✍️ Live sync input -> label
optionsContainer.addEventListener("input", (e) => {
  if (e.target.classList.contains("optn")) {
    const index = [...optionsContainer.querySelectorAll(".option input")].indexOf(e.target);
    const labels = radioGroup.querySelectorAll(".custom-radio span:last-child");
    if (labels[index]) {
      labels[index].textContent = e.target.value || `Option ${index + 1}`;
    }
  }
});

// ✍️ Mirror Title + Description
const pollTitleInput = document.getElementById("YoulinkInput");
const pollDescInput = document.getElementById("YourTextArea");
const pollTitleDiv = document.getElementById("polltit");
const pollDescDiv = document.getElementById("polldesc");

pollTitleInput.addEventListener("input", () => {
  pollTitleDiv.textContent = pollTitleInput.value;
});
pollDescInput.addEventListener("input", () => {
  pollDescDiv.textContent = pollDescInput.value;
});

// 🔀 Listen to multiToggle
multiToggle.addEventListener("change", enforceSelectionType);

// Init
renumberOptions();


// Highlight input border when radio/checkbox is selected
optionsContainer.addEventListener("change", (e) => {
  if (e.target.classList.contains("correct-answer")) {
    const isMultiple = document.getElementById("quiztoggle").checked;

    if (!isMultiple) {
      // SINGLE (radio): reset all first
      optionsContainer.querySelectorAll(".optn").forEach(inp => {
        inp.style.border = "0.1px solid #cccccc57";
      });
    }

    // Then apply highlight only to the one(s) selected
    const radiotextDiv = e.target.closest(".radiotext");
    if (radiotextDiv) {
      const textInput = radiotextDiv.querySelector(".optn");
      if (textInput) {
        if (e.target.checked) {
          textInput.style.setProperty("border", "0.1px solid #00f104", "important");
        } else {
          // remove highlight if unchecked (only matters in multi mode)
          textInput.style.border = "0.1px solid #cccccc57";
        }
      }
    }
  }
});

// Toggle switch between single (radio) and multiple (checkbox) mode
const quizToggle = document.getElementById("quiztoggle");
quizToggle.addEventListener("change", () => {
    const isMultiple = quizToggle.checked;

    // Reset all borders
    optionsContainer.querySelectorAll(".optn").forEach(inp => {
        inp.style.border = "0.1px solid #cccccc57";
    });

    // Clear selections
    optionsContainer.querySelectorAll(".correct-answer").forEach(inp => {
        inp.checked = false;
    });

    // Swap input types
    optionsContainer.querySelectorAll(".correct-answer").forEach((input) => {
        const newInput = document.createElement("input");
        newInput.className = "correct-answer";

        if (isMultiple) {
            newInput.type = "checkbox";
            newInput.name = "correct[]";
        } else {
            newInput.type = "radio";
            newInput.name = "correct";
        }

        // Apply CSS after replacement
        newInput.style.marginRight = "10px";
        newInput.style.marginTop = "11px";
        newInput.style.width = "20px";
        newInput.style.height = "20px";
        newInput.style.cursor = "pointer";

        input.replaceWith(newInput);
    });
});

// Update multiToggle state based on quizToggle
function syncMultiToggle() {
    if (quizToggle.checked) {
        multiToggle.checked = true;      // always on
        multiToggle.disabled = true;     // user cannot turn off
    } else {
        multiToggle.disabled = false;    // can toggle freely
    }
    
    enforceSelectionType(); // update input types
}

// Listen to quizToggle changes
quizToggle.addEventListener("change", syncMultiToggle);

// Initial sync on page load
syncMultiToggle();

// 🔀 Show/hide 'Other' input based on toggle
toggle.addEventListener('change', () => {
  otherOption.style.display = toggle.checked ? 'flex' : 'none';
});



document.querySelectorAll('.custom-radio-other').forEach(label => {
  const radioBtn = label.querySelector('.radio-btn');
  const textInput = label.querySelector('.other-input');

  // move the radio-dot visually close to input
  radioBtn.style.position = 'absolute';
  radioBtn.style.left = '6px';   // distance from label left
  radioBtn.style.top = '50%';
  radioBtn.style.transform = 'translateY(-50%)';

  textInput.style.paddingLeft = '26px'; // enough space for radio
});