(function () {
let hoverTimeout = null;
let hideTimeout = null;
let isHoveringTrigger = false;
let isHoveringModal = false;
let activityRequestId = 0;

const INITIAL_LIMIT = 30;
const PAGE_SIZE = 15;
const SCROLL_THRESHOLD = 250;

let currentOffset = 0;
let hasMore = true;
let isLoadingMore = false;
let scrollContainer = null;

let exportTotalCount = 0;
/* ==========================================================
   RewardTiers
   Shown when "Platform distribution" (pay_to_creator) is picked.
   Rows look like:   [1]  –  [to ▾]   [ 0.50 ZEC ]
   - the first "from" is always 1 and can never be changed
   - every other "from" is set automatically (previous "to" + 1)
   - "to" is a smart dropdown that can go to any rank
   - amounts are per winner, typed in ZEC, handled as zatoshi (BigInt)
   - total is checked against the community wallet balance
   - if the wallet is EMPTY the form is NOT blocked: the rows are replaced
     by a short notice (with an "Add funds" link) and no tiers are sent
   - the slot's height is animated: CSS transitions `height`, and a
     ResizeObserver keeps it equal to the tier box height, so opening,
     closing, adding/removing a range and the alert all glide
   Exposes: window.RewardTiers = { init, getTiers, isValid }
   ========================================================== */
(function () {
  "use strict";

  const ZAT = 100000000n;      // 1 ZEC = 100,000,000 zatoshi
  const MAX_RANK = 100000;     // highest rank the dropdown can reach
  const PAGE = 10;             // options added at a time
  const PAY_URL = "pay";       // "Add funds" target

  let slot = null;
  let active = false;
  let available = 0n;          // wallet available balance, in zatoshi
  let currency = "ZEC";
  let tiers = [];              // { from, to, amount }

  let menu = null;
  let menuTier = -1;
  let menuStart = 1;
  let menuEnd = 0;
  let docBound = false;
  let ro = null;               // ResizeObserver for the height animation

  /* ---------------- helpers ---------------- */

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  // "1.5" -> 150000000n ; invalid/empty -> null
  function parseZec(str) {
    const s = String(str || "").trim();
    if (!s || s === "." || !/^\d*\.?\d{0,8}$/.test(s)) return null;
    const parts = s.split(".");
    const whole = parts[0] || "0";
    const frac = (parts[1] || "").padEnd(8, "0");
    return BigInt(whole) * ZAT + BigInt(frac);
  }

  // 150000000n -> "1.5"
  function formatZec(zat) {
    const whole = zat / ZAT;
    const frac = (zat % ZAT).toString().padStart(8, "0").replace(/0+$/, "");
    const w = whole.toLocaleString("en-US");
    return frac ? `${w}.${frac}` : w;
  }

  const emit = () => window.dispatchEvent(new CustomEvent("reward-tiers:change"));

  /* ---------------- height animation ---------------- */

  // the slot's height always follows the tier box; CSS does the transition
  function syncHeight() {
    if (!slot || !active) return;
    const box = slot.firstElementChild;
    slot.style.height = (box ? box.offsetHeight : 0) + "px";
  }

  function observeBox() {
    if (ro) ro.disconnect();
    if (!slot) return;
    const box = slot.firstElementChild;
    if (box && "ResizeObserver" in window) {
      ro = ro || new ResizeObserver(syncHeight);
      ro.observe(box);
    }
    syncHeight();
  }

  /* ---------------- state ---------------- */

  // keeps every "from" in sync with the previous "to"
  function normalize() {
    tiers.forEach((t, i) => {
      t.from = i === 0 ? 1 : (tiers[i - 1].to ? tiers[i - 1].to + 1 : null);
      if (t.from === null || (t.to && t.to < t.from)) t.to = null;
    });
  }

  const winners = (t) => (t.to && t.from ? t.to - t.from + 1 : 0);

  function costOf(t) {
    const amt = parseZec(t.amount);
    const n = winners(t);
    return amt && n ? amt * BigInt(n) : 0n;
  }

  const allocated = () => tiers.reduce((sum, t) => sum + costOf(t), 0n);

  function canAdd() {
    const last = tiers[tiers.length - 1];
    if (!last || !last.to || last.to >= MAX_RANK) return false;
    const amt = parseZec(last.amount);
    return !!amt && amt > 0n;
  }

  function isValid() {
    if (!active) return true;
    // empty wallet: don't block the form, the notice explains it and no tiers are sent
    if (available <= 0n) return true;
    if (!tiers.length) return false;
    for (const t of tiers) {
      const amt = parseZec(t.amount);
      if (!t.to || !amt || amt <= 0n) return false;
    }
    return allocated() <= available;
  }

  function getTiers() {
    if (!active || available <= 0n) return [];
    return tiers.map((t) => ({
      from: t.from,
      to: t.to,
      amount_zat: String(parseZec(t.amount) || 0n)   // per winner, in zatoshi
    }));
  }

  /* ---------------- rendering ---------------- */

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const CHEVRON_SVG =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  function rowHtml(t, i) {
    const fromTitle = i === 0
      ? "The first rank always starts at 1"
      : "Starts right after the previous range";

    return `
      <div class="tier" data-i="${i}">
        <div class="tier-row">
          <div class="tier-from" title="${fromTitle}">${i === 0 ? LOCK_SVG : ""}<span>${t.from === null ? "–" : t.from}</span></div>
          <span class="tier-dash">–</span>
          <button type="button" class="tier-trigger${t.to ? "" : " is-empty"}" data-i="${i}" ${t.from === null ? "disabled" : ""}>
            <span>${t.to ? t.to : "to"}</span>${CHEVRON_SVG}
          </button>
          <label class="tier-amount">
            <input class="tier-input" data-i="${i}" inputmode="decimal" autocomplete="off"
                   placeholder="0.00" value="${esc(t.amount)}" aria-label="Amount each winner gets, in ${esc(currency)}">
            <span class="tier-unit">${esc(currency)}</span>
          </label>
          ${i === 0 ? "" : `<button type="button" class="tier-remove" data-i="${i}" aria-label="Remove this range">&times;</button>`}
        </div>
        <div class="tier-meta" data-meta="${i}"></div>
      </div>`;
  }

  // empty wallet: just a notice, nothing is blocked
  function renderEmptyWallet() {
    slot.innerHTML = `
      <div class="tier-box">
        <div class="tier-head">
          <span class="tier-title">Reward ranks</span>
          <span class="tier-balance">Wallet balance <strong>0 ${esc(currency)}</strong></span>
        </div>
        <div class="tier-alert is-info">
          <span>Your community wallet is empty, so reward ranks can't be set yet. You can still save this sprint, then add funds.</span>
          <button type="button" class="tier-fund">Add funds</button>
        </div>
      </div>`;
    observeBox();
  }

  function render() {
    if (!slot) return;

    if (available <= 0n) {
      renderEmptyWallet();
      return;
    }

    slot.innerHTML = `
      <div class="tier-box">
        <div class="tier-head">
          <span class="tier-title">Reward ranks</span>
          <span class="tier-balance">Wallet balance <strong>${formatZec(available)} ${esc(currency)}</strong></span>
        </div>
        <div class="tier-rows">${tiers.map(rowHtml).join("")}</div>
        <button type="button" class="tier-add" title="Finish the current range first">+ Add rank range</button>
        <div class="tier-summary"></div>
        <div class="tier-alert" hidden></div>
      </div>`;

    slot.querySelectorAll(".tier-trigger").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openMenu(Number(b.dataset.i), b);
      })
    );

    slot.querySelectorAll(".tier-input").forEach((inp) =>
      inp.addEventListener("input", () => onAmount(inp))
    );

    slot.querySelectorAll(".tier-remove").forEach((b) =>
      b.addEventListener("click", () => removeTier(Number(b.dataset.i)))
    );

    slot.querySelector(".tier-add").addEventListener("click", addTier);

    refresh();
    observeBox();
  }

  // updates totals, per-row hints, alert and Add button WITHOUT re-rendering rows
  // (so typing in an amount box never loses focus)
  function refresh() {
    if (!slot) return;

    const alloc = allocated();
    const remaining = available - alloc;
    const cur = esc(currency);

    const summary = slot.querySelector(".tier-summary");
    if (summary) {
      const rem = remaining < 0n ? "-" + formatZec(-remaining) : formatZec(remaining);
      summary.innerHTML =
        `<span>Total <strong>${formatZec(alloc)} ${cur}</strong></span>` +
        `<span>Remaining <strong>${rem} ${cur}</strong></span>`;
    }

    tiers.forEach((t, i) => {
      const el = slot.querySelector(`[data-meta="${i}"]`);
      if (!el) return;
      const n = winners(t);
      const amt = parseZec(t.amount);
      const label = `${n} winner${n === 1 ? "" : "s"}`;
      el.textContent = !n
        ? ""
        : amt && amt > 0n
          ? `${label} × ${formatZec(amt)} = ${formatZec(amt * BigInt(n))} ${currency}`
          : label;
    });

    const alertEl = slot.querySelector(".tier-alert");
    if (alertEl) {
      let msg = "";
      if (remaining < 0n) {
        msg = `Over budget by ${formatZec(-remaining)} ${currency}. Lower an amount, shorten a range, or add funds.`;
      }
      alertEl.hidden = !msg;
      alertEl.innerHTML = msg
        ? `<span>${esc(msg)}</span><button type="button" class="tier-fund">Add funds</button>`
        : "";
    }

    const add = slot.querySelector(".tier-add");
    if (add) add.disabled = !canAdd();
  }

  /* ---------------- actions ---------------- */

  function onAmount(inp) {
    let v = inp.value.replace(/[^\d.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 8);
    }
    if (v !== inp.value) inp.value = v;

    tiers[Number(inp.dataset.i)].amount = v;
    refresh();
    emit();
  }

  function addTier() {
    if (!canAdd()) return;
    tiers.push({ from: null, to: null, amount: "" });
    normalize();
    render();
    emit();
  }

  function removeTier(i) {
    if (i === 0) return;               // the first range is locked
    tiers.splice(i, 1);
    normalize();
    render();
    emit();
  }

  /* ---------------- smart dropdown ---------------- */

  function optionHtml(n, t, amt, budgetForRow) {
    const w = n - t.from + 1;
    const over = amt > 0n && BigInt(w) * amt > budgetForRow;
    return `<button type="button" class="tier-opt${n === t.to ? " is-selected" : ""}${over ? " is-over" : ""}" data-v="${n}"${over ? ' title="Over your wallet balance"' : ""}>` +
           `<span>${n}</span><small>${w} winner${w === 1 ? "" : "s"}</small></button>`;
  }

  function extendMenu(count) {
    if (!menu) return;
    const t = tiers[menuTier];
    const list = menu.querySelector(".tier-menu-list");
    const amt = parseZec(t.amount) || 0n;
    const budgetForRow = available - (allocated() - costOf(t));

    const start = menuEnd + 1;
    const end = Math.min(MAX_RANK, menuEnd + count);
    let html = "";
    for (let n = start; n <= end; n++) html += optionHtml(n, t, amt, budgetForRow);

    list.insertAdjacentHTML("beforeend", html);
    menuEnd = end;
  }

  function fillMenu(minVisible) {
    const list = menu.querySelector(".tier-menu-list");
    list.innerHTML = "";
    menuEnd = menuStart - 1;
    extendMenu(minVisible);
  }

  function openMenu(i, trigger) {
    closeMenu();
    const t = tiers[i];
    if (!t || t.from === null) return;

    menuTier = i;
    menuStart = t.from;

    menu = document.createElement("div");
    menu.className = "tier-menu";
    menu.innerHTML =
      `<input class="tier-menu-input" inputmode="numeric" autocomplete="off" placeholder="Type a rank (min ${t.from})">` +
      `<div class="tier-menu-list"></div>`;
    document.body.appendChild(menu);

    // make sure the current selection is visible in the first batch
    const visible = Math.max(PAGE, t.to ? t.to - t.from + 3 : 0);
    fillMenu(visible);

    const list = menu.querySelector(".tier-menu-list");
    const input = menu.querySelector(".tier-menu-input");

    menu.addEventListener("click", (e) => e.stopPropagation());

    list.addEventListener("click", (e) => {
      const b = e.target.closest(".tier-opt");
      if (b) pick(Number(b.dataset.v));
    });

    // keeps going as you scroll: the list can reach any rank
    list.addEventListener("scroll", () => {
      if (menuEnd < MAX_RANK && list.scrollTop + list.clientHeight >= list.scrollHeight - 40) {
        extendMenu(PAGE);
      }
    });

    // typing a rank jumps the list to start at that rank
    input.addEventListener("input", () => {
      const n = parseInt(input.value, 10);
      menuStart = validRank(n) ? n : tiers[menuTier].from;
      fillMenu(PAGE);
      list.scrollTop = 0;
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const n = parseInt(input.value, 10);
        if (validRank(n)) pick(n);
      } else if (e.key === "Escape") {
        closeMenu();
      }
    });

    positionMenu(trigger);

    // avoid popping the keyboard on touch devices
    if (window.matchMedia("(hover: hover)").matches) input.focus();

    const selected = list.querySelector(".is-selected");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }

  function validRank(n) {
    const t = tiers[menuTier];
    return Number.isInteger(n) && t && n >= t.from && n <= MAX_RANK;
  }

  function pick(n) {
    const i = menuTier;
    if (i < 0 || !tiers[i]) return;
    tiers[i].to = n;
    closeMenu();
    normalize();
    render();
    emit();
  }

  function positionMenu(trigger) {
    if (!menu) return;
    const r = trigger.getBoundingClientRect();
    const mh = menu.offsetHeight;
    const mw = menu.offsetWidth;
    const gap = 6;

    let top = r.bottom + gap;
    if (top + mh > window.innerHeight - gap && r.top - mh - gap > gap) {
      top = r.top - mh - gap;
    }
    top = Math.max(gap, Math.min(top, window.innerHeight - mh - gap));
    const left = Math.max(gap, Math.min(r.left, window.innerWidth - mw - gap));

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  function closeMenu() {
    if (menu) menu.remove();
    menu = null;
    menuTier = -1;
  }

  /* ---------------- setup ---------------- */

  function bindDocument() {
    if (docBound) return;
    docBound = true;

    document.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    // close when the page/wrapper scrolls (but not when the list itself scrolls)
    window.addEventListener("scroll", (e) => {
      if (menu && !menu.contains(e.target)) closeMenu();
    }, true);
  }

  function onDistribution(value) {
    active = value === "pay_to_creator";

    if (active) {
      render();                          // fills the slot + sets the target height
      slot.classList.add("is-open");     // CSS animates height / margin / opacity
    } else {
      closeMenu();
      slot.classList.remove("is-open");
      slot.style.height = "0px";         // animates closed; content stays until reopened
    }
    emit();
  }

  function init() {
    injectCss();
    closeMenu();
    bindDocument();

    if (ro) { ro.disconnect(); ro = null; }

    slot = document.getElementById("distributionSlot");
    active = false;
    tiers = [{ from: 1, to: null, amount: "" }];
    if (!slot) return;

    slot.classList.remove("is-open");
    slot.style.height = "0px";
    slot.innerHTML = "";

    try {
      available = BigInt(slot.dataset.availableZat || "0");
    } catch (_) {
      available = 0n;
    }
    if (available < 0n) available = 0n;
    currency = slot.dataset.currency || "ZEC";

    if (!slot.dataset.tiersBound) {
      slot.dataset.tiersBound = "1";
      slot.addEventListener("click", (e) => {
        if (e.target.closest(".tier-fund")) window.open(PAY_URL, "_blank");
      });
    }

    document.querySelectorAll('input[name="distribution"]').forEach((radio) =>
      radio.addEventListener("change", () => onDistribution(radio.value))
    );

    const checked = document.querySelector('input[name="distribution"]:checked');
    if (checked) onDistribution(checked.value);
  }

  /* ---------------- styles (self-injected) ---------------- */

  function injectCss() {
    if (document.getElementById("reward-tiers-css")) return;
    const style = document.createElement("style");
    style.id = "reward-tiers-css";
    style.textContent = `
.tier-box{--edge-fill:var(--bg-sidebar);display:flex;flex-direction:column;gap:14px;padding:18px 20px;border-radius:24px}
.tier-from,.tier-trigger,.tier-amount,.tier-add,.tier-menu{--edge-fill:var(--bg-surface)}
.tier-box,.tier-from,.tier-trigger,.tier-amount,.tier-add,.tier-menu{
  border:var(--edge-w,1px) solid transparent;
  background:
    linear-gradient(var(--edge-fill),var(--edge-fill)) padding-box,
    linear-gradient(135deg,var(--edge-hi,rgba(255,255,255,.42)) 0%,var(--edge-lo,rgba(255,255,255,.05)) 28%,var(--edge-lo,rgba(255,255,255,.05)) 72%,var(--edge-hi,rgba(255,255,255,.42)) 100%) border-box;
  transition:--edge-hi .2s ease,--edge-lo .2s ease,opacity .2s ease;
}
.tier-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.tier-title{font-size:14px;font-weight:600;color:var(--text-main)}
.tier-balance{font-size:12.5px;color:var(--text-muted)}
.tier-balance strong,.tier-summary strong{color:var(--text-main);font-weight:600}
.tier-rows{display:flex;flex-direction:column;gap:12px}
.tier-row{display:flex;align-items:center;gap:8px}
.tier-from{width:48px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:4px;border-radius:14px;font-size:14px;color:var(--text-main);opacity:.85;cursor:not-allowed;user-select:none}
.tier-from svg{color:var(--text-muted)}
.tier-dash{color:var(--text-muted)}
.tier-trigger{min-width:76px;height:44px;padding:0 12px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:space-between;gap:6px;border-radius:14px;font-family:inherit;font-size:14px;color:var(--text-main);cursor:pointer}
.tier-trigger.is-empty{color:var(--text-muted)}
.tier-trigger:hover:not(:disabled){--edge-hi:rgba(255,255,255,.6)}
.tier-trigger:disabled{opacity:.45;cursor:not-allowed}
.tier-amount{flex:1;min-width:0;height:44px;display:flex;align-items:center;gap:8px;padding:0 14px;border-radius:14px;cursor:text}
.tier-amount:focus-within{--edge-hi:rgba(72,136,240,.9);--edge-lo:rgba(72,136,240,.2)}
.tier-amount .tier-input{flex:1;min-width:0;width:100%;background:transparent!important;border:none!important;border-radius:0;padding:0;font-family:inherit;font-size:14px;color:var(--text-main);outline:none}
.tier-unit{font-size:12px;font-weight:600;color:var(--text-muted)}
.tier-remove{width:32px;height:32px;flex-shrink:0;border:none;border-radius:50%;background:transparent;color:var(--text-muted);font-size:20px;line-height:1;cursor:pointer}
.tier-remove:hover{color:#ff5a6e;background:rgba(255,90,110,.1)}
.tier-meta{min-height:16px;margin-top:6px;padding-left:2px;font-size:12px;color:var(--text-muted)}
.tier-add{align-self:flex-start;padding:10px 16px;border-radius:14px;font-family:inherit;font-size:13px;font-weight:600;color:var(--text-main);cursor:pointer}
.tier-add:hover:not(:disabled){--edge-hi:rgba(255,255,255,.6)}
.tier-add:disabled{opacity:.45;cursor:not-allowed}
.tier-summary{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--text-muted)}
.tier-alert{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:#ff5a6e}
.tier-alert.is-info{color:var(--text-muted)}
.tier-alert[hidden]{display:none}
.tier-fund{border:none;background:none;padding:0;font-family:inherit;font-size:12.5px;font-weight:600;color:#4285f4;cursor:pointer;text-decoration:underline}
.tier-menu{position:fixed;z-index:10001;width:190px;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:18px;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.tier-menu .tier-menu-input{width:100%;box-sizing:border-box;background:var(--bg-app)!important;border:1px solid var(--border)!important;border-radius:12px;padding:9px 12px;font-family:inherit;font-size:13px;color:var(--text-main);outline:none}
.tier-menu-list{max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.tier-opt{display:flex;align-items:center;justify-content:space-between;width:100%;padding:8px 10px;border:none;border-radius:10px;background:transparent;font-family:inherit;font-size:13px;color:var(--text-main);text-align:left;cursor:pointer}
.tier-opt small{font-size:11.5px;color:var(--text-muted)}
.tier-opt:hover{background:var(--bg-hover)}
.tier-opt.is-selected{color:#4285f4}
.tier-opt.is-over{opacity:.45}
`;
    document.head.appendChild(style);
  }

  window.RewardTiers = { init, getTiers, isValid };
})();

function getColor(id) {
  const colors = [
    '#FF6F61','#6B5B95','#88B04B','#F7CAC9',
    '#92A8D1','#955251','#B565A7','#009B77',
    '#DD4124','#45B8AC'
  ];
  return colors[id % colors.length];
}

function adjustColor(hex, amount) {
  hex = hex.replace('#', '');

  let r = parseInt(hex.substring(0, 2), 16) + amount;
  let g = parseInt(hex.substring(2, 4), 16) + amount;
  let b = parseInt(hex.substring(4, 6), 16) + amount;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


function getTextColor(bgColor) {
  const r = parseInt(bgColor.substring(1, 3), 16);
  const g = parseInt(bgColor.substring(3, 5), 16);
  const b = parseInt(bgColor.substring(5, 7), 16);

  const brightness = r * 0.299 + g * 0.587 + b * 0.114;

  if (brightness > 160) {
    return adjustColor(bgColor, -60);
  } else {
    return adjustColor(bgColor, 60);
  }
}

function scheduleHide() {
  clearTimeout(hideTimeout);

  hideTimeout = setTimeout(() => {
    if (!isHoveringTrigger && !isHoveringModal) {
      hideActivity();
    }
  }, 150);
}

function makeSkeletonRows(count) {
  return Array.from({ length: count }).map(() => `
    <li class="lb-s-row">
      <div class="lb-s-rank shimmer"></div>
      <div class="lb-s-avatar shimmer"></div>
      <div class="lb-s-name shimmer" style="width: ${getRandomWidth()}px;"></div>
      <div class="lb-s-xp shimmer"></div>
    </li>
  `).join("");
}

function appendSkeletonRows(list, count) {
  const wrap = document.createElement("div");
  wrap.className = "lb-skeleton-batch";
  wrap.innerHTML = makeSkeletonRows(count);
  const rows = Array.from(wrap.children);
  rows.forEach(row => list.appendChild(row));
  return rows;
}

function renderUserRow(user) {
  const li = document.createElement("li");
  li.className = "participant-item";

  const hasImage = user.image && user.image.trim() !== "";
  const bg = getColor(user.user_id);
  const textColor = getTextColor(bg);
  li.innerHTML = `
      ${
        hasImage
          ? `<img src="${user.image}" class="participant-avatar" alt="${user.username}">`
          : `<div class="participant-avatar" style="background:${bg}; color:${textColor}; font-weight: 500;">${user.username[0].toUpperCase()}</div>`
      }

    <div class="participant-info">
      <span class="participant-name">${user.username}</span>
      <span class="participant-xp">${user.xp.toLocaleString()} XP</span>
    </div>
  `;

  if (window.innerWidth > 767) {

    const delay = 300;

    function handleEnter(e) {
      isHoveringTrigger = true;

      clearTimeout(hoverTimeout);

      const position = {
        x: e.clientX,
        y: e.clientY
      };

      hoverTimeout = setTimeout(() => {
        showUserActivity(user.username, position);
      }, delay);
    }

    function handleLeave() {
      isHoveringTrigger = false;
      clearTimeout(hoverTimeout);
      scheduleHide();
    }

    li.addEventListener("mouseenter", handleEnter);
    li.addEventListener("mouseleave", handleLeave);

  } else {

    li.addEventListener("click", () => {
      showUserActivity(user.username);
    });

  }

  return li;
}

function appendUsersToList(list, users) {
  users.forEach((user) => {
    list.appendChild(renderUserRow(user));
  });
}

function getScrollContainer() {
  if (scrollContainer) return scrollContainer;
  scrollContainer = document.querySelector(".info-bottom") || window;
  return scrollContainer;
}

function onScrollCheck() {
  if (isLoadingMore || !hasMore) return;

  const el = getScrollContainer();
  let scrollBottomGap;

  if (el === window) {
    scrollBottomGap =
      document.documentElement.scrollHeight -
      (window.scrollY + window.innerHeight);
  } else {
    scrollBottomGap = el.scrollHeight - (el.scrollTop + el.clientHeight);
  }

  if (scrollBottomGap < SCROLL_THRESHOLD) {
    loadMoreParticipants();
  }
}

async function loadMoreParticipants() {
  if (isLoadingMore || !hasMore) return;
  isLoadingMore = true;

  const list = document.querySelector(".participants-list");
  const skeletonRows = appendSkeletonRows(list, PAGE_SIZE);

  try {
    const res = await fetch(
      `/api/${communitySlug}/leaderboard?offset=${currentOffset}&limit=${PAGE_SIZE}`
    );
    const data = await res.json();

    skeletonRows.forEach(row => row.remove());

    const users = data.leaderboard || [];
    appendUsersToList(list, users);

    currentOffset = data.next_offset;
    hasMore = !!data.has_more;

  } catch (err) {
    console.error("Failed to load more participants:", err);
    skeletonRows.forEach(row => row.remove());
  } finally {
    isLoadingMore = false;
  }
}


async function loadLeaderboard() {

  const list = document.querySelector(".participants-list");
  const emptyMessage = document.querySelector(".empty-message");

  const topRankRow = document.querySelector(".top-rank-row");

  const rankNumber = document.querySelector(".rank-number");
  const rankAvatar = document.querySelector(".rank-avatar");
  const rankUsername = document.querySelector(".rank-username");
  const rankXp = document.querySelector(".rank-xp");

  initExportButton();

  currentOffset = 0;
  hasMore = true;
  isLoadingMore = false;

  list.innerHTML = makeSkeletonRows(4);

  try {

    const res = await fetch(`/api/${communitySlug}/leaderboard?offset=0&limit=${INITIAL_LIMIT}`);
    const data = await res.json();

    const users = data.leaderboard;
    const currentUser = data.current_user;
    const participantsCount = document.querySelector(".participants-count");

    const totalCount = typeof data.total_count === "number" ? data.total_count : (users ? users.length : 0);
    exportTotalCount = totalCount;

    if (participantsCount) {
      participantsCount.textContent = `${totalCount} participants`;
    }
    if (!users || users.length === 0) {
      emptyMessage.style.display = "flex";
      list.style.display = "none";
      topRankRow.style.display = "none";
      return;
    }

    emptyMessage.style.display = "none";
    list.style.display = "flex";

    list.innerHTML = "";

    appendUsersToList(list, users);

    currentOffset = data.next_offset;
    hasMore = !!data.has_more;

    const container = getScrollContainer();
    container.removeEventListener("scroll", onScrollCheck);
    container.addEventListener("scroll", onScrollCheck, { passive: true });

    if (currentUser) {

      topRankRow.style.display = "flex";

      rankNumber.textContent = `${currentUser.rank}.`;

      const hasImage = currentUser.image && currentUser.image.trim() !== "";
      const bg = getColor(currentUser.user_id);
      const textColor = getTextColor(bg);

      rankAvatar.innerHTML = hasImage
        ? `<img src="${currentUser.image}" alt="${currentUser.username}" class="rank-avatar">`
        : `
          <div class="rank-init"
              style="background:${bg}; color:${textColor}; font-weight:500;">
            ${currentUser.username[0].toUpperCase()}
          </div>
        `;
      rankAvatar.alt = currentUser.username;

      rankUsername.textContent = currentUser.username;

      rankXp.textContent = `${currentUser.xp.toLocaleString()} XP`;

    } else {

      topRankRow.style.display = "none";

    }


  } catch (err) {
    console.error("Leaderboard failed to load:", err);
  }

}



function showCountdown() {
  const countdownWrapper = document.getElementById('countdownWrapper');


  if (!countdownWrapper) return;
  const h = countdownWrapper.scrollHeight;
  countdownWrapper.style.setProperty("--h", `${h}px`);
  countdownWrapper.classList.remove("is-hidden");
  countdownWrapper.classList.add("show");
}

function hideCountdown() {
  const countdownWrapper = document.getElementById('countdownWrapper');

  if (!countdownWrapper) return;
  countdownWrapper.classList.remove("show");
  countdownWrapper.classList.add("is-hidden");
}

function initSprintDatePickers({
  startOffsetMinutes = 10,
  durationDays = 14
} = {}) {
  const countdownWrapper = document.getElementById('countdownWrapper');
  const countdownTimer = document.getElementById('countdownTimer');
  const countdownLabel = document.querySelector('.countdown-label');
  const startPreview = document.getElementById('timezone-start');
  const endPreview   = document.getElementById('timezone-end');

  const startIsoInput = document.getElementById('start_date_iso');
  const endIsoInput   = document.getElementById('end_date_iso');

  const startDisplayInput =
    document.querySelector('input[name="start_date_display"]');
  const endDisplayInput =
    document.querySelector('input[name="end_date_display"]');

  const timezoneLabel = document.querySelector('.timezone-label');

  if (!startDisplayInput || !endDisplayInput) return;

  let countdownInterval = null;

  if (timezoneLabel) {
    timezoneLabel.textContent =
      `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  }

  function formatPreview(date) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatLocalISO(date) {
    const pad = n => String(n).padStart(2, '0');
    return (
      date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + 'T' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes())
    );
  }

  function updatePreview(el, date) {
    if (!el || !date) return;
    el.textContent = formatPreview(date);
    el.dataset.local = date.getTime();
  }

  function startCountdown(startDate, endDate) {
    if (!countdownTimer || !countdownLabel) return;

    if (countdownInterval) clearInterval(countdownInterval);

    function tick() {
      const now = new Date();
      let target;

      countdownLabel.classList.remove("ended");
      countdownLabel.textContent = "";
      countdownLabel.innerHTML = "";

      if (now < startDate) {
        target = startDate;
        countdownLabel.textContent = "Starting in:";

        showCountdown();

      } else if (now < endDate) {
        target = endDate;
        countdownLabel.textContent = "Ends in:";

        showCountdown();

      } else {
        countdownLabel.classList.add("ended");
        countdownLabel.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17,24H7.005a4.014,4.014,0,0,1-3.044-1.4,3.94,3.94,0,0,1-.917-3.158A12.522,12.522,0,0,1,7.445,12a12.522,12.522,0,0,1-4.4-7.444A3.94,3.94,0,0,1,3.961,1.4,4.014,4.014,0,0,1,7.005,0H17a4.017,4.017,0,0,1,3.044,1.4,3.943,3.943,0,0,1,.918,3.155A12.556,12.556,0,0,1,16.551,12a12.557,12.557,0,0,1,4.406,7.448,3.944,3.944,0,0,1-.918,3.156A4.017,4.017,0,0,1,17,24ZM17,2H7.005a2.015,2.015,0,0,0-1.528.7,1.921,1.921,0,0,0-.456,1.556c.376,2.5,1.924,4.84,4.6,6.957a1,1,0,0,1,0,1.568C6.945,14.9,5.4,17.242,5.021,19.741A1.921,1.921,0,0,0,5.477,21.3a2.015,2.015,0,0,0,1.528.7H17a2.014,2.014,0,0,0,1.528-.7,1.917,1.917,0,0,0,.456-1.554c-.373-2.487-1.92-4.829-4.6-6.962a1,1,0,0,1,0-1.564c2.681-2.133,4.228-4.475,4.6-6.963A1.916,1.916,0,0,0,18.523,2.7,2.014,2.014,0,0,0,17,2ZM15.681,20H8.318a1,1,0,0,1-.927-1.374,11.185,11.185,0,0,1,3.471-4.272l.518-.412a1,1,0,0,1,1.245,0l.509.406a11.3,11.3,0,0,1,3.473,4.276A1,1,0,0,1,15.681,20Zm-5.647-2h3.928A11.57,11.57,0,0,0,12,16,11.3,11.3,0,0,0,10.034,18Z"/>
          </svg>
          Sprint Ended
        `;

        hideCountdown();
        clearInterval(countdownInterval);
        return;
      }

      const diff = Math.max(0, Math.floor((target - now) / 1000));
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const nums = countdownTimer.querySelectorAll(".num");
      if (nums.length === 4) {
        nums[0].textContent = String(days).padStart(2, "0");
        nums[1].textContent = String(hours).padStart(2, "0");
        nums[2].textContent = String(minutes).padStart(2, "0");
        nums[3].textContent = String(seconds).padStart(2, "0");
      }
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  function syncCalendarFromInput(type) {
    const isoInput =
      type === "start" ? startIsoInput : endIsoInput;

    if (!isoInput || !isoInput.value) return;

    const d = new Date(isoInput.value);
    if (isNaN(d)) return;

    const state = window.calendarState;

    state.selected  = new Date(d);
    state.viewYear  = d.getFullYear();
    state.viewMonth = d.getMonth();

    const hourInput = document.querySelector(".flatpickr-hour");
    const minuteEl  = document.querySelector(".flatpickr-minute");
    const amPmEl    = document.querySelector(".flatpickr-am-pm");

    const h24 = d.getHours();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    if (hourInput) hourInput.value = h12;
    if (minuteEl)  minuteEl.textContent = String(d.getMinutes()).padStart(2, "0");
    if (amPmEl)    amPmEl.textContent = h24 >= 12 ? "PM" : "AM";

    window.dispatchEvent(new CustomEvent("calendar:refresh"));
  }

  function commitDate({ type, date }) {
    if (!(date instanceof Date)) return;
    date = snapTo30Minutes(date);
    if (type === "start") {
      startDisplayInput.value = formatPreview(date);
      startIsoInput.value = formatLocalISO(date);
      updatePreview(startPreview, date);

      const endDate = endIsoInput.value
        ? new Date(endIsoInput.value)
        : null;

      if (endDate && endDate < date) {
        commitDate({ type: "end", date });
      }

      if (endDate) startCountdown(date, endDate);
    }

    if (type === "end") {
      endDisplayInput.value = formatPreview(date);
      endIsoInput.value = formatLocalISO(date);
      updatePreview(endPreview, date);

      const startDate = new Date(startIsoInput.value);
      startCountdown(startDate, date);
    }
  }

  startDisplayInput.style.pointerEvents = 'none';
  endDisplayInput.style.pointerEvents = 'none';
  const startCalendar = document.getElementById("startCalendar");
  const startBox = document.getElementById("start_date");
  const EndBox = document.getElementById("end_date");

  document.addEventListener("click", (e) => {
    const target = e.target;

    const clickedInsideCalendar = startCalendar.contains(target);
    const clickedStartBox = startBox.contains(target);
    const clickedEndBox = EndBox.contains(target);

    if (!clickedInsideCalendar && !clickedStartBox && !clickedEndBox) {
      closeCalendar(startCalendar);
    }
  });

  let activePicker = "start";
  function toggleCalendar(triggerEl, calendarEl, type) {
    const isOpen = calendarEl.classList.contains("open");

    if (isOpen && activePicker === type) {
      closeCalendar(calendarEl);
      return;
    }

    activePicker = type;
    syncCalendarFromInput(type);
    window.openCalendar(triggerEl, calendarEl);
  }


  startBox.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCalendar(startBox, startCalendar, "start");
  });

  EndBox.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCalendar(EndBox, startCalendar, "end");
  });

  const startDate = snapTo30Minutes(
    new Date(Date.now() + startOffsetMinutes * 60 * 1000)
  );

  const endDate = snapTo30Minutes(
    new Date(startDate.getTime() + durationDays * 86400000)
  );

  startIsoInput.value = formatLocalISO(startDate);
  endIsoInput.value   = formatLocalISO(endDate);

  updatePreview(startPreview, startDate);
  updatePreview(endPreview, endDate);

  startCountdown(startDate, endDate);
window.addEventListener("calendar:select", (e) => {
  commitDate({
    type: activePicker,
    date: e.detail.date
  });
});
}



function initLiveTextPreview() {

  function renderLines(container, text) {
    if (!container) return;

    container.innerHTML = "";

    const lines = text.split("\n");

    lines.forEach((lineText) => {
      const line = document.createElement("div");
      line.className = "line";
      line.textContent = lineText || "\u00A0";
      container.appendChild(line);
    });

    const lastLine = container.lastElementChild;
    if (lastLine) {
      lastLine.scrollIntoView({
        block: "nearest",
        behavior: "auto"
      });
    }
  }

  const titleInput = document.getElementById("title");
  const previewTitle = document.getElementById("previewTitle");

  if (titleInput && previewTitle) {
    const defaultTitle = "Title";

    previewTitle.textContent = titleInput.value || defaultTitle;

    titleInput.addEventListener("input", () => {
      previewTitle.textContent =
        titleInput.value.trim() || defaultTitle;
    });
  }

  const rewardInput = document.getElementById("rewards");
  const previewReward = document.getElementById("previewReward");

  if (rewardInput && previewReward) {
    const defaultReward = "Top 3 get $ZEC + Gleyo XP";

    renderLines(previewReward, rewardInput.value || defaultReward);

    rewardInput.addEventListener("input", () => {
      renderLines(previewReward, rewardInput.value || defaultReward);
    });
  }

  const descInput = document.getElementById("description");
  const previewDesc = document.getElementById("previewDescription");

  if (descInput && previewDesc) {
    const defaultDesc =
      "Complete daily quests and rise up the leaderboard. Get featured. Get rewarded.";

    renderLines(previewDesc, descInput.value || defaultDesc);

    descInput.addEventListener("input", () => {
      renderLines(previewDesc, descInput.value || defaultDesc);
    });
  }
}

const INFO_SVG = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 354.796 354.796"
  width="20"
  height="20"
  fill="currentColor"
>
  <path d="M265.442,109.092c-10.602-4.25-13.665-6.82-13.665-11.461c0-3.714,2.813-8.053,10.744-8.053c7.015,0,12.395,2.766,12.443,2.79c0.566,0.302,1.201,0.463,1.83,0.463c1.535,0,2.893-0.929,3.456-2.367l1.927-4.926c0.671-1.795-0.347-3.359-1.645-3.92c-4.319-1.88-12.76-3.335-12.846-3.35c-0.136-0.024-0.609-0.125-0.609-0.678l-0.027-7.146c0-2.152-1.797-3.904-4.003-3.904h-3.457c-2.204,0-4,1.751-4,3.905l0.009,7.513c0,0.576-0.624,0.826-0.852,0.879c-10.655,2.538-17.314,10.343-17.314,20.188c0,12.273,10.145,17.819,21.099,21.982c8.757,3.438,12.329,6.924,12.329,12.037c0,5.564-5.059,9.45-12.307,9.45c-6.189,0-14.565-3.923-14.648-3.963c-0.536-0.254-1.104-0.382-1.688-0.382c-1.594,0-2.982,0.964-3.537,2.457l-1.84,4.982c-0.654,1.86,0.353,3.37,1.642,4.042c5.144,2.679,15.098,4.249,15.541,4.318c0.119,0.017,0.725,0.23,0.725,0.784v7.48c0,2.152,1.797,3.904,4.004,3.904h3.572c2.208,0,4.005-1.751,4.005-3.904v-7.872c0-0.736,0.543-0.801,0.655-0.828c11.351-2.55,18.343-10.855,18.343-21.283C285.325,121.518,279.377,114.597,265.442,109.092z"/>

  <path d="M260.979,22.509c-51.816,0-93.818,42.005-93.818,93.818c0,51.814,42.002,93.82,93.818,93.82c51.814,0,93.817-42.006,93.817-93.82C354.796,64.514,312.793,22.509,260.979,22.509zM260.979,188.404c-39.808,0-72.076-32.271-72.076-72.076s32.268-72.075,72.076-72.075c39.806,0,72.073,32.27,72.073,72.075s-32.267,72.076-72.073,72.076z"/>

  <path d="M335.733,255.61c-19.95,11.011-47.389,21.192-74.753,25.484c-24.346,3.818-70.148-5.39-70.148-16.265c0-4.121,40.17,10.154,64.469,3.671c18.633-4.971,15.988-22.401,5.853-24.7c-10.076-2.287-69.108-23.913-94.323-24.659c-11.878-0.351-41.203,4.131-55.393,6.442c-4.861,0.791-7.909,0.704-8.213,5.356c-1.412,21.62-4.195,65.832-5.712,88.926c-0.032,0.488,0.646,7.05,6.061,2.432c5.927-5.054,14.24-10.656,21.929-8.912c12.063,2.737,116.424,21.856,130.819,18.51c20.593-4.787,78.888-39.334,90.065-50.072C363.711,265.176,350.244,247.601,335.733,255.61z"/>

  <path d="M74.426,224.74l-54.672-2.694c-4.221-0.208-8.532,2.973-9.581,7.066l-9.941,90.255c-1.048,4.094,1.55,7.578,5.773,7.741l60.59-0.006c4.224,0.163,7.942-3.151,8.266-7.365l6.654-86.958C81.837,228.566,78.647,224.948,74.426,224.74zM42.24,315.145c-8.349,0-15.116-6.768-15.116-15.116c0-8.349,6.768-15.116,15.116-15.116s15.116,6.768,15.116,15.116c0,8.349-6.767,15.116-15.116,15.116z"/>
</svg>
`;



function isMobile() {
  return window.innerWidth < 750;
}



let paymentConfirmed = false;
let selectedOption = null;

/* The reward tiers slot is handled by RewardTiers (top of this file).
   This only keeps track of which option is picked and clears old errors. */
function initPayDistributionUI() {
  const radios = document.querySelectorAll('input[name="distribution"]');
  const errorDiv = document.getElementById("paymentError");

  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      selectedOption = radio.value;
      paymentConfirmed = false;
      if (errorDiv) errorDiv.style.display = "none";
    });
  });
}



function createOrionDropdown() {
  const panel = document.createElement('div');
  panel.className = 'orion-dropdown-panel';
  panel.innerHTML = `
    <div class="orion-color-row">
      <div class="orion-swatch"  data-color="#ff4b4b" style="background-color: #ff4b4b;"></div>
      <div class="orion-swatch" data-color="#ff6e40" style="background-color: #ff6e40;"></div>
      <div class="orion-swatch" data-color="#f6d32d" style="background-color: #f6d32d;"></div>
      <div class="orion-swatch" data-color="#ff82ff" style="background-color: #ff82ff;"></div>
      <div class="orion-swatch" data-color="#ffb347" style="background-color: #ffb347;"></div>
    </div>

    <div class="orion-color-row">
      <div class="orion-swatch" data-color="#4285f4" style="background-color: #4285f4;"></div>
      <div class="orion-swatch" data-color="#4258f4" style="background-color: #4258f4;"></div>
      <div class="orion-swatch" data-color="#3eff91" style="background-color: #3eff91;"></div>
      <div class="orion-swatch" data-color="#1e13f1" style="background-color: #1e13f1;"></div>
      <div class="orion-swatch" data-color="#13a04c" style="background-color: #13a04c;"></div>
    </div>

    <div class="orion-color-row">
      <div class="orion-swatch" data-color="green" style="background-color: green;"></div>
      <div class="orion-swatch" data-color="#428" style="background-color: #428;"></div>
      <div class="orion-swatch" data-color="#cccccc" style="background-color: #cccccc;"></div>
      <div class="orion-swatch" data-color="#a8a8a8" style="background-color: #a8a8a8;"></div>
      <div class="orion-swatch" data-color="#fdfdfd" style="background-color: #fdfdfd;"></div>
    </div>

    <input type="hidden" id="orion-hidden-input" name="color" />
    <div class="orion-preview" id="orion-preview"></div>

    <div class="orion-hashtag-group">
      <div class="orion-hashtag-icon" id="orion-hashtag-icon">#</div>
      <input class="orion-text-input" id="orion-text-input" placeholder="#hex" maxlength="7" />
      <img class="orion-eyedropper-icon" id="orion-eyedropper-icon" title="Pick screen color" src="https://cdn-icons-png.flaticon.com/512/151/151933.png" />
    </div>

    <button type="button" class="orion-confirm-btn" id="orion-confirm-btn">Okay</button>
  `;
  return panel;
}

function positionDropdown(panel, anchor) {
  const rect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const gap = 8;

  let top;

  if (viewportH - rect.bottom >= panelRect.height + gap) {
    top = rect.bottom + gap;
  } else if (rect.top >= panelRect.height + gap) {
    top = rect.top - panelRect.height - gap;
  } else {
    top = rect.bottom + gap;
  }

  let left = rect.left + rect.width / 2 - panelRect.width / 2;

  const minLeft = gap;
  const maxLeft = viewportW - panelRect.width - gap;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  const minTop = gap;
  const maxTop = viewportH - panelRect.height - gap;
  top = Math.max(minTop, Math.min(top, maxTop));

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}


  const isPremiumUntil = document.querySelector(".main-wrapper.badged")

  let isPremium = false
  if(isPremiumUntil) {
    isPremium= true
  } else {
    isPremium=false
  }
  



function bindOrionPickerEvents(picker) {
  let draftColor = null;

  const swatches = picker.querySelectorAll('.orion-swatch');
  const confirmBtn = picker.querySelector('#orion-confirm-btn');
  const preview = picker.querySelector('#orion-preview');
  const hiddenInput = picker.querySelector('#orion-hidden-input');
  const hashtagIcon = picker.querySelector('#orion-hashtag-icon');
  const colorInputField = picker.querySelector('#orion-text-input');
  const eyedropperIcon = picker.querySelector('#orion-eyedropper-icon');

  const previewHeader = document.querySelector('.preview-header');
  const previewContainer = document.querySelector('.preview-container');

  function setSprintColor(color) {
    document.documentElement.style.setProperty('--sprint-color', color);
    hiddenInput.value = color;
    window.selectedColor = color;   // read by the save handler
  }

  if (isPremium) {

    swatches.forEach((swatch) => {
      const color = swatch.getAttribute('data-color');

      swatch.addEventListener('click', () => {
        setSprintColor(color);

        picker.classList.remove('is-open');
      });
    });


    confirmBtn.addEventListener('click', () => {
      if (draftColor) {
        setSprintColor(draftColor); 
        draftColor = null;
      }
      picker.classList.remove('is-open');
    });


    if (hashtagIcon && colorInputField) {
      hashtagIcon.addEventListener('click', () => {
        hashtagIcon.style.display = 'none';
        colorInputField.style.display = 'inline-block';
        colorInputField.focus();
        colorInputField.value = '#';
      });


    colorInputField.addEventListener('input', () => {
      let val = colorInputField.value;

      if (!val.startsWith('#')) {
        val = '#' + val.replace(/#/g, '');
      }

      val = '#' + val.slice(1).replace(/[^0-9a-fA-F]/g, '');

      val = val.slice(0, 7);

      colorInputField.value = val;

      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        draftColor = val;

        if (preview) preview.style.backgroundColor = val;
        if (previewHeader) previewHeader.style.backgroundColor = val;
        if (previewContainer) previewContainer.style.backgroundColor = val;
      }
    });


    colorInputField.addEventListener('keydown', (e) => {
      const cursorPos = colorInputField.selectionStart;

      if (e.key === 'Backspace' && cursorPos <= 1) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft' && cursorPos <= 1) {
        e.preventDefault();
      }
    });


    }

    if (eyedropperIcon) {
      eyedropperIcon.addEventListener('click', async () => {
        if ('EyeDropper' in window) {
          try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            const pickedColor = result.sRGBHex;
            [preview, previewHeader, previewContainer].forEach(el => {
              setSprintColor(pickedColor);
            });
            if (hiddenInput) hiddenInput.value = pickedColor;
            if (colorInputField) {
              colorInputField.value = pickedColor;
              colorInputField.style.display = 'inline-block';
            }
            if (hashtagIcon) hashtagIcon.style.display = 'none';
          } catch (err) {
            console.warn('Eyedropper canceled:', err);
          }
        } else {
          alert('Eyedropper API not supported in this browser.');
        }
      });
    }

  } else {

    swatches.forEach(swatch => {
      swatch.classList.add('lock-base', 'lock-swatch');
      swatch.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      }, true);
    });

    if (hashtagIcon) {
      hashtagIcon.classList.add('lock-base', 'lock-icon');
      hashtagIcon.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      }, true);
    }

    if (colorInputField) {
      colorInputField.disabled = true;
    }

    if (eyedropperIcon) {
      eyedropperIcon.classList.add('lock-base', 'lock-icon');
      eyedropperIcon.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      }, true);
    }

    if (confirmBtn) {
      confirmBtn.classList.add('lock-base', 'lock-btn');
      confirmBtn.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      }, true);
    }
  }


}



function initOrionColorPicker() {
  const toggle = document.getElementById('orion-toggle-picker');
  if (!toggle) return;

  let picker = null;   // was undeclared before, which threw a ReferenceError on click

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();

    if (!picker) {
      picker = createOrionDropdown();
      document.body.appendChild(picker);
      bindOrionPickerEvents(picker);

      picker.addEventListener('click', e => e.stopPropagation());
    }
    const calendarPickr = document.querySelector(".flatpickr-calendar.open");
    if (calendarPickr) {
      calendarPickr.classList.remove("open");
    }
    picker.classList.toggle('is-open');
    positionDropdown(picker, toggle);
  });

  document.addEventListener('click', (e) => {
    if (!picker || !picker.classList.contains('is-open')) return;
    picker.classList.remove('is-open');
  });


  window.addEventListener('resize', () => {
    if (picker?.classList.contains('is-open')) {
      positionDropdown(picker, toggle);
    }
  });
}










// The date inputs hold LOCAL time ("2026-10-17T19:00", no offset).
// Convert to real UTC before sending, so the server never has to guess the timezone.
function localToUtcISO(localStr) {
  const d = new Date(localStr);            // no offset in the string = parsed as local time
  return isNaN(d) ? localStr : d.toISOString();   // "2026-10-17T18:00:00.000Z"
}

function snapTo30Minutes(date) {
  const d = new Date(date);

  d.setSeconds(0, 0);

  const m = d.getMinutes();

  if (m < 15) {
    d.setMinutes(0);
  } else if (m < 45) {
    d.setMinutes(30);
  } else {
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
  }

  return d;
}



function initSprintDates({
  startOffsetMinutes = 10,
  durationDays = 14
} = {}) {

  const startDisplay = document.querySelector('[name="start_date_display"]');
  const endDisplay = document.querySelector('[name="end_date_display"]');
  const startISO = document.getElementById('start_date_iso');
  const endISO = document.getElementById('end_date_iso');
  const tzLabel = document.querySelector('.timezone-label');

  const previewStart = document.getElementById('timezone-start');
  const previewEnd = document.getElementById('timezone-end');

  if (!startISO || !endISO) return;

  const now = new Date();

  const startDate = new Date(now.getTime() + startOffsetMinutes * 60 * 1000);
  const endDate = new Date(
    startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
  );

  const displayFormat = (date) =>
    date.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

  const previewFormat = (date) =>
    date.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

  const isoFormatLocal = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      date.getFullYear() + "-" +
      pad(date.getMonth() + 1) + "-" +
      pad(date.getDate()) + "T" +
      pad(date.getHours()) + ":" +
      pad(date.getMinutes())
    );
  };

  if (startDisplay) startDisplay.value = displayFormat(startDate);
  if (endDisplay) endDisplay.value = displayFormat(endDate);

  startISO.value = isoFormatLocal(startDate);
  endISO.value = isoFormatLocal(endDate);

  if (previewStart) previewStart.textContent = previewFormat(startDate);
  if (previewEnd) previewEnd.textContent = previewFormat(endDate);

  if (tzLabel) {
    tzLabel.textContent =
      "Timezone: " + Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

  function createSprint(prefillData = null) {
    const url = new URL(window.location.href);
    url.searchParams.set("open", "sprint");
    history.replaceState({}, "", url);

    const isMobile = window.innerWidth <= 991;

    if (isMobile) {
      let url = `/sprint_create?community_id=${communityId}`;
   

      fetch(url, { credentials: 'include' })
        .then(r => {
          if (!r.ok) throw new Error("Failed to load sprint_create");
          return r.text();
        })
        .then(html => {
          const wrapper = document.querySelector('.main-wrapper');
          wrapper.innerHTML = html;

        initOrionColorPicker();
        initSprintDates();
        initSprintDatePickers();
        initLiveTextPreview();
        initPayDistributionUI();
        window.RewardTiers.init();      // reward tiers slot
        Savehanler();
        setupSprintValidation();



        })
        .catch(err => {
          console.error("❌ Mobile sprint error:", err);
          alert("Could not load sprint planner.");
        });

      return;
    }



    const panel = document.getElementById('rightPanel');
    const leftPanel = document.getElementById('leftPanel');

    document.querySelector('.main-wrapper').classList.add('sprint-mode');

    if (window.innerWidth <= 900) {
      document.querySelector('.main-wrapper').style.flexDirection = 'column';
      panel.style.borderRadius = '0';
    }

    panel.classList.add('fade-out');
    panel.classList.add('sprint-mode');

    setTimeout(() => {
  
      let url = `/sprint_create?community_id=${communityId}`;
   

      console.log("🔍 Sprint fetch URL:", url);

      Promise.all([
        fetch(url).then(r => { if (!r.ok) throw new Error("Failed to load sprint_create"); return r.text(); }),
        fetch('/live_view').then(r => { if (!r.ok) throw new Error("Failed to load live_view"); return r.text(); })
      ])
      .then(([sprintHtml, liveHtml]) => {
        panel.innerHTML = sprintHtml;
        panel.classList.remove('fade-out');

        leftPanel.innerHTML = liveHtml;

   
        initOrionColorPicker();
        initSprintDates();
        initSprintDatePickers();
        initLiveTextPreview();
        initPayDistributionUI();
        window.RewardTiers.init();      // reward tiers slot
        Savehanler();

        setupSprintValidation();
        


      })
      .catch(err => {
        alert("Failed to load sprint planner.");
        console.error("❌ Load Error:", err);
      });

    }, 300);



  }


  function setupSprintValidation() {
    const saveBtn = document.getElementById("saveBtn");
    if (!saveBtn) return;

    const titleInput = document.getElementById("title");
    const startDateInput = document.getElementById("start_date_iso");
    const endDateInput = document.getElementById("end_date_iso");
    const distributionInputs = document.querySelectorAll('input[name="distribution"]');

    function validateForm() {
      const title = titleInput.value.trim();
      const startDate = startDateInput.value;
      const endDate = endDateInput.value;

      const distributionRequired = distributionInputs.length > 0;
      const distributionChecked = document.querySelector('input[name="distribution"]:checked');

      // when "Platform distribution" is picked the reward tiers must be valid too
      // (an empty wallet does NOT count as invalid, see RewardTiers.isValid)
      const tiersOk = window.RewardTiers ? window.RewardTiers.isValid() : true;

      const isValid =
        title &&
        startDate &&
        endDate &&
        (!distributionRequired || distributionChecked) &&
        tiersOk;

      if (isValid) {
        saveBtn.classList.remove("disable");
      } else {
        saveBtn.classList.add("disable");
      }
    }

    titleInput.addEventListener("input", validateForm);
    startDateInput.addEventListener("change", validateForm);
    endDateInput.addEventListener("change", validateForm);
    distributionInputs.forEach(radio =>
      radio.addEventListener("change", validateForm)
    );

    // re-check whenever the tiers change (replace the old listener from a previous open)
    if (window.__sprintValidate) {
      window.removeEventListener("reward-tiers:change", window.__sprintValidate);
    }
    window.__sprintValidate = validateForm;
    window.addEventListener("reward-tiers:change", validateForm);

    validateForm();
  }

  function Savehanler() {
    const SaveBtn = document.getElementById("saveBtn");
    if (!SaveBtn) return;

    SaveBtn.addEventListener("click", async function () {

      const saveBtn = this;
      if (saveBtn.disabled || saveBtn.classList.contains("disable")) {
        return;
      }

      const distribution =
        document.querySelector('input[name="distribution"]:checked')?.value || null;

      if (distribution === "pay_to_creator" && !window.RewardTiers.isValid()) {
        showError("Fill in every reward rank and keep the total within your wallet balance.");
        return;
      }

      const payload = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        rewards: document.getElementById("rewards").value.trim(),
        end_zone: document.getElementById("end_zone").value || null,
        color: window.selectedColor || null,
        distribution: distribution,
        // [{ from, to, amount_zat }]  amount_zat = per winner, in zatoshi (string)
        // empty list when the wallet is empty
        reward_tiers: distribution === "pay_to_creator" ? window.RewardTiers.getTiers() : [],
        start_date: localToUtcISO(document.getElementById("start_date_iso").value),
        end_date: localToUtcISO(document.getElementById("end_date_iso").value)
      };

      saveBtn.disabled = true;

      try {
        const res = await fetch(`/${communitySlug}/sprints/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        saveBtn.disabled = false;

        if (!res.ok) {
          showError(data.message || "Something went wrong.");
          return;
        }

        showSuccess(data.message || "Sprint created successfully.");

        setTimeout(async () => {

          await refreshCommunityNav(communitySlug); 

          loadMainSettingsSection(data.redirect_url);

        }, 700);

      } catch (err) {
        saveBtn.disabled = false;
        showError("Network error. Please try again.");
      }
    });
  }


 

const modal = document.getElementById("activity-modal");
const modalContent = modal.querySelector(".activity-content");
if(window.innerWidth >= 768) {

  modal.addEventListener("mouseenter", () => {
    isHoveringModal = true;
    clearTimeout(hideTimeout);
  });


  modal.addEventListener("mouseleave", () => {
    isHoveringModal = false;
    scheduleHide();
  });
} else {
  modal.addEventListener("click", (e) => {
    const isMobile = window.innerWidth <= 767;

    if (isMobile && e.target === modal) {
      hideActivity();
    }
  });  
}



function timeAgo(date) {

  const parsedDate = new Date(date.endsWith("Z") ? date : date + "Z");

  const seconds = Math.floor((Date.now() - parsedDate.getTime()) / 1000);

  const intervals = [
    {label:"year", secs:31536000},
    {label:"month", secs:2592000},
    {label:"day", secs:86400},
    {label:"hour", secs:3600},
    {label:"minute", secs:60},
    {label:"second", secs:1}
  ];

  for (const i of intervals){
    const count = Math.floor(seconds / i.secs);
    if(count >= 1){
      return `${count}${i.label[0]} ago`;
    }
  }

  return "just now";
}

/* ==========================================================
   Desktop profile hover card placement
   The card must stay INSIDE the main left panel (#leftPanel):
   - starts next to the cursor
   - flips to the left of the cursor if there is no room on the right
   - flips above the cursor if there is no room below
   - then gets clamped so it can never cross the panel edges
   (mobile uses the fixed full-screen layout from the CSS)
   ========================================================== */
function placeActivityModal(position) {
  if (window.innerWidth <= 767 || !position) return;

  const panel = document.getElementById("leftPanel");
  const bounds = panel
    ? panel.getBoundingClientRect()
    : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

  const gap = 12;       // breathing room from the panel edges
  const offset = 12;    // distance from the cursor

  const w = modal.offsetWidth;
  const h = modal.offsetHeight;

  let left = position.x + offset;
  let top = position.y + offset;

  // no room on the right of the cursor -> open to its left
  if (left + w > bounds.right - gap) {
    left = position.x - w - offset;
  }

  // vertical: never jump above the cursor. Start at the cursor and, if the
  // card is taller than the space below, only slide it up by the overflow
  // (the clamp below), so it stays as low as the panel allows.

  // final safety clamp, always inside the panel
  left = Math.max(bounds.left + gap, Math.min(left, bounds.right - w - gap));
  top = Math.max(bounds.top + gap, Math.min(top, bounds.bottom - h - gap));

  modal.style.left = left + "px";
  modal.style.top = top + window.scrollY + "px";
}

async function showUserActivity(username, position) {

  const isMobile = window.innerWidth <= 767;
  const requestId = ++activityRequestId;

  modal.classList.add("profile-mode");

  modalContent.innerHTML = `
    <div class="activity-loading">
      ${fetchingSvg}
    </div>
  `;

  modal.classList.remove("hidden");

  if (!isMobile && position) {
    placeActivityModal(position);
  }

  try {
    const res = await fetch(`/api/${communitySlug}/user/${username}/activity`);
    const data = await res.json();

    if (requestId !== activityRequestId) return;

    renderUserActivity(data, isMobile, position);

  } catch (err) {
    if (requestId !== activityRequestId) return;
    modalContent.innerHTML = `<div class="error">Failed to load</div>`;
  }
}


function activityItemHtml(act, data) {
  if (act.type === "admin_xp_action") {
    const sign = act.xp > 0 ? "+" : "";
    const xpClass = act.xp > 0 ? "activity-xp" : "activity-xp negative";

    return `
      <div class="activity-item">
        <div class="activity-left">
          ${act.message}
          <span class="activity-time-inline">${timeAgo(act.completed_at)}</span>
        </div>
        <div class="${xpClass}">${sign}${act.xp} XP</div>
      </div>
    `;
  }

  const actor = data.is_current_user ? "You" : data.username;

  return `
    <div class="activity-item">
      <div class="activity-left">
        <span class="activity-user">${actor}</span>
        completed
        <span class="activity-quest">${act.subquest_name}</span>
        <span class="activity-time-inline">${timeAgo(act.completed_at)}</span>
      </div>
      ${act.xp !== null ? `<div class="activity-xp">+${act.xp} XP</div>` : ``}
    </div>
  `;
}


function buildActivityCard(data, isMobile) {
  const bg = getColor(data.user_id);
  const textColor = getTextColor(bg);

  const hasBanner = data.banner && data.banner.trim() !== "";
  const hasImage = data.image && data.image.trim() !== "";

  const progress = data.next_level_xp > 0
    ? Math.min(100, Math.max(0, (data.current_xp / data.next_level_xp) * 100))
    : 0;

  const bannerHtml = `
    <div class="act-banner${hasBanner ? " has-banner" : ""}"
         style="--b1:${bg}; --b2:${textColor}; --b3:#4888f0;">
      <div class="act-banner-media">
        <div class="act-banner-art" aria-hidden="true">
          <i class="act-blob ab1"></i><i class="act-blob ab2"></i><i class="act-blob ab3"></i>
          <span class="act-banner-sheen"></span>
        </div>
        ${hasBanner ? `<img class="act-banner-img" src="${data.banner}" alt="${data.username} banner">` : ``}
        <div class="act-banner-shade"></div>
      </div>
      ${
        isMobile
          ? `<button class="act-back-btn" id="activityBackBtn" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg> Back
            </button>`
          : ``
      }
    </div>
  `;

  const rolesHtml = `
    <div class="act-roles">
      <span class="role-core">${data.core_role}</span>
      ${data.extra_roles.map(r =>
        `<span class="role-extra" style="background:${r.color}">${r.name}</span>`
      ).join("")}
    </div>
  `;

  const headHtml = `
    <div class="act-head">
      <div class="act-avatar" style="background:${bg}; color:${textColor};">
        ${
          hasImage
            ? `<img src="${data.image}" alt="${data.username}">`
            : `<span>${data.username[0].toUpperCase()}</span>`
        }
      </div>
      <div class="act-meta">
        <div class="act-username">${data.username}</div>
        ${rolesHtml}
      </div>
    </div>
  `;

  const activitiesHtml = data.activities.length === 0
    ? `<div class="no-activity">No activity yet</div>`
    : data.activities.map(act => activityItemHtml(act, data)).join("");

  return `
    <div class="act-card">
      ${bannerHtml}
      ${headHtml}
      <div class="act-body">
        <div class="act-level">
          <div class="act-level-row">
            <span class="act-level-label">Level ${data.level}</span>
            <span class="act-level-progress">${data.current_xp} / ${data.next_level_xp} XP</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="act-activities">
          <div class="recent-activity-title">Recent activity</div>
          <div class="act-activity-list">${activitiesHtml}</div>
        </div>
      </div>
    </div>
  `;
}


function renderUserActivity(data, isMobile, position) {

  modalContent.innerHTML = buildActivityCard(data, isMobile);

  if (isMobile) {
    const backBtn = document.getElementById("activityBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", hideActivity);
    }
  } else {
    // the card is taller now than the loading spinner was, so place it again
    requestAnimationFrame(() => placeActivityModal(position));
  }
}


function hideActivity(){
  modal.classList.add("hidden");
}

 
function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => modal.remove(), 200);
}

function openExportModal({ scope = "all", sprintUuid = null } = {}) {
  document.getElementById("exportModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "exportModal";
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-glass" id="exportModalInner">
      <div class="export-loading"><div class="export-spinner"></div></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.classList.add("show");

  modal.onclick = (e) => {
    if (e.target === modal) closeExportModal();
  };

  const inner = modal.querySelector("#exportModalInner");

  fetch(`/api/${communitySlug}/export-info`, { credentials: "include" })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load your plan.");
      renderExportForm(inner, data, { scope, sprintUuid });
    })
    .catch((err) => {
      inner.innerHTML = `
        <h3>Export leaderboard</h3>
        <p class="export-error" id="exportLoadError"></p>
        <div class="modal-actions push-downer">
          <button class="btn-outline" id="exportCloseBtn">Close</button>
        </div>
      `;
      inner.querySelector("#exportLoadError").textContent = err.message;
      inner.querySelector("#exportCloseBtn").onclick = closeExportModal;
    });
}

function renderExportForm(inner, info, { scope, sprintUuid }) {
  const cap = info.max_export;
  const unlimited = cap === null || cap === undefined;
  const total = exportTotalCount || 0;

  const maxAllowed = unlimited ? total : Math.min(cap, total);
  const capLabel = unlimited ? "Unlimited" : cap.toLocaleString();

  const title = scope === "sprint" ? "Export sprint leaderboard" : "Export leaderboard";

  const limitNote = unlimited
    ? `Your ${info.plan_label} plan has no export limit.`
    : `Your ${info.plan_label} plan can export up to ${cap.toLocaleString()} members.`;

  const overCapNote = !unlimited && total > cap
    ? ` This leaderboard has ${total.toLocaleString()} participants, so only the top ${cap.toLocaleString()} can be exported. Upgrade to export more.`
    : "";

  inner.innerHTML = `
    <h3>${title}</h3>
    <p>${limitNote}${overCapNote}</p>

    <input type="number" id="exportCount" class="export-input"
           min="1" ${maxAllowed ? `max="${maxAllowed}"` : ""}
           placeholder="How many top members to export"
           value="${maxAllowed || ""}" />
    <div class="export-counter" id="exportCounter"></div>

    <p class="export-error" id="exportError" style="display:none;"></p>

    <div class="modal-actions push-downer export">
      <button class="btn-outline" id="exportCancelBtn">Cancel</button>
      <button id="exportConfirmBtn" class="export-btn-comfirm">Export</button>
    </div>
  `;

  const input = inner.querySelector("#exportCount");
  const counter = inner.querySelector("#exportCounter");
  const confirmBtn = inner.querySelector("#exportConfirmBtn");
  const cancelBtn = inner.querySelector("#exportCancelBtn");
  const errorEl = inner.querySelector("#exportError");

  let isSending = false;

  function validate() {
    const n = parseInt(input.value, 10);
    const hasValue = Number.isInteger(n) && n > 0;
    const overCap = !unlimited && hasValue && n > cap;
    const overTotal = hasValue && total > 0 && n > total;

    counter.textContent = `${hasValue ? n.toLocaleString() : 0}/${capLabel}`;
    counter.classList.toggle("over", overCap);
    input.classList.toggle("invalid", overCap || overTotal);

    if (overCap) {
      errorEl.textContent = `Your plan can only export ${cap.toLocaleString()} members.`;
      errorEl.style.display = "block";
    } else if (overTotal) {
      errorEl.textContent = `There are only ${total.toLocaleString()} participants.`;
      errorEl.style.display = "block";
    } else {
      errorEl.style.display = "none";
    }

    confirmBtn.classList.toggle("valid", hasValue && !overCap && !overTotal && total > 0);
  }

  function setSending(state) {
    isSending = state;
    input.disabled = state;
    cancelBtn.disabled = state;
    confirmBtn.textContent = state ? "Sending…" : "Export";
    confirmBtn.style.opacity = state ? "0.7" : "";
    confirmBtn.style.pointerEvents = state ? "none" : "";
  }

  input.addEventListener("input", validate);
  validate();

  cancelBtn.onclick = closeExportModal;

  confirmBtn.onclick = async () => {
    if (isSending) return;

    if (total === 0) {
      showError("Nothing to export yet.");
      return;
    }

    if (!confirmBtn.classList.contains("valid")) return;

    const count = parseInt(input.value, 10);

    setSending(true);

    try {
      const res = await fetch(`/api/${communitySlug}/export`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
          count,
          sprint_uuid: scope === "sprint" ? sprintUuid : null
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSending(false);
        showError(data.message || "Something went wrong. Please try again.");
        return;
      }

      closeExportModal();
      showSuccess(data.message || "Export sent to your email.");

    } catch (err) {
      console.error("Export failed:", err);
      setSending(false);
      showError("Network error. Please try again.");
    }
  };
}

function initExportButton() {
  const btn = document.getElementById("exportBtn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    if (!exportTotalCount) {
      showError("Nothing to export yet.");
      return;
    }

    openExportModal({
      scope: btn.dataset.scope || "all",
      sprintUuid: btn.dataset.sprintUuid || null,
    });
  });
}



function checkOpenSprintFromURL() {
  const params = new URLSearchParams(window.location.search);
  __CURRENT_PATH__ = null;
  const open = params.get("open");

  if (open === "sprint") {
    createSprint();
  }
}



  checkOpenSprintFromURL();
  initExportButton();
  window.createSprint = createSprint;
  window.openExportModal = openExportModal;
  window.LeaderboardModule = {
    init: loadLeaderboard
  };

})();