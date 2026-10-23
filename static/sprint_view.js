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
let rewardDividerInserted = false;

let exportTotalCount = 0;

let lastRankedUser = null;
let lastRankedRowEl = null;
let tieGroupStartRowEl = null;

let rewardTiers = [];
let rewardCurrency = "ZEC";

const zecSvg = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5h7l-7 7h7"/><path d="M12 6v2.5M12 15.5V18"/></svg>`;

function loadRewardTiers() {
  rewardTiers = [];
  rewardCurrency = "ZEC";

  const el = document.getElementById("rewardTiersData");
  if (!el) return;

  try {
    const parsed = JSON.parse(el.textContent);
    rewardTiers = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    rewardTiers = [];
  }

  rewardCurrency = el.dataset.currency || "ZEC";
}

function prizeForRank(rank) {
  const r = Number(rank);
  if (!r) return null;

  for (const t of rewardTiers) {
    if (r >= t.from && r <= t.to) return t;
  }

  return null;
}

function prizeAmount(tier) {
  return String(tier.per_winner).trim().split(" ")[0];
}

function getColor(id) {
  const colors = [
    '#FF6F61','#6B5B95','#88B04B','#F7CAC9',
    '#92A8D1','#955251','#B565A7','#009B77',
    '#DD4124','#45B8AC'
  ];
  return colors[id % colors.length];
}

function scheduleHide() {
  clearTimeout(hideTimeout);

  hideTimeout = setTimeout(() => {
    if (!isHoveringTrigger && !isHoveringModal) {
      hideActivity();
    }
  }, 150);
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

const starsvg = `<svg viewBox="0 0 24 24" width="14" height="14" style="margin-right: 5px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" />
</svg>`;

function makeTieBadge(xp) {
  const badge = document.createElement("span");
  badge.className = "tie-first-badge";
  badge.style.cssText = `
    display:inline-flex;align-items:center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid #e5e7eb19;
    padding:3px 10px;
    border-radius:999px;
    font-size:11.5px;
    font-weight:550;
    color:#c9ccd6;
    white-space:nowrap;
  `;
  badge.innerHTML = `${starsvg}First to ${xp.toLocaleString()}XP`;
  return badge;
}

function renderUserRow(user, endZoneReached) {
  const li = document.createElement("li");
  li.className = "participant-item";

  const hasImage = user.image && user.image.trim() !== "";
  const bg = getColor(user.user_id);
  const textColor = getTextColor(bg);

  const tier = prizeForRank(user.rank);
  const prizeHtml = tier
    ? `<span class="participant-prize">${zecSvg}${prizeAmount(tier)} ${rewardCurrency}</span>`
    : "";

  li.innerHTML = `
      ${
        hasImage
          ? `<img src="${user.image}" class="participant-avatar" alt="${user.username}">`
          : `<div class="participant-avatar" style="background:${bg}; color:${textColor}; font-weight: 500;">${user.username[0].toUpperCase()}</div>`
      }

    <div class="participant-info">
      <span class="participant-name">${user.username}</span>
      <span class="participant-meta">
        ${prizeHtml}
        <span class="participant-xp">${user.xp.toLocaleString()} XP</span>
      </span>
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

  if (lastRankedUser && lastRankedUser.xp === user.xp) {
    if (!tieGroupStartRowEl) {
      const prevInfo = lastRankedRowEl.querySelector(".participant-info");
      const prevMeta = lastRankedRowEl.querySelector(".participant-meta");
      if (prevInfo && prevMeta && !lastRankedRowEl.dataset.tieBadgeAdded) {
        prevInfo.insertBefore(makeTieBadge(lastRankedUser.xp), prevMeta);
        lastRankedRowEl.dataset.tieBadgeAdded = "1";
      }
      tieGroupStartRowEl = lastRankedRowEl;
    }
  } else {
    tieGroupStartRowEl = null;
  }

  lastRankedUser = user;
  lastRankedRowEl = li;

  return li;
}

function makeRewardZoneDivider() {
  const divider = document.createElement("li");
  divider.className = "reward-zone-divider";
  divider.innerHTML = `
    <span class="reward-zone-line"></span>
    <span class="reward-zone-label">
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" fill="currentColor" width="13" height="13" viewBox="0 0 15 15" style="enable-background:new 0 0 15 15;" xml:space="preserve">
      <path d="M6.5,5v2H0V5H6.5z M8.5,5v2H15V5H8.5z M1,8v4.5C1,13.3284,1.6716,14,2.5,14h4V8H1z M8.5,8v6h4c0.8284,0,1.5-0.6716,1.5-1.5  V8H8.5z M10.5,0c-1.4033-0.0444-2.6497,0.8904-3,2.25C7.1497,0.8904,5.9033-0.0444,4.5,0c-1.0709-0.0337-1.9663,0.8072-2,1.8781  C2.4987,1.9187,2.4987,1.9594,2.5,2C2.3443,2.9427,2.9822,3.8331,3.9249,3.9888C4.0853,4.0153,4.2486,4.0191,4.41,4h6.13  c0.9548,0.1497,1.8503-0.5029,2-1.4577c0.0282-0.1797,0.0282-0.3626,0-0.5423c0.0002-1.1046-0.895-2.0002-1.9996-2.0004  C10.5269-0.0004,10.5135-0.0003,10.5,0z M4.5,3c-0.506,0.0463-0.9537-0.3264-1-0.8323C3.4949,2.1119,3.4949,2.0558,3.5,2  C3.4537,1.494,3.8264,1.0463,4.3323,1C4.3881,0.9949,4.4442,0.9949,4.5,1c1.1046,0,2,0.8954,2,2H4.5z M10.5,3h-2  c0-1.1046,0.8954-2,2-2c0.5523,0,1,0.4477,1,1c0.0463,0.506-0.3264,0.9537-0.8323,1C10.6119,3.0051,10.5558,3.0051,10.5,3z"/>
      </svg>
      End of reward zone
    </span>
    <span class="reward-zone-line"></span>
  `;
  return divider;
}

function appendUsersToList(list, users, endZone) {
  const showZone = !isNaN(endZone) && endZone > 0;

  users.forEach((user) => {
    if (showZone && !rewardDividerInserted && user.rank > endZone) {
      list.appendChild(makeRewardZoneDivider());
      rewardDividerInserted = true;
    }
    list.appendChild(renderUserRow(user));
  });
}

function getScrollContainer() {
  if (scrollContainer) return scrollContainer;
  scrollContainer = document.querySelector(".info-bottom") || window;
  return scrollContainer;
}


function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => modal.remove(), 200);
}

function openExportModal({ scope = "sprint", sprintUuid = null } = {}) {
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

    const pathParts = window.location.pathname.split("/");
    const sprintUuidFromUrl = pathParts[pathParts.length - 1];

    openExportModal({
      scope: "sprint",
      sprintUuid: btn.dataset.sprintUuid || sprintUuidFromUrl,
    });
  });
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
  const pathParts = window.location.pathname.split("/");
  const sprintId = pathParts[pathParts.length - 1];

  const skeletonRows = appendSkeletonRows(list, PAGE_SIZE);

  try {
    const res = await fetch(
      `/api/${communitySlug}/leaderboard/${sprintId}?offset=${currentOffset}&limit=${PAGE_SIZE}`
    );
    const data = await res.json();

    skeletonRows.forEach(row => row.remove());

    const users = data.leaderboard || [];
    appendUsersToList(list, users, parseInt(data.end_zone, 10));

    currentOffset = data.next_offset;
    hasMore = !!data.has_more;

  } catch (err) {
    console.error("Failed to load more participants:", err);
    skeletonRows.forEach(row => row.remove());
  } finally {
    isLoadingMore = false;
  }
}

async function loadLeaderboardSprint() {

  const list = document.querySelector(".participants-list");
  const emptyMessage = document.querySelector(".empty-message");

  const topRankRow = document.querySelector(".top-rank-row");

  const rankNumber = document.querySelector(".rank-number");
  const rankAvatar = document.querySelector(".rank-avatar");
  const rankUsername = document.querySelector(".rank-username");
  const rankXp = document.querySelector(".rank-xp");

  initExportButton();
  loadRewardTiers();

  currentOffset = 0;
  hasMore = true;
  isLoadingMore = false;
  rewardDividerInserted = false;
  lastRankedUser = null;
  lastRankedRowEl = null;
  tieGroupStartRowEl = null;
  exportTotalCount = 0;

  list.innerHTML = makeSkeletonRows(4);

  const pathParts = window.location.pathname.split("/");
  const sprintId = pathParts[pathParts.length - 1];
  try {

    const res = await fetch(
      `/api/${communitySlug}/leaderboard/${sprintId}?offset=0&limit=${INITIAL_LIMIT}`
    );
    const data = await res.json();


    const users = data.leaderboard;
    const currentUser = data.current_user;
    const participantsCount = document.querySelector(".participants-count");

    const totalCount = typeof data.total_count === "number"
      ? data.total_count
      : (users ? users.length : 0);
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

    appendUsersToList(list, users, parseInt(data.end_zone, 10));

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
          <div class="rank-avatar rank-init"
              style="width:100%;height:100%;border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    background:${bg}; color:${textColor}; font-weight:500;">
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
  

const panel = document.getElementById("announcementPanel");
const detailsReward = panel?.querySelector(".details-reward");
const infoButton = document.getElementById("infoToggleBtn");

if (panel) {
  let overlay = document.getElementById("mobileOverlay");

  // Create the overlay if the HTML does not contain one.
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mobileOverlay";
    document.body.appendChild(overlay);
  }

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.45)",
    zIndex: "9998",
    opacity: "0",
    visibility: "hidden",
    pointerEvents: "none",
    transition: "opacity 220ms ease, visibility 220ms ease"
  });

  panel.style.zIndex = "9999";

  function setInfoIconHidden(hidden) {
    document.querySelectorAll(".diver-svg, .toggle-icon").forEach(el => {
      el.classList.toggle("hidden", hidden);
    });
  }

  function setPanelOpen(open) {
    panel.classList.toggle("show", open);

    if (window.innerWidth <= 991) {
      overlay.classList.toggle("active", open);

      Object.assign(overlay.style, {
        opacity: open ? "1" : "0",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none"
      });

      document.body.classList.toggle("no-scroll", open);
      setInfoIconHidden(open);
    }

    if (!open) {
      panel.style.transform = "";

      if (detailsReward) {
        detailsReward.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant"
        });
      }
    }
  }

  function toggleAnnouncement() {
    setPanelOpen(!panel.classList.contains("show"));
  }

  function closeAnnouncement() {
    setPanelOpen(false);
  }

  window.toggleAnnouncement = toggleAnnouncement;
  window.closeAnnouncement = closeAnnouncement;

  // Clicking the backdrop closes the panel.
  overlay.addEventListener("click", closeAnnouncement);

  // Close when clicking anywhere outside the panel or its toggle button.
  document.addEventListener("pointerdown", e => {
    if (
      window.innerWidth > 991 ||
      !panel.classList.contains("show")
    ) {
      return;
    }

    if (
      !panel.contains(e.target) &&
      !infoButton?.contains(e.target)
    ) {
      closeAnnouncement();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAnnouncement();
  });

  // Mobile drag-to-dismiss using pointer events.
  const dragHandle = document.getElementById("dragHandle");

  if (dragHandle) {
    dragHandle.style.touchAction = "none";
    dragHandle.style.cursor = "grab";

    let startY = 0;
    let currentY = 0;
    let dragging = false;
    let activePointerId = null;

    dragHandle.addEventListener("pointerdown", e => {
      if (window.innerWidth > 991 || e.button !== 0) return;
      if (!panel.classList.contains("show")) return;

      dragging = true;
      activePointerId = e.pointerId;
      startY = e.clientY;
      currentY = startY;

      panel.style.transition = "none";
      dragHandle.style.cursor = "grabbing";

      dragHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    dragHandle.addEventListener("pointermove", e => {
      if (!dragging || e.pointerId !== activePointerId) return;

      currentY = e.clientY;

      const deltaY = Math.max(0, currentY - startY);
      panel.style.transform = `translate3d(0, ${deltaY}px, 0)`;
    });

    function finishDrag(e) {
      if (!dragging || e.pointerId !== activePointerId) return;

      currentY = e.clientY;

      const deltaY = currentY - startY;
      dragging = false;
      activePointerId = null;

      panel.style.transition = "";
      dragHandle.style.cursor = "grab";

      if (deltaY > 80) {
        closeAnnouncement();
      } else {
        panel.style.transform = "";
      }
    }

    dragHandle.addEventListener("pointerup", finishDrag);

    dragHandle.addEventListener("pointercancel", () => {
      dragging = false;
      activePointerId = null;
      panel.style.transition = "";
      panel.style.transform = "";
      dragHandle.style.cursor = "grab";
    });

    dragHandle.addEventListener("lostpointercapture", () => {
      if (!dragging) return;

      dragging = false;
      activePointerId = null;
      panel.style.transition = "";
      panel.style.transform = "";
      dragHandle.style.cursor = "grab";
    });
  }
}



 
    function SprintIntiLeader() {
    function formatLocal(utcString) {
        const date = new Date(utcString);

        const month = date.toLocaleString(undefined, { month: "short" });
        const day = String(date.getDate()).padStart(2, "0");

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";

        hours = hours % 12 || 12;

        return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
    }

    const startEl = document.getElementById("timezone-start");
    const endEl = document.getElementById("timezone-end");

    if (startEl && endEl) {
        startEl.textContent = formatLocal(startEl.dataset.utc);
        endEl.textContent = formatLocal(endEl.dataset.utc);
    }

    const announcement = document.getElementById("announcementStatus");

    if (announcement) {
      const startRaw = announcement.dataset.start;
      const endRaw = announcement.dataset.end;

      const startDate = new Date(startRaw.endsWith("Z") ? startRaw : startRaw + "Z");
      const endDate = new Date(endRaw.endsWith("Z") ? endRaw : endRaw + "Z");

      const now = new Date();

      const start = formatLocal(startDate);
      const end = formatLocal(endDate);

      let status = "";

      if (now < startDate) {
        status = "Starting Soon";
      } else if (now >= startDate && now <= endDate) {
        status = "Currently Live";
      } else {
        status = "Sprint Ended";
      }

      announcement.textContent = `${status} · ${start} – ${end}`;
    }


    const countdownLabel = document.querySelector(".countdown-label");
    const countdown = document.getElementById("countdownTimer");


const start = new Date(startEl.dataset.utc);
const end   = new Date(endEl.dataset.utc);
    console.log(start)
    let intervalId;

    function updateCountdown() {
        const nowUTC = Date.now();
        let target;
        let label;

        if (nowUTC < start.getTime()) {
        target = start;
        label = "Starting in:";
        countdownLabel.textContent = label;
        } 
        else if (nowUTC < end.getTime()) {
        target = end;
        label = "Ends in:";
        countdownLabel.textContent = label;
        } 
        else {
        countdownLabel.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17,24H7.005a4.014,4.014,0,0,1-3.044-1.4,3.94,3.94,0,0,1-.917-3.158A12.522,12.522,0,0,1,7.445,12a12.522,12.522,0,0,1-4.4-7.444A3.94,3.94,0,0,1,3.961,1.4,4.014,4.014,0,0,1,7.005,0H17a4.017,4.017,0,0,1,3.044,1.4,3.943,3.943,0,0,1,.918,3.155A12.556,12.556,0,0,1,16.551,12a12.557,12.557,0,0,1,4.406,7.448,3.944,3.944,0,0,1-.918,3.156A4.017,4.017,0,0,1,17,24ZM17,2H7.005a2.015,2.015,0,0,0-1.528.7,1.921,1.921,0,0,0-.456,1.556c.376,2.5,1.924,4.84,4.6,6.957a1,1,0,0,1,0,1.568C6.945,14.9,5.4,17.242,5.021,19.741A1.921,1.921,0,0,0,5.477,21.3a2.015,2.015,0,0,0,1.528.7H17a2.014,2.014,0,0,0,1.528-.7,1.917,1.917,0,0,0,.456-1.554c-.373-2.487-1.92-4.829-4.6-6.962a1,1,0,0,1,0-1.564c2.681-2.133,4.228-4.475,4.6-6.963A1.916,1.916,0,0,0,18.523,2.7,2.014,2.014,0,0,0,17,2ZM15.681,20H8.318a1,1,0,0,1-.927-1.374,11.185,11.185,0,0,1,3.471-4.272l.518-.412a1,1,0,0,1,1.245,0l.509.406a11.3,11.3,0,0,1,3.473,4.276A1,1,0,0,1,15.681,20Zm-5.647-2h3.928A11.57,11.57,0,0,0,12,16,11.3,11.3,0,0,0,10.034,18Z"/>
            </svg>


            Sprint Ended
        `;

        countdownLabel.classList.add("ended")

        const wrapper = document.getElementById("countdownWrapper");
        if (wrapper && !wrapper.classList.contains("is-hidden")) {
            wrapper.classList.add("is-hidden");
            setTimeout(() => wrapper.remove(), 450);
        }

        clearInterval(intervalId);
        return;
        }

        const diff = target.getTime() - nowUTC;

        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        const nums = countdown.querySelectorAll(".num");
        if (nums.length >= 4) {
        nums[0].textContent = String(days).padStart(2, "0");
        nums[1].textContent = String(hours).padStart(2, "0");
        nums[2].textContent = String(minutes).padStart(2, "0");
        nums[3].textContent = String(seconds).padStart(2, "0");
        }
    }

    updateCountdown();
    intervalId = setInterval(updateCountdown, 1000);


    const wrapper = document.getElementById("edit-button-wrapper");
    if (!wrapper) return;

    let tooltip = document.createElement("span");
    tooltip.className = "tooltip-text";
    tooltip.textContent = "Edit";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(-4px)";
    document.getElementById("inject-main-card").appendChild(tooltip);

    let visible = false;

    function positionTooltip() {
        if (!visible || !tooltip || !wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        if (!rect || tooltip.offsetHeight === 0) return;

        tooltip.style.top = `${rect.bottom + 8}px`;
        tooltip.style.left = `${rect.right - tooltip.offsetWidth}px`;
    }

    wrapper.addEventListener("mouseenter", () => {
        visible = true;
        positionTooltip();
        tooltip.style.opacity = "1";
        tooltip.style.transform = "translateY(0)";
    });

    wrapper.addEventListener("mouseleave", () => {
        visible = false;
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(-4px)";
    });

    window.addEventListener("scroll", positionTooltip, true);
    window.addEventListener("resize", positionTooltip);

        function isMobile() {
        return window.innerWidth < 750;
        }


 
    const wrapperSpr = document.getElementById("edit-button-wrapper");
    if (!wrapperSpr) return;

    const endDate = new Date(wrapperSpr.dataset.sprintEnd);
    const hasEnded = wrapperSpr.dataset.hasEnded === "true";

    if (hasEnded) {
        wrapperSpr.remove();
        return;
    }



    let timer;
    function checkSprintEnded() {
        const now = new Date();
        if (now >= endDate) {
        wrapperSpr.remove();
        clearInterval(timer);
        }
    }

    checkSprintEnded();
    timer = setInterval(checkSprintEnded, 10000); 
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
   The card must stay INSIDE the main left panel:
   - starts next to the cursor
   - flips to the left of the cursor if there is no room on the right
   - flips above the cursor if there is no room below
   - then gets clamped so it can never cross the panel edges
   (mobile uses the fixed full-screen layout from the CSS)
   ========================================================== */
function placeActivityModal(position) {
  if (window.innerWidth <= 767 || !position) return;

  const panelEl =
    document.getElementById("leftPanel") ||
    document.querySelector(".info-left");

  const bounds = panelEl
    ? panelEl.getBoundingClientRect()
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


  loadLeaderboardSprint();

  window.SprintViewinit = {
    init: SprintIntiLeader
  };

})();