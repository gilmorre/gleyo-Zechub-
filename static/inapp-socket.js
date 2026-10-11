(function () {
  if (window.__INAPP_JS_LOADED__) {
    console.warn("inapp-socket.js already loaded, skipping duplicate load");
    return;
  }
  window.__INAPP_JS_LOADED__ = true;

  function navigateTo(url) {
    window.location.href = url;
  }
  window.navigateTo = navigateTo;

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

  // ---------- gradient edge (works on any page, even without your CSS vars) ----------
  function ensureEdgeStyles() {
    if (document.getElementById("gl-edge-styles")) return;

    const style = document.createElement("style");
    style.id = "gl-edge-styles";
    style.textContent = `
      .gl-edge::before {
        content: "";
        position: absolute;
        inset: 0;
        padding: 1px;
        border-radius: inherit;
        background: linear-gradient(
          135deg,
          var(--edge-hi-strong, rgba(255,255,255,.55)) 0%,
          var(--edge-lo-strong, rgba(255,255,255,.10)) 28%,
          var(--edge-lo-strong, rgba(255,255,255,.10)) 72%,
          var(--edge-hi-strong, rgba(255,255,255,.55)) 100%
        );
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

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

      socket.on("community_publish_notification", (payload) => {
        const active = window.CurrentActiveChat;

        if (!active || !active.communityId) {
          showTopCommunityModal(payload);
          return;
        }

        const sameCommunity =
          String(active.communityId) === String(payload.community_id);

        const isSameChannel =
          sameCommunity &&
          payload.channel_uuid &&
          active.channelUuid &&
          active.channelUuid === payload.channel_uuid;

        if (isSameChannel) return;

        showTopCommunityModal(payload);
      });

      socket.on("community_notification", (payload) => {
        if (payload.type === "community_publish") return;
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

        const isSameTicketChat =
          sameCommunity &&
          payload.ticket_uuid &&
          active.ticketUuid &&
          active.ticketUuid === payload.ticket_uuid;

        if (isSameChannelChat || isSameTicketChat) {
          return;
        }

        showTopCommunityModal(payload);
      });

      function setOnlineCount(value) {
        const el = document.getElementById("Oniline-counter");
        if (!el) return;

        if (value === null || value === undefined || isNaN(value)) {
          el.textContent = "";
          return;
        }

        el.textContent = `${Number(value).toLocaleString()} Online`;
      }

      socket.on("online_count_update", (data) => {
        const count = data?.count;

        const liveEl = document.getElementById("liveCount");
        if (liveEl) liveEl.textContent = count;

        setOnlineCount(count);
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
    const { community_id, community_slug, channel_uuid } = data;
    const current = window.CurrentActiveChat || {};

    if (current.communityId !== community_id) {
      const communityEl = document.querySelector(
        `.logo-communities[data-community-id="${community_id}"]`
      );

      if (communityEl) {
        communityEl.click();
      }
    }

    setTimeout(() => {
      const ch = document.querySelector(
        `.channel[data-channel-uuid="${channel_uuid}"]`
      );

      if (ch) {
        ch.click();
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

    if (isPreview) {
      openFromNotification(data);
      return;
    }

    if (data.link) {
      window.location.href = data.link;
    }
  }

  function buildNotificationText(data) {
    const text = (data.content || "").trim();
    const name =
      typeof data.sender_name === "string" ? data.sender_name.trim() : "";
    const files = Array.isArray(data.files) ? data.files : [];

    if (text) {
      return name ? `${name}: ${text}` : text;
    }

    const who = name || "Someone";

    const isVoice =
      !!data.audio ||
      data.message_kind === "voice" ||
      (files.length === 1 && files[0].type === "voice");

    if (isVoice) {
      return `${who} sent a voice message`;
    }

    if (files.length > 1) {
      return `📎 ${who} sent ${files.length} attachments`;
    }

    if (files.length === 1) {
      return `📎 ${who} sent an attachment`;
    }

    return name ? `${name}: ` : "";
  }

  function showTopCommunityModal(data) {
    const existing = document.getElementById("community-top-modal");
    if (existing) {
      const isDesktopExisting =
        window.matchMedia("(min-width: 992px)").matches;

      animateModalOut(existing, isDesktopExisting, () => {
        showTopCommunityModal(data);
      });

      return;
    }

    const isDesktop = window.matchMedia("(min-width: 992px)").matches;

    ensureEdgeStyles();

    const modal = document.createElement("div");
    modal.id = "community-top-modal";
    modal.className = "gl-edge";

    modal.style.cssText = `
      position: fixed;
      width: min(94%, 420px);

      background: linear-gradient(
        180deg,
        rgba(91, 88, 88, 0.16),
        rgba(255, 255, 255, 0.08)
      );

      backdrop-filter: blur(26px) saturate(170%);
      -webkit-backdrop-filter: blur(26px) saturate(170%);
      border: none;

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

    if (isDesktop) {
      modal.style.bottom = "100px";
      modal.style.right = "-460px";
      modal.style.borderRadius = "24px 24px 6px 24px";
    } else {
      modal.style.top = "-120px";
      modal.style.left = "50%";
      modal.style.transform = "translateX(-50%)";
      modal.style.paddingBottom = "15px";
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

      <div style="display:flex; gap:14px; min-width:0; padding:0; margin:0">

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

        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; padding:0; margin:0">

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
            ">${escapeHtml(data.community_name)}</div>

            <div id="community-modal-time" style="font-size:11.5px; opacity:.55; flex-shrink:0;"></div>
          </div>

          <div style="
            font-size:15px;
            opacity:.92;
            display:-webkit-box;
            -webkit-box-orient:vertical;
            -webkit-line-clamp:4;
            padding:0;
            margin:0;
            white-space:pre-wrap;
            overflow:hidden;
            word-break:break-word;
            line-height:1.35;
          ">${escapeHtml(buildNotificationText(data))}</div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const timeEl = modal.querySelector("#community-modal-time");
    function updateTime() {
      timeEl.textContent = formatTimeAgo(createdAt);
    }
    updateTime();
    modal._timeInterval = setInterval(updateTime, 60000);

    requestAnimationFrame(() => {
      modal.style.opacity = "1";
      if (isDesktop) {
        modal.style.right = "24px";
      } else {
        modal.style.top = "14px";
      }
    });

    if (isDesktop) {
      modal.querySelector("#community-modal-close").onclick = (e) => {
        e.stopPropagation();
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

    let didMove = false;

    if (data.link) {
      modal.style.cursor = "pointer";

      modal.addEventListener("click", () => {
        if (didMove) return;
        handleNotificationNavigation(data);
      });
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
          didMove = false;

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

          if (Math.abs(delta) > 5) didMove = true;

          if (delta > 0) {
            e.preventDefault();

            modal.style.transform = `translateX(-50%) translateY(${-Math.min(
              delta,
              140
            )}px)`;
          }
        },
        { passive: false }
      );

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

          setTimeout(() => {
            didMove = false;
          }, 300);
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

  function isIosUnsupportedPush() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    return isIOS && !isStandalone;
  }

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

  let swRegistration = null;
  let __pushInitDone = false;

  function initPushSystem() {
    if (__pushInitDone) return;
    __pushInitDone = true;

    if (isIosUnsupportedPush()) {
      console.log("🚫 iOS push not supported in browser — skipping");
      return;
    }
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/static/sw.js")
      .then(async (reg) => {
        swRegistration = reg;
        setTimeout(checkPushState, 1200);
      })
      .catch((err) => console.error("SW failed", err));
  }

  async function checkPushState() {
    try {
      let existingSub = null;

      if (swRegistration) {
        existingSub = await swRegistration.pushManager.getSubscription();
      }

      if (existingSub) {
        const res = await fetch("/api/push/check", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existingSub),
        });

        const data = await res.json();

        if (!data.exists) {
          showPushBanner();
        }

        return;
      }

      showPushBanner();
    } catch (err) {
      console.error("Push check failed:", err);
      showPushBanner();
    }
  }

  function showPushBanner() {
    if (isIosUnsupportedPush()) return;

    if (sessionStorage.getItem("push_dismissed")) return;

    if (document.getElementById("push-banner")) return;

    ensureEdgeStyles();

    const banner = document.createElement("div");
    banner.id = "push-banner";
    banner.className = "gl-edge";

    banner.innerHTML = `
      <button id="push-close-btn">
        <svg width="12" height="12" style="flex-shrink: 0" viewBox="0 0 24 24" fill="none">
          <path d="M6 6L18 18M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <span id="push-text">
        Get alerts for new replies, mentions & quests instantly
      </span>

      <button id="enable-push-btn">Enable</button>
    `;

    document.body.appendChild(banner);

    Object.assign(banner.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(18, 18, 30, 0.88)",
      backdropFilter: "blur(14px)",
      webkitBackdropFilter: "blur(14px)",
      border: "none",
      color: "#e5e7eb",
      boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      zIndex: "9998",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "12px",
      fontFamily: "'DM Sans', sans-serif",
      padding: "18px 16px 16px",
      width: "calc(100% - 32px)",
      maxWidth: "420px",
      borderRadius: "20px",
      fontSize: "14px",
    });

    const btn = banner.querySelector("#enable-push-btn");
    const closeBtn = banner.querySelector("#push-close-btn");

    Object.assign(btn.style, {
      background: "#7c6fff",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      width: "100%",
      maxWidth: "140px",
      padding: "10px",
      borderRadius: "20px",
      fontSize: "14px",
      transition: "opacity 0.2s",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "0.85";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "1";
    });

    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      width: "26px",
      height: "26px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      opacity: "0.8",
      transition: "opacity 0.2s, background 0.2s",
    });

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.opacity = "1";
      closeBtn.style.background = "rgba(255,255,255,0.15)";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.opacity = "0.8";
      closeBtn.style.background = "rgba(255,255,255,0.08)";
    });

    closeBtn.addEventListener("click", () => {
      sessionStorage.setItem("push_dismissed", "1");
      banner.remove();
    });

    btn.addEventListener("click", async () => {
      enablePushNotifications();
    });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function enablePushNotifications() {
    try {
      if (!swRegistration) return;

      const perm = await Notification.requestPermission();

      if (perm !== "granted") {
        sessionStorage.setItem("push_dismissed", "1");

        const banner = document.getElementById("push-banner");
        if (banner) banner.remove();

        return;
      }

      const existing = await swRegistration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existing),
        });

        const banner = document.getElementById("push-banner");
        if (banner) banner.remove();

        console.log("✅ Re-synced existing push subscription to server");
        return;
      }

      const VAPID_PUBLIC_KEY =
        "BK1nuMFllNE7v6giIAeMg0Is1Qc9fWWvKMauCQni1fHR8r0AkiLIob50n6dWLBuruQCdfiwTEZYGu3wOAXQ6cJs";

      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      const banner = document.getElementById("push-banner");
      if (banner) banner.remove();

      console.log("✅ Push subscribed");
    } catch (err) {
      console.error("❌ Push error:", err);
    }
  }

  function ensureFontLoaded() {
    if (document.getElementById("dm-sans-font")) return;

    const link = document.createElement("link");
    link.id = "dm-sans-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap";

    document.head.appendChild(link);
  }
  ensureFontLoaded();

  window.getCommunitySlug = getCommunitySlug;
  window.isPreviewCommunity = isPreviewCommunity;
  window.openFromNotification = openFromNotification;
  window.handleNotificationNavigation = handleNotificationNavigation;
  window.showTopCommunityModal = showTopCommunityModal;
  window.initPushSystem = initPushSystem;
  window.showPushBanner = showPushBanner;
  window.enablePushNotifications = enablePushNotifications;

  window.addEventListener("load", () => {
    initPushSystem();
  });
})();