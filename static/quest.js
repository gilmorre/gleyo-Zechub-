(function () {

REWARD_ICONS = {
 ALL: `
        <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#4285f4">
          <path
            d="M232,128.00037A104.11767,104.11767,0,0,0,128.042,24.00086L128,23.96423l-.042.03663a103.99952,103.99952,0,0,0-.001,207.999l.043.0376.043-.0376A104.11763,104.11763,0,0,0,232,128.00037Zm-16.36768-8h-39.853c-1.5918-29.637-12.01123-57.01758-29.5044-78.08643A88.1919,88.1919,0,0,1,215.63232,120.00037Zm-119.37353,16h63.48242C157.93164,164.75623,146.44678,191.703,128,210.44177,109.55322,191.703,98.06836,164.75623,96.25879,136.00037Zm0-16C98.06836,91.24353,109.55322,64.29675,128,45.559c18.44678,18.73779,29.93164,45.68457,31.74121,74.44141Zm50.01562,94.08642c17.49317-21.06933,27.9126-48.45044,29.50489-78.08642h39.853A88.19181,88.1918,0,0,1,146.27441,214.08679Z"
            fill="#4285f4"
          />
        </svg>

    `,

    FCFS: `
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" style="flex-shrink: 0"
            width="16"
            height="16"
            fill="#e67e22"
            stroke="#e67e22"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round">
        <path d="M13 3 
                C12.6 2.5,12 2.5,11.7 3 
                L5.5 12.2 
                C5.2 12.7,5.5 13.3,6 13.3 
                H10 
                V21 
                C10 21.5,10.7 21.7,11.1 21.3 
                L18.2 12.3 
                C18.6 11.8,18.3 11.2,17.7 11.2 
                H13 
                V3 Z"/>
        </svg> 
    `,

    RAFFLE: `
        "svg": """
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
     width="16"
     height="16">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M14.0079 19.0029L14.0137 17C14.0137 16.4477 14.4625 16 15.0162 16C15.5698 16 16.0187 16.4477 16.0187 17V18.9765C16.0187 19.458 16.0187 19.6988 16.1731 19.8464C16.3275 19.9941 16.5637 19.984 17.0362 19.964C18.8991 19.8852 20.0437 19.6332 20.8504 18.8284C21.6591 18.0218 21.911 16.8766 21.9894 15.0105C22.005 14.6405 22.0128 14.4554 21.9437 14.332C21.8746 14.2085 21.5987 14.0545 21.0469 13.7463C20.4341 13.4041 20.0199 12.7503 20.0199 12C20.0199 11.2497 20.4341 10.5959 21.0469 10.2537C21.5987 9.94554 21.8746 9.79147 21.9437 9.66803C22.0128 9.54458 22.005 9.35954 21.9894 8.98947C21.911 7.12339 21.6591 5.97823 20.8504 5.17157C19.9727 4.29604 18.6952 4.0748 16.5278 4.0189C16.2482 4.01169 16.0187 4.23718 16.0187 4.51618V7C16.0187 7.55228 15.5698 8 15.0162 8C14.4625 8 14.0137 7.55228 14.0137 7L14.0064 4.49855C14.0056 4.22298 13.7814 4 13.5052 4H9.99502C6.21439 4 4.32407 4 3.14958 5.17157C2.34091 5.97823 2.08903 7.12339 2.01058 8.98947C1.99502 9.35954 1.98724 9.54458 2.05634 9.66802C2.12545 9.79147 2.40133 9.94554 2.95308 10.2537C3.56586 10.5959 3.98007 11.2497 3.98007 12C3.98007 12.7503 3.56586 13.4041 2.95308 13.7463C2.40133 14.0545 2.12545 14.2085 2.05634 14.332C1.98724 14.4554 1.99502 14.6405 2.01058 15.0105C2.08903 16.8766 2.34091 18.0218 3.14958 18.8284C4.32407 20 6.21438 20 9.99502 20H13.0054C13.4767 20 13.7124 20 13.8591 19.8541C14.0058 19.7081 14.0065 19.4731 14.0079 19.0029ZM16.0187 13V11C16.0187 10.4477 15.5698 10 15.0162 10C14.4625 10 14.0137 10.4477 14.0137 11V13C14.0137 13.5523 14.4625 14 15.0162 14C15.5698 14 16.0187 13.5523 16.0187 13Z"
        fill="#8B5CF6"
      />
    </svg>
  `,


    VOTE: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(0, 255, 0)"
            width="16"
            height="16" class="reward-icons" >
          <g transform="scale(0.0375)">
            <path d="M144 224C161.7 224 176 238.3 176 256L176 512C176 529.7 161.7 544 144 544L96 544C78.3 544 64 529.7 64 512L64 256C64 238.3 78.3 224 96 224L144 224zM334.6 80C361.9 80 384 102.1 384 129.4L384 133.6C384 140.4 382.7 147.2 380.2 153.5L352 224L512 224C538.5 224 560 245.5 560 272C560 291.7 548.1 308.6 531.1 316C548.1 323.4 560 340.3 560 360C560 383.4 543.2 402.9 521 407.1C525.4 414.4 528 422.9 528 432C528 454.2 513 472.8 492.6 478.3C494.8 483.8 496 489.8 496 496C496 522.5 474.5 544 448 544L360.1 544C323.8 544 288.5 531.6 260.2 508.9L248 499.2C232.8 487.1 224 468.7 224 449.2L224 262.6C224 247.7 227.5 233 234.1 219.7L290.3 107.3C298.7 90.6 315.8 80 334.6 80z"/>
          </g>
        </svg>
  `,



};

const svgMap = { 
  xp: `

      <svg viewBox="0 0 24 24" width="16" height="16"  style="margin-right: 5px;"  xmlns="http://www.w3.org/2000/svg" stroke="#4285f4" fill="#4285f4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" />
      </svg>
       `,

  role: `<svg xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px;" width="14" height="14" fill="#5865F2" viewBox="0 0 24 24" style="margin-right: 5px;"> 
            <path d="M20.318 4.36a19.8 19.8 0 0 0-4.885-1.517c-.212.375-.445.866-.609 1.25a18.3 18.3 0 0 0-5.487 0 12 12 0 0 0-.618-1.25A19.9 19.9 0 0 0 3.214 4.36C.534 9.036-.32 13.57.1 18.048a19.9 19.9 0 0 0 5.992 3.03q.695-.945 1.227-1.994a13.5 13.5 0 0 1-1.872-.892q.191-.143.372-.292c3.928 1.794 8.181 1.794 12.062 0q.181.149.372.292a12 12 0 0 1-1.873.891c.36.697.773 1.363 1.226 1.994a19.8 19.8 0 0 0 6.001-3.03c.501-5.176-.839-9.673-3.55-13.658M8.02 15.32c-1.184 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419m7.974 0c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.177 1.095 2.157 2.419 0 1.333-.947 2.419-2.157 2.419"/>
         </svg>`,

  custom: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
           fill="none" stroke="var(--text-muted)" stroke-width="2" style="margin-right: 4px;"
           viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
             <path d="M11 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-7"/>
             <path d="M18.2 2.8a2 2 0 0 1 2.8 2.8L12 14.8l-3.5.9.9-3.5L18.2 2.8z"/>
         </svg>`,

token: `  <svg fill="none" viewBox="0 0 24 24" style="margin-right: 5px; overflow: visible;"  xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <g transform="translate(12 12) scale(1.6) translate(-12 -12)">
              <circle cx="12" cy="12" r="9" fill="#F3B724"/>
              <polyline points="9 9 15 9 9 15 15 15" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <line x1="12" y1="7" x2="12" y2="9" stroke="#fff" stroke-linecap="round" stroke-width="2"/>
              <line x1="12" y1="15" x2="12" y2="17" stroke="#fff" stroke-linecap="round" stroke-width="2"/>
            </g>
          </svg>`
};

let twitterState = "ok"; 

const DraftSvg = `
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="#000000">
  <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style="fill:#2D50A7;" d="M267.636,0c-12.853,0-23.273,10.42-23.273,23.273v93.091c0,12.853,10.42,23.273,23.273,23.273 c12.853,0,23.273-10.42,23.273-23.273V23.273C290.909,10.42,280.489,0,267.636,0z"></path> <path style="fill:#73A1FB;" d="M267.638,372.364c-12.853,0-23.273,10.42-23.273,23.273v93.091c0,12.853,10.42,23.273,23.273,23.273 c12.853,0,23.273-10.42,23.273-23.273v-93.091C290.911,382.784,280.491,372.364,267.638,372.364z"></path> <path style="fill:#355EC9;" d="M185.355,140.808L119.529,74.98c-9.086-9.089-23.822-9.089-32.912,0 c-9.089,9.089-9.089,23.824,0,32.912l65.826,65.828c4.544,4.544,10.501,6.817,16.455,6.817c5.955,0,11.913-2.273,16.455-6.817 C194.444,164.631,194.444,149.897,185.355,140.808z"></path> <g> <path style="fill:#C4D9FD;" d="M477.091,232.727h-46.545c-12.853,0-23.273,10.42-23.273,23.273 c0,12.853,10.42,23.273,23.273,23.273h46.545c12.853,0,23.273-10.42,23.273-23.273 C500.364,243.147,489.944,232.727,477.091,232.727z"></path> <path style="fill:#C4D9FD;" d="M382.83,338.283c-9.087-9.089-23.823-9.087-32.912,0c-9.089,9.089-9.087,23.823,0,32.912 l65.828,65.825c4.544,4.544,10.501,6.816,16.457,6.816c5.956,0,11.913-2.273,16.455-6.816c9.089-9.089,9.089-23.824,0-32.912 L382.83,338.283z"></path> </g> <path style="fill:#3D6DEB;" d="M151.273,256c0-12.853-10.42-23.273-23.273-23.273H34.909c-12.853,0-23.273,10.42-23.273,23.273 c0,12.853,10.42,23.273,23.273,23.273H128C140.853,279.273,151.273,268.853,151.273,256z"></path> <path style="fill:#5286FA;" d="M185.355,338.283c-9.087-9.089-23.824-9.089-32.912,0l-65.825,65.825 c-9.089,9.087-9.089,23.824,0,32.912c4.544,4.544,10.501,6.816,16.457,6.816c5.956,0,11.913-2.271,16.455-6.816l65.825-65.825 C194.444,362.108,194.444,347.372,185.355,338.283z"></path>
  </g>
</svg>
`;

const LiveSvg = `
<svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="currentColor">
<g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>ic_fluent_live_24_regular</title> <desc>Created with Sketch.</desc> <g id="🔍-Product-Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="ic_fluent_live_24_regular" fill="currentColor" fill-rule="nonzero"> <path d="M5.98959236,4.92893219 C6.28248558,5.22182541 6.28248558,5.69669914 5.98959236,5.98959236 C2.67013588,9.30904884 2.67013588,14.6909512 5.98959236,18.0104076 C6.28248558,18.3033009 6.28248558,18.7781746 5.98959236,19.0710678 C5.69669914,19.363961 5.22182541,19.363961 4.92893219,19.0710678 C1.02368927,15.1658249 1.02368927,8.83417511 4.92893219,4.92893219 C5.22182541,4.63603897 5.69669914,4.63603897 5.98959236,4.92893219 Z M19.0710678,4.92893219 C22.9763107,8.83417511 22.9763107,15.1658249 19.0710678,19.0710678 C18.7781746,19.363961 18.3033009,19.363961 18.0104076,19.0710678 C17.7175144,18.7781746 17.7175144,18.3033009 18.0104076,18.0104076 C21.3298641,14.6909512 21.3298641,9.30904884 18.0104076,5.98959236 C17.7175144,5.69669914 17.7175144,5.22182541 18.0104076,4.92893219 C18.3033009,4.63603897 18.7781746,4.63603897 19.0710678,4.92893219 Z M8.81801948,7.75735931 C9.1109127,8.05025253 9.1109127,8.52512627 8.81801948,8.81801948 C7.06066017,10.5753788 7.06066017,13.4246212 8.81801948,15.1819805 C9.1109127,15.4748737 9.1109127,15.9497475 8.81801948,16.2426407 C8.52512627,16.5355339 8.05025253,16.5355339 7.75735931,16.2426407 C5.41421356,13.8994949 5.41421356,10.1005051 7.75735931,7.75735931 C8.05025253,7.46446609 8.52512627,7.46446609 8.81801948,7.75735931 Z M16.2426407,7.75735931 C18.5857864,10.1005051 18.5857864,13.8994949 16.2426407,16.2426407 C15.9497475,16.5355339 15.4748737,16.5355339 15.1819805,16.2426407 C14.8890873,15.9497475 14.8890873,15.4748737 15.1819805,15.1819805 C16.9393398,13.4246212 16.9393398,10.5753788 15.1819805,8.81801948 C14.8890873,8.52512627 14.8890873,8.05025253 15.1819805,7.75735931 C15.4748737,7.46446609 15.9497475,7.46446609 16.2426407,7.75735931 Z M12,10.5 C12.8284271,10.5 13.5,11.1715729 13.5,12 C13.5,12.8284271 12.8284271,13.5 12,13.5 C11.1715729,13.5 10.5,12.8284271 10.5,12 C10.5,11.1715729 11.1715729,10.5 12,10.5 Z"> </path> </g> </g> 
</g>
</svg>
`;

const REWARD_UNIT_LABELS = {
  xp: "XP",
  token: "ZEC",
  role: "",      
  custom: ""    
};

const nameLoaderStyle = document.createElement('style');
nameLoaderStyle.innerHTML = `
.name-dots{
  display:inline-flex;
  align-items:center;
  gap:4px;
  height:1em;
  vertical-align:middle;
}
.name-dots span{
  width:5px;
  height:5px;
  border-radius:50%;
  background:currentColor;
  opacity:.25;
  animation:nameDotsPulse 1s infinite ease-in-out both;
}
.name-dots span:nth-child(2){ animation-delay:.15s; }
.name-dots span:nth-child(3){ animation-delay:.3s; }
@keyframes nameDotsPulse{
  0%,80%,100%{ opacity:.25; transform:scale(.7); }
  40%{ opacity:1; transform:scale(1); }
}
`;
document.head.appendChild(nameLoaderStyle);

function showNameLoading(el) {
  if (!el) return;
  el.innerHTML = `<span class="name-dots"><span></span><span></span><span></span></span>`;
}

function getModuleItems(moduleId) {
  return document.querySelectorAll(`.quest-item[data-module-id="${moduleId}"]`);
}

function setItemModule(item, moduleId) {
  item.dataset.moduleId = moduleId;
  item.id = `subquests-${moduleId}`;
}

function bindOnce(key, target, type, handler, options) {
  window.__bound = window.__bound || {};
  const prev = window.__bound[key];
  if (prev) prev.target.removeEventListener(prev.type, prev.handler, prev.options);
  target.addEventListener(type, handler, options);
  window.__bound[key] = { target, type, handler, options };
}

function persistModuleOpen(moduleId) {
  fetch("/save_subquest_state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken
    },
    body: JSON.stringify({
      community_id: communityId,
      module_id: moduleId,
      state: "open"
    })
  }).catch(console.error);
}

function finalizeMove(item, originModule, targetModule, targetUUID) {
  const targetList = targetModule.querySelector('.subquests-list');
  if (targetList) {
    targetList.style.display = "";
    targetList.appendChild(item);
  }

  setItemModule(item, targetUUID);

  const subquestUUID = item.dataset.subquestUuid;
  item.dataset.url = `/${communitySlug}/quest/admin/${targetUUID}/${subquestUUID}`;

  getModuleItems(targetUUID).forEach(s => s.style.display = "flex");

  const toggleBtn = targetModule.querySelector('.toggle-subquests');
  const icon = toggleBtn ? toggleBtn.querySelector("svg") : null;
  if (icon) icon.style.transform = "rotate(180deg)";

  updateModuleUI(originModule);
  updateModuleUI(targetModule);
}

function renderTaskTypeIcons(taskTypes) {
  const keys = [...new Set((taskTypes || []).map(t => TASK_ICON_MAP[t] || (t || "").toLowerCase()))]
    .filter(k => PLATFORM_ICONS[k]);

  if (!keys.length) return "";

  const visible = keys.slice(0, 3);
  const extra = keys.length - visible.length;

  const icons = visible.map(k => {
    const platform = PLATFORM_ICONS[k];
    return `
      <div class="task-type-badge" style="background-color:${platform.color};" title="${k}">
        ${platform.icon}
      </div>
    `;
  }).join("");

  const extraBadge = extra > 0
    ? `<div class="task-type-badge task-type-extra">+${extra}</div>`
    : "";

  return `<div class="task-type-stack">${icons}${extraBadge}</div>`;
}


function renderStatusBadge(isDraft) {
  const icon = isDraft ? DraftSvg : LiveSvg;
  const label = isDraft ? "Draft" : "Live";
  const cls = isDraft ? "quest-status-draft" : "quest-status-live";

  return `
    <div class="quest-status-badge ${cls}" title="${label}">
      <span class="status-icon">${icon}</span>
      <span class="status-label">${label}</span>
    </div>
  `;
}


const DISTRIBUTION_LABELS = {
  ALL: "ALL",
  FCFS: "FCFS",
  RAFFLE: "RAFFLE",
  VOTE: "VOTE"
};

function renderRewardBadge(reward) {
  let data = reward.reward_data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch (e) { data = {}; }
  }
  data = data || {};

  const typeIcon = svgMap[reward.reward_type] || "";
  const distIcon = REWARD_ICONS[reward.distribution_type] || REWARD_ICONS.ALL;
  const distLabel = DISTRIBUTION_LABELS[reward.distribution_type] || reward.distribution_type || "";
  const typeClass = `reward-badge-${reward.reward_type || "custom"}`;

  let displayValue = "";

  switch (reward.reward_type) {
    case "xp":
      displayValue = `${data.amount ?? ""} XP`;
      break;

    case "token": {
      const symbol = data.symbol || REWARD_UNIT_LABELS.token || "ZEC";
      displayValue = `${data.amount_per_winner ?? ""} ${symbol}`;
      break;
    }

    case "custom":
      displayValue = data.text || "";
      break;

    case "role":
      displayValue = data.role_name || data.text || "";
      break;

    default:
      displayValue = data.amount ?? "";
  }

  return `
    <div class="reward-badge ${typeClass}" title="${reward.reward_type} · ${reward.distribution_type}">
      ${typeIcon}
      <span class="reward-amount">${displayValue}</span>
      ${distIcon}
      <span class="reward-dist-label">${distLabel}</span>
    </div>
  `;
}

function renderRewardsContainer(rewards) {
  rewards = rewards || [];

  if (!rewards.length) {
    return `<div class="sub-quest-init-place"></div>`;
  }

  const visible = rewards.slice(0, 3);
  const extra = rewards.length - visible.length;

  const badges = visible.map(renderRewardBadge).join("");
  const extraBadge = extra > 0
    ? `<div class="reward-badge reward-extra">+${extra}</div>`
    : "";

  return `
    <div class="sub-quest-init-place">
      ${badges}${extraBadge}
    </div>
  `;
}


const contextMenu = document.getElementById('custom-context-menu');

const TopDropdownTriggersSelector = ".filter-trigger, #dropdown-arrow";
function isTopDropdownTrigger(target) {
  return target.closest(TopDropdownTriggersSelector);
}

function updateTopAreaWidth() {
  const topArea = document.querySelector('.top-area');
  const container = document.querySelector('.content-container');
  const left = document.querySelector('.inner-most-width');
  const filter = document.querySelector('.filter-trigger');

  if (!topArea || !container) return;

  const screenWidth = window.innerWidth;

  if (screenWidth >= 768 && screenWidth <= 942) {
    const containerWidth = container.clientWidth;
    const leftWidth = left ? left.offsetWidth : 0;
    const filterWidth = filter ? filter.offsetWidth : 0;

    const containerStyles = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyles.paddingLeft);
    const paddingRight = parseFloat(containerStyles.paddingRight);

    const availableWidth =
      containerWidth -
      leftWidth -
      filterWidth -
      paddingLeft -
      paddingRight +
      3;

    topArea.style.width = availableWidth + "px";
  }  
}
window.addEventListener("resize", updateTopAreaWidth);


async function syncSprintUI() {
  try {
    const res = await fetch(`/api/${communitySlug}/sprint`);
    const data = await res.json();

    const btn = document.getElementById("createSprintBtn");
    if (!btn) return;

    if (!data.exists) return;

    const now = new Date();
    const start = data.start ? new Date(data.start) : null;
    const end = data.end ? new Date(data.end) : null;

    if (!start || !end) return;

    if (now >= start && now <= end) {
      btn.remove();
      return;
    }

    if (now < start) {
      btn.remove();
      return;
    }

    if (now > end) {
      return;
    }

  } catch (e) {
    console.error("Sprint sync failed", e);
  }
}


const NothingHereSvg = `
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
    width="1024.000000pt" height="1024.000000pt" viewBox="0 0 1024.000000 1024.000000"
    preserveAspectRatio="xMidYMid meet">

    <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)"
    fill="currentColor" stroke="none">
    <path d="M3635 9750 c-313 -28 -651 -109 -936 -225 -667 -272 -1220 -790
    -1553 -1456 -167 -334 -259 -655 -295 -1033 -14 -140 -14 -473 -1 -607 51
    -508 208 -946 486 -1360 84 -124 112 -161 251 -320 l92 -106 -36 -53 c-72
    -107 -160 -325 -197 -490 -82 -359 -52 -760 83 -1100 308 -775 1112 -1254
    1962 -1170 320 32 601 127 849 287 411 267 683 650 784 1104 32 147 46 277 46
    436 0 122 -11 259 -25 315 -6 24 -3 27 67 47 40 13 130 50 201 83 l128 62 147
    -145 c81 -79 189 -184 240 -232 l92 -88 -17 -32 c-10 -20 -18 -64 -21 -120 -4
    -85 -3 -91 31 -161 30 -60 57 -92 154 -186 65 -62 408 -398 763 -745 650 -635
    1300 -1263 1441 -1391 101 -91 215 -158 341 -202 93 -32 116 -36 238 -40 151
    -4 231 8 346 53 200 79 391 268 471 465 79 196 67 455 -30 645 -71 141 -131
    205 -647 686 -698 651 -1082 1011 -1185 1109 -60 58 -216 204 -345 326 -464
    435 -442 419 -565 419 -44 0 -98 -3 -120 -8 l-40 -7 -223 217 -223 218 84 127
    c306 461 467 1026 467 1639 0 479 -94 882 -305 1314 -172 351 -392 647 -679
    914 -456 423 -1033 700 -1651 791 -161 24 -509 34 -670 20z m622 -274 c405
    -60 761 -188 1075 -387 476 -302 844 -726 1074 -1240 238 -531 302 -1114 184
    -1673 -162 -765 -668 -1423 -1355 -1761 -200 -98 -188 -96 -210 -38 -30 80
    -112 235 -169 317 l-53 79 104 53 c204 103 397 248 570 425 112 115 165 181
    249 307 564 848 433 1995 -308 2707 -287 276 -622 466 -987 560 -482 124
    -1014 66 -1470 -161 -237 -117 -403 -238 -596 -430 -271 -272 -455 -593 -545
    -953 -171 -679 -17 -1366 431 -1922 l85 -105 -85 -51 c-104 -62 -210 -140
    -301 -221 l-67 -61 -64 71 c-180 198 -308 385 -420 613 -419 855 -335 1907
    218 2702 147 212 372 455 558 602 408 324 926 524 1510 585 84 9 474 -4 572
    -18z m-2 -875 c228 -46 495 -155 680 -277 415 -273 706 -704 813 -1203 24
    -115 26 -145 27 -351 0 -199 -3 -238 -24 -335 -124 -582 -488 -1028 -1068
    -1312 l-153 -74 -57 44 c-97 74 -222 152 -338 210 -303 151 -561 206 -919 194
    -181 -6 -307 -24 -446 -64 l-85 -25 -100 104 c-268 276 -422 565 -503 938 -24
    115 -26 143 -26 350 0 195 3 239 22 329 81 371 237 663 501 935 298 306 677
    491 1146 560 17 2 118 3 225 1 153 -2 219 -7 305 -24z m-704 -3432 c694 -118
    1183 -640 1260 -1344 27 -253 -30 -565 -146 -795 -92 -184 -265 -388 -439
    -519 -363 -274 -821 -379 -1256 -287 -140 29 -216 55 -339 112 -455 213 -768
    622 -857 1119 -26 148 -24 388 4 522 64 297 185 530 385 739 206 215 446 356
    734 429 144 36 197 42 374 44 118 1 187 -4 280 -20z m3039 -835 c14 -18 1 -33
    -192 -224 l-207 -206 -206 206 -206 207 87 74 c49 40 145 128 214 195 l125
    122 185 -178 c102 -98 192 -186 200 -196z m457 -156 c32 -28 220 -205 418
    -393 378 -358 1043 -987 1180 -1115 44 -41 123 -116 175 -166 52 -50 200 -189
    327 -308 145 -136 248 -240 272 -277 71 -106 103 -243 82 -354 -43 -231 -258
    -405 -499 -405 -129 0 -238 38 -352 123 -81 61 -1072 996 -2080 1964 l-306
    293 346 345 c190 190 354 345 363 345 9 0 43 -23 74 -52z"/>
    <path d="M3170 7681 c-191 -62 -281 -273 -191 -449 27 -54 111 -127 168 -146
    71 -24 167 -21 230 8 240 112 244 451 7 567 -52 25 -165 36 -214 20z"/>
    <path d="M4600 7681 c-131 -42 -218 -151 -228 -282 -9 -128 55 -241 169 -298
    54 -27 72 -31 138 -30 87 1 121 11 184 55 87 62 147 193 132 287 -17 106 -87
    202 -181 248 -52 25 -165 36 -214 20z"/>
    <path d="M3820 6834 c-240 -44 -423 -137 -579 -291 -135 -135 -211 -266 -211
    -367 0 -111 67 -180 172 -179 61 1 85 17 181 119 187 200 388 295 596 281 175
    -11 311 -84 481 -257 63 -64 125 -122 138 -129 32 -17 114 -16 149 3 69 35
    102 105 89 187 -18 115 -167 316 -318 429 -94 71 -252 151 -358 180 -73 20
    -281 35 -340 24z"/>
    <path d="M2571 4529 c-118 -34 -192 -141 -193 -277 -1 -111 29 -155 271 -397
    l211 -209 -206 -207 c-113 -113 -219 -226 -235 -250 -97 -148 -30 -351 141
    -426 21 -9 64 -15 107 -15 124 0 154 19 406 270 l217 216 223 -220 c251 -249
    277 -267 397 -267 214 0 348 211 261 409 -16 36 -77 103 -241 268 l-219 221
    228 230 c207 208 230 235 246 284 47 145 -34 316 -175 366 -56 20 -154 19
    -216 -1 -42 -15 -79 -47 -279 -245 l-230 -229 -220 220 c-251 250 -281 270
    -395 269 -36 0 -80 -5 -99 -10z"/>
    </g>
    </svg>

`;


function checkEmptyModulesAndReset() {
  const remainingModules = document.querySelectorAll('.content-init-q.scrollable');

  if (remainingModules.length === 0) {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = "";  
    renderWelcomeBlock();  
  }
}

async function initQuestApp() {
  const app = document.getElementById("app");
  if (!app) return;

  try {
    const res = await fetch(`/api/${communitySlug}/quests`);
    const data = await res.json();
    twitterState = data.twitter_state || "ok";

    if (!data.quests || data.quests.length === 0) {
      app.innerHTML = "";
      renderWelcomeBlock("questContainer");
      return;
    }

    app.innerHTML = "";

    createQuestModule(data.quests, communitySlug);
    initQuestUIBindings(); 
    initModuleCRUDHandlers();
    initAddSubquestHandlers();  
    initTopDropdowns();
    
    const allModules = document.querySelectorAll('.content-init-q.scrollable');
    allModules.forEach((module) => {
      bindModuleActions(module);
    });

    initSubquestToggles(data.community_id);
    document.querySelectorAll('.quest-item').forEach(item => {
      attachContextMenuEvents(item);
    });
    initSubquestFiltering();
    initMobileQuestMoveSystem(); 
    initQuestItemNavigation();
    initQuestDragSystem();
    LoadContextitemInit();

    requestAnimationFrame(() => {
      updateTopAreaWidth();
    });

    syncSprintUI()

  } catch (err) {
    console.error("Quest fetch failed:", err);
    renderWelcomeBlock("questContainer");
  }
}



function initSubquestFiltering() {
  const trigger = document.querySelector(".filter-trigger");
  const dropdown = document.getElementById("global-filter-dropdown");

  if (!trigger || !dropdown) return;

  function setTriggerText(text) {
    const textNode = Array.from(trigger.childNodes)
      .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== "");

    if (textNode) {
      textNode.textContent = text + " ";
    } else {
      const svg = trigger.querySelector("svg");
      trigger.innerHTML = text + " ";
      if (svg) trigger.appendChild(svg);
    }
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    if (IsopenDropdown === dropdown) {
      dropdown.style.display = "none";
      IsopenDropdown = null;
      return;
    }
    SmartDropdown(trigger, dropdown, {
      offset: 10,
      prefer: "bottom"
    });

  });

  dropdown.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  dropdown.querySelectorAll(".filter-item").forEach(item => {
    item.addEventListener("click", function () {
      const value = item.dataset.value;

      trigger.dataset.filter = value;

      const label =
        value.charAt(0).toUpperCase() + value.slice(1);

      setTriggerText(label);

      applySubquestFilter(value);
    });
  });
}

function applySubquestFilter(type) {
  const items = document.querySelectorAll(".quest-item");
  const AllInitQconatin = document.querySelector(".allinit-conatin");
  const emptyState = document.querySelector(".empty-state");

  let visibleCount = 0;

  items.forEach(item => {
    const isDraft   = item.dataset.draft === "true";
    const isArchive = item.dataset.archive === "true";
    const isActive  = item.dataset.active === "true";

    let show = false;

    if (type === "all") show = true;
    if (type === "draft") show = isDraft;
    if (type === "archive") show = isArchive;
    if (type === "active") show = isActive;

    if (show) visibleCount++;

    item.style.display = show ? "flex" : "none";
  });

  if (visibleCount === 0) {
    AllInitQconatin.style.display = "none";
    emptyState.style.display = "flex";
  } else {
    AllInitQconatin.style.display = "block";
    emptyState.style.display = "none";
  }
}


let mobileMoveMode = false;
let mobileMoveItem = null;
let mobileOriginModule = null;
window.activeQuestUUID = null;


function guardMobileMove(e){
  if(!mobileMoveMode) return false;
  if(e){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  return true; 
}

function bindModuleActions(module) {
  const menuBtn = module.querySelector('.menu-btn');
  const dropdown = document.getElementById('myDropdown');
  const moduleHeader = module.querySelector('.module-header');

  if (!moduleHeader) return;

  const moduleUUID = module.id.replace('module-', '');

  function closeOtherDropdowns() {
    if (IsopenDropdown) {
      IsopenDropdown.style.display = 'none';
      IsopenDropdown = null;
    }
  } 
  
  function closeModuleDropdown() {
    if (!dropdown) return;

    dropdown.classList.remove('show', 'flip-left', 'flip-up');
    dropdown.style.display = 'none';

    if (window.activeQuestUUID === moduleUUID) {
      window.activeQuestUUID = null;
    }
  }

function toggleModuleDropdown(x, y, e) {
  if (!dropdown) return;

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show', 'flip-left', 'flip-up');
    dropdown.style.display = 'none';
    return;
  }

  hideAllDropdowns();
  closeOtherDropdowns();
  hideMenu();

  window.activeQuestUUID = moduleUUID;

  dropdown.classList.add('show');
  dropdown.style.display = 'flex';

  positionDropdown(dropdown, x, y);
}

  // Desktop right-click toggle
  moduleHeader.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTopDropdownTrigger(e.target)) return;

    toggleModuleDropdown(e.pageX, e.pageY);
  });

  // Mobile long-press toggle
  let pressTimer = null;
  let longPressTriggered = false;
  let touchStartX = 0;
  let touchStartY = 0;

  moduleHeader.addEventListener('touchstart', (e) => {
    longPressTriggered = false;

    const touch = e.touches[0];
    if (!touch) return;

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    const target = e.target;
    const x = touch.pageX;
    const y = touch.pageY;

    pressTimer = setTimeout(() => {
      if (isTopDropdownTrigger(target)) return;

      longPressTriggered = true;
      toggleModuleDropdown(x, y);
    }, 600);
  }, { passive: true });

  moduleHeader.addEventListener('touchend', (e) => {
    clearTimeout(pressTimer);

    if (longPressTriggered) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });

  moduleHeader.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (!touch) return;

    if (
      Math.abs(touch.clientX - touchStartX) > 10 ||
      Math.abs(touch.clientY - touchStartY) > 10
    ) {
      clearTimeout(pressTimer);
    }
  }, { passive: true });

  moduleHeader.addEventListener('touchcancel', () => {
    clearTimeout(pressTimer);
  }, { passive: true });

  // Menu button toggle
  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isTopDropdownTrigger(e.target)) return;

      toggleModuleDropdown(e.pageX, e.pageY, e);  
    });
  }
}

  function hideAllDropdowns() {
    document.querySelectorAll('.dropdown.show').forEach(d => {
      d.classList.remove('show');
      d.style.display = 'none';
    });
  }

function positionDropdown(dropdown, x, y) {
  const padding = 10;
  const gap = 14;

  dropdown.classList.remove('flip-left', 'flip-up');

  dropdown.style.visibility = 'hidden';
  dropdown.style.display = 'flex';
  dropdown.style.left = '0px';
  dropdown.style.top = '0px';

  const realWidth = dropdown.offsetWidth || 180;
  const realHeight = dropdown.offsetHeight || 200;

  const viewportX = x - window.scrollX;
  const viewportY = y - window.scrollY;

  const spaceRight = window.innerWidth - viewportX;
  const spaceBelow = window.innerHeight - viewportY;
  const spaceAbove = viewportY;

  let left = x;
  let top = y + gap;

  // Flip horizontally when there isn't enough room on the right.
  if (spaceRight < realWidth + padding) {
    dropdown.classList.add('flip-left');
    left = x - realWidth - gap;
  } else {
    left = x + gap;
  }

  // Flip vertically when there isn't enough room below.
  if (spaceBelow < realHeight + gap + padding) {
    dropdown.classList.add('flip-up');
    top = y - realHeight - gap;
  }

  // Keep the dropdown inside the viewport.
  const minLeft = window.scrollX + padding;
  const maxLeft = window.scrollX + window.innerWidth - realWidth - padding;

  const minTop = window.scrollY + padding;
  const maxTop = window.scrollY + window.innerHeight - realHeight - padding;

  left = Math.max(minLeft, Math.min(left, maxLeft));
  top = Math.max(minTop, Math.min(top, maxTop));

  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${top}px`;
  dropdown.style.visibility = 'visible';
}

function renderWelcomeBlock(containerId = "questContainer") {
  const app = document.getElementById("app");
  if (!app) return;

  const wrapper = document.createElement("div");
  wrapper.className = "content-container welcome";

  wrapper.innerHTML = `
    <div class="spacer-init">

      <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225.000000 225.000000"
        preserveAspectRatio="xMidYMid meet">

        <g transform="translate(0.000000,225.000000) scale(0.100000,-0.100000)"
        fill=" currentColor" stroke="none">
        <path d="M1400 2006 c-19 -7 -135 -63 -257 -125 -123 -61 -232 -111 -243 -111
        -12 0 -141 36 -287 80 -146 44 -280 80 -297 80 -46 0 -105 -19 -127 -41 -44
        -44 -5 -127 54 -115 15 3 40 9 55 12 19 4 108 -19 282 -72 355 -108 319 -111
        628 44 158 79 255 122 275 122 42 0 495 -167 524 -193 68 -61 19 -177 -75
        -177 -16 0 -119 36 -231 80 -111 44 -209 80 -217 80 -8 0 -114 -50 -236 -111
        -240 -120 -320 -146 -413 -134 -27 3 -130 31 -227 60 -97 30 -179 55 -182 55
        -3 0 -6 -212 -6 -471 l0 -471 -35 -35 c-32 -32 -40 -35 -77 -30 -26 3 -51 15
        -67 31 l-26 26 -5 511 -5 511 -24 19 c-31 26 -57 24 -86 -6 l-25 -24 0 -494
        c0 -563 1 -568 73 -641 23 -23 56 -47 72 -53 17 -6 165 -51 330 -98 228 -66
        314 -86 360 -86 57 0 74 7 306 122 154 76 257 122 275 121 16 0 116 -35 223
        -77 180 -72 198 -77 248 -72 64 7 132 43 167 90 56 73 56 73 56 671 0 629 0
        627 -73 699 -38 38 -68 52 -297 137 -272 101 -337 114 -410 86z m-131 -696
        c85 -43 134 -124 135 -220 1 -103 -53 -180 -167 -240 -26 -14 -50 -33 -53 -43
        -3 -10 -17 -22 -31 -28 -38 -14 -73 0 -90 36 -25 51 4 99 89 150 98 59 108 71
        108 122 0 36 -6 50 -29 74 -63 62 -160 25 -174 -68 -12 -73 -85 -99 -127 -46
        -37 47 -13 141 54 211 74 80 191 101 285 52z m-89 -637 c25 -32 20 -69 -12
        -95 -62 -54 -149 30 -98 95 30 37 80 37 110 0z"/>
        </g>
      </svg>

      <p class="space">
        <strong>Quest Hub</strong>
        Welcome to your Quest hub! This is where you create fun quests, tasks, and reward your community for taking actions.
      </p>

      <a href="/${communitySlug}/module"
        class="marakey"
        data-path="/${communitySlug}/module"
        onclick="event.preventDefault(); loadMainSettingsSection(this.dataset.path, event)">
       Create Module
      </a>

    </div>
  `;

  app.appendChild(wrapper);
}


const InnerSvgDisplay = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
          <path d="M6 9l6 6 6-6" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"/>
        </svg>
`
const InnerOnWords = `
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14.5" height="14.5" fill="currentColor" aria-hidden="true">
            <g transform="translate(0 1.333) scale(0.0416666)">
              <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z"/>
            </g>
          </svg>
`;

const isMobileInit = window.innerWidth <= 767;


const FinalPreview = isMobileInit ? InnerOnWords : "Preview";


function updateArchiveMenuState(questItem) {
  if (!contextMenu || !questItem) return;

  const isArchived = questItem.dataset.archive === "true";

  const archiveBtn   = contextMenu.querySelector('.menu-item.archived');
  const unarchiveBtn = contextMenu.querySelector('.menu-item.un-archive');

  if (!archiveBtn || !unarchiveBtn) return;

  if (isArchived) {
    unarchiveBtn.style.display = "flex";
    archiveBtn.style.display   = "none";
  } else {
    archiveBtn.style.display   = "flex";
    unarchiveBtn.style.display = "none";
  }
}

function syncInitialToggleState() {
  document.querySelectorAll(".toggle-subquests").forEach(btn => {
    const moduleId = btn.dataset.moduleId;
    const icon = btn.querySelector("svg");
    const subquests = getModuleItems(moduleId);

    if (!subquests.length || !icon) return;

    const isOpen = subquests[0].style.display !== "none";

    icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
  });
}


function buildModuleElement(quest, communitySlug) {
  const is_open = quest.is_open === true;

  const module = document.createElement("div");
  module.className = "content-init-q scrollable";
  module.id = `module-${quest.uuid}`;
  module.dataset.community = communitySlug;

  module.innerHTML = `
    <div class="cardin">

      <div class="module-header">
        <div class="module-title-wrapper" data-module-id="${quest.uuid}">
          <h5 class="module-title" id="module-name-${quest.uuid}">${quest.title}</h5>
        </div>

        <div class="module-actions">
          <button class="icon-btn toggle-subquests" data-module-id="${quest.uuid}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="icon-btn add-quest">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="icon-btn menu-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="subquests-list">
        ${quest.subquests.map(subquest => `
          <div class="quest-item"
              id="subquests-${quest.uuid}"
              data-module-id="${quest.uuid}"
              style="display:${is_open ? "flex" : "none"};"
              data-url="${subquest.url}"
              data-draft="${subquest.is_draft}"
              data-subquest-uuid="${subquest.uuid}" 
              data-archive="${subquest.is_archive}"
              data-active="${!subquest.is_draft && !subquest.is_archive}">

            <div class="diver-quest-123321">

              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" fill="currentColor">
                <path d="M6.5 11a1.5 1.5 0 1 1-3 0
                         1.5 1.5 0 0 1 3 0z
                         M5 3.5A1.5 1.5 0 1 0 6.5 5
                         1.5 1.5 0 0 0 5 3.5z
                         M12.5 11a1.5 1.5 0 1 1-3 0
                         1.5 1.5 0 0 1 3 0z
                         M11 3.5A1.5 1.5 0 1 0 12.5 5
                         1.5 1.5 0 0 0 11 3.5z"/>
              </svg>

              <div class="quest-link" style="user-select:none !important;">
                ${subquest.name}
              </div>
              ${renderStatusBadge(!!subquest.is_draft)}

            </div>

            <div style="display: flex; align-items: center; gap: 17px">
              ${renderTaskTypeIcons(subquest.task_types)}

              ${renderRewardsContainer(subquest.rewards)}
            </div>

          </div>
        `).join("")}
      </div>

    </div>
  `;

  return module;
}

function createQuestModule(quests, communitySlug, isMobile = false, subquestStates = {}) {
  const app = document.getElementById("app");
  if (!app) return;

  const contentContainer = document.createElement("div");
  contentContainer.className = "content-container";
  contentContainer.innerHTML = `
    <div class="inner-most-width"></div>

    <div class="filter-trigger" data-filter="all">
      All
      ${InnerSvgDisplay}
    </div>

    <div class="top-area">
        <div class="edge-wrap">
          <input type="text" id="SearchAdmintquest" placeholder="Search...">
        </div>
      <a 
        href="/${communitySlug}/quest"
        data-path="/${communitySlug}/quest"
        onclick="event.preventDefault(); loadMainSettingsSection(this.dataset.path, true, true)"
        class="highlight">
        ${FinalPreview}
      </a>

      <div class="dropdown-wrapper">
        <div class="topbars">
          <div class="browse-wrapper">
            <button class="top-btn dropdown-toggle">
              <span id="btn-text" class="btn-text">Templates</span>
              <div class="vertical-line"></div>
              <span id="dropdown-arrow" class="arrow">▼</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="diver-nessess"></div>
    <div class="diver-nessess"></div>
  `;

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "scroll-container";

  const noResults = document.createElement("div");
  noResults.id = "no-results-message";
  noResults.style.cssText = `
    display: none;
    text-align:center;
    margin-top:10rem;
    font-weight: 550;
    font-style: italic;
    color: var(--text-main);
    font-size: 14px;
    height: 100%
  `;
  noResults.textContent = "No quest found";

  const AllInitQconatin = document.createElement("div");
  AllInitQconatin.className = "allinit-conatin";

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.innerHTML = `
    <div class="empty-container">
      <div class="empty-icon">
        ${NothingHereSvg}
      </div>
      <div class="empty-text">
        Nothing here yet
      </div>    
    </div>
  `;

  scrollContainer.appendChild(emptyState);

  app.appendChild(contentContainer);
  app.appendChild(scrollContainer);
  scrollContainer.appendChild(noResults);
  scrollContainer.appendChild(AllInitQconatin);

  quests.forEach(quest => {
    AllInitQconatin.appendChild(buildModuleElement(quest, communitySlug));
    syncInitialToggleState();
  });
}




function initMobileQuestMoveSystem(){

  document.addEventListener("click", async (e) => {
    if(!mobileMoveMode) return;

    const targetModule = e.target.closest('.content-init-q');
    if(!targetModule) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const targetQuestUUID = targetModule.id.replace("module-", "");
    const subquestUUID = mobileMoveItem?.dataset?.subquestUuid;

    if(!targetQuestUUID || !subquestUUID) return;

    const originQuestUUID = mobileOriginModule
      ? mobileOriginModule.id.replace("module-", "")
      : null;

    if(originQuestUUID === targetQuestUUID){
      cleanupMobileMove();
      showToast("Cancelled", "error");
      return;
    }

    const targetWasOpen = [...getModuleItems(targetQuestUUID)].some(
      el => getComputedStyle(el).display !== "none"
    );

    try{
      const res = await fetch('/move_subquest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          subquest_uuid: subquestUUID,
          target_quest_uuid: targetQuestUUID
        })
      });

      const data = await res.json();

      if(data.status === 'success'){

        finalizeMove(mobileMoveItem, mobileOriginModule, targetModule, targetQuestUUID);

        if(!targetWasOpen){
          persistModuleOpen(targetQuestUUID);
        }

        showSuccess(`
          <div style="display:flex;align-items:center;gap:10px;">
            ${SuccessAvgInitColored}
            <span>Moved successfully</span>
          </div>
        `);
        cleanupMobileMove();

      } else {
        showError("Move failed");
        cleanupMobileMove();
      }

    }catch(err){
      showError("Move error");
      cleanupMobileMove();
    }

  }, true);
}

function cleanupMobileMove(){
  if(mobileMoveItem){
    mobileMoveItem.classList.remove('mobile-move-active');
  }

  document.documentElement.classList.remove('quest-mobile-lock');

  mobileMoveMode = false;
  mobileMoveItem = null;
  mobileOriginModule = null;
}



  function isMobileView() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

const mobileMoveStyle = document.createElement('style');
mobileMoveStyle.innerHTML = `
html.quest-mobile-lock{
  overflow: hidden !important;
  touch-action: none !important;
}

.quest-item.mobile-move-active{
  opacity:0.3;
}

.quest-drag-ghost{
  position: fixed;
  pointer-events:none;
  z-index:999999;
  opacity:0.9;
  background:var(--bg-main);
  border:1px solid var(--border);
  border-radius:8px;
  padding:6px 10px;
  box-shadow:0 8px 25px rgba(0,0,0,0.25);
}
`;


let dragState = {
  item: null,
  ghost: null,
  originModule: null,
  currentModule: null,
  startY: 0,
  dragging: false
};

const dragStyle = document.createElement('style');
dragStyle.innerHTML = `
.quest-drag-ghost {
  position: fixed;
  pointer-events:none;
  z-index:999999;
  opacity:0.9;
  background:var(--bg-main);
  border:1px solid var(--border);
  border-radius:8px;
  padding:6px 10px;
  box-shadow:0 8px 25px rgba(0,0,0,0.25);
}



.quest-item.dragging{
  opacity:0.3;
}
`;
document.head.appendChild(dragStyle);



function initQuestDragSystem(){
  document.addEventListener('pointerdown', onDragStart, true);
  document.addEventListener('pointermove', onDragMove, true);
  document.addEventListener('pointerup', onDragEnd, true);
}

function onDragStart(e){

  if(isMobileView()) {
    return;
  }

  const handle = e.target.closest('.diver-quest-123321 svg');
  if(!handle) return;

  const questItem = handle.closest('.quest-item');
  if(!questItem) return;

  e.preventDefault();

  dragState.dragging = true;
  dragState.item = questItem;
  dragState.originModule = questItem.closest('.content-init-q');
  dragState.startY = e.clientY;

  handle.style.cursor = 'grabbing';

  const ghost = questItem.cloneNode(true);
  ghost.classList.add('quest-drag-ghost');

  const badgeRow = ghost.querySelector('.sub-quest-init-place, .task-type-stack')?.closest('div[style*="gap"]');
  if (badgeRow) badgeRow.remove();

  ghost.querySelectorAll('.sub-quest-init-place, .task-type-stack').forEach(el => el.remove());

  ghost.style.width = 'auto';
  ghost.style.display = 'inline-flex';
  ghost.style.alignItems = 'center';

  document.body.appendChild(ghost);

  dragState.ghost = ghost;
  questItem.classList.add('dragging');
}

function onDragMove(e){
  if(!dragState.dragging) return;

  e.preventDefault();

  const { ghost } = dragState;

  const container = document.querySelector('.scroll-container');
  if(container){
    const cRect = container.getBoundingClientRect();
    const gRect = ghost.getBoundingClientRect();

    let x = e.clientX + 10;
    let y = e.clientY + 10;

    if(x < cRect.left) x = cRect.left;
    if(x + gRect.width > cRect.right) x = cRect.right - gRect.width;
    if(y < cRect.top) y = cRect.top;
    if(y + gRect.height > cRect.bottom) y = cRect.bottom - gRect.height;

    ghost.style.left = x + 'px';
    ghost.style.top  = y + 'px';
  }

  autoScroll(e.clientY);

  const el = document.elementFromPoint(e.clientX, e.clientY);
  const module = el ? el.closest('.content-init-q.scrollable') : null;

  if(dragState.currentModule && dragState.currentModule !== module){
    const prev = dragState.currentModule;

    if(prev.dataset.tempOpen === "true"){
      const wasOpen = prev.dataset.wasOpen === "true";

      if(!wasOpen){
        const btn = prev.querySelector('.toggle-subquests');
        if(btn){
          const id = btn.dataset.moduleId;
          const subs = getModuleItems(id);
          subs.forEach(s => s.style.display = "none");

          const icon = btn.querySelector('svg');
          if(icon) icon.style.transform = "rotate(0deg)";
        }
      }

      delete prev.dataset.tempOpen;
      prev.classList.remove("temp-open");
    }

    prev.classList.remove("module-drop-target");
  }

  document.querySelectorAll('.content-init-q').forEach(m=>{
    m.classList.remove('module-drop-target');
  });

  if(!module){
    dragState.currentModule = null;
    return;
  }

  module.classList.add('module-drop-target');
  dragState.currentModule = module;

  const toggleBtn = module.querySelector('.toggle-subquests');
  if (!toggleBtn) return;

  const moduleId = toggleBtn.dataset.moduleId;
  const subquests = getModuleItems(moduleId);
  if (!subquests.length) return;

  const isOpen = subquests[0].style.display !== "none";

  if (!module.dataset.hasOwnProperty("wasOpen")) {
    module.dataset.wasOpen = isOpen ? "true" : "false";
  }

  if (!isOpen && module.dataset.tempOpen !== "true") {

    subquests.forEach(sub => sub.style.display = "flex");

    const icon = toggleBtn.querySelector('svg');
    if(icon) icon.style.transform = "rotate(180deg)";

    module.classList.add("temp-open");
    module.dataset.tempOpen = "true";
  }
}

let suppressNextClickQ = false;

function updateModuleUI(module) {
  if (!module) return;
  
  const toggleBtn = module.querySelector('.toggle-subquests');
  const icon = toggleBtn?.querySelector('svg');
  const subquests = module.querySelectorAll('.quest-item');
  const subquestList = module.querySelector('.subquests-list');

  if (!toggleBtn || !icon || !subquestList) return;

  const hasItems = subquests.length > 0;

  if (!hasItems) {
    icon.style.transform = "rotate(0deg)";

    console.log("this is the module", icon)
    return;
  }

  const isOpen = [...subquests].some(
    el => getComputedStyle(el).display !== "none"
  );

  subquestList.style.display = isOpen ? "" : "none";

  icon.style.transform = isOpen
    ? "rotate(180deg)"
    : "rotate(0deg)";
}


function onDragEnd(e){
  if(!dragState.dragging) return;
  suppressNextClickQ = true; 

  setTimeout(() => {
    suppressNextClickQ = false;
  }, 120);
  const { item, ghost, currentModule, originModule } = dragState;

  document.querySelectorAll('.content-init-q')
    .forEach(m=>m.classList.remove('module-drop-target'));

  const subquestUUID = item?.dataset?.subquestUuid || null;

  const originQuestUUID = originModule
    ? originModule.id.replace("module-", "")
    : null;

  const targetQuestUUID = currentModule
    ? currentModule.id.replace("module-", "")
    : null;

  if(!currentModule || !targetQuestUUID || !subquestUUID){
    cleanupHybrid();
    return;
  }

  if(originQuestUUID === targetQuestUUID){
    cleanupHybrid();
    return;
  }

  const targetWasOpen = currentModule.dataset.wasOpen === "true";

  fetch('/move_subquest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    },
    body: JSON.stringify({
      subquest_uuid: subquestUUID,
      target_quest_uuid: targetQuestUUID
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.status === 'success'){

      finalizeMove(item, originModule, currentModule, targetQuestUUID);

      if (!targetWasOpen) {
        persistModuleOpen(targetQuestUUID);
      }

    } else {
      console.error("Move failed:", data);
      updateModuleUI(originModule);
      updateModuleUI(currentModule);
    }
  })
  .catch(err=>{
    console.error("Move error:", err);
  });

  cleanupHybrid();
}

function cleanupHybrid(){
  const { item, ghost } = dragState;

  if(item) item.classList.remove('dragging');
  if(ghost) ghost.remove();

  document.querySelectorAll('.content-init-q').forEach(m=>{
    delete m.dataset.wasOpen;
    delete m.dataset.tempOpen;
    m.classList.remove("temp-open");
    m.classList.remove("module-drop-target");
  });

  dragState = {
    item:null,
    ghost:null,
    originModule:null,
    currentModule:null,
    startY:0,
    dragging:false
  };
}



function autoScroll(y){
  const container = document.querySelector('.scroll-container');
  if(!container) return;

  const rect = container.getBoundingClientRect();
  const threshold = 80;
  const speed = 12;

  if(y < rect.top || y > rect.bottom) return;

  if(y < rect.top + threshold){
    container.scrollTop -= speed;
  }

  if(y > rect.bottom - threshold){
    container.scrollTop += speed;
  }
}


document.addEventListener('mouseover', e=>{
  const h = e.target.closest('.diver-quest-123321 svg');
  if(h) h.style.cursor = 'grab';
});

  function hideMenu() {
    contextMenu.style.display = 'none';
  }


function hideMenuModule() {
   dropdownMode.classList.remove('show');
  dropdownMode.style.display = "none"

}

  function hideAllMenus(e) {
    hideMenuModule();
    hideMenu();
    if (isTopDropdownTrigger(e.target)) return;

    if(IsopenDropdown){
      IsopenDropdown.style.display ="none";

      IsopenDropdown = null;      
    }
  }

const dropdownMode = document.getElementById('myDropdown');





function initQuestItemNavigation() {

  document.addEventListener("click", (e) => {
    const questItem = e.target.closest(".quest-item");
    if (!questItem) return;

    const moduleDropdown = document.getElementById("myDropdown");
    if(guardMobileMove(e)) return;

    const isContextMenuOpen =
      contextMenu && contextMenu.style.display === "flex";

    const isModuleMenuOpen =
      moduleDropdown &&
      (moduleDropdown.style.display === "flex" ||
       moduleDropdown.style.display === "block" ||
       moduleDropdown.classList.contains("show"));

    const isSmartDropdownOpen = IsopenDropdown !== null;

    const isDragging = dragState?.dragging === true;

    if (
      suppressNextClickQ ||        
      isDragging ||                  
      isContextMenuOpen ||           
      isModuleMenuOpen ||           
      isSmartDropdownOpen           
    ) {
      suppressNextClickQ = false;    
      hideAllMenus?.(e);

      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const url = questItem.dataset.url;
    if (url) {
      loadMainSettingsSection(url, event);
    }

  }, true); 


  document.addEventListener("click", (e) => {

    const clickedQuestItem   = e.target.closest(".quest-item");
    const clickedContextMenu = e.target.closest("#contextMenu");
    const clickedModuleMenu  = e.target.closest("#myDropdown");
    const clickedSmartDrop   = e.target.closest(".smart-dropdown");
    const clickedToggle      = e.target.closest(".toggle-subquests");
    const clickedMenuBtn     = e.target.closest(".menu-btn");

    const isDragging = dragState?.dragging === true;

    if (isDragging) return;

    if (clickedQuestItem) return;

    if (
      clickedContextMenu ||
      clickedModuleMenu ||
      clickedSmartDrop
    ) return;

    if (clickedToggle) return;
    if (clickedMenuBtn) return; 

    hideAllMenus?.(e);

    if (contextMenu) {
      contextMenu.style.display = "none";
    }



    const moduleDropdown = document.getElementById("myDropdown");
    if (moduleDropdown) {
      moduleDropdown.classList.remove("show");
      moduleDropdown.style.display = "none";
    }

    if (isTopDropdownTrigger(e.target)) return;
    if (IsopenDropdown) {
      IsopenDropdown.style.display = "none";
      IsopenDropdown = null;
    }
  }, true);
}


function attachContextMenuEvents(item) {
  let pressTimer = null;
  let longPressTriggered = false;
  let startX = 0;
  let startY = 0;

  function showMenu(x, y, e) {
    const menuWidth = contextMenu.offsetWidth || 180;
    const menuHeight = contextMenu.offsetHeight || 200;
    const padding = 10;
    let left = x, top = y;

    if (window.innerWidth - x < menuWidth + padding) left = x - menuWidth;
    if (window.innerHeight - y < menuHeight + padding) top = y - menuHeight;
    if (left < 0) left = 0;
    if (top < 0) top = 0;

    hideMenuModule();

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
    contextMenu.style.display = 'flex';

    const uuid = item.dataset.subquestUuid || '';
    contextMenu.dataset.currentId = uuid;
    window.currentSubquest = item;
    updateArchiveMenuState(item);

    if (isTopDropdownTrigger(e.target)) return;

    if (IsopenDropdown) {
      IsopenDropdown.style.display = "none";
      IsopenDropdown = null;
    }
  }

  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showMenu(e.pageX, e.pageY, e);
  });

  item.addEventListener('touchstart', (e) => {
    longPressTriggered = false;

    const touch = e.touches[0];
    startX = touch.pageX;
    startY = touch.pageY;

    pressTimer = setTimeout(() => {
      longPressTriggered = true;

      showMenu(startX, startY, e);

      e.preventDefault();
      e.stopPropagation();
    }, 600);
  }, { passive: false });

  item.addEventListener('touchend', (e) => {
    clearTimeout(pressTimer);

    if (longPressTriggered) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });

  item.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.pageX - startX);
    const dy = Math.abs(touch.pageY - startY);

    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimer);
    }
  }, { passive: true });
}


document.head.appendChild(mobileMoveStyle);



function getSubquestUUID(el) {
  return el.dataset.subquestUuid;
}

function questUX({
  module,
  node = null,
  scrollContainer = null,
  toast = null,
  toastType = "success",
  highlight = false,
  delay = 250
}) {
  if (toast) {
    if (toastType === "error") showError(toast);
    else showSuccess(toast);
  }

  if (module) forceOpenModule(module);

  if (scrollContainer && node) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });

      if (highlight) {
        highlightQuest(node, delay);
      }
    });
  }
}


function DelquestUX({
  module,
  node = null,
  scrollContainer = null,
  toast = null,
  toastType = "success",
  highlight = false,
  delay = 250
}) {
  if (toast) {
    if (toastType === "error") showError(toast);
    else showSuccess(toast);
  }

  if (scrollContainer && node) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });

      if (highlight) {
        highlightQuest(node, delay);
      }
    });
  }
}

function LoadContextitemInit() {
  let currentSubquest = null;

  contextMenu.querySelector('.menu-item:nth-child(1)').addEventListener('click', function () {
    if (!window.currentSubquest) return;

    const uuid = window.currentSubquest.dataset.subquestUuid;

    const nameEl = window.currentSubquest.querySelector('.quest-link');
    const oldName = (nameEl?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    showInputModal({
      title: "Rename Quest",
      message: "Enter a new name for this quest",
      placeholder: "Quest name...",
      defaultValue: oldName,
      confirmText: "Rename",
      onConfirm: async (newName) => {
        newName = newName.replace(/\s+/g, " ").trim();
        if (!newName || newName === oldName || !nameEl) return;

        showNameLoading(nameEl);

        try {
          const res = await fetch(`/rename_subquest/${uuid}`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ name: newName })
          });

          const data = await res.json();

          if (res.ok && (data.status === 'success' || data.success === true)) {
            nameEl.textContent = data.name || newName;
          } else {
            nameEl.textContent = oldName;
            showError(data.message || "Rename failed");
          }
        } catch (err) {
          console.error("Rename subquest error:", err);
          nameEl.textContent = oldName;
          showError("Rename failed");
        }
      }
    });

    hideMenu();
  });



  contextMenu.querySelector('.menu-item.move').addEventListener('click', function () {
    if (!window.currentSubquest) return;
    if(!isMobileView()) {
      return;
    }
    const questItem = window.currentSubquest; 
    hideMenu();

    if(isMobileView()){
      mobileMoveMode = true;
      mobileMoveItem = questItem;
      mobileOriginModule = questItem.closest('.content-init-q');

      questItem.classList.add('mobile-move-active');
      document.documentElement.classList.add('quest-mobile-lock');

      showToast("Tap a module to move here", "success");
      return;
    }

  });


  contextMenu.querySelector('.menu-item:nth-child(8)').addEventListener('click', function (e) {
    if (!window.currentSubquest) return;
    e.preventDefault();
    e.stopPropagation();
    const uuid = window.currentSubquest.dataset.subquestUuid;

    showInputModal({
      title: "Delete Subquest",
      message: "Are you sure you want to delete this quest? This action cannot be undone.",
      cancelText: "Cancel",
      confirmText: "Delete",
      placeholder: "",
      defaultValue: "",
      onConfirm: () => {

        fetch(`/delete_subquest/${uuid}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          }
        })
        .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {

              const module = window.currentSubquest.closest('.content-init-q');

              window.currentSubquest.remove();
              updateModuleUI(module);

              DelquestUX({
                module,
                toast: "Quest deleted",
                toastType: "success"
              });

            } else {
              DelquestUX({ toast: data.message || "Delete failed", toastType: "error" });
            }
          });


      }
    });

    hideMenu();
  });

  contextMenu.querySelector('.menu-item:nth-child(5)').addEventListener('click', toggleArchive);
  contextMenu.querySelector('.menu-item:nth-child(6)').addEventListener('click', toggleArchive);

  function toggleArchive(){
    if (!window.currentSubquest) return;

    const uuid = window.currentSubquest.dataset.subquestUuid;

    fetch(`/toggle_subquest_archive/${uuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      }
    })
    .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {

          const module = window.currentSubquest.closest('.content-init-q');

          window.currentSubquest.dataset.archive = data.archived ? "true" : "false";
          window.currentSubquest.dataset.active  = data.archived ? "false" : "true";

          if (data.archived) {
            window.currentSubquest.style.display = "none";

            questUX({
              module,
              toast: "Quest archived",
              toastType: "success"
            });

          } else {
            window.currentSubquest.style.display = "flex";

            questUX({
              module,
              node: window.currentSubquest,
              scrollContainer: module.closest('.scroll-container'),
              toast: "Quest restored",
              toastType: "success",
              highlight: true
            });
          }

        } else {
          questUX({ toast: data.message || "Archive failed", toastType: "error" });
        }
      });


    hideMenu();
  }

  contextMenu.querySelector('.menu-item:nth-child(3)').addEventListener('click', function (e) {
    if (!window.currentSubquest) return;
    e.preventDefault();
    e.stopPropagation();

    const url = window.currentSubquest.dataset.url;
    if (url) window.open(url, '_blank');

    hideMenu();
  });

  contextMenu.querySelector('.menu-item:nth-child(2)').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!window.currentSubquest) return;

      const uuid = window.currentSubquest.dataset.subquestUuid;
      const sourceModuleId = window.currentSubquest.dataset.moduleId;

      const subquestContainer = window.currentSubquest.closest('.subquests-list');
      if (!subquestContainer) return;

      fetch(`/duplicate_subquest/${uuid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {

          const newItem = document.createElement('div');
          newItem.className = 'quest-item';
          newItem.dataset.subquestUuid = data.subquest_uuid;
          newItem.dataset.archive = "false";
          newItem.dataset.active = "true";
          newItem.dataset.draft = "false";
          newItem.dataset.url = window.currentSubquest.dataset.url;
          setItemModule(newItem, sourceModuleId);

          newItem.innerHTML = `
            <div class="diver-quest-123321">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" fill="currentColor">
                <path d="M6.5 11a1.5 1.5 0 1 1-3 0
                        1.5 1.5 0 0 1 3 0z
                        M5 3.5A1.5 1.5 0 1 0 6.5 5
                        1.5 1.5 0 0 0 5 3.5z
                        M12.5 11a1.5 1.5 0 1 1-3 0
                        1.5 1.5 0 0 1 3 0z
                        M11 3.5A1.5 1.5 0 1 0 12.5 5
                        1.5 1.5 0 0 0 11 3.5z"/>
              </svg>

              <div class="quest-link">${data.name}</div>
              ${renderStatusBadge(true)}

            </div>
            
            <div style="display: flex; align-items: center; gap: 17px">
              ${renderTaskTypeIcons(data.task_types)}
              ${renderRewardsContainer(data.rewards || [])}
            </div>
          `;

          const subquestList = window.currentSubquest.closest('.subquests-list');
          const module = window.currentSubquest.closest('.content-init-q');
          const scrollContainer = module.closest('.scroll-container');

          if (subquestList) {
            subquestList.appendChild(newItem);
            attachContextMenuEvents(newItem);

            const toastMsg = data.skipped_token_reward
              ? "Quest duplicated — token reward was not copied"
              : "Quest duplicated successfully";

            questUX({
              module,
              node: newItem,
              scrollContainer,
              toast: toastMsg,
              toastType: "success",
              highlight: true
            });
          }
        } else {
          questUX({ toast: data.message || "Duplicate failed", toastType: "error" });
        }
      });

      hideMenu();
    });

}


function forceOpenModule(module) {
  if (!module) return;

  const toggleBtn = module.querySelector('.toggle-subquests');
  if (!toggleBtn) return;

  const moduleId = toggleBtn.dataset.moduleId;
  const subquests = module.querySelectorAll('.quest-item');
  const icon = toggleBtn.querySelector("svg");

  const isAnyVisible = [...subquests].some(s => s.style.display === "flex");
  if (isAnyVisible) return;

  subquests.forEach(sub => sub.style.display = "flex");
  if (icon) icon.style.transform = "rotate(180deg)";
  console.log("called Force opened")
  persistModuleOpen(moduleId);
}


function highlightQuest(node, delay = 250) {
  if (!node) return;

  setTimeout(() => {
    node.classList.add('smart-highlight');

    setTimeout(() => {
      node.classList.remove('smart-highlight');
    }, 1200);

  }, delay);
}


function initAddSubquestHandlers(scope = null) {
  const modules = scope
    ? [scope]
    : document.querySelectorAll('.content-init-q.scrollable');
  if (!modules.length) return;

  modules.forEach(module => {
    const addQuestBtn = module.querySelector('.add-quest');
    if (!addQuestBtn) return;

    const moduleId = module.id.replace('module-', '');
    const subquestContainer = module.querySelector('.subquests-list');
    const scrollContainer = module.closest('.scroll-container');

    addQuestBtn.addEventListener('click', async () => {
      if (addQuestBtn.dataset.loading === "true") return;    
      addQuestBtn.dataset.loading = "true";

      const originalHTML = addQuestBtn.innerHTML;
      addQuestBtn.innerHTML = IsloadingInit;

      try {
        const res = await fetch(`/create_subquest/${moduleId}`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
        });

        const data = await res.json();

        if (data.status !== 'success') {
          console.error('Backend error:', data.message);
          return;
        }

        if (!subquestContainer) {
          console.error('Subquest container not found for module', moduleId);
          return;
        }

        forceOpenModule(module);
        const newSubquest = document.createElement('div');
        newSubquest.className = 'quest-item';
        newSubquest.style.display = 'flex';

        setItemModule(newSubquest, moduleId);
        newSubquest.dataset.url = `/${communitySlug}/quest/admin/${moduleId}/${data.subquest_uuid}`;
        newSubquest.dataset.draft = "true";     
        newSubquest.dataset.archive = "false";
        newSubquest.dataset.active = "false";
        newSubquest.dataset.subquestUuid = data.subquest_uuid;

        newSubquest.innerHTML = `
          <div class="diver-quest-123321">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="17" height="17" fill="currentColor">
              <path d="M6.5 11a1.5 1.5 0 1 1-3 0
                      1.5 1.5 0 0 1 3 0z
                      M5 3.5A1.5 1.5 0 1 0 6.5 5
                      1.5 1.5 0 0 0 5 3.5z
                      M12.5 11a1.5 1.5 0 1 1-3 0
                      1.5 1.5 0 0 1 3 0z
                      M11 3.5A1.5 1.5 0 1 0 12.5 5
                      1.5 1.5 0 0 0 11 3.5z"/>
            </svg>

            <div class="quest-link" style="user-select:none !important;">
              ${data.name || 'Untitled quest'}
            </div>
            ${renderStatusBadge(true)}

          </div>

        `;

        subquestContainer.appendChild(newSubquest);

        requestAnimationFrame(() => {
          newSubquest.style.display = 'flex';
          newSubquest.style.opacity = '0';
          newSubquest.style.transform = 'translateY(10px)';

          requestAnimationFrame(() => {
            newSubquest.style.transition = 'all 0.3s ease';
            newSubquest.style.opacity = '1';
            newSubquest.style.transform = 'translateY(0)';
          });
        });

        if (typeof attachContextMenuEvents === 'function') {
          attachContextMenuEvents(newSubquest);
        }

        if (scrollContainer) {
          requestAnimationFrame(() => {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });

            highlightQuest(newSubquest, 280);
          });
        }
      } catch (err) {
        console.error('JS Fetch error:', err);
      } finally {
        addQuestBtn.innerHTML = originalHTML;
        delete addQuestBtn.dataset.loading;
      }
    });
  });
}


function createShareModal() { 
  if (document.getElementById("share-modal")) return;

  const modal = document.createElement("div");
  modal.id = "share-modal";

  modal.innerHTML = `
    <div class="share-backdrop"></div>

    <div class="share-box">

      <div class="share-header" id="share-header" style="display:none;">
        <span>Share this module</span>
        <button class="share-close">✕</button>
      </div>

      <div class="share-preview" id="share-preview-container">
        ${fetchingSvg}
      </div>

      <div class="share-row" id="share-actions" style="display:none;">

        <div class="share-item" data-type="copy">
          <div class="share-circle">
            ${linkSvg}
          </div>
          <div class="share-label">Copy Link</div>
        </div>

        <div class="share-item" data-type="reddit">
          <div class="share-circle">
            ${redditSvg}
          </div>
          <div class="share-label">Reddit</div>
        </div>

        <div class="share-item" data-type="whatsapp">
          <div class="share-circle">
            ${whatappSVG}
          </div>
          <div class="share-label">WhatsApp</div>
        </div>

        <div class="share-item" data-type="x">
          <div class="share-circle">
            ${twitterSvg}
          </div>
          <div class="share-label">X (Twitter)</div>
        </div>

        <div class="share-item" data-type="linkedin">
          <div class="share-circle">
            ${linkedinSvg}
          </div>
          <div class="share-label">Linkedin</div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const shareBox = modal.querySelector(".share-box");

  modal.addEventListener("click", (e) => {
    if (!shareBox.contains(e.target)) {
      closeShareModal();
    }
  });

  shareBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  requestAnimationFrame(() => modal.classList.add("open"));

  modal.querySelector(".share-close").onclick = closeShareModal;
  modal.querySelector(".share-backdrop").onclick = closeShareModal;

  modal.querySelectorAll(".share-item").forEach(item => {
    item.onclick = async () => {
      const type = item.dataset.type;
      const url = modal.dataset.url;
      const encoded = encodeURIComponent(url);
      let shareLink = "";

      if (type === "copy") {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          const input = document.createElement("input");
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }

        showSuccess("Link copied");
        await closeShareModal();
        return;
      }

      if (type === "x") {
        shareLink = `https://twitter.com/intent/tweet?url=${encoded}`;
      }
      if (type === "reddit") {
        shareLink = `https://www.reddit.com/submit?url=${encoded}`;
      }
      if (type === "whatsapp") {
        shareLink = `https://wa.me/?text=${encoded}`;
      }
      if (type === "linkedin") {
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
      }

      if (shareLink) {
        window.open(shareLink, "_blank");
      }

      await closeShareModal();
    };
  });

}



async function loadSharePreview(moduleUUID) {
  const container = document.getElementById("share-preview-container");
  const header = document.getElementById("share-header");
  const actions = document.getElementById("share-actions");

  header.style.display = "none";
  actions.style.display = "none";

  container.innerHTML = fetchingSvg;

  try {
    const res = await fetch(`/api/share/preview/${moduleUUID}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div style="color:red;">Failed to load preview</div>`;
      return;
    }

    container.innerHTML = data.html;

    header.style.display = "flex";
    actions.style.display = "flex";

  } catch (e) {
    container.innerHTML = `<div style="color:red;">Network error</div>`;
  }
}



function openShareModal(url, moduleUUID, subquestUUID) {
  createShareModal();

  const modal = document.getElementById("share-modal");
  modal.dataset.url = url;

  modal.classList.add("open");

  loadSharePreview(moduleUUID, subquestUUID);
}


function closeShareModal() {
  return new Promise(resolve => {
    const modal = document.getElementById("share-modal");
    if (!modal) return resolve();

    modal.classList.remove("open");

    const duration = 250;

    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      modal.removeEventListener("transitionend", finish);
      resolve();
    };

    modal.addEventListener("transitionend", finish);

    setTimeout(finish, duration + 50);
  });
}

window.activeQuestUUID = null;

whatappSVG =`
<svg class="whatsapp-icon"
     xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 510 512.459"
     fill="currentColor">
  <path d="M435.689 74.468C387.754 26.471 324 .025 256.071 0 116.098 0 2.18 113.906 2.131 253.916c-.024 44.758 11.677 88.445 33.898 126.946L0 512.459l134.617-35.311c37.087 20.238 78.85 30.891 121.345 30.903h.109c139.949 0 253.88-113.917 253.928-253.928.024-67.855-26.361-131.645-74.31-179.643v-.012zm-179.618 390.7h-.085c-37.868-.011-75.016-10.192-107.428-29.417l-7.707-4.577-79.886 20.953 21.32-77.889-5.017-7.987c-21.125-33.605-32.29-72.447-32.266-112.322.049-116.366 94.729-211.046 211.155-211.046 56.373.025 109.364 22.003 149.214 61.903 39.853 39.888 61.781 92.927 61.757 149.313-.05 116.377-94.728 211.058-211.057 211.058v.011zm115.768-158.067c-6.344-3.178-37.537-18.52-43.358-20.639-5.82-2.119-10.044-3.177-14.27 3.178-4.225 6.357-16.388 20.651-20.09 24.875-3.702 4.238-7.403 4.762-13.747 1.583-6.343-3.178-26.787-9.874-51.029-31.487-18.86-16.827-31.597-37.598-35.297-43.955-3.702-6.355-.39-9.789 2.775-12.943 2.849-2.848 6.344-7.414 9.522-11.116s4.225-6.355 6.343-10.581c2.12-4.238 1.06-7.937-.522-11.117-1.584-3.177-14.271-34.409-19.568-47.108-5.151-12.37-10.385-10.69-14.269-10.897-3.703-.183-7.927-.219-12.164-.219s-11.105 1.582-16.925 7.939c-5.82 6.354-22.209 21.709-22.209 52.927 0 31.22 22.733 61.405 25.911 65.642 3.177 4.237 44.745 68.318 108.389 95.812 15.135 6.538 26.957 10.446 36.175 13.368 15.196 4.834 29.027 4.153 39.96 2.52 12.19-1.825 37.54-15.353 42.824-30.172 5.283-14.818 5.283-27.529 3.701-30.172-1.582-2.641-5.819-4.237-12.163-7.414l.011-.024z"/>
</svg>

`;

linkedinSvg = `
    <svg
      class="linkedin-icon"
      viewBox="0 -2 44 44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M746,305 L736.2754,305 L736.2754,290.9384 C736.2754,287.257796 734.754233,284.74515 731.409219,284.74515 C728.850659,284.74515 727.427799,286.440738 726.765522,288.074854 C726.517168,288.661395 726.555974,289.478453 726.555974,290.295511 L726.555974,305 L716.921919,305 C716.921919,305 717.046096,280.091247 716.921919,277.827047 L726.555974,277.827047 L726.555974,282.091631 C727.125118,280.226996 730.203669,277.565794 735.116416,277.565794 C741.21143,277.565794 746,281.474355 746,289.890824 L746,305 Z
          M707.17921,274.428187 C704.0127,274.428187 702,272.350964 702,269.717936 C702,267.033681 704.072201,265 707.238711,265 C710.402634,265 712.348071,267.028559 712.41016,269.710252 C712.41016,272.34328 710.402634,274.428187 707.17921,274.428187 Z
          M703.109831,277.827047 L711.685795,277.827047 L711.685795,305 L703.109831,305 Z"
        fill="#007EBB"
        transform="translate(-702 -265)"
      />
    </svg>
`;

linkSvg = `
<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88" fill="var(--text-main)"><title>hyperlink</title><path d="M60.54,34.07A7.65,7.65,0,0,1,49.72,23.25l13-12.95a35.38,35.38,0,0,1,49.91,0l.07.08a35.37,35.37,0,0,1-.07,49.83l-13,12.95A7.65,7.65,0,0,1,88.81,62.34l13-13a20.08,20.08,0,0,0,0-28.23l-.11-.11a20.08,20.08,0,0,0-28.2.07l-12.95,13Zm14,3.16A7.65,7.65,0,0,1,85.31,48.05L48.05,85.31A7.65,7.65,0,0,1,37.23,74.5L74.5,37.23ZM62.1,89.05A7.65,7.65,0,0,1,72.91,99.87l-12.7,12.71a35.37,35.37,0,0,1-49.76.14l-.28-.27a35.38,35.38,0,0,1,.13-49.78L23,50A7.65,7.65,0,1,1,33.83,60.78L21.12,73.49a20.09,20.09,0,0,0,0,28.25l0,0a20.07,20.07,0,0,0,28.27,0L62.1,89.05Z"/></svg>
`;

redditSvg = `
<svg viewBox="0 -4 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#000000" class="reddit-icon">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> 
    <g  transform="translate(-800.000000, -566.000000)" fill="#FF5700"> 
    <path d="M831.14,592.325803 C829.346,592.325803 827.8385,590.884067 827.8385,589.106421 C827.8385,587.328775 829.346,585.839477 831.14,585.839477 C832.934,585.839477 834.389,587.328775 834.389,589.106421 C834.389,590.884067 832.934,592.325803 831.14,592.325803 M831.902,598.574316 C830.231,600.228597 827.654,601.032699 824.024,601.032699 C824.0165,601.032699 824.0075,601.031213 823.9985,601.031213 C823.991,601.031213 823.982,601.032699 823.973,601.032699 C820.343,601.032699 817.7675,600.228597 816.098,598.574316 C815.585,598.065993 815.585,597.244055 816.098,596.737218 C816.6095,596.23038 817.439,596.23038 817.952,596.737218 C819.104,597.878716 821.0735,598.434602 823.973,598.434602 C823.982,598.434602 823.991,598.436088 823.9985,598.436088 C824.0075,598.436088 824.0165,598.434602 824.024,598.434602 C826.9235,598.434602 828.8945,597.878716 830.048,596.737218 C830.561,596.228894 831.3905,596.23038 831.902,596.737218 C832.4135,597.245541 832.4135,598.067479 831.902,598.574316 M813.611,589.106421 C813.611,587.330262 815.1155,585.839477 816.908,585.839477 C818.702,585.839477 820.157,587.330262 820.157,589.106421 C820.157,590.884067 818.702,592.325803 816.908,592.325803 C815.1155,592.325803 813.611,590.884067 813.611,589.106421 M839.996,568.598098 C841.211,568.598098 842.1995,569.577586 842.1995,570.780024 C842.1995,571.983948 841.211,572.963436 839.996,572.963436 C838.781,572.963436 837.7925,571.983948 837.7925,570.780024 C837.7925,569.577586 838.781,568.598098 839.996,568.598098 M848,585.570452 C848,582.417955 845.4125,579.854043 842.231,579.854043 C840.854,579.854043 839.5895,580.335612 838.5965,581.136742 C835.079,578.945898 830.615,577.62604 825.83,577.346611 L828.326,569.527051 L835.1855,571.127824 C835.3655,573.602556 837.4535,575.561534 839.996,575.561534 C842.6555,575.561534 844.82,573.416766 844.82,570.780024 C844.82,568.144768 842.6555,566 839.996,566 C838.136,566 836.519,567.049346 835.7135,568.581748 L827.7425,566.722354 C827.075,566.56629 826.4,566.94679 826.193,567.594828 L823.094,577.300535 C817.9385,577.425386 813.092,578.749703 809.3165,581.068371 C808.337,580.308859 807.1055,579.854043 805.769,579.854043 C802.5875,579.854043 800,582.417955 800,585.570452 C800,587.519025 800.99,589.241677 802.4975,590.273187 C802.4345,590.726516 802.4015,591.182818 802.4015,591.645065 C802.4015,595.585315 804.713,599.250595 808.91,601.964625 C812.933,604.567182 818.258,606 823.9025,606 C829.547,606 834.872,604.567182 838.895,601.964625 C843.092,599.250595 845.4035,595.585315 845.4035,591.645065 C845.4035,591.224435 845.375,590.806778 845.3225,590.392093 C846.9305,589.376932 848,587.594828 848,585.570452"> 

    </path> 
  </g> 
</g> 
</svg>
`;

twitterSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" class="twitter-icon" fill="currentColor" class="bi bi-twitter-x" viewBox="0 0 16 16">
    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
  </svg>
`;


fetchingSvg= `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="spin-svg">
  <path d="M4.97498 12H7.89998" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M11.8 5V8" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M18.625 12H15.7" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M11.8 19V16" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6.97374 16.95L9.04203 14.8287" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6.97374 7.05001L9.04203 9.17133" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M16.6262 7.05001L14.5579 9.17133" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M16.6262 16.95L14.5579 14.8287" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
</svg>

`;




function initModuleCRUDHandlers() {
  bindOnce('moduleCrud', document, 'click', (e) => {
    let target = e.target;

    let editBtn = target;
    while (editBtn && !editBtn.classList.contains('edit-mode-module')) {
      editBtn = editBtn.parentElement;
    }

    if (editBtn) {
      const moduleId = window.activeQuestUUID;
      if (!moduleId) return;

      const path = `/${communitySlug}/module/${moduleId}`;

      loadMainSettingsSection(path); 
      hideMenuModule();
      return;
    }

    const renameBtn = target.closest('.rename-module');
    if (renameBtn) {

      const moduleId = window.activeQuestUUID;
      if (!moduleId) return;

      const titleEl = document.getElementById(`module-name-${moduleId}`);
      if (!titleEl) return;

      const oldName = (titleEl.textContent || "").replace(/\s+/g, " ").trim();

      showInputModal({
        title: "Rename Module",
        message: "Enter a new name for this module",
        placeholder: "Module name...",
        defaultValue: oldName,
        confirmText: "Rename",
        onConfirm: async (newName) => {
          newName = newName.replace(/\s+/g, " ").trim();
          if (!newName || newName === oldName) return;

          showNameLoading(titleEl);

          try {
            const res = await fetch(`/rename_module/${moduleId}`, {
              method: 'POST',
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
              },
              body: JSON.stringify({ title: newName })
            });

            const data = await res.json();

            if (res.ok && (data.status === 'success' || data.success === true)) {
              titleEl.textContent = data.title || data.name || newName;
            } else {
              titleEl.textContent = oldName;
              showError(data.message || "Rename failed");
            }
          } catch (err) {
            console.error("Rename module error:", err);
            titleEl.textContent = oldName;
            showError("Rename failed");
          }
        }
      });

      hideMenuModule();
      return;
    }

    const deleteBtn = target.closest('.delete-module');
    if (deleteBtn) {

      const moduleId = window.activeQuestUUID;
      if (!moduleId) return;

      const moduleEl = document.getElementById(`module-${moduleId}`);
      const moduleName =
        moduleEl?.querySelector('.module-title')?.textContent || "this module";

      showInputModal({
        title: "Delete Module",
        message: `Are you sure you want to delete "${moduleName}" module? This action cannot be undone.`,
        cancelText: "Cancel",
        confirmText: "Delete",
        placeholder: "",
        defaultValue: "",
        onConfirm: () => {

          fetch(`/delete_module/${moduleId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken
            }
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              moduleEl?.remove();  
              checkEmptyModulesAndReset();
            }
          });

        }
      });

      hideMenuModule();
      return;
    }

    const shareBtn = target.closest('.share-module');
    if (shareBtn) {
      const moduleId = window.activeQuestUUID;
      if (!moduleId) {
        showError("Module not found");
        return;
      }

      const firstSubquest = getModuleItems(moduleId)[0];
      const subquestUUID = firstSubquest?.dataset.subquestUuid;

      if (!subquestUUID) {
        showError("This module can't be shared yet. Add a quest first.");
        hideMenuModule();
        return;
      }

      const shareUrl = `${window.location.origin}/${communitySlug}/quest/${moduleId}/${subquestUUID}`;

      hideMenuModule();
      openShareModal(shareUrl, moduleId, subquestUUID);

      return;
    }

    const duplicateBtn = target.closest('.duplicate-module');
    if (duplicateBtn) {

      const moduleId = window.activeQuestUUID;
      if (!moduleId) return;

      hideMenuModule();

      fetch(`/duplicate_module/${moduleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        }
      })
      .then(res => {
        if (!res.ok) throw new Error('Duplicate failed');
        return res.json();
      })
      .then(data => {
        if (data.status === 'success' && data.module) {
          appendDuplicatedModule(data.module);
          showSuccess(
            data.skipped_token_reward
              ? "Module duplicated — token rewards were not copied"
              : "Module duplicated successfully"
          );
        } else {
          showError(data.message || "Duplicate failed");
        }
      })
      .catch(err => {
        console.error('Duplicate error:', err);
        showError("Duplicate failed");
      });

      return;
    }

  });
}


function initQuestUIBindings() {
  const searchInput = document.getElementById("SearchAdmintquest");
  if (!searchInput) return;

  searchInput.addEventListener('input', function () {
    const searchValue = this.value.trim().toLowerCase();

    const filterTrigger = document.querySelector(".filter-trigger");
    if (!filterTrigger) return;

    const activeFilter = filterTrigger.dataset.filter || "all";

    let anyMatch = false;

    document.querySelectorAll('.content-init-q.scrollable').forEach((module) => {
      const moduleTitle =
        module.querySelector('.module-title')?.textContent.toLowerCase() || '';

      const questItems = module.querySelectorAll('.quest-item');

      let moduleHasMatch = false;

      questItems.forEach((quest) => {
        const questText =
          quest.querySelector('a')?.textContent.toLowerCase() ||
          quest.textContent.toLowerCase();

        const isDraft   = quest.dataset.draft === "true";
        const isArchive = quest.dataset.archive === "true";
        const isActive  = quest.dataset.active === "true";

        let allowedByFilter = false;
        if (activeFilter === "all") allowedByFilter = true;
        if (activeFilter === "draft") allowedByFilter = isDraft;
        if (activeFilter === "archive") allowedByFilter = isArchive;
        if (activeFilter === "active") allowedByFilter = isActive;

        if (!allowedByFilter) {
          quest.style.display = "none";
          return;
        }

        const match =
          searchValue === "" ||
          moduleTitle.includes(searchValue) ||
          questText.includes(searchValue);

        if (match) {
          quest.style.display = "flex";
          moduleHasMatch = true;
          anyMatch = true;
        } else {
          quest.style.display = "none";
        }
      });

      const hasVisible = [...questItems].some(q => q.style.display === "flex");
      module.style.display = hasVisible ? "block" : "none";
    });

    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
      if (!anyMatch && searchValue !== "") {
        noResultsMessage.style.display = "block";
      } else {
        noResultsMessage.style.display = "none";
      }
    }
  });

  bindOnce('uiClick', document, 'click', (e) => {
    if (
      !e.target.closest('.dropdown') &&
      !e.target.closest('.menu-btn') &&
      !e.target.closest('.module-header')
    ) {
      hideAllDropdowns();
    }
  });

  bindOnce('uiContext', document, 'contextmenu', (e) => {
    if (
      !e.target.closest('.dropdown') &&
      !e.target.closest('.menu-btn') &&
      !e.target.closest('.module-header')
    ) {
      hideAllDropdowns();
    }
  });

  document.addEventListener('scroll', hideAllDropdowns, true);
}


function initSubquestToggles(communityId, scope = null) {
  const buttons = scope
    ? scope.querySelectorAll(".toggle-subquests")
    : document.querySelectorAll(".toggle-subquests");

  buttons.forEach(btn => {

    btn.addEventListener("click", e => {
      e.stopPropagation();

      hideAllDropdowns();
      hideAllMenus(e);

      const moduleId = btn.dataset.moduleId;

      const icon = btn.querySelector("svg");
      const subquests = getModuleItems(moduleId);

      if (!subquests.length) {
        showError(`
          <div style="display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path
                  d="M12,2A10,10,0,1,0,22,12,10.016,10.016,0,0,0,12,2Zm1,14a1,1,0,0,1-2,0V12a1,1,0,0,1,2,0ZM12,9a1,1,0,1,1,1-1A1,1,0,0,1,12,9Z"
                  fill="currentColor"
                />
              </svg>
              No quest in this module
          </div>
        `);
        return;
      }

      const currentlyOpen = [...subquests].some(
        el => getComputedStyle(el).display !== "none"
      );

      const list = btn.closest('.content-init-q')?.querySelector('.subquests-list');
      if (list && !currentlyOpen) list.style.display = "";

      subquests.forEach(sub => {
        sub.style.display = currentlyOpen ? "none" : "flex";
      });

      if (icon) {
        icon.style.transform = currentlyOpen
          ? "rotate(0deg)"
          : "rotate(180deg)";
      }

      const newState = currentlyOpen ? "closed" : "open";

      fetch("/save_subquest_state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          community_id: communityId,
          module_id: moduleId,
          state: newState
        })
      }).catch(console.error);
    });
  });
}

function appendDuplicatedModule(moduleData) {
  const container = document.querySelector('.allinit-conatin');
  if (!container) return;

  const module = buildModuleElement(moduleData, communitySlug);
  container.appendChild(module);

  bindModuleActions(module);
  initSubquestToggles(communityId, module);
  initAddSubquestHandlers(module);

  module.querySelectorAll('.quest-item').forEach(item => {
    attachContextMenuEvents(item);
  });

  const icon = module.querySelector('.toggle-subquests svg');
  if (icon && moduleData.subquests.length) {
    icon.style.transform = "rotate(180deg)";
  }

  persistModuleOpen(moduleData.uuid);

  const scrollContainer = module.closest('.scroll-container');
  if (scrollContainer) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      highlightQuest(module, 280);
    });
  }
}



function SmartDropdown(trigger, dropdown, options = {}) {
  if (!trigger || !dropdown) return;

  const container = document.getElementById("app");
  if (!container) return;

  const config = {
    offset: 8,
    zIndex: 99999,
    prefer: "bottom",
    ...options
  };

  dropdown.style.position = "fixed";
  dropdown.style.zIndex = config.zIndex;

  function close() {
    if (IsopenDropdown) {
      IsopenDropdown.style.display = "none";
      IsopenDropdown = null;
    }
  }

  function open() {

    if (IsopenDropdown && IsopenDropdown !== dropdown) {
      IsopenDropdown.style.display = "none";
      IsopenDropdown = null;
    }

    hideMenuModule?.();
    hideMenu?.();

    const tRect = trigger.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();

    dropdown.style.visibility = "hidden";
    dropdown.style.display = "flex";

    const dRect = dropdown.getBoundingClientRect();

    dropdown.style.visibility = "visible";

    let top, left;

    if (config.prefer === "bottom") {
      if (tRect.bottom + dRect.height + config.offset <= cRect.bottom) {
        top = tRect.bottom + config.offset;
      } else {
        top = tRect.top - dRect.height - config.offset;
      }
    } else {
      if (tRect.top - dRect.height - config.offset >= cRect.top) {
        top = tRect.top - dRect.height - config.offset;
      } else {
        top = tRect.bottom + config.offset;
      }
    }

    left = tRect.left + (tRect.width / 2) - (dRect.width / 2);

    const minLeft = cRect.left + config.offset;
    const maxLeft = cRect.right - dRect.width - config.offset;

    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.display = "flex";

    IsopenDropdown = dropdown;
  }

  function toggle() {
    if (IsopenDropdown === dropdown) {
      close();
    } else {
      open();
    }
  }

  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);

  toggle();

  return { open, close, toggle };
}

function initTopDropdowns() {
  const trigger = document.getElementById('dropdown-arrow');
  const menu = document.querySelector('.dropdown-menu');

  if (!trigger || !menu) return;

  trigger.replaceWith(trigger.cloneNode(true));

  const newTrigger = document.getElementById('dropdown-arrow');

  newTrigger.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();

    SmartDropdown(newTrigger, menu, {
      offset: 10,
      prefer: "bottom"
    });
  });
}




const RAW = [
    ["Follow us on X", "Social", ["twitter"], 20, "Follow the community account on X so you never miss an announcement, update or event. Once you've followed, come back and verify to claim your XP."],
    ["Retweet the pinned post", "Social", ["twitter"], 25, "Retweet our pinned announcement to help spread the word. The more people see it, the faster the community grows, and you earn XP for helping."],
    ["Quote-tweet with your take", "Social", ["twitter"], 40, "Quote-tweet the announcement and add your own thoughts. Tell your followers in your own words why you're part of this community and what excites you about it."],
    ["Like & reply to the announcement", "Social", ["twitter"], 20, "Like the announcement and leave a thoughtful reply. Keep it genuine, since low-effort or spam replies may be rejected."],
    ["Join the Discord", "Social", ["discord"], 20, "Join the community Discord server to chat with other members, get help, and hear about events first. Accept the invite, then come back and verify your membership."],
    ["Get your Discord role", "Social", ["discord"], 30, "Already in the Discord? Head to the verification channel, follow the steps there, and claim your member role to unlock the members-only channels."],
    ["Join the Telegram community", "Social", ["telegram"], 20, "Join the community Telegram group for quick updates and live conversation. Open the invite, tap join, then come back and verify."],
    ["Subscribe on YouTube", "Social", ["youtube"], 20, "Subscribe to the community YouTube channel for tutorials, recordings of community calls and workshops, and project updates. Hit subscribe, then come back and verify."],
    ["Like & comment on our latest video", "Social", ["file-upload"], 30, "Watch our latest video, give it a like and leave a thoughtful comment about what you took away from it, then upload a screenshot showing both so we can verify it. Comments that add nothing may be rejected."],
    ["Follow on Farcaster", "Social", ["visit-link", "file-upload"], 20, "Follow the community on Farcaster to keep up with updates in the decentralized social ecosystem. Open the profile, follow, then upload a screenshot showing that you're following so we can verify it."],
    ["Join the Zcash forum", "Social", ["visit-link", "text"], 30, "Create an account on the Zcash community forum and say hello in the introductions thread. Paste your username below so we can confirm it."],
    ["Share on LinkedIn", "Social", ["url"], 30, "Share a post about the community on LinkedIn, in your own words and with a short note on why it matters to you. Paste the link to your post below."],
    ["Invite 3 friends", "Social", ["invite"], 60, "Bring three friends into the community using your personal invite link. The task completes automatically once three people have joined through it."],
    ["Follow on TikTok", "Social", ["visit-link"], 20, "Follow the community on TikTok for short, snackable explainers and behind-the-scenes clips."],

    ["Create a shielded wallet", "Zcash", ["text"], 50, "Set up a wallet that supports shielded addresses and write a short note on which wallet you picked and why. Never share your seed phrase, only the name of the wallet."],
    ["Receive your first shielded ZEC", "Zcash", ["file-upload"], 60, "Receive ZEC to a shielded address and upload a screenshot of your balance. Make sure your seed phrase and full address are not visible in the image."],
    ["Send a shielded transaction", "Zcash", ["url"], 80, "Send a shielded transaction and share the confirmation. Paste a link to the transaction on a block explorer so we can verify it went through."],
    ["Explain unified addresses", "Zcash", ["text"], 50, "Write a short explanation of unified addresses in your own words: what they are, why they exist, and how they make life easier for users."],
    ["Back up your seed phrase", "Zcash", ["puzzle"], 30, "Write your recovery phrase down offline and store it somewhere safe. To confirm you understand the importance, answer the security question from the guide. Never type your actual phrase here."],
    ["Try Zodl wallet", "Zcash", ["visit-link", "file-upload"], 40, "Install the Zodl wallet from the official page, set it up, and upload a screenshot of your balance screen so we can see you got it running."],
    ["Try Zkool wallet", "Zcash", ["visit-link", "file-upload"], 40, "Install Zkool, explore its features, and upload a screenshot of the app showing your account."],
    ["Run a lightwalletd server", "Zcash", ["url"], 120, "Set up lightwalletd on your own server and share your public endpoint. We'll check that it's reachable and syncing before approving."],
    ["Read the Zcash overview", "Zcash", ["visit-link"], 25, "Read the protocol overview page to understand how Zcash works and what makes shielded transactions private."],
    ["Find a transaction on an explorer", "Zcash", ["visit-link", "text"], 35, "Open a block explorer, look up a transaction, and tell us what you learned: what fields are visible and what stays hidden for shielded transactions."],
    ["Learn about the Ironwood pool", "Zcash", ["quiz"], 50, "Read up on the Ironwood shielded pool, then answer a short quiz to prove it stuck."],
    ["Send a shielded memo", "Zcash", ["text"], 60, "Send a shielded transaction with an encrypted memo and describe the experience: which wallet you used, and how the memo showed up on the other side."],
    ["Vote with your ZEC", "Zcash", ["coin_holder_vote"], 100, "Deposit ZEC into Gleyo and cast your vote for the project you want to see funded. Your vote is weighted by the amount you deposit, and your ZEC never leaves the reward hub."],

    ["Quiz: Zcash basics", "Learning", ["quiz"], 40, "Pass the beginner Zcash quiz and show you understand the fundamentals."],
    ["Quiz: Privacy 101", "Learning", ["quiz"], 40, "Test your knowledge of digital privacy, from metadata to encryption and surveillance."],
    ["Watch the ZecHub video", "Learning", ["visit-link", "puzzle"], 25, "Watch the video all the way through. A passphrase is mentioned during it, so enter it below to prove you watched."],
    ["Read a whitepaper section", "Learning", ["visit-link", "text"], 35, "Read a section of the whitepaper and summarize it in 3 sentences, in your own words."],
    ["Complete the starter tutorial", "Learning", ["visit-link"], 50, "Finish the starter tutorial end to end. Take your time, it covers everything you need to get going."],
    ["Write a 3-line summary", "Learning", ["text"], 30, "Summarize what you learned this week in three lines."],
    ["Take the community poll", "Learning", ["poll"], 15, "Answer the weekly poll and help shape what the community focuses on next."],
    ["Glossary challenge", "Learning", ["quiz"], 45, "Match privacy terms to their meanings and see how many you get right."],

    ["Introduce yourself", "Community", ["text"], 20, "Tell the community who you are and why you're here. Where are you from, what do you do, and what do you hope to get out of this?"],
    ["Verify you're human", "Community", ["p.o.h"], 30, "Complete a quick proof of humanity check. It keeps the leaderboard fair and keeps bots out."],
    ["Daily check-in", "Community", [], 10, "Check in once a day with a quick note on what you're up to.", "daily", false],
    ["7-day check-in streak", "Community", [], 2, "Check in seven days in a row. Miss a day and the streak resets.", "daily", true],
    ["Vote on a proposal", "Community", ["poll"], 25, "Read the current proposal and cast your vote. Every voice counts."],
    ["Give product feedback", "Community", ["text"], 40, "Share one thing we could improve and tell us why it matters to you."],
    ["Rate your experience", "Community", ["Optionscale(star)"], 15, "Rate your experience in the community so far from 1 to 5 stars."],
    ["Would you recommend us?", "Community", ["Optionscale(numbers)"], 15, "On a scale from 1 to 10, how likely are you to recommend this community to a friend?"],
    ["Report a bug", "Community", ["text", "file-upload"], 50, "Report a reproducible bug with clear steps, and attach a screenshot or recording if you can."],
    ["Help a newcomer", "Community", ["url"], 45, "Answer a newcomer's question in Discord, then paste the link to your message below."],
    ["Attend the community call", "Community", ["puzzle", "text"], 50, "Join the live call, enter the code word announced during it, and share one takeaway."],

    ["Write a thread", "Content", ["url"], 80, "Write a thread (5+ posts) about the community on X and paste the link to the first post below."],
    ["Make a meme", "Content", ["file-upload"], 40, "Create an original meme about the community and upload it."],
    ["Create a tutorial video", "Content", ["url"], 150, "Record a how-to video and share the link. Clear audio and a clear walkthrough matter more than fancy editing."],
    ["Write a blog post", "Content", ["url"], 120, "Publish a 500+ word article about the community or the tech behind it and share the link."],
    ["Translate a guide", "Content", ["file-upload", "text"], 100, "Translate a guide into your language and upload the file. Tell us which guide and which language."],
    ["Design a banner", "Content", ["file-upload"], 70, "Design a banner for the community and upload the final file."],
    ["Short explainer clip", "Content", ["url"], 90, "Make a 60-second explainer on any part of the community or the tech, and share the link."],
    ["Submit a testimonial", "Content", ["text"], 35, "Share your honest experience with the community, good and bad."],

    ["Fork a repo", "Dev", ["github"], 30, "Fork the starter repo and give it a star so we can see you're ready to build."],
    ["Open a pull request", "Dev", ["url"], 100, "Open a pull request and paste the link. Make sure it describes what changed and why."],
    ["Build a demo with the SDK", "Dev", ["url"], 150, "Ship a small demo using the SDK and share the link to the repo or live demo."],
    ["Submit a GitHub issue", "Dev", ["url"], 40, "Open a well-written issue with steps to reproduce and share the link."],
    ["Review a pull request", "Dev", ["url"], 70, "Leave a useful review on an open pull request and share the link to your review."],
    ["Deploy a testnet app", "Dev", ["url"], 130, "Deploy something on testnet and share the link so others can try it."],
    ["Write documentation", "Dev", ["url"], 90, "Improve or add docs and share the link to your change."],
    ["Hackathon submission", "Dev", ["url", "file-upload"], 200, "Submit your project to the hackathon with a link to the repo or demo and a screenshot or pitch deck."],

    ["Register for the workshop", "Events", ["visit-link"], 20, "Sign up for the upcoming workshop using the registration page so we can save you a spot."],
    ["Attend the live workshop", "Events", ["puzzle"], 80, "Attend live and enter the code word announced during the session."],
    ["Submit a workshop recap", "Events", ["text"], 60, "Write a short recap of what you learned and how you plan to use it."],
    ["Bring a friend to the workshop", "Events", ["invite"], 50, "Invite someone new to attend with you using your personal invite link."],

    ["Join a partner community", "Partnerships", ["partnership"], 40, "Join one of our partner communities and get verified there. We check that you're a member before awarding XP."],
    ["Complete a partner quest", "Partnerships", ["partnership_quest"], 70, "Complete a quest in a partner community and claim it there. We verify that the claim went through before awarding XP."],
    ["Join the partner's Discord", "Partnerships", ["discord", "partnership"], 50, "Join our partner's Discord server, then verify your membership in their community."],
    ["Follow the partner on X", "Partnerships", ["twitter"], 20, "Follow our partner's account on X to stay up to date on what we're building together."],
    ["Cross-community collab", "Partnerships", ["partnership", "text"], 90, "Join the partner community, introduce yourself there, and tell us here what you shared with them."]
  ];

  const TYPE_MAP = {
    link: "visit-link",
    custom: "text",
    upload: "file-upload",
    number: "numbers",
    poh: "p.o.h",
    "coin-holder-vote": "coin_holder_vote"
  };
  const TASK_TYPE_MAP = {
    "twitter": "twitter",
    "discord": "discord",
    "telegram": "telegram",
    "youtube": "youtube",
    "github": "github",
    "visit-link": "visit-link",
    "link": "visit-link",
    "file-upload": "file-upload",
    "upload": "file-upload",
    "text": "text",
    "custom": "text",
    "url": "url",
    "numbers": "numbers",
    "number": "numbers",
    "puzzle": "puzzle",
    "poll": "poll",
    "quiz": "quiz",
    "invite": "invite",
    "partnership": "partnership",
    "partnership_quest": "partnership_quest",
    "p.o.h": "p.o.h",
    "poh": "p.o.h",
    "coin_holder_vote": "coin_holder_vote",
    "Optionscale(star)": "Optionscale(star)",
    "Optionscale(numbers)": "Optionscale(numbers)"
  };

  const TASK_ICON_MAP = {
    "twitter": "twitter",
    "discord": "discord",
    "telegram": "telegram",
    "youtube": "youtube",
    "github": "github",
    "visit-link": "visit-link",
    "file-upload": "file-upload",
    "text": "text",
    "url": "url",
    "numbers": "numbers",
    "puzzle": "puzzle",
    "poll": "poll",
    "quiz": "quiz",
    "invite": "invite",
    "partnership": "partnership",
    "partnership_quest": "partnership_quest",
    "p.o.h": "p.o.h",
    "coin_holder_vote": "coin_holder_vote",
    "Optionscale(star)": "optionscale(star)",
    "Optionscale(numbers)": "optionscale(numbers)"
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function fileTypesFor(name) {
    if (/translate/i.test(name)) return ["document"];
    if (/bug/i.test(name)) return ["image", "video"];
    if (/hackathon/i.test(name)) return ["presentation", "image", "document"];
    return ["image"];
  }

  function buildTaskConfig(type, name, description) {
    switch (type) {
      case "visit-link":
        return { link: "https://example.com", preview: { title: name, description: description, image: "" } };

      case "text":
        return { title: name, description: description, placeholder: "Type here...", auto_validate: false };

      case "url":
        return { title: name, description: description, placeholder: "https://example.com", auto_validate: false, track_invites: false };

      case "numbers":
        return { title: name, description: description, placeholder: "12345", auto_validate: false };

      case "file-upload":
        return {
          fileCount: /hackathon|bug/i.test(name) ? 2 : 1,
          fileTypes: fileTypesFor(name)
        };

      case "puzzle":
        return { title: name, description: description, answer: "", placeholder: "Enter secret code...", auto_validate: true };

      case "poll":
        return {
          title: name,
          description: description,
          options: /proposal/i.test(name) ? ["Yes", "No", "Abstain"] : ["Option A", "Option B", "Option C"],
          multiple: false,
          other: false
        };

      case "quiz":
        return {
          title: name,
          description: description,
          options: ["Option A", "Option B", "Option C"],
          correct: [0],
          allowMultipleSelection: false,
          multiple: false,
          hasCorrectAnswers: true
        };

      case "invite":
        return {
          numInvites: /\b3\b|three/i.test(name) ? 3 : 1,
          subquest_uuid: "",
          subquest_name: "",
          require_twitter_match: false
        };

      case "youtube":
        return { link: "https://youtube.com/", name: "Community channel", icon: "" };

      case "github":
        return {
          link: "",
          repo_name: "",
          repo_owner: "",
          owner_avatar: "",
          star: true,
          fork: /fork/i.test(name)
        };

      case "partnership":
        return {
          community_name: "Partner community",
          about: "Join the partner community.",
          link: "https://gleyo.app/",
          icon: "",
          community_id: ""
        };

      case "partnership_quest":
        return {
          community_name: "Partner community",
          subquest_name: "Partner quest",
          link: "https://gleyo.app/",
          icon: "",
          community_id: ""
        };

      case "p.o.h":
        return { link: "" };

      case "coin_holder_vote":
        return {
          zecPerVote: "0.001",
          payoutAddress: "",
          projects: [
            { name: "Project A", description: "Describe the first project here." },
            { name: "Project B", description: "Describe the second project here." }
          ]
        };

      case "Optionscale(star)":
        return { title: name, description: description, starCount: 5 };

      case "Optionscale(numbers)":
        return {
          title: name,
          description: description,
          scale: { from: 1, to: 10 },
          labels: { left: "Not Likely", right: "Very Likely" }
        };

      case "twitter": {
        if (/retweet|quote|like|reply/i.test(name)) {
          return {
            mode: "engage",
            tweet_link: "",
            tweet_preview: "Your announcement will appear here.",
            tweet_author: "Your community",
            tweet_handle: "yourcommunity",
            tweet_avatar: "",
            tweet_date: new Date().toISOString(),
            tweet_verified: false,
            tweet_verified_type: "none",
            like: /like/i.test(name),
            retweet: /retweet|quote/i.test(name),
            reply: /reply|quote/i.test(name),
            reply_text: ""
          };
        }
        return {
          mode: "follow",
          profile_link: "https://x.com/",
          profile_name: "Your community",
          profile_handle: "yourcommunity",
          profile_avatar: "",
          verified: false,
          verified_type: "none"
        };
      }

      case "discord":
        return { link: "https://discord.gg/", name: "Community Discord", icon: "" };

      case "telegram":
        return { link: "https://t.me/", name: "Community Telegram", icon: "" };

      default:
        return { title: name, description: description };
    }
  }

  const TEMPLATES = RAW.map(([name, category, task_types, xp, description, recurrence, streak_enabled], i) => {
    const types = [...new Set(task_types.map(t => TYPE_MAP[t] || t))];

    return {
      id: "tpl-" + String(i + 1).padStart(3, "0"),
      name,
      category,
      description,
      xp,
      recurrence: recurrence || null,
      streak_enabled: streak_enabled === true,
      task_types: types,
      tasks: types.map(type => ({
        type,
        config: buildTaskConfig(type, name, description)
      })),
      rewards: [{
        reward_type: "xp",
        distribution_type: "ALL",
        reward_data: { amount: xp }
      }]
    };
  });

  let modal;
  let creating = false;
  let state = { q: "", activeId: null };
  let listScroll = 0;
  const previewCache = new Map();
  const mobileMQ = window.matchMedia("(max-width: 640px)");
  const isMobileTpl = () => mobileMQ.matches;

  document.querySelectorAll("#tpl-modal").forEach(el => el.remove());

  function skeleton() {
    return `
      <div class="tpl-skel">
        <div style="height:26px;width:55%"></div>
        <div style="height:14px;width:90%"></div>
        <div style="height:14px;width:75%"></div>
        <div style="height:120px"></div>
        <div style="height:150px"></div>
      </div>`;
  }

  function build() {
    if (modal) return;

    modal = document.createElement("div");
    modal.id = "tpl-modal";
    modal.innerHTML = `
      <div class="tpl-box">

        <div class="tpl-left">
          <div class="tpl-left-head">
            <div class="tpl-left-top">
              <h3>Create a new quest</h3>
              <button class="tpl-close tpl-close-left" aria-label="Close">✕</button>
            </div>
            <button class="tpl-scratch" id="tpl-scratch">
              <b>Start from scratch</b>
              <span>Begin with a blank slate</span>
            </button>
            <div class="tpl-or">or</div>
            <div class="tpl-search-wrap">
              <input id="tpl-search" class="tpl-search" type="text" placeholder="Search ${TEMPLATES.length} templates...">
            </div>
          </div>
          <div class="tpl-list" id="tpl-list"></div>
        </div>

        <div class="tpl-right">
          <div class="tpl-right-head">
            <div class="tpl-right-lead">
              <button class="tpl-back" aria-label="Back">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <span class="tpl-right-title" id="tpl-right-title">Select a template</span>
            </div>
            <button class="tpl-close" aria-label="Close">✕</button>
          </div>
          <div class="tpl-preview tpl-preview-locked" id="tpl-preview"></div>
          <div class="tpl-foot">
            <div class="tpl-dd" id="tpl-dd">
              <input type="hidden" id="tpl-module">
              <button type="button" class="tpl-dd-trigger" id="tpl-dd-trigger">
                <span class="tpl-dd-label" id="tpl-dd-label">Select module</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div class="tpl-dd-menu" id="tpl-dd-menu"></div>
            </div>
            <button class="tpl-use" id="tpl-use">Use template</button>
          </div>
        </div>

      </div>`;
    document.body.appendChild(modal);

    const dd = modal.querySelector("#tpl-dd");

    modal.addEventListener("click", e => {
      if (e.target === modal) { close(); return; }
      if (!e.target.closest("#tpl-dd")) dd.classList.remove("open");
    });

    modal.querySelectorAll(".tpl-close").forEach(btn => btn.addEventListener("click", close));
    modal.querySelector(".tpl-back").addEventListener("click", showList);

    modal.querySelector("#tpl-search").addEventListener("input", e => {
      state.q = e.target.value.trim().toLowerCase();
      renderList();
    });

    modal.querySelector("#tpl-list").addEventListener("click", e => {
      const item = e.target.closest(".tpl-item");
      if (!item) return;
      selectTemplate(item.dataset.id);
    });

    modal.querySelector("#tpl-dd-trigger").addEventListener("click", e => {
      e.stopPropagation();
      dd.classList.toggle("open");
    });

    modal.querySelector("#tpl-dd-menu").addEventListener("click", e => {
      const item = e.target.closest(".tpl-dd-item");
      if (!item) return;
      e.stopPropagation();
      setModule(item.dataset.id);
      dd.classList.remove("open");
    });

    modal.querySelector("#tpl-use").addEventListener("click", e => {
      if (!state.activeId) return;
      useTemplate(state.activeId, e.currentTarget);
    });

    modal.querySelector("#tpl-scratch").addEventListener("click", startFromScratch);
  }

  function setModule(id) {
    const items = modal.querySelectorAll(".tpl-dd-item");
    let name = "Select module";

    items.forEach(el => {
      const on = el.dataset.id === id;
      el.classList.toggle("selected", on);
      if (on) name = el.querySelector(".tpl-dd-name").textContent;
    });

    modal.querySelector("#tpl-module").value = id || "";
    modal.querySelector("#tpl-dd-label").textContent = name;
  }

  function fillModules() {
    const mods = [...document.querySelectorAll(".content-init-q.scrollable")];
    const menu = modal.querySelector("#tpl-dd-menu");
    const prev = modal.querySelector("#tpl-module").value;

    menu.innerHTML = mods.map(m => {
      const id = m.id.replace("module-", "");
      const name = m.querySelector(".module-title")?.textContent.trim() || "Module";
      return `
        <div class="tpl-dd-item" data-id="${id}">
          <span class="tpl-dd-name">${esc(name)}</span>
          <svg class="tpl-dd-check" viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`;
    }).join("");

    const stillThere = mods.some(m => m.id === "module-" + prev);
    setModule(stillThere ? prev : (mods[0]?.id.replace("module-", "") || ""));
  }

  function filteredTemplates() {
    return TEMPLATES.filter(t =>
      !state.q || (t.name + " " + t.description + " " + t.category).toLowerCase().includes(state.q)
    );
  }

  function renderList() {
    const list = filteredTemplates();
    const box = modal.querySelector("#tpl-list");

    if (!list.length) {
      box.innerHTML = `<div class="tpl-empty">No template found</div>`;
      return;
    }

    let html = "";
    let lastCat = null;

    list.forEach(t => {
      if (t.category !== lastCat) {
        html += `<div class="tpl-cat">${esc(t.category)}</div>`;
        lastCat = t.category;
      }
      html += `
        <div class="tpl-item ${t.id === state.activeId ? "active" : ""} ${isTwitterLocked(t) ? "tpl-item-locked" : ""}" data-id="${t.id}">
          <span class="tpl-item-name">${esc(t.name)}</span>
          ${renderTaskTypeIcons(t.task_types)}
        </div>`;
    });

    box.innerHTML = html;
  }

  const isTwitterLocked = tpl =>
    twitterState !== "ok" && tpl.task_types.includes("twitter");

  function lockedPreviewHTML() {
    const upgrade = twitterState === "upgrade";
    const href = upgrade
      ? `/community/${communitySlug}/settings/billing`
      : `/community/${communitySlug}/settings/integrations/twitter`;
    const title = upgrade ? "Twitter tasks need a paid plan" : "Connect your X account";
    const link  = upgrade ? "Upgrade your plan" : "Connect your X account";
    const rest  = upgrade ? "to use Twitter tasks." : "in settings to use Twitter tasks.";

    return `
      <div class="tpl-locked">
        <div class="tpl-locked-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 3L21 21M17 10V8C17 5.23858 14.7614 3 12 3C11.0283 3 10.1213 3.27719 9.35386 3.75681M7.08383 7.08338C7.02878 7.38053 7 7.6869 7 8V10.0288M19.5614 19.5618C19.273 20.0348 18.8583 20.4201 18.362 20.673C17.7202 21 16.8802 21 15.2 21H8.8C7.11984 21 6.27976 21 5.63803 20.673C5.07354 20.3854 4.6146 19.9265 4.32698 19.362C4 18.7202 4 17.8802 4 16.2V14.8C4 13.1198 4 12.2798 4.32698 11.638C4.6146 11.0735 5.07354 10.6146 5.63803 10.327C5.99429 10.1455 6.41168 10.0647 7 10.0288M19.9998 14.4023C19.9978 12.9831 19.9731 12.227 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C17.773 10.0269 17.0169 10.0022 15.5977 10.0002M10 10H8.8C8.05259 10 7.47142 10 7 10.0288" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g>
          </svg>
        </div>
        <h4>${title}</h4>
        <p><a class="task-link" href="${href}" target="_blank" rel="noopener noreferrer">${link}</a> ${rest}</p>
      </div>`;
  }  

  function setActiveInList(id) {
    modal.querySelectorAll(".tpl-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === id);
    });
  }

  function showList() {
    if (!modal) return;
    modal.querySelector(".tpl-box").classList.remove("show-preview");
    modal.querySelector("#tpl-list").scrollTop = listScroll;
  }

async function selectTemplate(id) {
  const tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl || !modal) return;

  state.activeId = id;
  setActiveInList(id);
  modal.querySelector("#tpl-right-title").textContent = tpl.name;

  const pane = modal.querySelector("#tpl-preview");
  const useBtn = modal.querySelector("#tpl-use");

  if (isMobileTpl()) {
    listScroll = modal.querySelector("#tpl-list").scrollTop;
    modal.querySelector(".tpl-box").classList.add("show-preview");
  }

  if (isTwitterLocked(tpl)) {
    pane.innerHTML = lockedPreviewHTML();
    pane.scrollTop = 0;
    useBtn.disabled = true;
    return;
  }
  useBtn.disabled = false;

  if (previewCache.has(id)) {
    pane.innerHTML = previewCache.get(id);
    pane.scrollTop = 0;
    return;
  }

  pane.innerHTML = skeleton();

  try {
    const res = await fetch(`/${communitySlug}/preview_template`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      body: JSON.stringify({
        subquest_name: tpl.name,
        subquest_desc: [{ type: "text", html: esc(tpl.description) }],
        tasks: tpl.tasks,
        rewards: tpl.rewards,
        recurrence: tpl.recurrence,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      })
    });

    if (!modal || state.activeId !== id) return;

    // Server says it's locked: trust it, whatever the client thought
    if (res.status === 403) {
      let body = {};
      try { body = await res.json(); } catch (e) {}
      if (body.error === "twitter_locked") {
        twitterState = body.state || "upgrade";
        renderList();                      // marks all Twitter templates as locked
        pane.innerHTML = lockedPreviewHTML();
        useBtn.disabled = true;
        return;
      }
    }

    const html = await res.text();
    if (!res.ok) throw new Error("preview failed");

    previewCache.set(id, html);
    pane.innerHTML = html;
    pane.scrollTop = 0;

    if (typeof initSubquestTasks === "function") initSubquestTasks();
  } catch (err) {
    console.error(err);
    if (modal && state.activeId === id) {
      pane.innerHTML = `<div class="tpl-empty">Could not load preview</div>`;
    }
  }
}

async function useTemplate(templateId, btn) {
  if (creating) return;

  const tpl = TEMPLATES.find(t => t.id === templateId);   // find tpl FIRST
  if (!tpl) return;
  if (isTwitterLocked(tpl)) return;                        // then check lock

  const moduleId = modal ? modal.querySelector("#tpl-module").value : "";
  if (!moduleId) return showError("Create a module first");

  creating = true;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = IsloadingInit;
  btn.style.cursor = "wait";

  try {
    const res = await fetch(`/create_subquest_from_template/${moduleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      body: JSON.stringify({
        community_slug: communitySlug,
        quest_uuid: moduleId,
        subquest_name: tpl.name,
        subquest_desc: [{ type: "text", html: esc(tpl.description) }],
        tasks: tpl.tasks,
        rewards: tpl.rewards,
        recurrence: tpl.recurrence,
        streak_enabled: tpl.streak_enabled
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      close();
      loadMainSettingsSection(data.redirect);
      return;
    }
    showToast(data.error || "Failed to use template");
  } catch (err) {
    console.error(err);
    showToast("Failed to use template");
  }

  creating = false;
  btn.disabled = false;
  btn.innerHTML = original;
  btn.style.cursor = "";
}

  async function startFromScratch() {
    const moduleId = modal.querySelector("#tpl-module").value;
    if (!moduleId) return showError("Create a module first");

    try {
      const res = await fetch(`/create_subquest/${moduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }
      });
      const data = await res.json();

      if (data.status === "success") {
        close();
        loadMainSettingsSection(`/${communitySlug}/quest/admin/${moduleId}/${data.subquest_uuid}`);
      } else {
        showError(data.message || "Could not create quest");
      }
    } catch (err) {
      console.error(err);
      showError("Network error");
    }
  }

  function open() {
    if (modal || document.getElementById("tpl-modal")) return;

    build();
    fillModules();
    state = { q: "", activeId: null };
    listScroll = 0;
    creating = false;
    renderList();
    modal.classList.add("open");

    if (!isMobileTpl()) {
      const first = filteredTemplates().find(t => !isTwitterLocked(t));
      if (first) selectTemplate(first.id);
    }
  }

  function close() {
    const el = modal || document.getElementById("tpl-modal");
    if (el) {
      el.style.display = "none";
      el.remove();
    }
    document.querySelectorAll("#tpl-modal").forEach(m => m.remove());
    modal = null;
    creating = false;
    state = { q: "", activeId: null };
  }

  const onTemplatesClick = e => {
    if (!e.target.closest(".btn-text")) return;
    e.preventDefault();
    e.stopPropagation();
    if (modal || document.getElementById("tpl-modal")) return;
    open();
  };

  const onTemplatesKey = e => {
    if (e.key !== "Escape" || !modal) return;
    const dd = modal.querySelector("#tpl-dd");
    if (dd && dd.classList.contains("open")) {
      dd.classList.remove("open");
      return;
    }
    close();
  };

  if (window.__tplHandlers) {
    document.removeEventListener("click", window.__tplHandlers.click, true);
    document.removeEventListener("keydown", window.__tplHandlers.key);
  }
  window.__tplHandlers = { click: onTemplatesClick, key: onTemplatesKey };
  document.addEventListener("click", onTemplatesClick, true);
  document.addEventListener("keydown", onTemplatesKey);

  window.QuestModule = {
    init: initQuestApp
  };

})();