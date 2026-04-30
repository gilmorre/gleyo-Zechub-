
function navigateTo(url) {
  window.location.href = url;
}

window.navigateTo = navigateTo



function forceReflow() {
  setTimeout(() => {
    window.scrollTo(0, window.scrollY + 1);
    window.scrollTo(0, window.scrollY - 1);
    document.body.style.minHeight = window.innerHeight + "px";
  }, 50);
}

function handleFocusOut(e) {
  const el = e.target;

  if (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  ) {
      forceReflow();
  }
}

document.addEventListener("focusout", handleFocusOut);


function loadSocketIO() {
  if (window.io) return Promise.resolve();

  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "/static/js/socket.io.js";
    s.onload = resolve;
    document.head.appendChild(s);
  });
}






if (!window.__INAPP_SOCKET__) {
  window.__INAPP_SOCKET__ = true;

  loadSocketIO().then(() => {
    const socket = io({
      transports: ["websocket"],
      withCredentials: true,
      upgrade: false,
      rememberUpgrade: true,
    });

    window.__SOCKET__ = socket;

    socket.on("connect", () => {
      console.log("🔌 In-app socket connected:", socket.id);
    });

    socket.on("community_notification", (payload) => {
      const active = window.CurrentActiveChat;

      if (!active || !active.communityId) {
        showTopCommunityModal(payload);
        return;
      }

      const sameCommunity =
        String(active.communityId) === String(payload.community_id);

      const isSameChannelChat =
        sameCommunity &&
        payload.channel_uuid &&
        active.channelUuid &&
        active.channelUuid === payload.channel_uuid;

      // ✅ ticket match (only if BOTH exist)
      const isSameTicketChat =
        sameCommunity &&
        payload.ticket_uuid &&
        active.ticketUuid &&
        active.ticketUuid === payload.ticket_uuid;

      // 🚫 ONLY block when exact match
      if (isSameChannelChat || isSameTicketChat) {
        return;
      }

      showTopCommunityModal(payload);
    });

    socket.on("online_count_update", (data) => {
      const el = document.getElementById("liveCount");
      if (el) el.textContent = data.count;
    });
  });
}
function getCommunitySlug() {
  const path = window.location.pathname.split("/").filter(Boolean);
  return path.length ? path[0] : null;
}

function isPreviewCommunity() {
  const slug = getCommunitySlug();
  return slug === "chat"; 
}


function openFromNotification(data) {
  const {
    community_id,
    community_slug,
    channel_uuid
  } = data;

  // 🔁 If different community → switch it
  if (CurrentActiveChat.communityId !== community_id) {
    const communityEl = document.querySelector(
      `.logo-communities[data-community-id="${community_id}"]`
    );

    if (communityEl) {
      communityEl.click(); // triggers your existing switch logic
    }
  }

  // ⏳ Wait for channels to render, then open
  setTimeout(() => {
    const ch = document.querySelector(
      `.channel[data-channel-uuid="${channel_uuid}"]`
    );

    if (ch) {
      ch.click(); // reuse your existing system
    }
  }, 120);
}


function animateModalOut(modal, isDesktop, done) {
  modal.style.opacity = "0";

  if (isDesktop) {
    modal.style.right = "-460px";
  } else {
    modal.style.top = "-140px";
    modal.style.transform = "translateX(-50%)";
  }

  clearInterval(modal._timeInterval);

  setTimeout(() => {
    modal.remove();
    done && done();
  }, 450);
}


function handleNotificationNavigation(data) {
  const isPreview = isPreviewCommunity();

  // 🧠 CASE 1: INSIDE previewtesting → SPA navigation
  if (isPreview) {
    openFromNotification(data);
    return;
  }

  // 🌍 CASE 2: OUTSIDE → full redirect
  if (data.link) {
    window.location.href = data.link;
  }
}

function showTopCommunityModal(data) {
  const hasSender =
    typeof data.sender_name === "string" &&
    data.sender_name.trim().length > 0;

  const senderPrefix = hasSender
    ? `${escapeHtml(data.sender_name)}: `
    : "";

  const existing = document.getElementById("community-top-modal");
  if (existing) {
    const isDesktopExisting =
      window.matchMedia("(min-width: 992px)").matches;

    animateModalOut(existing, isDesktopExisting, () => {
      showTopCommunityModal(data); // 🔁 re-call AFTER exit
    });

    return; // ⛔ stop current execution
  }


  const isDesktop = window.matchMedia("(min-width: 992px)").matches;

  const modal = document.createElement("div");
  modal.id = "community-top-modal";

  modal.style.cssText = `
    position: fixed;
    width: min(94%, 420px);

    background: linear-gradient(
      180deg,
      rgba(91, 88, 88, 0.16),
      rgba(255, 255, 255, 0.08)
    );


    backdrop-filter: blur(26px) saturate(170%);
    eb: 0.9px solid var(--border);
    -webkit-backdrop-filter: blur(26px) saturate(170%);

    padding: 16px 16px;
    color: #fff;

    box-shadow: 0 18px 40px rgba(0,0,0,.35);

    z-index: 999999;
    opacity: 0;

    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

    transition:
      top .45s cubic-bezier(.2,.8,.2,1),
      right .45s cubic-bezier(.2,.8,.2,1),
      opacity .3s ease;
  `;

  // 📍 POSITION + SHAPE
  if (isDesktop) {
    modal.style.bottom = "100px";
    modal.style.right = "-460px";
    modal.style.borderRadius = "24px 24px 6px 24px";
  } else {
    modal.style.top = "-120px";
    modal.style.left = "50%";
    modal.style.transform = "translateX(-50%)";
    modal.style.paddingBottom = "15px"
    modal.style.borderRadius = "25px";
  }

  const createdAt = new Date(data.created_at + "Z");

  modal.innerHTML = `
    ${isDesktop ? `
      <button id="community-modal-close" style="
        position:absolute;
        top:10px;
        right:12px;
        width:26px;
        height:26px;
        border-radius:50%;
        border:none;
        background:rgba(255,255,255,.08);
        color:#fff;
        font-size:15px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
      ">✕</button>
    ` : ""}

    <div style="display:flex; gap:14px;  min-width:0; padding: 0; margin: 0">

    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      align-self:center;
      flex-shrink:0;
    ">
      <img
        src="${data.community_logo || "/static/img/default-community.png"}"
        style="
          width:40px;
          height:40px;
          border-radius:50%;
          object-fit:cover;
        "
      />
    </div>

      <div style="flex:1; min-width:0;display:flex;flex-direction:column;gap:4px; padding: 0; margin: 0">

          <div style="
            display:flex;
            align-items:center;
            gap:8px;
            padding-right:${isDesktop ? "34px" : "0"};
          ">
          <div style="
            font-size:14.5px;
            font-weight:600;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            flex:1;
          ">${escapeHtml(data.community_name)}
          </div>

          <div id="community-modal-time" style="font-size: 11.5px; opacity:.55; flex-shrink:0;"></div>
        </div>

        <div style="
          font-size:15px;
          opacity:.92;
          display:-webkit-box;
          -webkit-box-orient:vertical;
          -webkit-line-clamp:4;
          padding: 0; 
          margin: 0
          white-space:pre-wrap;
          overflow:hidden;
          word-break:break-word;
          line-height:1.35;
        ">${senderPrefix}${escapeHtml(data.content)}
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 🕒 TIME
  const timeEl = modal.querySelector("#community-modal-time");
  function updateTime() {
    timeEl.textContent = formatTimeAgo(createdAt);
  }
  updateTime();
  modal._timeInterval = setInterval(updateTime, 60000);

  // 🎬 ENTER
  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    if (isDesktop) {
      modal.style.right = "24px";
    } else {
      modal.style.top = "14px";
    }
  });

  // ❌ DESKTOP: X BUTTON
  if (isDesktop) {
    modal.querySelector("#community-modal-close").onclick = () => {
      modal.style.opacity = "0";
      modal.style.right = "-460px";
      clearInterval(modal._timeInterval);
      setTimeout(() => modal.remove(), 450);
    };
  }
  function lockBodyScrollMain() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScrollMain() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

if (!isDesktop) {
  let startY = 0;
  let currentY = 0;
  let isSwiping = false;

  modal.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      currentY = startY;
      isSwiping = true;

      modal.style.transition = "none";
      lockBodyScrollMain();
    },
    { passive: false }
  );

  modal.addEventListener(
    "touchmove",
    (e) => {
      if (!isSwiping) return;

      currentY = e.touches[0].clientY;
      const delta = startY - currentY;

      if (delta > 0) {
        // 🔒 THIS IS THE KEY
        e.preventDefault();

        modal.style.transform =
          `translateX(-50%) translateY(${-Math.min(delta, 140)}px)`;
      }
    },
    { passive: false }
  );



  const targetLink = data.link;

  if (targetLink) {
    let didMove = false;

    modal.style.cursor = "pointer";

    modal.addEventListener("click", () => {
      if (didMove) return;

      handleNotificationNavigation(data);
    });


    modal.addEventListener("touchend", () => {
      setTimeout(() => {
        didMove = false;
      }, 0);
    });
  }



  modal.addEventListener(
    "touchend",
    () => {
      const delta = startY - currentY;
      isSwiping = false;

      modal.style.transition =
        "top .45s cubic-bezier(.2,.8,.2,1), opacity .3s ease, transform .3s ease";

      unlockBodyScrollMain();

      if (delta > 80) {
        modal.style.opacity = "0";
        modal.style.top = "-140px";
        modal.style.transform = "translateX(-50%)";
        clearInterval(modal._timeInterval);
        setTimeout(() => modal.remove(), 450);
      } else {
        modal.style.transform = "translateX(-50%) translateY(0)";
      }
    },
    { passive: false }
  );

  modal.addEventListener(
    "touchcancel",
    () => {
      unlockBodyScrollMain();
      isSwiping = false;
    },
    { passive: false }
  );
}



}

/* helpers */
function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}


