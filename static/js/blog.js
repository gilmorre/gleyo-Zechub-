(function () {

  async function loadBlogPartial(url, push = true) {
    const root = document.getElementById("blog-root");
    if (!root) return;

    root.style.opacity = "0.4";

    try {
      const res = await fetch(url, {
        headers: { "X-Partial": "1" },
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Blog partial load failed:", res.status);
        root.style.opacity = "1";
        return;
      }

      const html = await res.text();
      root.innerHTML = html;
      root.style.opacity = "1";

      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

      if (push) {
        window.history.pushState({ blogUrl: url }, "", url);
      }

      document.title =
        url === "/blog" || url === "/"
          ? "Blog · Gleyo"
          : document.querySelector(".post-title")?.textContent
            ? `${document.querySelector(".post-title").textContent} · Gleyo Blog`
            : document.title;

    } catch (err) {
      console.error("Blog partial fetch error:", err);
      root.style.opacity = "1";
    }
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest(".js-blog-link");
    if (!link) return;

    // let modifier-clicks (new tab, etc.) behave normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;

    e.preventDefault();

    const href = link.getAttribute("href");
    if (!href) return;

    // "Back home" link isn't a blog partial — do a real nav
    if (href === "/") {
      window.location.href = "/";
      return;
    }

    loadBlogPartial(href, true);
  });

  window.addEventListener("popstate", () => {
    loadBlogPartial(window.location.pathname, false);
  });

})();