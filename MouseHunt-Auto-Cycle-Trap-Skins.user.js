// ==UserScript==
// @name         MouseHunt - Auto Cycle Trap Skins
// @namespace    https://www.mousehuntgame.com/
// @description  Auto cycle available trap skins
// @version      1.0.0
// @match        https://www.mousehuntgame.com/*
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Auto-Cycle-Trap-Skins.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-Auto-Cycle-Trap-Skins.user.js
// @grant        unsafeWindow
// ==/UserScript==

(() => {
  const w = unsafeWindow;

  const HORNS_PER_CHANGE = 1; // 1 = every horn, 4 = every 4 horns
  const RANDOM_SKIN = 1; // 1 = random, 0 = sequential

  let skins = [];
  let index = 0;
  let horns = 0;
  let lastIndex = -1;

  function load() {
    w.hg.utils.UserInventory.getItemsByClass("skin", true, (data) => {
      skins = data.filter((s) => s.component_name === w.user.weapon_name);
      index = 0;
    });
  }

  function cycle() {
    if (!skins.length) return;

    let selected;

    if (RANDOM_SKIN) {
      let newIndex;

      do {
        newIndex = Math.floor(Math.random() * skins.length);
      } while (skins.length > 1 && newIndex === lastIndex);

      lastIndex = newIndex;
      selected = skins[newIndex];
    } else {
      selected = skins[index++ % skins.length];
    }

    w.hg.utils.TrapControl.setSkin(selected.type);
    w.component = selected.component_type;
    w.hg.utils.TrapControl.go();
  }

  load();

  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._mhActiveturn =
      url && url.includes("/managers/ajax/turns/activeturn.php");

    return originalOpen.apply(this, arguments);
  };

  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function () {
    if (this._mhActiveturn) {
      this.addEventListener("load", () => {
        horns++;

        if (horns >= HORNS_PER_CHANGE) {
          horns = 0;
          setTimeout(cycle, 1000);
        }
      });
    }

    return originalSend.apply(this, arguments);
  };
})();
