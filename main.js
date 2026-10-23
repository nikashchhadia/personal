// Everything here is progressive enhancement: the page is complete without it.
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  document.getElementById("year").textContent = new Date().getFullYear();

  // Theme: follows the system by default. A manual toggle overrides it for this tab
  // only, and is dropped when it matches the system again or the system theme changes.
  const themeBtn = document.getElementById("theme");
  themeBtn.hidden = false;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches);
  const setOverride = (t) => {
    if (t) root.dataset.theme = t; else delete root.dataset.theme;
    try { t ? sessionStorage.setItem("theme", t) : sessionStorage.removeItem("theme"); } catch (e) {}
    window.dispatchEvent(new Event("themechange"));
  };
  const toggleTheme = () => {
    const next = isDark() ? "light" : "dark";
    setOverride(next === (systemDark.matches ? "dark" : "light") ? null : next);
    return `theme: ${next}`;
  };
  themeBtn.addEventListener("click", toggleTheme);
  systemDark.addEventListener?.("change", () => setOverride(null));

  // Tab title easter egg
  const title = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "still training… come back" : title;
  });

  // Command palette
  const dialog = document.getElementById("palette");
  const input = document.getElementById("palette-input");
  const list = document.getElementById("palette-list");
  const out = document.getElementById("palette-out");
  const paletteBtn = document.getElementById("open-palette");
  paletteBtn.hidden = false;
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelectorAll("kbd").forEach((k) => { if (k.textContent === "⌘") k.textContent = "Ctrl"; });
  }

  const jump = (id) => () => {
    dialog.close();
    const el = document.getElementById(id);
    const earlier = el.closest("details");
    if (earlier) earlier.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1200);
  };
  const open = (url) => () => { window.open(url, "_blank", "noopener"); dialog.close(); };

  const commands = [
    { name: "Work", hint: "jump", run: jump("work") },
    ...[...document.querySelectorAll("#work .item[id]")].map((li) => ({
      name: li.querySelector("h3 a").textContent,
      hint: "jump",
      keywords: li.textContent,
      run: jump(li.id),
    })),
    { name: "Projects", hint: "jump", run: jump("projects") },
    ...[...document.querySelectorAll("#projects li[id]")].map((li) => ({
      name: li.querySelector("h3").firstChild.textContent.trim(),
      hint: "project",
      keywords: li.textContent,
      run: jump(li.id),
    })),
    { name: "Education", hint: "jump", run: jump("education") },
    { name: "Copy email", hint: "chhadia@stanford.edu", run: async () => {
      try { await navigator.clipboard.writeText("chhadia@stanford.edu"); return "copied chhadia@stanford.edu"; }
      catch (e) { return "chhadia@stanford.edu"; }
    } },
    { name: "GitHub", hint: "open", run: open("https://github.com/nikashchhadia") },
    { name: "LinkedIn", hint: "open", run: open("https://www.linkedin.com/in/nikashchhadia") },
    { name: "Toggle theme", hint: "t", run: toggleTheme },
    { name: "whoami", hint: "$", run: () => "nikash: builds agents, trains models, likes math" },
    { name: "sudo ping nikash", hint: "$", run: () => "pong. say hi at chhadia@stanford.edu" },
  ];
  commands.forEach((c) => { c.keywords ??= ""; });

  let shown = commands;
  let sel = 0;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = commands.filter((c) => !q || (c.name + " " + c.keywords).toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(shown.length - 1, 0));
    list.replaceChildren(...shown.map((c, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === sel));
      const a = document.createElement("span"); a.textContent = c.name;
      const b = document.createElement("span"); b.textContent = c.hint;
      li.append(a, b);
      li.addEventListener("mousemove", () => { if (sel !== i) { sel = i; render(); } });
      li.addEventListener("click", () => runCmd(c));
      return li;
    }));
    if (!shown.length) out.textContent = q ? `command not found: ${q}` : "";
  };
  const runCmd = async (c) => {
    const r = await c.run();
    if (typeof r === "string") out.textContent = r;
  };
  const openPalette = () => {
    if (dialog.open) return dialog.close();
    input.value = ""; out.textContent = ""; sel = 0; render();
    dialog.showModal(); input.focus();
  };
  paletteBtn.addEventListener("click", openPalette);
  input.addEventListener("input", () => { sel = 0; out.textContent = ""; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = (sel + 1) % Math.max(shown.length, 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + shown.length) % Math.max(shown.length, 1); render(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[sel]) runCmd(shown[sel]); }
  });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); openPalette(); }
    else if (e.key === "t") toggleTheme();
  });
})();
