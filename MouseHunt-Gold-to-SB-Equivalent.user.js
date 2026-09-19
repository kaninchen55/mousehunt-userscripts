// ==UserScript==
// @name         MouseHunt - Gold to SB+ equivalent
// @version      1.0.2
// @namespace    https://greasyfork.org/en/users/735492-mouseindustry
// @author       mouseindustry
// @description  Shows SB+ equivalent after gold in HUD and journal entries
// @match        https://www.mousehuntgame.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Gold-to-SB-Equivalent.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Gold-to-SB-Equivalent.user.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const API_URL = "https://markethunt.win/api/items/114";
  const CACHE_KEY = "mh_sb_price_cache";
  const SB_URL =
    "https://www.mousehuntgame.com/item.php?item_type=super_brie_cheese";

  async function fetchSBPrice() {
    try {
      const data = await fetch(API_URL).then((r) => r.json());
      return data.market_data?.at(-1)?.price || null;
    } catch (e) {
      console.error("[Gold→SB+] API error:", e);
      return null;
    }
  }

  async function getSBPrice() {
    const utcDate = new Date().toISOString().slice(0, 10);
    const cache = GM_getValue(CACHE_KEY, null);

    if (cache?.date === utcDate && cache?.price) return cache.price;

    const firstPrice = await fetchSBPrice();
    if (!firstPrice) return cache?.price || null;

    const secondPrice = await fetchSBPrice();
    const finalPrice = secondPrice || firstPrice;

    GM_setValue(CACHE_KEY, {
      date: utcDate,
      price: finalPrice,
      firstPrice,
      secondPrice,
    });

    console.log(
      `[Gold→SB+] UTC ${utcDate}: first=${firstPrice}, second=${secondPrice}, using=${finalPrice}`,
    );
    return finalPrice;
  }

  function processGold(sbPrice) {
    document
      .querySelectorAll(".mh-ui-gold:not([data-sb-processed])")
      .forEach((goldEl) => {
        const gold = parseInt(goldEl.textContent.replace(/,/g, ""), 10);
        if (isNaN(gold)) return;

        let node = goldEl.nextSibling;
        while (node && node.nodeType !== Node.TEXT_NODE)
          node = node.nextSibling;
        if (!node) return;

        const match = node.textContent.match(/^(\s*gold\b)([\s\S]*)$/i);
        if (!match) return;

        const sb = (gold / sbPrice).toFixed(2);

        const wrapper = document.createElement("span");
        wrapper.dataset.sbValue = "1";

        const link = document.createElement("a");
        link.className = "item";
        link.href = SB_URL;
        link.setAttribute(
          "onclick",
          "hg.views.ItemView.show('super_brie_cheese'); return false;",
        );
        link.textContent = "SUPER|brie+";

        wrapper.append(
          document.createTextNode(` (${sb} `),
          link,
          document.createTextNode(")"),
        );

        node.textContent = match[1];
        node.parentNode.insertBefore(wrapper, node.nextSibling);

        if (match[2])
          node.parentNode.insertBefore(
            document.createTextNode(match[2]),
            wrapper.nextSibling,
          );

        goldEl.dataset.sbProcessed = "1";
      });
  }

  function addSBEquivalentRow(sbPrice) {
    document
      .querySelectorAll(".mousehuntHud-userStat-row.gold")
      .forEach((goldRow) => {
        if (goldRow.parentElement.querySelector(".sb-equivalent")) return;

        const goldEl = goldRow.querySelector(".hud_gold");
        if (!goldEl) return;

        const gold = parseInt(goldEl.textContent.replace(/,/g, ""), 10);
        if (isNaN(gold)) return;

        const row = document.createElement("div");
        row.className = "mousehuntHud-userStat-row sb-equivalent";

        const label = document.createElement("span");
        label.className = "label";
        label.textContent = "SB+ eq.";

        const value = document.createElement("span");
        value.className = "value";
        value.textContent = (gold / sbPrice).toFixed(2);

        row.append(label, value);
        goldRow.after(row);
      });
  }

  async function init() {
    const sbPrice = await getSBPrice();
    if (!sbPrice) return;

    processGold(sbPrice);
    addSBEquivalentRow(sbPrice);

    const observer = new MutationObserver(() => {
      processGold(sbPrice);
      addSBEquivalentRow(sbPrice);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  init();
})();
