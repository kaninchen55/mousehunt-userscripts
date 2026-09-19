// ==UserScript==
// @name         MouseHunt - Daily Draw Fav
// @namespace    https://www.mousehuntgame.com/
// @version      1.1.1
// @author       mouseindustry
// @description  Favourite your friends and put them on top in the daily draw tab
// @match        https://www.mousehuntgame.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Daily-Draw-Fav.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Daily-Draw-Fav.user.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";
  let scheduled = false;
  let lastRun = 0;

  function safeJSON(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const Sent = {
    key: "mhdd_sent",
    data: new Set(safeJSON(GM_getValue("mhdd_sent", "[]"), [])),
    has(id) {
      return this.data.has(id);
    },
    mark(id) {
      if (this.data.has(id)) return;
      this.data.add(id);
      GM_setValue(this.key, JSON.stringify([...this.data]));
    },
  };

  const Favs = {
    key: "mhdd_favs",
    namesKey: "mhdd_fav_names",
    get() {
      return safeJSON(GM_getValue(this.key, "[]"), []);
    },
    has(id) {
      return this.get().includes(id);
    },
    getNames() {
      return safeJSON(GM_getValue(this.namesKey, "{}"), {});
    },
    setName(id, name) {
      const names = this.getNames();
      names[id] = name;
      GM_setValue(this.namesKey, JSON.stringify(names));
    },
    getName(id) {
      return this.getNames()[id] || "";
    },
    toggle(id, name) {
      const favs = new Set(this.get());
      if (favs.has(id)) favs.delete(id);
      else {
        favs.add(id);
        if (name) this.setName(id, name);
      }
      GM_setValue(this.key, JSON.stringify([...favs]));
      return favs.has(id);
    },
  };

  function injectCSS() {
    if (document.getElementById("mhdd-css")) return;
    const style = document.createElement("style");
    style.id = "mhdd-css";
    style.textContent = `
            .mhdd-sent{opacity:0.4!important}
            .mhdd-fav-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:28px!important;height:25px!important;margin-left:8px!important;padding:0!important;border:1px solid #c7a62a!important;border-radius:5px!important;background:#f7f7f7!important;color:#aaa!important;cursor:pointer!important;font-size:17px!important;line-height:1!important;transition:all .12s ease!important;vertical-align:middle!important;box-sizing:border-box!important}
            .mhdd-fav-btn:hover{background:#fff3b0!important;border-color:#d6a900!important;color:#d6a900!important;transform:scale(1.05)!important}
            .mhdd-fav-btn.mhdd-fav{background:#fff0a8!important;border-color:#d6a900!important;color:#e0a800!important;box-shadow:0 0 4px rgba(214,169,0,.35)!important}
            .mhdd-draw-fav{position:absolute!important;left:8px!important;bottom:6px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:2px 7px!important;border:1px solid #c7a62a!important;border-radius:5px!important;background:#fff8cf!important;color:#8a6900!important;font:bold 12px/18px Arial,sans-serif!important;cursor:pointer!important;box-sizing:border-box!important;user-select:none!important;z-index:100!important}
            .mhdd-draw-fav:hover{background:#fff0a8!important}
            .mhdd-fav-popup{position:absolute!important;left:0!important;bottom:30px!important;right:auto!important;top:auto!important;z-index:999999!important;min-width:170px!important;max-width:260px!important;max-height:300px!important;overflow-y:auto!important;padding:5px!important;border:1px solid #c7a62a!important;border-radius:6px!important;background:#fffdf0!important;box-shadow:0 2px 8px rgba(0,0,0,.25)!important;font:13px/18px Arial,sans-serif!important;box-sizing:border-box!important}
            .mhdd-popup-title{padding:3px 5px 5px!important;border-bottom:1px solid #ddd0a0!important;color:#806400!important;font-weight:bold!important}
            .mhdd-popup-item{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:4px 5px!important;border-bottom:1px solid #eee8cf!important}
            .mhdd-popup-item:last-child{border-bottom:0!important}
            .mhdd-popup-name{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
            .mhdd-popup-unstar{flex:0 0 auto!important;border:0!important;background:none!important;color:#d6a900!important;cursor:pointer!important;padding:1px 3px!important;font-size:16px!important;line-height:16px!important}
            .mhdd-popup-unstar:hover{color:#b00000!important}
            .mhdd-popup-empty{padding:6px!important;color:#888!important;text-align:center!important}
        `;
    document.head.appendChild(style);
  }

  function getDrawRoot() {
    return document.querySelector("#messengerUINotification");
  }

  function isDailyDrawActive() {
    return !!document.querySelector('.tab.active[data-tab="daily_draw"]');
  }

  function scheduleProcess(delay = 120) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      const now = Date.now();
      if (now - lastRun < 250) return;
      lastRun = now;
      process();
    }, delay);
  }

  function closePopup() {
    document.querySelector(".mhdd-fav-popup")?.remove();
  }

  function showPopup() {
    if (!isDailyDrawActive()) return;
    const root = getDrawRoot();
    const counter = root?.querySelector(".mhdd-draw-fav");
    if (!counter) return;

    counter.querySelector(".mhdd-fav-popup")?.remove();

    const popup = document.createElement("div");
    popup.className = "mhdd-fav-popup";

    const favs = Favs.get();
    const title = document.createElement("div");
    title.className = "mhdd-popup-title";
    title.textContent = `Favourites (${favs.length})`;
    popup.appendChild(title);

    if (!favs.length) {
      const empty = document.createElement("div");
      empty.className = "mhdd-popup-empty";
      empty.textContent = "No favourites";
      popup.appendChild(empty);
    } else {
      favs.forEach((id) => {
        const item = document.createElement("div");
        item.className = "mhdd-popup-item";

        const name = document.createElement("span");
        name.className = "mhdd-popup-name";
        name.textContent = Favs.getName(id) || "Unknown";

        const unstar = document.createElement("button");
        unstar.type = "button";
        unstar.className = "mhdd-popup-unstar";
        unstar.textContent = "★";
        unstar.title = "Remove from favourites";

        unstar.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          Favs.toggle(id);
          updateCounter();
          showPopup();
          scheduleProcess(0);
        });

        item.append(name, unstar);
        popup.appendChild(item);
      });
    }

    counter.appendChild(popup);
  }

  function updateCounter() {
    const counter = getDrawRoot()?.querySelector(".mhdd-draw-fav");
    const label = counter?.querySelector(".mhdd-draw-fav-label");
    if (label) label.textContent = `★ ${Favs.get().length}`;
  }

  function createCounter() {
    const root = getDrawRoot();
    let counter = root?.querySelector(".mhdd-draw-fav");

    if (!root || !isDailyDrawActive()) {
      if (counter) counter.remove();
      closePopup();
      return;
    }

    if (getComputedStyle(root).position === "static")
      root.style.position = "relative";

    if (!counter) {
      counter = document.createElement("div");
      counter.className = "mhdd-draw-fav";
      counter.title = "Show favourites";

      const label = document.createElement("span");
      label.className = "mhdd-draw-fav-label";
      counter.appendChild(label);

      counter.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDailyDrawActive()) return;
        if (counter.querySelector(".mhdd-fav-popup")) closePopup();
        else showPopup();
      });

      counter.addEventListener("mouseenter", () => {
        if (!isDailyDrawActive()) return;
        if (!counter.querySelector(".mhdd-fav-popup")) showPopup();
      });

      root.appendChild(counter);
    }

    counter.style.display = isDailyDrawActive() ? "inline-flex" : "none";
    updateCounter();
  }

  function sortMessages(root) {
    if (!isDailyDrawActive()) return;

    const msgs = [
      ...root.querySelectorAll(".message.daily_draw.notification.ballot"),
    ];
    if (msgs.length < 2) return;

    const parent = msgs[0].parentElement;
    if (!parent) return;

    msgs.sort((a, b) => {
      const favA = Favs.has(a.dataset.mhId) ? 1 : 0;
      const favB = Favs.has(b.dataset.mhId) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return (
        Number(b.dataset.timestamp || 0) - Number(a.dataset.timestamp || 0)
      );
    });

    const fragment = document.createDocumentFragment();
    msgs.forEach((msg) => fragment.appendChild(msg));

    const empty = parent.querySelector(".empty");
    if (empty) parent.insertBefore(fragment, empty);
    else parent.appendChild(fragment);
  }

  function process() {
    injectCSS();

    if (!isDailyDrawActive()) {
      closePopup();
      getDrawRoot()?.querySelector(".mhdd-draw-fav")?.remove();
      return;
    }

    createCounter();

    const root = getDrawRoot() || document.body;
    const msgs = root.querySelectorAll(
      ".message.daily_draw.notification.ballot",
    );

    msgs.forEach((msg) => {
      const sendBtn = msg.querySelector(".sendBallot");
      const id = sendBtn?.dataset?.sender;
      if (!id) return;

      const name =
        msg.querySelector('a[href*="profile.php"]')?.textContent?.trim() ||
        "Unknown";
      msg.dataset.mhId = id;
      msg.dataset.mhName = name;
      msg.classList.toggle("mhdd-sent", Sent.has(id));

      let btn = msg.querySelector(".mhdd-fav-btn");

      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mhdd-fav-btn";

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const fav = Favs.toggle(id, name);
          btn.classList.toggle("mhdd-fav", fav);
          btn.textContent = fav ? "★" : "☆";
          btn.title = fav
            ? `Remove ${name} from favorites`
            : `Add ${name} to favorites`;

          updateCounter();

          if (getDrawRoot()?.querySelector(".mhdd-fav-popup")) showPopup();

          scheduleProcess(20);
        });

        msg.appendChild(btn);
      }

      const fav = Favs.has(id);
      if (fav) Favs.setName(id, name);

      btn.classList.toggle("mhdd-fav", fav);
      btn.textContent = fav ? "★" : "☆";
      btn.title = fav
        ? `Remove ${name} from favorites`
        : `Add ${name} to favorites`;
    });

    updateCounter();
    sortMessages(root);
  }

  function init() {
    injectCSS();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList" || !m.addedNodes.length) continue;
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (
            n.matches?.(
              "#messengerUINotification,.message.ballot,.notification,.tab",
            ) ||
            n.querySelector?.(
              "#messengerUINotification,.message.ballot,.notification,.tab",
            )
          ) {
            scheduleProcess(100);
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", (e) => {
      const tab = e.target.closest(".tab[data-tab]");
      if (tab) {
        if (tab.dataset.tab === "daily_draw") scheduleProcess(150);
        else {
          closePopup();
          getDrawRoot()?.querySelector(".mhdd-draw-fav")?.remove();
        }
        return;
      }
      if (!e.target.closest(".mhdd-draw-fav")) closePopup();
    });

    setTimeout(() => scheduleProcess(0), 400);
  }

  init();
})();
