// ==UserScript==
// @name         MouseHunt - Banned Member Guard
// @namespace    https://greasyfork.org/en/users/735492-mouseindustry
// @author       mouseindustry
// @description  Limits interactions with banned members from official mousehunt discord. Can also manually ban users.
// @version      1.0.4
// @match        https://www.mousehuntgame.com/*
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Banned-Member-Guard.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Banned-Member-Guard.user.js
// @license      MIT
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const HARD_BANNED = {
    3943856: "MouseHunt Discord Problematic Mapping Members", //Gojo Sensei/ XXXXXXXX
    6157403: "MouseHunt Discord Problematic Mapping Members", //Joel/ Jay IT/ Stokke131
    5412365: "MouseHunt Discord Problematic Mapping Members", //Intrinsic Li/ Pokemon9/ Paper Bag
    4631164: "MouseHunt Discord Problematic Mapping Members", //Jack Lim
  };

  const LS_KEY = "mhBannedHunters";

  function getLocalBans() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveLocalBans(d) {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  }

  function getBanInfo(id) {
    if (!id) return { banned: false, permanent: false, reason: "" };
    if (HARD_BANNED[id])
      return { banned: true, permanent: true, reason: HARD_BANNED[id] };
    const local = getLocalBans()[id];
    if (local)
      return { banned: true, permanent: false, reason: local.reason || "" };
    return { banned: false, permanent: false, reason: "" };
  }

  function mkWarning(info) {
    const box = document.createElement("div");
    box.style.cssText =
      "margin-top:10px;padding:12px;border:2px solid #d60000;background:#ffeaea;color:#b00000;border-radius:6px;font-size:13px";

    const t = document.createElement("div");
    t.style.fontWeight = "bold";
    t.style.marginBottom = "8px";
    t.textContent = info.permanent ? "⚠ Permanently Banned" : "⚠ Banned";

    box.appendChild(t);
    return box;
  }

  function disableButtons(c, d) {
    c.querySelectorAll(".userInteractionButtonsView-button").forEach((b) => {
      b.style.pointerEvents = d ? "none" : "";
      b.style.opacity = d ? "0.4" : "";
      b.style.filter = d ? "grayscale(1)" : "";
    });
  }

  function getHunterId() {
    return (
      document
        .querySelector(".hunterInfoView-hunterId-idText span")
        ?.textContent?.trim() || ""
    );
  }

  function initProfilePage() {
    if (!/\/profile\.php$/i.test(location.pathname)) return;
    if (document.getElementById("mh-ban-panel")) return;

    const id = getHunterId();
    if (!id) return;

    const info = getBanInfo(id);
    const card = document.querySelector(".hunterInfoView-idCardBlock");
    const buttons = document.querySelector(".userInteractionButtonsView");
    if (!card || !buttons) return;

    const panel = document.createElement("div");
    panel.id = "mh-ban-panel";
    panel.style.cssText =
      "margin-top:12px;padding:12px;border:2px solid #bdbdbd;background:#f8f8f8;border-radius:8px;position:relative";

    if (info.banned) panel.appendChild(mkWarning(info));

    let checkbox, textarea;

    if (info.banned) {
      const wrap = document.createElement("div");
      wrap.style.margin = "10px 0";

      checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      const label = document.createElement("label");
      label.textContent = "Confirm interaction";

      wrap.appendChild(checkbox);
      wrap.appendChild(label);
      panel.appendChild(wrap);

      textarea = document.createElement("textarea");
      textarea.rows = 3;
      textarea.style.cssText = "width:100%;box-sizing:border-box";
      textarea.value = info.reason || "";
      panel.appendChild(textarea);
    }

    const btn = document.createElement("button");
    btn.style.cssText =
      "padding:10px 16px;font-weight:bold;border:none;border-radius:6px";

    function refresh() {
      const cur = getBanInfo(id);
      if (cur.permanent) {
        btn.textContent = "PERMANENT";
        btn.disabled = true;
        btn.style.background = "#888";
        return;
      }
      btn.textContent = cur.banned ? "UNBAN" : "BAN";
      btn.style.background = "#d60000";
      btn.style.color = "white";
    }

    refresh();

    textarea?.addEventListener("input", () => {
      const b = getLocalBans();
      if (b[id]) {
        b[id].reason = textarea.value.trim();
        saveLocalBans(b);
      }
    });

    if (!document.getElementById("mh-ban-panel-style")) {
      const style = document.createElement("style");
      style.id = "mh-ban-panel-style";
      style.textContent =
        "#mh-ban-panel button:hover{transform:scale(1.03);filter:brightness(1.1);cursor:pointer;}";
      document.head.appendChild(style);
    }

    btn.onclick = () => {
      const b = getLocalBans();
      if (getBanInfo(id).banned) delete b[id];
      else b[id] = { reason: textarea?.value.trim() || "Manual ban" };
      saveLocalBans(b);
      location.reload();
    };

    panel.appendChild(btn);

    const exp = document.createElement("button");
    exp.textContent = "Export";
    exp.style.cssText =
      "position:absolute;right:10px;bottom:10px;font-size:12px";

    exp.onclick = () => {
      const data = {
        hard_banned: HARD_BANNED,
        local_banned: getLocalBans(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mh-bans.json";
      a.click();
      URL.revokeObjectURL(url);
    };

    panel.appendChild(exp);
    card.insertAdjacentElement("afterend", panel);

    function updateButtons() {
      const cur = getBanInfo(id);
      disableButtons(buttons, cur.banned && !checkbox?.checked);
    }

    checkbox?.addEventListener("change", updateButtons);
    updateButtons();
  }

  function initFriendsPage() {
    const cont = document.querySelector(
      ".friendsPage-community-channelContainer",
    );
    if (!cont || cont.dataset.init) return;
    cont.dataset.init = "1";

    const input = cont.querySelector('input[name="user_id"]');
    const host = input?.closest(".friendsPage-community-channel");
    const btn = cont.querySelector('a[onclick*="triggerHunterForm"]');
    if (!input || !host || !btn) return;

    const warn = document.createElement("div");
    warn.className = "mh-ban-warning";
    warn.style.cssText =
      "display:none;width:100%;box-sizing:border-box;margin:10px 0 0;padding:8px;border:1px solid red;background:#ffeaea;color:red;clear:both";

    const cb = document.createElement("input");
    cb.type = "checkbox";

    const label = document.createElement("label");
    warn.appendChild(cb);
    warn.appendChild(label);
    host.appendChild(warn);

    if (!document.getElementById("mh-friends-ban-style")) {
      const style = document.createElement("style");
      style.id = "mh-friends-ban-style";
      style.textContent = `
                .friendsPage-community-channel.friends-page-id-search.mh-ban-active{position:relative!important}
                .friendsPage-community-channel.friends-page-id-search.mh-ban-active .mh-ban-warning{display:block!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;float:none!important;clear:both!important;width:100%!important;box-sizing:border-box!important;margin:10px 0 0!important}
                .friendsPage-community-channel.friends-page-id-search.mh-ban-active.mh-ban-absolute{padding-bottom:48px!important}
                .friendsPage-community-channel.friends-page-id-search.mh-ban-active.mh-ban-absolute .mh-ban-warning{position:absolute!important;left:0!important;right:0!important;bottom:0!important;margin:0!important}
            `;
      document.head.appendChild(style);
    }

    function updateLayout(banned) {
      host.classList.remove("mh-ban-absolute");
      if (!banned) return;

      const display = getComputedStyle(host).display;
      if (display === "flex" || display === "grid")
        host.classList.add("mh-ban-absolute");
    }

    function update() {
      const info = getBanInfo(input.value.trim());
      const banned = info.banned;

      host.classList.toggle("mh-ban-active", banned);
      warn.style.display = banned ? "block" : "none";
      label.textContent = banned
        ? `Click to confirm interaction. BANNED: ${info.reason}`
        : "";

      updateLayout(banned);

      btn.style.pointerEvents = banned && !cb.checked ? "none" : "";
      btn.style.opacity = banned && !cb.checked ? "0.4" : "";
    }

    input.addEventListener("input", update);
    cb.addEventListener("change", update);
    update();
  }

  function run() {
    initFriendsPage();
    initProfilePage();
  }

  new MutationObserver(run).observe(document.body, {
    childList: true,
    subtree: true,
  });
  run();
})();
