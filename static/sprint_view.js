(function () {
let hoverTimeout = null;
let hideTimeout = null;
let isHoveringTrigger = false;
let isHoveringModal = false;

// ── pagination state ──────────────────────────────────
const INITIAL_LIMIT = 30;
const PAGE_SIZE = 15;
const SCROLL_THRESHOLD = 250; // px from bottom before triggering next load

let currentOffset = 0;
let hasMore = true;
let isLoadingMore = false;
let scrollContainer = null;
let rewardDividerInserted = false; // 🔒 must survive across page fetches — only reset on full reload

// ── tie-badge tracking ──────────────────────────────────
// ties can span across pages (e.g. last row of page 1 and first row of
// page 2 have equal xp), so all of this has to be module-level, not
// local to one render call — same reasoning as rewardDividerInserted above.
let lastRankedUser = null;   // { xp } of the most recently rendered row
let lastRankedRowEl = null;  // the <li> for that row
let tieGroupStartRowEl = null; // the <li> that already got the badge for the CURRENT streak of ties


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
    return adjustColor(bgColor, -60); // darker
  } else {
    return adjustColor(bgColor, 60); // lighter
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
  // move the <li> children directly into the list, keep the wrapper
  // out of the DOM tree so it doesn't break <ul> semantics
  const rows = Array.from(wrap.children);
  rows.forEach(row => list.appendChild(row));
  return rows; // so caller can remove exactly these once real data arrives
}

const starsvg = `<svg viewBox="0 0 24 24" width="14" height="14" style="margin-right: 5px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" />
</svg>`;

// pill badge — placed on the FIRST (higher-ranked) row of a tied-xp
// streak, since that's the user who reached this xp amount first and
// therefore wins the tiebreak against everyone else in the group.
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

  // ── tie detection against the immediately-preceding rendered row ──
  // (works across page boundaries since lastRankedUser/lastRankedRowEl
  // are module-level, not reset per page fetch)
  if (lastRankedUser && lastRankedUser.xp === user.xp) {
    if (!tieGroupStartRowEl) {
      // this is the FIRST time we've noticed this streak of ties —
      // badge goes on the PREVIOUS row (the top of the tied group),
      // not this one
      const prevInfo = lastRankedRowEl.querySelector(".participant-info");
      const prevXpEl = lastRankedRowEl.querySelector(".participant-xp");
      if (prevInfo && prevXpEl && !lastRankedRowEl.dataset.tieBadgeAdded) {
        prevInfo.insertBefore(makeTieBadge(lastRankedUser.xp), prevXpEl);
        lastRankedRowEl.dataset.tieBadgeAdded = "1";
      }
      tieGroupStartRowEl = lastRankedRowEl;
    }
    // else: already badged the top of this group — later tied rows get nothing
  } else {
    // xp changed — any tie streak that was running has ended
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

// renders a page of users into the list, appending (not replacing).
// `endZone` uses each user's absolute `rank` (from the backend) rather
// than a local loop index, so the divider still lands in the right
// place regardless of which page it falls on.
//
// 🔥 rewardDividerInserted is a MODULE-LEVEL flag, not local to this call —
// this function runs once per page fetch (initial load + every scroll load),
// so a locally-scoped flag would reset every time and re-insert the divider
// on every subsequent page. It only resets in loadLeaderboardSprint() on a
// full reload.
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
  // this is the element with the calc()'d height / overflow set
  // elsewhere in the app (see updateInfoBottomHeight)
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
    // allow retry on next scroll rather than permanently giving up
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

  // reset pagination + tie-tracking state on (re)load
  currentOffset = 0;
  hasMore = true;
  isLoadingMore = false;
  rewardDividerInserted = false;
  lastRankedUser = null;
  lastRankedRowEl = null;
  tieGroupStartRowEl = null;

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

    // ✅ use the backend's true total, not the length of just this page —
    // users.length only ever reflects the first INITIAL_LIMIT rows, so it
    // was never the real participant count once a sprint grew past 30.
    if (participantsCount) {
      const totalCount = typeof data.total_count === "number" ? data.total_count : users.length;
      participantsCount.textContent = `${totalCount} participants`;
    }
    // EMPTY LEADERBOARD
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

    // wire up infinite scroll once, against whichever container actually scrolls
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
  
  const panel = document.getElementById('announcementPanel');
  const overlay = document.getElementById('mobileOverlay');
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  window.toggleAnnouncement=toggleAnnouncement
  function toggleAnnouncement() {
    if (window.innerWidth <= 991) {
      panel.classList.toggle('show');
      overlay.classList.toggle('active');

      // ✅ Add/remove scroll lock cleanly
      if (panel.classList.contains('show')) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }

      toggleIcon.classList.toggle('hidden');
    } else {
      panel.classList.toggle('show');
    }
  }

  function closeAnnouncement() {
    panel.classList.remove('show');
    overlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
    document.querySelector('.toggle-icon').classList.remove('hidden');
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnnouncement();
  });


  const detailsReward = panel?.querySelector(".details-reward");


  function closeAnnouncement() {
    panel.classList.remove("show");
    document.body.classList.remove("no-scroll");

    // 🔥 instantly reset scroll
    if (detailsReward) {
      detailsReward.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" // no animation
      });
    }
  }



  const dragHandle = document.getElementById("dragHandle");
  let startY = 0;
  let currentY = 0;
  let draggingY = false;

  dragHandle.addEventListener("touchstart", (e) => {
    e.preventDefault();
    draggingY = true;
    startY = e.touches[0].clientY;
  });

  dragHandle.addEventListener("touchmove", (e) => {
    if (!draggingY) return;

    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      panel.style.transform = `translateY(${deltaY}px)`;
    }
  });

  dragHandle.addEventListener("touchend", () => {
    if (!draggingY) return;

    const deltaY = currentY - startY;
    draggingY = false;
    panel.style.transform = "";

    if (deltaY > 80) {
      closeAnnouncement(); // 🔥 scroll reset happens here
    }
  });



 
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

    // sprint date range
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
        // ✅ SPRINT ENDED (HTML)
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
    document.body.appendChild(tooltip);

    let visible = false;

    function positionTooltip() {
        if (!visible || !tooltip || !wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        if (!rect || tooltip.offsetHeight === 0) return;

        tooltip.style.top =
        `${rect.top - tooltip.offsetHeight - 8}px`;
        tooltip.style.left =
        `${rect.right - tooltip.offsetWidth}px`;
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
        tooltip.style.transform = "translateY(4px)";
    });

    window.addEventListener("scroll", positionTooltip, true);
    window.addEventListener("resize", positionTooltip);

        function isMobile() {
        return window.innerWidth < 750;
        }


 
    const wrapperSpr = document.getElementById("edit-button-wrapper");
    if (!wrapperSpr) return; // no button in DOM

    const endDate = new Date(wrapperSpr.dataset.sprintEnd);
    const hasEnded = wrapperSpr.dataset.hasEnded === "true";

    // Hide immediately if backend already marked ended
    if (hasEnded) {
        wrapperSpr.remove();
        return;
    }



    // Timer check
    let timer; // ✅ declare before use
    function checkSprintEnded() {
        const now = new Date();
        if (now >= endDate) {
        wrapperSpr.remove();
        clearInterval(timer);
        }
    }

    checkSprintEnded(); // initial run
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

async function showUserActivity(username, position) {

  const isMobile = window.innerWidth <= 767;

  // 👉 show loader instantly
  modalContent.innerHTML = `
    <div class="activity-loading">
      ${fetchingSvg}
    </div>
  `;

  modal.classList.remove("hidden");

  // 👉 position only for desktop
  if (!isMobile && position) {
    const offset = 12;
    modal.style.top = position.y + window.scrollY + offset + "px";
    modal.style.left = position.x + offset + "px";
  }

  try {
    const res = await fetch(`/api/${communitySlug}/user/${username}/activity`);
    const data = await res.json();

    renderUserActivity(data, isMobile, position);

  } catch (err) {
    modalContent.innerHTML = `<div class="error">Failed to load</div>`;
  }
}



function renderUserActivity(data, isMobile, position) {

  modalContent.innerHTML = "";

  if (isMobile) {

    const progress = (data.current_xp / data.next_level_xp) * 100;

    modalContent.innerHTML = `
    <div class="mobile-user-card">

      <!-- 🔥 TOP BAR -->
      <div class="mobile-top-bar">
        <button class="back-btn-modalinit" id="activityBackBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6L9 12L15 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
          </svg> Back
        </button>
      </div>

      <!-- USER -->
      <div class="mobile-user-header">
        ${
          data.image && data.image.trim() !== ""
            ? `<img class="mobile-avatar" src="${data.image}" alt="${data.username}">`
            : `<div class="mobile-avatar mobile-avatar-fallback"
                    style="display:flex;align-items:center;justify-content:center;
                          background:${getColor(data.user_id)};
                          color:${getTextColor(getColor(data.user_id))};
                          font-weight:500;">
                ${data.username[0].toUpperCase()}
              </div>`
        }

        <div class="mobile-user-meta">
          <div class="mobile-username">${data.username}</div>
        </div>
      </div>

      <!-- XP -->
      <div class="init-fillere">
        <div class="mobile-level-row">
          <span class="mobile-level-label">Level ${data.level}</span>
          <span class="mobile-level-progress">
            ${data.current_xp} / ${data.next_level_xp}XP
          </span>
        </div>

        <div class="xp-bar">
          <div class="xp-fill" style="width:${progress}%"></div>
        </div>
      </div>

      <!-- ROLES -->
      <div class="mobile-roles">
        <span class="role-core">${data.core_role}</span>

        ${data.extra_roles.map(r =>
          `<span class="role-extra" style="background:${r.color}">
            ${r.name}
          </span>`
        ).join("")}
      </div>

      <!-- ACTIVITY -->
      <div class="iner-llebei">
        <div class="recent-activity-title">
          Recent activity
        </div>

        ${
          data.activities.length === 0
            ? `<div class="no-activity">No activity yet</div>`
            : data.activities.map(act => {

                const actor = data.is_current_user ? "You" : data.username;

                return `
                <div class="activity-item">

                  <div class="activity-left">
                    <span class="activity-user">${actor}</span>
                    completed
                    <span class="activity-quest">${act.subquest_name}</span>
                    <span class="activity-time-inline">
                      ${timeAgo(act.completed_at)}
                    </span>
                  </div>

                  ${
                    act.xp !== null
                      ? `<div class="activity-xp">+${act.xp} XP</div>`
                      : ``
                  }

                </div>
                `;

              }).join("")
        }
      </div>

    </div>
    `;

    // ✅ attach back button AFTER render
    const backBtn = document.getElementById("activityBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", hideActivity);
    }

  } else {

    if (data.activities.length === 0) {

      const empty = document.createElement("div");
      empty.className = "no-activity";
      empty.textContent = "No activity yet";

      modalContent.appendChild(empty);

    } else {
      
      data.activities.forEach(act => {

        const text = data.is_current_user
          ? `You completed ${act.subquest_name}`
          : `${data.username} completed ${act.subquest_name}`;

        const div = document.createElement("div");
        div.className = "activity-item";

        div.innerHTML = `
          <div class="activity-left">
            ${text}
            <span class="activity-time-inline">
              ${timeAgo(act.completed_at)}
            </span>
          </div>

          ${
            act.xp !== null
              ? `<div class="activity-xp">+${act.xp} XP</div>`
              : ``
          }
        `;

        modalContent.appendChild(div);

      });

    }

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