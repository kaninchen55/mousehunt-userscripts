// ==UserScript==
// @name         MouseHunt - All Trap Skins
// @namespace    https://www.mousehuntgame.com/
// @version      1.1
// @description  Switch MouseHunt trap skins between Server Mode and Client Mode. Server Mode uses the skin actually armed in MouseHunt, while Client Mode lets you display any OWNED or UNOWNED skin locally without changing the server-side skin.
// @author       mouseindustry
// @license      MIT
// @match        https://www.mousehuntgame.com/*
// @updateURL    https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-All-Trap-Skins.user.js
// @downloadURL  https://raw.githubusercontent.com/kaninchen55/mousehunt-userscripts/main/MouseHunt-All-Trap-Skins.user.js
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const KEY = "mh_skin_modes";
  let mode = "server",
    currentWeaponId = null,
    processTimer = null,
    imageTimer = null,
    serverTimer = null,
    animationBusy = false;
  let storageCache = null,
    browserCache = null;

  const getData = () => {
    if (storageCache) return storageCache;
    try {
      storageCache = JSON.parse(localStorage.getItem(KEY) || '{"weapons":{}}');
    } catch {
      storageCache = { weapons: {} };
    }
    if (!storageCache.weapons) storageCache.weapons = {};
    return storageCache;
  };
  const saveData = (data) => {
    storageCache = data;
    localStorage.setItem(KEY, JSON.stringify(data));
  };
  const getWeaponId = () =>
    window.user?.weapon_item_id || window.hg?.user?.weapon_item_id || null;
  const getBrowser = () => {
    if (browserCache?.isConnected) return browserCache;
    browserCache = document.querySelector(
      '.trapSelectorView__browserStateParent--items[data-blueprint-type="skin"] .trapSelectorView__itemBrowserContainer.campPage-trap-itemBrowser.skin',
    );
    return browserCache;
  };
  const invalidateBrowser = () => {
    browserCache = null;
  };

  const getWeaponData = () => {
    const data = getData(),
      id = String(currentWeaponId);
    if (!data.weapons[id]) {
      data.weapons[id] = {
        mode: "server",
        serverSkin: null,
        clientSkin: null,
        clientTrapImage: null,
        clientThumbnail: null,
      };
      saveData(data);
    }
    return data.weapons[id];
  };

  const saveWeaponData = (changes) => {
    if (!currentWeaponId) return;
    const data = getData(),
      id = String(currentWeaponId);
    data.weapons[id] = { ...(data.weapons[id] || {}), ...changes };
    saveData(data);
  };

  const getServerSkin = () => {
    const browser = getBrowser();
    if (!browser) return null;
    const armed = browser.querySelector(
      ".campPage-trap-itemBrowser-item.skin.armed[data-item-id]",
    );
    return (
      armed?.dataset.itemId ||
      browser.querySelector(
        '.campPage-trap-itemBrowser-armed-item-disarmButton[data-item-classification="skin"]',
      )?.dataset.itemId ||
      null
    );
  };

  const getTrapImage = () =>
    document.querySelector(".trapImageView-layer.weapon");
  const getSummaryImage = () =>
    document.querySelector(
      '.trapSelectorView__armedItem[data-item-classification="skin"] .armedItemImage,.trapSelectorView__armedItem[data-item-classification="skin"] .trapSelectorView__armedItemImage',
    );

  const setBusy = (busy) => {
    animationBusy = busy;
    document
      .querySelectorAll(".mh-client-arm")
      .forEach((button) => button.classList.toggle("mh-client-arm-busy", busy));
  };

  const saveServer = (id) => {
    if (id) saveWeaponData({ serverSkin: id });
  };

  const syncServer = () => {
    const id = getServerSkin();
    if (id) saveServer(id);
    return id || getWeaponData().serverSkin || null;
  };

  const saveClient = (id, trapImage, thumbnail) => {
    if (id && trapImage && thumbnail)
      saveWeaponData({
        clientSkin: id,
        clientTrapImage: trapImage,
        clientThumbnail: thumbnail,
      });
  };

  const setBackground = (element, url) => {
    if (element && url && element.style.backgroundImage !== `url("${url}")`)
      element.style.backgroundImage = `url("${url}")`;
  };

  const applyClientImages = (trapImage, thumbnail) => {
    if (trapImage) setBackground(getTrapImage(), trapImage);
    if (thumbnail) setBackground(getSummaryImage(), thumbnail);
  };

  const animateImages = (trapImage, thumbnail, done) => {
    if (!trapImage || animationBusy) {
      done?.();
      return;
    }
    const trap = getTrapImage(),
      summary = getSummaryImage();
    setBusy(true);
    const finish = () => {
      setBusy(false);
      done?.();
    };
    if (!trap) {
      setBackground(summary, thumbnail);
      finish();
      return;
    }
    $(trap)
      .stop(true, true)
      .fadeOut(250, function () {
        $(this)
          .css("background-image", `url("${trapImage}")`)
          .fadeIn(250, function () {
            setBackground(summary, thumbnail);
            finish();
          });
      });
  };

  const getSkinImages = (id) => {
    if (!id) return null;
    const item = getBrowser()?.querySelector(
      `.campPage-trap-itemBrowser-item.skin[data-item-id="${id}"]`,
    );
    if (!item) return null;
    const thumbnail =
      item
        .querySelector(
          ".campPage-trap-itemBrowser-item-leftBar .campPage-trap-itemBrowser-item-image",
        )
        ?.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || null;
    const trapImage =
      item.querySelector(".itembrowser-skin-image")?.src || null;
    return thumbnail && trapImage ? { thumbnail, trapImage } : null;
  };

  const animateToServer = () => {
    const data = getWeaponData(),
      serverSkin = getServerSkin() || data.serverSkin;
    if (serverSkin) saveServer(serverSkin);
    const images = getSkinImages(serverSkin);
    if (images) animateImages(images.trapImage, images.thumbnail);
    else setBusy(false);
  };

  const animateToClient = () => {
    const data = getWeaponData();
    if (data.clientTrapImage && data.clientThumbnail)
      animateImages(data.clientTrapImage, data.clientThumbnail);
    else animateToServer();
  };

  const clearClientSkin = () => {
    saveWeaponData({
      clientSkin: null,
      clientTrapImage: null,
      clientThumbnail: null,
    });
    animateToServer();
    updateArmButtons();
  };

  const armServer = (id) => {
    if (!id || animationBusy) return;
    const item = getBrowser()?.querySelector(
      `.campPage-trap-itemBrowser-item.skin[data-item-id="${id}"]`,
    );
    if (!item || item.dataset.mhOriginalUnowned === "1") return;
    hg.utils.TrapControl.setSkin(id);
    saveServer(id);
    const images = getSkinImages(id);
    if (images) animateImages(images.trapImage, images.thumbnail);
    else updateArmButtons();
  };

  const armClient = (id, trapImage, thumbnail) => {
    if (!id || !trapImage || !thumbnail || animationBusy) return;
    saveClient(id, trapImage, thumbnail);
    animateImages(trapImage, thumbnail);
    updateArmButtons();
  };

  const updateArmButtons = () => {
    const browser = getBrowser();
    if (!browser) return;
    const data = getWeaponData(),
      clientSkin = String(data.clientSkin);
    browser.querySelectorAll(".mh-client-arm").forEach((button) => {
      const armed =
        mode === "client" && clientSkin === String(button.dataset.itemId);
      button.textContent = armed ? "Armed" : "Arm";
      button.classList.toggle("mh-client-arm-armed", armed);
      button.classList.toggle("mh-client-arm-busy", animationBusy);
    });
  };

  const addArmButton = (item) => {
    if (item.querySelector(".mh-client-arm")) return;
    const name = item.querySelector(".campPage-trap-itemBrowser-item-name"),
      id = item.dataset.itemId;
    if (!name || !id) return;
    const button = document.createElement("a");
    button.href = "#";
    button.className = "campPage-trap-itemBrowser-item-armButton mh-client-arm";
    button.dataset.itemId = id;
    button.dataset.itemClassification = "skin";
    button.textContent = "Arm";
    name.appendChild(button);
  };

  const setupArmHandler = (browser) => {
    if (browser.dataset.mhArmHandler === "1") return;
    browser.dataset.mhArmHandler = "1";
    browser.addEventListener("click", (e) => {
      const button = e.target.closest(".mh-client-arm");
      if (!button || !browser.contains(button)) return;
      e.preventDefault();
      e.stopPropagation();
      if (animationBusy) return;
      const id = button.dataset.itemId;
      const item = button.closest(".campPage-trap-itemBrowser-item.skin");
      if (mode === "server") {
        if (item?.dataset.mhOriginalUnowned === "1") return;
        armServer(id);
      } else {
        const data = getWeaponData();
        if (String(data.clientSkin) === String(id)) clearClientSkin();
        else {
          const images = getSkinImages(id);
          if (images) armClient(id, images.trapImage, images.thumbnail);
        }
      }
    });
  };

  const updateItems = () => {
    const browser = getBrowser();
    if (!browser) return;
    browser
      .querySelectorAll(".campPage-trap-itemBrowser-item.skin[data-item-id]")
      .forEach((item) => {
        if (
          item.classList.contains("mh-unowned-skin-item") &&
          !item.dataset.mhOriginalUnowned
        )
          item.dataset.mhOriginalUnowned = "1";
        const unowned = item.dataset.mhOriginalUnowned === "1";
        if (mode === "client" && unowned) {
          item.classList.remove("mh-unowned-skin-item", "cannotArm");
          item.classList.add("canArm");
        } else if (mode === "server" && unowned) {
          item.classList.add("mh-unowned-skin-item", "cannotArm");
          item.classList.remove("canArm");
        }
        addArmButton(item);
      });
    setupArmHandler(browser);
    updateArmButtons();
  };

  const createToggle = () => {
    const browser = getBrowser();
    if (!browser) return;
    const filter = browser.querySelector(
      ".trapSelectorView__itemBrowser-filterContainer,.campPage-trap-itemBrowser-filterContainer",
    );
    if (!filter) return;
    let toggle = filter.querySelector(".mh-skin-mode-toggle");
    const random = filter.querySelector(".random-skin-button");
    if (!toggle) {
      toggle = document.createElement("div");
      toggle.className = "mh-skin-mode-toggle";
      toggle.innerHTML =
        '<span class="mh-mode-label mh-server-label">Server</span><label class="mh-switch"><input type="checkbox"><span class="mh-slider"></span></label><span class="mh-mode-label mh-client-label">Client</span>';
      toggle.querySelector("input").addEventListener("change", (e) => {
        if (animationBusy) {
          e.target.checked = mode === "client";
          return;
        }
        switchMode(e.target.checked ? "client" : "server");
      });
    }
    const input = toggle.querySelector("input");
    if (input) input.checked = mode === "client";
    toggle.classList.toggle("mh-mode-server", mode === "server");
    toggle.classList.toggle("mh-mode-client", mode === "client");
    if (random) {
      if (random.nextElementSibling !== toggle)
        random.insertAdjacentElement("afterend", toggle);
    } else if (!filter.contains(toggle)) filter.appendChild(toggle);
  };

  const updateToggle = () => {
    const toggle = getBrowser()?.querySelector(".mh-skin-mode-toggle");
    if (!toggle) return;
    const input = toggle.querySelector("input");
    if (input) input.checked = mode === "client";
    toggle.classList.toggle("mh-mode-server", mode === "server");
    toggle.classList.toggle("mh-mode-client", mode === "client");
  };

  const switchMode = (newMode) => {
    if (!currentWeaponId || newMode === mode || animationBusy) return;
    if (mode === "server") {
      const actual = getServerSkin();
      if (actual) saveServer(actual);
    }
    mode = newMode;
    saveWeaponData({ mode });
    updateToggle();
    updateItems();
    if (newMode === "server") {
      const actual = getServerSkin() || getWeaponData().serverSkin;
      if (actual) armServer(actual);
      else updateArmButtons();
    } else {
      animateToClient();
      updateArmButtons();
    }
  };

  const updateWeapon = () => {
    const weaponId = getWeaponId();
    if (!weaponId) return;
    const id = String(weaponId);
    if (id === String(currentWeaponId)) return;
    currentWeaponId = id;
    mode = getWeaponData().mode || "server";
  };

  const protectImage = () => {
    if (mode !== "client" || !currentWeaponId || animationBusy) return;
    const data = getWeaponData();
    if (data.clientTrapImage && data.clientThumbnail)
      applyClientImages(data.clientTrapImage, data.clientThumbnail);
    updateArmButtons();
  };

  const process = () => {
    processTimer = null;
    updateWeapon();
    invalidateBrowser();
    document
      .querySelectorAll(
        ".campPage-trap-itemBrowser:not(.skin) .mh-skin-mode-toggle",
      )
      .forEach((toggle) => toggle.remove());
    const browser = getBrowser();
    if (!browser) return;
    createToggle();
    updateItems();
    updateToggle();
    if (mode === "server") syncServer();
    else protectImage();
  };

  const scheduleProcess = () => {
    if (processTimer) return;
    processTimer = setTimeout(process, 100);
  };

  const scheduleImageProtection = () => {
    if (mode !== "client" || animationBusy || imageTimer) return;
    imageTimer = setTimeout(() => {
      imageTimer = null;
      protectImage();
    }, 40);
  };

  const scheduleServerSync = () => {
    if (serverTimer) return;
    serverTimer = setTimeout(() => {
      serverTimer = null;
      if (mode === "server" && !animationBusy) syncServer();
    }, 100);
  };

  const style = document.createElement("style");
  style.textContent = `
        .campPage-trap-itemBrowser.skin .campPage-trap-itemBrowser-filterContainer{overflow:hidden!important;height:auto!important}
        .campPage-trap-itemBrowser.skin .campPage-trap-itemBrowser-items{margin-top:45px!important}
        .mh-skin-mode-toggle{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;margin-top:8px;padding:8px 0;clear:both;position:relative;z-index:2}
        .mh-mode-label{font-weight:bold;color:var(--d-text,#7d838c);transition:.2s;text-transform:uppercase}
        .mh-mode-server .mh-server-label{color:var(--d-blue,#42b9ff);text-shadow:0 0 5px rgb(66 185 255 / 45%)}
        .mh-mode-client .mh-client-label{color:var(--d-orange,#fcb671);text-shadow:0 0 5px rgb(252 182 113 / 45%)}
        .mh-switch{position:relative;display:inline-block;width:38px;height:20px;flex:none}
        .mh-switch input{opacity:0;width:0;height:0}
        .mh-slider{position:absolute;inset:0;cursor:pointer;background:var(--d-action,#5e646f);border-radius:20px;transition:.2s}
        .mh-slider:before{content:"";position:absolute;width:16px;height:16px;left:2px;top:2px;background:var(--d-white,#e7eaee);border-radius:50%;transition:.2s}
        .mh-switch input:checked+.mh-slider{background:var(--d-orange,#fcb671)}
        .mh-switch input:checked+.mh-slider:before{transform:translateX(18px)}
        .mh-mode-server .mh-slider{background:var(--d-blue,#0e7fbf)}
        .campPage-trap-itemBrowser-item-name{position:relative!important;padding-right:58px!important;white-space:nowrap!important;overflow:hidden!important;box-sizing:border-box!important}
        .mh-client-arm{display:inline-block!important;position:absolute!important;right:0!important;top:-2px!important;margin:0!important;width:48px!important;height:auto!important;box-sizing:border-box;text-align:center;border:1px solid #666;font-size:11px;font-weight:900;line-height:1.75;text-shadow:0 1px 2px #000;text-transform:uppercase;background:#6a8b23;border-radius:5px;box-shadow:inset 0 0 5px 2px #8da746;color:#fff;text-decoration:none;cursor:pointer}
        .mh-client-arm-armed{cursor:pointer!important;background:#fcb671!important;background-color:var(--d-orange)!important;box-shadow:0 -2px 1px var(--d-orange) inset,0 -13px 1px var(--d-orange-dark) inset,0 0 1px #333!important}
        .mh-client-arm-armed:hover{background:#5ffcff!important;border-color:#000!important;box-shadow:inset 0 0 5px 2px #5accdb!important}
        .mh-client-arm-busy{pointer-events:none!important;cursor:wait!important;opacity:.65!important}
        .mh-client-arm::after{content:none!important;display:none!important}
    `;
  document.head.appendChild(style);

  new MutationObserver((mutations) => {
    let processNeeded = false,
      imageNeeded = false,
      serverNeeded = false;
    for (const mutation of mutations) {
      const target = mutation.target;
      if (mutation.type === "childList") {
        processNeeded = true;
        break;
      }
      if (mutation.type === "attributes") {
        if (mutation.attributeName === "style") {
          if (
            target.matches?.(
              ".trapImageView-layer.weapon,.trapSelectorView__armedItemImage,.armedItemImage",
            )
          )
            imageNeeded = true;
        } else if (mutation.attributeName === "class") {
          if (target.closest?.(".mh-client-arm,.mh-skin-mode-toggle")) continue;
          if (target.closest?.(".trapSelectorView__itemBrowserContainer.skin"))
            serverNeeded = true;
        }
      }
    }
    if (processNeeded) scheduleProcess();
    else if (serverNeeded) scheduleServerSync();
    else if (imageNeeded) scheduleImageProtection();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  process();
})();
