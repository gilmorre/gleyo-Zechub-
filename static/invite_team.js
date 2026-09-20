(function () {

let currentIsLimited = false;
let currentCode = null;

// ── members state ──────────────────────────────────────
let memberOffset = 0;
let memberLimit = 20;
let memberSearch = "";
let memberHasMore = true;
let memberLoading = false;
let searchDebounceTimer = null;

const roleColors = {
  admin: '#f5a524', editor: '#5b8def', reviewer: '#8b5cf6', member: '#8a8f98'
};

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
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getTextColor(bgColor) {
  const r = parseInt(bgColor.substring(1, 3), 16);
  const g = parseInt(bgColor.substring(3, 5), 16);
  const b = parseInt(bgColor.substring(5, 7), 16);
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness > 160 ? adjustColor(bgColor, -60) : adjustColor(bgColor, 60);
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── build a real member row (mirrors the Jinja markup exactly) ──
function buildMemberHTML(m) {
  const avatarInner = m.profile_pic
    ? `<img src="${escapeHtml(m.profile_pic)}" alt="${escapeHtml(m.username)}" loading="lazy" decoding="async">`
    : escapeHtml((m.username || "?")[0].toUpperCase());

  const roleAttrs = m.is_creator
    ? `data-tooltip="Community creator cannot be edited"`
    : `data-user-id="${m.id}"`;

  const roleLabel = m.banned
    ? `<span class="team-role-label" style="color:#f66;">Banned</span>`
    : `<span class="team-role-label">${escapeHtml(m.role)}</span>`;

  const creatorLock = m.is_creator ? `
    <span class="creator-lock" data-tooltip="Community creator cannot be edited">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="gold" stroke-width="2" class="icon">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    </span>` : '';

  return `
  <div class="team-member">
    <div class="team-avatar" data-user-id="${m.id}">${avatarInner}</div>
    <div class="team-divide-up">
      <div class="team-info">
        <div class="team-name" style="font-size:15px !important;color:var(--text-main) !important;">${escapeHtml(m.username)}</div>
        ${m.joined ? `<div class="team-joined" style="margin-top:4px;color:#bebece;">Joined ${escapeHtml(m.joined)}</div>` : ''}
      </div>
      <div class="team-role ${m.is_creator ? 'creator-role' : ''}" ${roleAttrs}>
        ${roleLabel}
        ${creatorLock}
      </div>
    </div>
  </div>`;
}

function buildSkeletonHTML() {
  return `
  <div class="team-member skeleton-row">
    <div class="team-avatar"><div class="skeleton-box avatar member-lighter"></div></div>
    <div class="team-divide-up">
      <div class="team-info">
        <div class="team-name skeleton-box member-lighter"></div>
        <div class="team-joined skeleton-box member-lighter"></div>
      </div>
      <div class="team-role">
        <span class="team-role-label skeleton-box member-lighter"></span>
      </div>
    </div>
  </div>`;
}

function applyAvatarColors(scopeEl) {
  scopeEl.querySelectorAll('.team-avatar').forEach(el => {
    if (el.querySelector("img") || el.dataset.colored) return;
    const userId = Number(el.dataset.userId) || 0;
    const bg = getColor(userId);
    el.style.backgroundColor = bg;
    el.style.color = getTextColor(bg);
    el.dataset.colored = "1";
  });
}

function checkEmptyState() {
  const list = document.querySelector(".team-members-list");
  const visible = list.querySelectorAll(".team-member:not(.skeleton-row)").length;
  list.classList.toggle("empty", visible === 0 && !memberLoading);
}

function appendSkeletons(count) {
  const list = document.querySelector(".team-members-list");
  for (let i = 0; i < count; i++) {
    list.insertAdjacentHTML("beforeend", buildSkeletonHTML());
  }
}

function removeSkeletons() {
  document.querySelectorAll(".team-member.skeleton-row").forEach(el => el.remove());
}

// ── core fetch: append (infinite scroll) or replace (search / reset) ──
async function fetchMembers({ replace = false } = {}) {
  if (memberLoading) return;
  if (!replace && !memberHasMore) return;

  memberLoading = true;

  const list = document.querySelector(".team-members-list");
  const heading = list.querySelector("h3");

  if (replace) {
    memberOffset = 0;
    memberHasMore = true;
    list.querySelectorAll(".team-member").forEach(el => el.remove());
    appendSkeletons(3);
  } else {
    appendSkeletons(3);
  }

  try {
    const params = new URLSearchParams({
      offset: memberOffset,
      limit: memberLimit
    });
    if (memberSearch) params.set("search", memberSearch);

    const res = await fetch(`/api/${communitySlug}/members?${params.toString()}`);
    const data = await res.json();

    removeSkeletons();

    if (!res.ok) {
      showToast(`❌ ${data.error || "Failed to load members"}`, "error");
      return;
    }

    if (heading) heading.textContent = `${data.total_members} Members`;

    data.members.forEach(m => {
      list.insertAdjacentHTML("beforeend", buildMemberHTML(m));
    });

    applyAvatarColors(list);

    memberOffset = data.next_offset;
    memberHasMore = data.has_more;

    checkEmptyState();
  } catch (err) {
    console.error(err);
    removeSkeletons();
    showToast("❌ Network error", "error");
  } finally {
    memberLoading = false;
  }
}

// ── infinite scroll sentinel ──────────────────────────
function setupInfiniteScroll() {
  const list = document.querySelector(".team-members-list");
  let sentinel = document.querySelector(".team-members-sentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.className = "team-members-sentinel";
    sentinel.style.height = "1px";
  }
  list.appendChild(sentinel); // keep it last after every render

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && memberHasMore && !memberLoading) {
        fetchMembers({ replace: false }).then(() => list.appendChild(sentinel));
      }
    });
  }, { root: null, rootMargin: "200px", threshold: 0 });

  observer.observe(sentinel);
}

// ── debounced search (2s pause), both mobile + desktop inputs ──
function setupSearch() {
  const inputs = document.querySelectorAll(".team-search-box input.input-style");

  inputs.forEach(input => {
    input.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      const value = input.value.trim();

      // keep the other search box in sync visually
      inputs.forEach(other => { if (other !== input) other.value = input.value; });

      searchDebounceTimer = setTimeout(() => {
        memberSearch = value; // empty string => server just returns the full paginated list again
        fetchMembers({ replace: true }).then(setupInfiniteScroll);
      }, 2000);
    });
  });
}

// ── role dropdown, delegated so dynamically-added rows work ──
function setupRoleDropdownDelegation() {
  const dropdown = document.getElementById("roleDropdown");
  const container = document.querySelector(".team-container");
  let currentUserId = null;
  let currentRoleBox = null;

  container.addEventListener("click", (e) => {
    const roleEl = e.target.closest(".team-role");
    if (!roleEl || !container.contains(roleEl)) return;
    if (roleEl.classList.contains("creator-role")) return;

    e.stopPropagation();
    currentUserId = roleEl.dataset.userId;
    currentRoleBox = roleEl;

    if (window.activeTrigger === roleEl) {
      dropdown.style.display = "none";
      window.activeTrigger = null;
      return;
    }
    window.activeTrigger = roleEl;

    const rect = roleEl.getBoundingClientRect();
    dropdown.style.display = "block";
    dropdown.style.visibility = "hidden";
    const dropdownHeight = dropdown.offsetHeight;
    const dropdownWidth = dropdown.offsetWidth;
    dropdown.style.visibility = "visible";

    let left = rect.right - dropdownWidth - 2;
    let top = rect.bottom + 4;
    if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - 4;
    if (left < 6) left = 6;
    if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 6;

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  });

  dropdown.querySelectorAll("div").forEach(option => {
    option.addEventListener("click", async (e) => {
      e.stopPropagation();
      const role = option.dataset.role;
      if (!currentUserId) return;

      try {
        const res = await fetch(`/community/${communityId}/update_role`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
          body: JSON.stringify({ user_id: currentUserId, role: role })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          showToast(`Role updated to ${role}`, "success", true);
          const label = currentRoleBox.querySelector(".team-role-label");
          if (data.banned) {
            label.textContent = "Banned";
            label.style.color = "#f66";
          } else {
            label.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            label.style.color = "";
          }
        } else {
          showToast(`❌ ${data.error}`, "error");
        }
      } catch (err) {
        console.error(err);
        showToast("❌ Network error", "error");
      }
      dropdown.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !e.target.closest(".team-role")) {
      dropdown.style.display = "none";
      window.activeTrigger = null;
    }
  });

  window.addEventListener("scroll", () => { dropdown.style.display = "none"; window.activeTrigger = null; }, true);
}

function teaminbxinit() {
  const filterDropdown = document.querySelector(".team-role-filter");

  // role filter — now filters by re-querying the CURRENT dataset via search
  // (server-side "ban" filter isn't a username search, so this stays a
  // client-side show/hide over whatever's currently loaded, same as before)
  filterDropdown.querySelectorAll("div").forEach(option => {
    option.addEventListener("click", () => {
      const filter = option.getAttribute("data-filter");
      document.querySelectorAll(".team-member:not(.skeleton-row)").forEach(member => {
        const roleLabel = member.querySelector(".team-role-label").textContent.toLowerCase();
        member.style.display = (filter === "all" || roleLabel === filter) ? "flex" : "none";
      });
      checkEmptyState();
      filterDropdown.style.display = "none";
    });
  });

  applyAvatarColors(document.querySelector(".team-members-list"));
  setupRoleDropdownDelegation();
  setupSearch();
  setupInfiniteScroll();

  // ── everything below is unchanged from before ──

  const inviteUser = document.querySelector(".invite-user");
  const inviteDropdown = document.querySelector(".team-role-invite");

  if (inviteUser && inviteDropdown) {
    inviteUser.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = inviteUser.getBoundingClientRect();
      if (inviteDropdown.style.display === "block") {
        inviteDropdown.style.display = "none";
        return;
      }
      inviteDropdown.style.position = "fixed";
      inviteDropdown.style.top = rect.bottom + 6 + "px";
      const dropdownWidth = inviteDropdown.offsetWidth || 160;
      const left = rect.left + rect.width / 2 - dropdownWidth / 2;
      inviteDropdown.style.left = left + "px";
      inviteDropdown.style.zIndex = "9999";
      inviteDropdown.style.display = "block";
    });

    inviteDropdown.querySelectorAll("div").forEach(option => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        inviteUser.querySelector("span").textContent = option.textContent;
        inviteDropdown.style.display = "none";
      });
    });
  }

  document.addEventListener("click", () => {
    document.querySelector(".team-role-filter").style.display = "none";
  });

  document.addEventListener("click", (e) => {
    const target = e.target;
    const isInsideDropdown =
      target.closest(".team-role-invite") ||
      target.closest(".team-role-menu") ||
      target.closest(".team-filter") ||
      target.closest(".invite-user-dropdown") ||
      target.closest(".team-role") ||
      target.closest(".team-btn.invite") ||
      target.closest(".team-btn.copy");

    if (!isInsideDropdown) {
      document.querySelector(".team-role-invite")?.style.setProperty("display", "none");
      document.querySelector(".team-role-dropdown")?.style.setProperty("display", "none");
      document.querySelectorAll(".team-role.open").forEach(el => el.classList.remove("open"));
    }
  });

  const filterBtn = document.querySelector(".team-filter");
  const roleFilter = document.getElementById("teamRoleFilter");
  document.body.appendChild(roleFilter);

  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = filterBtn.getBoundingClientRect();
    roleFilter.style.display = "block";
    roleFilter.style.top = rect.bottom + scrollY + 8 + "px";
    roleFilter.style.left = rect.right + window.scrollX - roleFilter.offsetWidth + "px";
  });

  const inviteBtn = document.querySelector(".team-btn.invite");
  const modalWrapper = document.querySelector(".modal-pops");
  const modalAmit = document.querySelector(".send-invite-email");
  const closeIconAmit = modalAmit.querySelector(".modal-close-icon");

  inviteBtn.addEventListener("click", () => {
    modalWrapper.classList.add("active");
    modalAmit.classList.add("active");
  });

  const closeModal = () => {
    modalAmit.classList.remove("active");
    modalWrapper.classList.remove("active");
  };
  closeIconAmit.addEventListener("click", closeModal);
  modalWrapper.addEventListener("click", (e) => { if (e.target === modalWrapper) closeModal(); });

  const copyBtn = document.querySelector(".team-btn.copy");
  const modal = document.querySelector(".link-invite-modal");
  const closeIcon = modal.querySelector(".modal-close-icon-link");
  const roleDropdown = document.querySelector(".team-role-dropdown");
  const roleToggle = modal.querySelector(".invite-user-dropdown");
  const roleSpan = roleToggle.querySelector("span");
  const copyLinkBtn = modal.querySelector(".invite-btn.copy-link-btn");

  const inviterUserId = 1;
  const inviterUsername = "nuce";

  const showButtonSpinner = (btn) => {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Generating...`;
  };

  const restoreButton = (btn) => {
    btn.disabled = false;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy invite link
    `;
  };

  const generateCode = async (role) => {
    showButtonSpinner(copyLinkBtn);
    try {
      const res = await fetch(`/${communitySlug}/generate_invite_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ role, inviter_user_id: inviterUserId, inviter_username: inviterUsername })
      });
      const data = await res.json();
      if (data.success) {
        currentCode = data.code;
        currentIsLimited = data.is_limited;
      } else {
        console.error("Error generating code:", data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      restoreButton(copyLinkBtn);
    }
  };

  copyBtn.addEventListener("click", () => {
    modal.classList.add("show");
    const role = roleToggle.getAttribute("data-selected-role") || "Editor";
    generateCode(role);
  });

  closeIcon.addEventListener("click", () => {
    modal.classList.remove("show");
    roleDropdown.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      roleDropdown.style.display = "none";
    }
  });

  roleToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = roleToggle.getBoundingClientRect();
    if (roleDropdown.style.display === "block") {
      roleDropdown.style.display = "none";
      return;
    }
    roleDropdown.style.position = "fixed";
    roleDropdown.style.display = "block";
    const dropdownWidth = roleDropdown.offsetWidth || 160;
    roleDropdown.style.top = rect.bottom + 6 + "px";
    roleDropdown.style.left = (rect.left + rect.width / 2 - dropdownWidth / 2) + "px";
    roleDropdown.style.zIndex = "9999";
  });

  roleDropdown.querySelectorAll("div").forEach(option => {
    option.addEventListener("click", async (e) => {
      e.stopPropagation();
      const selectedRole = option.getAttribute("data-link");
      roleToggle.setAttribute("data-selected-role", selectedRole);
      roleSpan.textContent = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
      roleDropdown.style.display = "none";
      await generateCode(selectedRole);
    });
  });

  document.addEventListener("click", () => { roleDropdown.style.display = "none"; });

  copyLinkBtn.addEventListener("click", async () => {
    if (!currentCode) return;
    const slug = communitySlug;
    const role = roleToggle.getAttribute("data-selected-role") || "editor";

    let url;
    if (role === "member") {
      url = currentIsLimited
        ? `https://gleyo.app/${slug}/invite/${currentCode}?private`
        : `https://gleyo.app/${slug}/invite/${currentCode}`;
    } else {
      url = `https://gleyo.app/${slug}/team_invite/${currentCode}`;
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try { document.execCommand("copy"); } catch (e) { console.error("Copy failed", e); }
      document.body.removeChild(textarea);
    }

    copyLinkBtn.textContent = "Copied!";
    setTimeout(() => restoreButton(copyLinkBtn), 1000);
  });

  const sendBtn = document.querySelector(".invite-btn.send");
  const defaultBtnText = sendBtn.textContent;
  let selectedRole = document.querySelector(".invite-user span").textContent.trim().toLowerCase();

  document.querySelectorAll(".team-role-invite div").forEach(item => {
    item.addEventListener("click", e => {
      selectedRole = e.target.getAttribute("data-invite");
      document.querySelectorAll(".team-role-invite div").forEach(d => d.classList.remove("selected"));
      e.target.classList.add("selected");
    });
  });

  sendBtn.addEventListener("click", async () => {
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<div class="spinner"></div> Sending...`;
    const emails = document.getElementById("invite-emails").value;

    try {
      const res = await fetch(`/community/${communitySlug}/send_invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ emails, role: selectedRole, current_user_id: currentUserId })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const emailList = data.sent_emails;
        const delay = emailList.length === 1 ? 6000 : 3000;
        const showNextToast = (index) => {
          if (index >= emailList.length) return;
          const toast = document.createElement("div");
          toast.className = "toast success show";
          const img = document.createElement("img");
          img.src = "{{ url_for('static', filename='sprint.png') }}";
          img.alt = "success";
          const textSpan = document.createElement("span");
          textSpan.textContent = `Invitation link sent to ${emailList[index]}`;
          toast.appendChild(img);
          toast.appendChild(textSpan);
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.classList.remove("show");
            toast.remove();
            showNextToast(index + 1);
          }, delay);
        };
        showNextToast(0);
      } else {
        showToast(`❌ ${data.error}`, "error", true);
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Network error", "error", true);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = defaultBtnText;
    }
  });
}

window.TeamInviteModule = {
  init: teaminbxinit
};

})();