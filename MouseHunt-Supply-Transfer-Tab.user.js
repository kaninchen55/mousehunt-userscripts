// ==UserScript==
// @name         Mousehunt - Supply Transfer Tab
// @namespace    https://greasyfork.org/en/users/735492-mouseindustry
// @author       mouseindustry
// @version      1.1.1
// @description  Adds a Supply Transfers tab to the MouseHunt messenger notification panel.
// @match        https://www.mousehuntgame.com/*
// @match        http://www.mousehuntgame.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Supply-Transfer-Tab.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Supply-Transfer-Tab.user.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  /* ═══════════════ CONSTANTS ═══════════════ */

  const STORAGE_KEY = "mh_supply_transfers";
  const DISCORD_KEY = "mh_supply_discord";
  const NOTES_KEY = "mh_supply_notes";
  const FILTER_KEY = "mh_supply_filter";
  const PANEL_ID = "messengerUINotification";
  const TAB_BTN_ID = "mh-transfer-tab-btn";
  const TAB_PANE_ID = "mh-transfer-tab-pane";
  const FILTER_ID = "mh-transfer-filter";
  const TAB_KEY = "supply_transfers";

  /* ═══════════════ STORAGE ═══════════════ */

  const ls = {
    get(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        return {};
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };

  /* ═══════════════ STYLES ═══════════════ */

  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
 
        .mh-transfer-arrow {
            font-size:18px;
            font-weight:900;
            margin-right:5px;
            vertical-align:middle;
            -webkit-text-stroke:1px currentColor;
        }
 
        .mh-discord-wrap {
            display:inline-block;
            margin-left:6px;
            vertical-align:middle;
        }
 
        .mh-discord-label {
            font-size:11px;
            color:#5865F2;
            cursor:pointer;
        }
 
        .mh-discord-label:hover {
            color:#4752c4;
        }
 
        .mh-transfer-discord {
            font-size:11px !important;
            padding:1px 3px !important;
            border:none !important;
            border-radius:0 !important;
            box-shadow:none !important;
            background:transparent !important;
            outline:none !important;
            width:100px !important;
            color:#7289da !important;
        }
 
        .mh-transfer-discord::placeholder {
            color:#bbb;
        }
 
        body.mh-dark .mh-discord-label {
            color:#7289da;
        }
 
        body.mh-dark .mh-discord-label:hover {
            color:#8ea1e1;
        }
 
        .mh-transfer-date-row {
            display:flex;
            align-items:center;
            gap:6px;
            margin-top:2px;
        }
 
        .mh-transfer-note {
            font-size:11px !important;
            padding:1px 3px !important;
            border:none !important;
            border-radius:0 !important;
            box-shadow:none !important;
            background:transparent !important;
            outline:none !important;
            flex:1;
            color:#555 !important;
        }
 
        .mh-transfer-note::placeholder {
            color:#ccc !important;
        }
 
 
        /* ═══════════════ FILTER ═══════════════ */
 
        #mh-transfer-filter {
            position:absolute !important;
            left:8px !important;
            bottom:6px !important;
            z-index:1000 !important;
            display:none;
            flex-direction:column;
            align-items:flex-start;
            gap:3px;
            width:134px !important;
            max-width:134px !important;
            box-sizing:border-box;
            padding:4px 6px;
            background:rgba(255,255,255,.96);
            border:1px solid #bbb;
            border-radius:3px;
            box-shadow:0 1px 4px rgba(0,0,0,.25);
            font-size:11px;
        }
 
        #mh-transfer-filter.visible {
            display:flex !important;
        }
 
        #mh-transfer-filter .mh-filter-row {
            display:flex;
            align-items:center;
            width:100%;
            box-sizing:border-box;
        }
 
        #mh-transfer-filter select,
        #mh-transfer-filter input {
            height:22px;
            box-sizing:border-box;
            font-size:11px;
            padding:1px 4px;
            width:100% !important;
            max-width:100% !important;
        }
 
        #mh-transfer-filter select {
            width:100%;
        }
 
        #mh-transfer-filter .mh-filter-search {
            width:100% !important;
            max-width:100% !important;
        }
 
        #mh-transfer-filter .mh-filter-custom {
            display:none;
            flex-direction:column;
            align-items:stretch;
            gap:3px;
            width:100%;
        }
 
        #mh-transfer-filter .mh-filter-custom.visible {
            display:flex;
        }
 
        #mh-transfer-filter .mh-filter-custom input {
            width:100% !important;
            max-width:100% !important;
        }
 
 
        /* ═══════════════ DARK MODE ═══════════════ */
 
        body.mh-dark #messengerUINotification #mh-transfer-filter,
        body.mh-dark-mode #messengerUINotification #mh-transfer-filter {
            background:#262b33;
            border-color:#555;
            color:#dcddde;
        }
 
        body.mh-dark #messengerUINotification #mh-transfer-filter input,
        body.mh-dark #messengerUINotification #mh-transfer-filter select,
        body.mh-dark-mode #messengerUINotification #mh-transfer-filter input,
        body.mh-dark-mode #messengerUINotification #mh-transfer-filter select {
            background:#343942;
            color:#dcddde;
            border-color:#555;
        }
 
        body.mh-dark #messengerUINotification .mh-transfer-note,
        body.mh-dark-mode #messengerUINotification .mh-transfer-note {
            color:#dcddde !important;
        }
 
        body.mh-dark #messengerUINotification .mh-transfer-note::placeholder,
        body.mh-dark-mode #messengerUINotification .mh-transfer-note::placeholder {
            color:#777 !important;
        }
 
    </style>`,
  );

  /* ═══════════════ HELPERS ═══════════════ */

  const todayStr = () => {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function extractSnuid(html) {
    const snuidMatch = html.match(/snuid=([^"&\s]+)/);
    const profileMatch = html.match(/hunterprofile\.php\?snuid=([^"&\s]+)/);
    const pidMatch = html.match(/p\.php\?id=([^"&\s]+)/);

    return (
      snuidMatch?.[1] ||
      profileMatch?.[1] ||
      (pidMatch ? "pid_" + pidMatch[1] : null)
    );
  }

  function parseEntryDate(entry) {
    if (!entry.dateText) {
      return null;
    }

    const parsed = new Date(entry.dateText);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    parsed.setHours(12, 0, 0, 0);

    return parsed;
  }

  const filterState = {
    getPreset() {
      const saved = ls.get(FILTER_KEY);
      if (["5", "10", "month", "all"].includes(saved.preset)) {
        return saved.preset;
      }
      return "5";
    },

    setPreset(preset) {
      if (!["5", "10", "month", "all"].includes(preset)) {
        return;
      }
      ls.set(FILTER_KEY, { preset });
    },
  };

  function matchesPreset(entry, preset) {
    const date = parseEntryDate(entry);

    if (preset === "all") {
      return true;
    }

    if (!date) {
      return true;
    }

    const now = new Date();

    now.setHours(23, 59, 59, 999);

    if (preset === "month") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
      );

      start.setHours(0, 0, 0, 0);

      return date >= start && date <= now;
    }

    const days = Number(preset);

    if (!days) {
      return true;
    }

    const start = new Date(now);

    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return date >= start && date <= now;
  }

  function matchesCustomDate(entry, fromValue, toValue) {
    const date = parseEntryDate(entry);

    if (!date) {
      return true;
    }

    if (!fromValue && !toValue) {
      return true;
    }

    if (fromValue) {
      const from = new Date(fromValue + "T00:00:00");

      if (date < from) {
        return false;
      }
    }

    if (toValue) {
      const to = new Date(toValue + "T23:59:59");

      if (date > to) {
        return false;
      }
    }

    return true;
  }

  function matchesSearch(entry, search) {
    if (!search) {
      return true;
    }

    const needle = search.toLowerCase();

    const body = (entry.bodyHTML || "").replace(/<[^>]*>/g, " ").toLowerCase();

    const notes = (ls.get(NOTES_KEY)[entry.id] || "").toLowerCase();

    return body.includes(needle) || notes.includes(needle);
  }

  function createFilterUI(panel) {
    let filter = panel.querySelector(`#${FILTER_ID}`);

    if (filter) {
      return filter;
    }

    if (getComputedStyle(panel).position === "static") {
      panel.style.position = "relative";
    }

    filter = document.createElement("div");

    filter.id = FILTER_ID;

    filter.innerHTML = `
            <div class="mh-filter-row">
                <select class="mh-filter-preset">
                    <option value="5">Last 5 days</option>
                    <option value="10">Last 10 days</option>
                    <option value="month">Last 1 month</option>
                    <option value="all">All</option>
                    <option value="custom">Custom dates</option>
                </select>
            </div>
 
            <div class="mh-filter-custom">
                <div class="mh-filter-row">
                    <input type="date" class="mh-filter-from">
                </div>
 
                <div class="mh-filter-row">
                    <input type="date" class="mh-filter-to">
                </div>
            </div>
 
            <div class="mh-filter-row">
                <input type="text" class="mh-filter-search" placeholder="Search name / notes...">
            </div>
        `;

    panel.appendChild(filter);

    setupFilterEvents(filter);

    const preset = filter.querySelector(".mh-filter-preset");

    preset.value = filterState.getPreset();

    updateCustomVisibility(filter);

    return filter;
  }

  function updateCustomVisibility(filter) {
    const preset = filter.querySelector(".mh-filter-preset");
    const customRow = filter.querySelector(".mh-filter-custom");

    if (preset.value === "custom") {
      customRow.classList.add("visible");
    } else {
      customRow.classList.remove("visible");
    }
  }

  function setupFilterEvents(filter) {
    const preset = filter.querySelector(".mh-filter-preset");
    const from = filter.querySelector(".mh-filter-from");
    const to = filter.querySelector(".mh-filter-to");
    const search = filter.querySelector(".mh-filter-search");

    preset.addEventListener("change", () => {
      updateCustomVisibility(filter);

      if (preset.value !== "custom") {
        filterState.setPreset(preset.value);
      }

      renderTab();
    });

    from.addEventListener("change", () => {
      renderTab();
    });

    to.addEventListener("change", () => {
      renderTab();
    });

    search.addEventListener("input", () => {
      renderTab();
    });
  }

  function updateFilterVisibility() {
    const panel = document.getElementById(PANEL_ID);

    if (!panel) {
      return;
    }

    const filter = panel.querySelector(`#${FILTER_ID}`);

    if (!filter) {
      return;
    }

    const btn = panel.querySelector(`#${TAB_BTN_ID}`);
    const pane = panel.querySelector(`#${TAB_PANE_ID}`);

    const active =
      btn?.classList.contains("active") && pane?.classList.contains("active");

    filter.classList.toggle("visible", !!active);
  }

  function scanJournal() {
    const liveEls = [
      ...document.querySelectorAll("div.entry.short.supplytransferitem"),
    ].filter((el) => !el.closest(`#${TAB_PANE_ID}`));

    if (!liveEls.length) {
      return;
    }

    const store = ls.get(STORAGE_KEY);

    let changed = false;

    liveEls.forEach((el) => {
      const id = el.getAttribute("data-entry-id");

      if (!id || store[id]) {
        return;
      }

      const journalText = el.querySelector(".journaltext");
      const html = journalText?.innerHTML || "";

      store[id] = {
        id,
        timeText: (
          el.querySelector(".journaldate")?.textContent?.trim() || ""
        ).replace(/-\s*$/, ""),
        envText:
          el.querySelector(".journalenvironment")?.textContent?.trim() || "",
        dateText:
          el.querySelector(".history-timestamp")?.textContent?.trim() ||
          todayStr(),
        bodyHTML: html.trim(),
        snuid: extractSnuid(html),
      };

      changed = true;
    });

    if (changed) {
      ls.set(STORAGE_KEY, store);
      renderTab();
    }
  }

  const scanWithDelay = () => {
    scanJournal();
    setTimeout(scanJournal, 500);
  };

  function renderTab() {
    const panel = document.getElementById(PANEL_ID);

    if (!panel) {
      return;
    }

    const tabsBar = panel.querySelector(".notificationHeader .tabs");
    const msgList = panel.querySelector(".notificationMessageList");

    if (!tabsBar || !msgList) {
      waitForPanelReady(panel);
      return;
    }

    ensureTab(panel, tabsBar, msgList);

    const pane = panel.querySelector(`#${TAB_PANE_ID}`);
    const btn = panel.querySelector(`#${TAB_BTN_ID}`);

    if (!pane || !btn) {
      return;
    }

    const filter = createFilterUI(panel);

    const preset = filter.querySelector(".mh-filter-preset").value;
    const from = filter.querySelector(".mh-filter-from").value;
    const to = filter.querySelector(".mh-filter-to").value;
    const search = filter
      .querySelector(".mh-filter-search")
      .value.trim()
      .toLowerCase();

    const store = ls.get(STORAGE_KEY);
    const discord = ls.get(DISCORD_KEY);
    const notes = ls.get(NOTES_KEY);

    let sorted = Object.values(store).sort(
      (a, b) => Number(b.id) - Number(a.id),
    );

    if (preset === "custom") {
      sorted = sorted.filter((entry) => {
        return matchesCustomDate(entry, from, to);
      });
    } else {
      sorted = sorted.filter((entry) => {
        return matchesPreset(entry, preset);
      });
    }

    if (search) {
      sorted = sorted.filter((entry) => {
        return matchesSearch(entry, search);
      });
    }

    btn.querySelector(".counter").textContent = sorted.length;

    if (!sorted.length) {
      pane.innerHTML = '<div class="empty">No supply transfers found.</div>';
      updateFilterVisibility();
      return;
    }

    const today = todayStr();

    pane.innerHTML = sorted
      .map((entry) => {
        const isSent = (entry.bodyHTML || "").toLowerCase().includes("i sent");

        const arrow = `
                <span
                    class="mh-transfer-arrow"
                    style="color:${isSent ? "#cc0000" : "#008000"};"
                >${isSent ? "&#9664;" : "&#9654;"}</span>
            `;

        const dateLabel =
          entry.dateText === today ? "Today" : entry.dateText || today;

        const timeLabel = (entry.timeText || "").replace(/-\s*$/, "");

        const dKey = entry.snuid || null;

        const dVal = dKey ? discord[dKey] || "" : "";

        const discordHTML = !dKey
          ? ""
          : dVal
            ? `
                        <span
                            class="mh-discord-label"
                            data-discord-key="${escapeHTML(dKey)}"
                            data-entry-id="${escapeHTML(entry.id)}"
                        >${escapeHTML(dVal)}</span>
                    `
            : `
                        <input
                            type="text"
                            class="mh-transfer-discord"
                            data-discord-key="${escapeHTML(dKey)}"
                            data-entry-id="${escapeHTML(entry.id)}"
                            placeholder="Discord"
                            value=""
                        />
                    `;

        const noteVal = (notes[entry.id] || "").replace(/"/g, "&quot;");

        return `
                <div class="message daily_draw notification mh-transfer-row">
 
                    <div class="clear-block">
                        <span class="messageText">
                            ${arrow}${entry.bodyHTML || ""}
                        </span>
 
                        <span class="mh-discord-wrap">
                            ${discordHTML}
                        </span>
                    </div>
 
                    <div class="mh-transfer-date-row">
                        <span class="date" style="flex-shrink:0;">
                            ${dateLabel} - ${timeLabel}
                        </span>
 
                        <input
                            type="text"
                            class="mh-transfer-note"
                            data-entry-id="${escapeHTML(entry.id)}"
                            placeholder="notes..."
                            value="${noteVal}"
                        />
                    </div>
 
                </div>
            `;
      })
      .join("");

    attachEvents(pane);

    updateFilterVisibility();
  }

  function attachEvents(pane) {
    pane.querySelectorAll(".mh-transfer-row").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        row.classList.add("hover");
      });

      row.addEventListener("mouseleave", () => {
        row.classList.remove("hover");
      });
    });

    function commitDiscord(input) {
      const key = input.dataset.discordKey;
      const val = input.value.trim();

      if (!key) {
        return;
      }

      const map = ls.get(DISCORD_KEY);

      map[key] = val;

      ls.set(DISCORD_KEY, map);

      if (val) {
        pane
          .querySelectorAll(`.mh-transfer-discord[data-discord-key="${key}"]`)
          .forEach((el) => {
            const label = document.createElement("span");

            label.className = "mh-discord-label";
            label.textContent = val;
            label.dataset.discordKey = key;
            label.dataset.entryId = el.dataset.entryId;

            el.parentNode.replaceChild(label, el);
          });

        pane
          .querySelectorAll(`.mh-discord-label[data-discord-key="${key}"]`)
          .forEach((el) => {
            el.textContent = val;
          });
      }
    }

    function makeDiscordInput(key, entryId, val) {
      const input = Object.assign(document.createElement("input"), {
        type: "text",
        className: "mh-transfer-discord",
        value: val,
      });

      input.dataset.discordKey = key;
      input.dataset.entryId = entryId;

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitDiscord(input);
        }
      });

      input.addEventListener("blur", () => {
        commitDiscord(input);
      });

      return input;
    }

    pane.querySelectorAll(".mh-transfer-discord").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitDiscord(input);
        }
      });

      input.addEventListener("blur", () => {
        commitDiscord(input);
      });
    });

    pane.addEventListener("click", (e) => {
      const label = e.target.closest(".mh-discord-label");

      if (!label) {
        return;
      }

      const input = makeDiscordInput(
        label.dataset.discordKey,
        label.dataset.entryId,
        label.textContent,
      );

      label.parentNode.replaceChild(input, label);

      input.focus();
      input.select();
    });

    pane.querySelectorAll(".mh-transfer-note").forEach((input) => {
      input.addEventListener("change", function () {
        const map = ls.get(NOTES_KEY);

        map[this.dataset.entryId] = this.value.trim();

        ls.set(NOTES_KEY, map);

        const filter = document.getElementById(FILTER_ID);
        const search = filter?.querySelector(".mh-filter-search");

        if (search?.value.trim()) {
          renderTab();
        }
      });
    });
  }

  function waitForPanelReady(panel) {
    const obs = new MutationObserver(() => {
      if (
        panel.querySelector(".notificationHeader .tabs") &&
        panel.querySelector(".notificationMessageList")
      ) {
        obs.disconnect();
        renderTab();
      }
    });

    obs.observe(panel, {
      childList: true,
      subtree: true,
    });
  }

  function ensureTab(panel, tabsBar, msgList) {
    if (panel.querySelector(`#${TAB_BTN_ID}`)) {
      return;
    }

    const pane = Object.assign(document.createElement("div"), {
      id: TAB_PANE_ID,
      className: "tab",
      innerHTML: '<div class="empty">No supply transfers found.</div>',
    });

    pane.dataset.tab = TAB_KEY;

    msgList.appendChild(pane);

    const btn = Object.assign(document.createElement("a"), {
      id: TAB_BTN_ID,
      href: "#",
      className: "tab",
      innerHTML: `
                    Supply Transfers
                    <div class="counter">0</div>
                    <div class="arrowShadow"></div>
                    <div class="arrow"></div>
                `,
    });

    btn.dataset.tab = TAB_KEY;

    btn.onclick = (e) => {
      e.preventDefault();

      if (window.messenger?.UI?.notification?.showTab) {
        messenger.UI.notification.showTab(TAB_KEY);

        setTimeout(() => {
          renderTab();
          updateFilterVisibility();
        }, 0);

        return;
      }

      panel.querySelectorAll(".notificationHeader .tabs a.tab").forEach((a) => {
        a.classList.remove("active");
      });

      panel.querySelectorAll(".notificationMessageList .tab").forEach((p) => {
        p.classList.remove("active");
      });

      btn.classList.add("active");
      pane.classList.add("active");

      renderTab();
      updateFilterVisibility();
    };

    tabsBar.appendChild(btn);
  }

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) {
          continue;
        }

        if (node.id === PANEL_ID || node.querySelector?.(`#${PANEL_ID}`)) {
          renderTab();
          setTimeout(scanJournal, 500);
          return;
        }
      }
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  new MutationObserver(() => {
    updateFilterVisibility();
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  /* ═══════════════ INITIALIZE ═══════════════ */

  if (window.jQuery) {
    $(document).ready(scanWithDelay);
    $(document).ajaxSuccess(scanWithDelay);
  } else {
    scanWithDelay();
  }
})();
