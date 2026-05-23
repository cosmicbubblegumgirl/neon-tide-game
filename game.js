(() => {
  "use strict";

  const fishData = Array.isArray(window.NEON_TIDE_FISH) ? window.NEON_TIDE_FISH : [];

  const rarityMeta = {
    Common: { weight: 48, value: 18, color: [0.78, 0.94, 0.98, 1] },
    Uncommon: { weight: 34, value: 30, color: [0.35, 1, 0.7, 1] },
    Rare: { weight: 25, value: 54, color: [0.2, 0.85, 1, 1] },
    Epic: { weight: 15, value: 105, color: [0.7, 0.45, 1, 1] },
    Legendary: { weight: 7, value: 240, color: [1, 0.77, 0.28, 1] }
  };

  const districts = [
    { name: "Neon Harbor", habitat: "Neon Harbor", x: 0, z: 0, faction: "Dock Families", risk: 1.05 },
    { name: "Corporate Canals", habitat: "Corporate Canals", x: -12, z: -7, faction: "ORCA Dynamics", risk: 1.32 },
    { name: "Flooded Metro", habitat: "Flooded Metro", x: 10, z: -8, faction: "Subway Markets", risk: 1.18 },
    { name: "Frozen Docks", habitat: "Frozen Docks", x: -15, z: 10, faction: "Icebreakers", risk: 1.08 },
    { name: "Skywater Reservoir", habitat: "Skywater Reservoir", x: 14, z: 11, faction: "Skyline Farmers", risk: 0.96 },
    { name: "Deep Abyss", habitat: "Deep Abyss", x: 0, z: 19, faction: "Abyssal Grid", risk: 1.55 },
    { name: "Blackwater Trenches", habitat: "Blackwater Trenches", x: -18, z: 18, faction: "Trench Choir", risk: 1.42 },
    { name: "Toxic Reefs", habitat: "Toxic Reefs", x: 18, z: -16, faction: "Chrome Divers", risk: 1.35 }
  ];

  const businessTemplates = [
    { id: "ramen", name: "Floating Ramen Empire", cost: 120, revenue: 18, effect: "Catch sale value rises with each ramen route." },
    { id: "market", name: "Underground Seafood Market", cost: 180, revenue: 34, effect: "Rare and Epic fish move faster through hidden stations." },
    { id: "baitlab", name: "Cybernetic Bait Lab", cost: 260, revenue: 42, effect: "Better bites and more unusual mutations." },
    { id: "abyss", name: "The Abyss Current", cost: 420, revenue: 76, effect: "Nightclub influence lowers heat after payouts." }
  ];

  const upgradeTemplates = [
    { id: "rod", name: "Monowire Rod", cost: 80, max: 5, effect: "Faster reeling and safer line tension." },
    { id: "sonar", name: "Abyssal Sonar", cost: 110, max: 5, effect: "Higher chance of Epic, Legendary, and Mythic catches." },
    { id: "hold", name: "Cryo Hold", cost: 95, max: 5, effect: "More fish can be carried before docking." },
    { id: "hull", name: "Storm Hull", cost: 135, max: 5, effect: "Heat and weather damage ease off in risky districts." }
  ];

  const tutorialCards = [
    {
      title: "Wake The Trawler",
      text: "Use WASD, arrows, or the touch steering buttons to move Blizzard's boat through the flooded districts."
    },
    {
      title: "Cast Into The Glow",
      text: "Press Cast near a district. The compass core names the habitat, and sonar pings show where the schools are moving."
    },
    {
      title: "Hold The Sweet Spot",
      text: "Press and hold Reel to build progress. Keep the line in the green-gold zone or the catch tears free."
    },
    {
      title: "Build The Empire",
      text: "Dock at The Abyss Current to sell fish, invest in ramen routes, expand black-market trade, and buy boat upgrades."
    },
    {
      title: "Choose Who Blizzard Becomes",
      text: "Talk with Quantum Cupcake and choose a legacy path. Trust changes what the ocean reveals."
    }
  ];

  const saveKey = "neon-tide-save-v1";
  const keys = new Set();
  const steer = { left: false, right: false, forward: false };
  const ui = {};

  const state = {
    credits: 140,
    trust: 38,
    heat: 4,
    rep: 8,
    day: 1,
    weather: "Black rain",
    weatherTimer: 32,
    payoutTimer: 24,
    activeTab: "market",
    legacy: "",
    tutorialIndex: 0,
    tutorialDone: false,
    boat: { x: -2, z: -2, rot: 0.65, speed: 0 },
    cast: null,
    reeling: false,
    currentDistrict: districts[0],
    inventory: [],
    seenFish: new Set(),
    businesses: businessTemplates.map((item) => ({ ...item, level: 0 })),
    upgrades: upgradeTemplates.map((item) => ({ ...item, level: 0 })),
    log: []
  };

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");
      if (!saved || typeof saved !== "object") return;
      for (const key of ["credits", "trust", "heat", "rep", "day", "legacy", "tutorialDone"]) {
        if (saved[key] !== undefined) state[key] = saved[key];
      }
      if (saved.boat) state.boat = { ...state.boat, ...saved.boat };
      if (Array.isArray(saved.inventory)) state.inventory = saved.inventory.slice(0, holdCapacity());
      if (Array.isArray(saved.seenFish)) state.seenFish = new Set(saved.seenFish);
      if (Array.isArray(saved.businesses)) {
        state.businesses.forEach((business) => {
          const match = saved.businesses.find((item) => item.id === business.id);
          if (match) business.level = Number(match.level || 0);
        });
      }
      if (Array.isArray(saved.upgrades)) {
        state.upgrades.forEach((upgrade) => {
          const match = saved.upgrades.find((item) => item.id === upgrade.id);
          if (match) upgrade.level = Number(match.level || 0);
        });
      }
    } catch {
      localStorage.removeItem(saveKey);
    }
  }

  function saveProgress() {
    const payload = {
      credits: state.credits,
      trust: state.trust,
      heat: state.heat,
      rep: state.rep,
      day: state.day,
      legacy: state.legacy,
      tutorialDone: state.tutorialDone,
      boat: state.boat,
      inventory: state.inventory,
      seenFish: Array.from(state.seenFish),
      businesses: state.businesses.map(({ id, level }) => ({ id, level })),
      upgrades: state.upgrades.map(({ id, level }) => ({ id, level }))
    };
    localStorage.setItem(saveKey, JSON.stringify(payload));
  }

  function init() {
    loadProgress();
    cacheUi();
    setupInput();
    setupActions();
    addLog("Quantum Cupcake hears a signal beneath the harbor.");
    const renderer = createRenderer(ui.canvas);
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      update(dt);
      renderer.render(now / 1000);
      renderHud();
      requestAnimationFrame(frame);
    }

    renderTutorial();
    renderDock();
    requestAnimationFrame(frame);

    if (!state.tutorialDone) openModal(ui.tutorial);
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  function cacheUi() {
    ui.canvas = document.querySelector("#world");
    ui.credits = document.querySelector("#credits");
    ui.trust = document.querySelector("#trust");
    ui.heat = document.querySelector("#heat");
    ui.rep = document.querySelector("#rep");
    ui.districtLabel = document.querySelector("#districtLabel");
    ui.habitatLabel = document.querySelector("#habitatLabel");
    ui.inventoryCount = document.querySelector("#inventoryCount");
    ui.inventoryList = document.querySelector("#inventoryList");
    ui.needle = document.querySelector("#needle");
    ui.tensionFill = document.querySelector("#tensionFill");
    ui.castStatus = document.querySelector("#castStatus");
    ui.castProgress = document.querySelector("#castProgress");
    ui.missionTitle = document.querySelector("#missionTitle");
    ui.missionText = document.querySelector("#missionText");
    ui.eventLog = document.querySelector("#eventLog");
    ui.toast = document.querySelector("#toast");
    ui.tutorial = document.querySelector("#tutorial");
    ui.tutorialTitle = document.querySelector("#tutorialTitle");
    ui.tutorialText = document.querySelector("#tutorialText");
    ui.tutorialSteps = document.querySelector("#tutorialSteps");
    ui.dock = document.querySelector("#dock");
    ui.dockContent = document.querySelector("#dockContent");
  }

  function setupInput() {
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      keys.add(key);
      if (key === " ") {
        if (state.cast) state.reeling = true;
        else castLine();
      }
      if (key === "e") toggleDock();
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
      if (event.key === " ") state.reeling = false;
    });

    document.querySelectorAll("[data-steer]").forEach((button) => {
      const dir = button.dataset.steer;
      const set = (value) => {
        steer[dir] = value;
      };
      button.addEventListener("pointerdown", () => set(true));
      button.addEventListener("pointerup", () => set(false));
      button.addEventListener("pointerleave", () => set(false));
      button.addEventListener("pointercancel", () => set(false));
    });

    const reelButton = document.querySelector("#reelButton");
    ["pointerdown", "touchstart"].forEach((eventName) => {
      reelButton.addEventListener(eventName, (event) => {
        event.preventDefault();
        state.reeling = true;
      });
    });
    ["pointerup", "pointerleave", "pointercancel", "touchend"].forEach((eventName) => {
      reelButton.addEventListener(eventName, () => {
        state.reeling = false;
      });
    });
  }

  function setupActions() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const action = button.dataset.action;
      if (!action) return;
      handleAction(action, button);
    });

    document.querySelectorAll(".tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeTab = button.dataset.tab || "market";
        document.querySelectorAll(".tabs button").forEach((tab) => tab.classList.toggle("active", tab === button));
        renderDock();
      });
    });
  }

  function handleAction(action, button) {
    if (action === "cast") castLine();
    if (action === "reel") state.reeling = true;
    if (action === "dock") toggleDock(true);
    if (action === "dock-close") toggleDock(false);
    if (action === "sell") sellHold();
    if (action === "tutorial") openModal(ui.tutorial);
    if (action === "tutorial-prev") setTutorial(state.tutorialIndex - 1);
    if (action === "tutorial-next") setTutorial(state.tutorialIndex + 1);
    if (action === "tutorial-close") closeTutorial();
    if (action === "invest") invest(button.dataset.business);
    if (action === "upgrade") buyUpgrade(button.dataset.upgrade);
    if (action === "talk") talkQuantum(button.dataset.choice);
    if (action === "legacy") chooseLegacy(button.dataset.legacy);
  }

  function update(dt) {
    updateBoat(dt);
    updateDistrict();
    updateCast(dt);
    updateWorldTimers(dt);
  }

  function updateBoat(dt) {
    const forward = keys.has("w") || keys.has("arrowup") || steer.forward;
    const reverse = keys.has("s") || keys.has("arrowdown");
    const left = keys.has("a") || keys.has("arrowleft") || steer.left;
    const right = keys.has("d") || keys.has("arrowright") || steer.right;
    const turnSpeed = 1.95 + upgradeLevel("hull") * 0.08;

    if (left) state.boat.rot += turnSpeed * dt;
    if (right) state.boat.rot -= turnSpeed * dt;

    const target = forward ? 5.2 : reverse ? -2.4 : 0;
    state.boat.speed += (target - state.boat.speed) * Math.min(1, dt * 3.4);
    state.boat.x += Math.sin(state.boat.rot) * state.boat.speed * dt;
    state.boat.z += Math.cos(state.boat.rot) * state.boat.speed * dt;
    state.boat.x = clamp(state.boat.x, -24, 24);
    state.boat.z = clamp(state.boat.z, -22, 24);
  }

  function updateDistrict() {
    let best = districts[0];
    let bestDistance = Infinity;
    for (const district of districts) {
      const distance = Math.hypot(state.boat.x - district.x, state.boat.z - district.z);
      if (distance < bestDistance) {
        best = district;
        bestDistance = distance;
      }
    }
    state.currentDistrict = best;
  }

  function updateWorldTimers(dt) {
    state.weatherTimer -= dt;
    state.payoutTimer -= dt;
    if (state.weatherTimer <= 0) {
      const options = ["Black rain", "Neon fog", "Static monsoon", "Clear cybermoon", "Red tide warning"];
      state.weather = options[Math.floor(Math.random() * options.length)];
      state.weatherTimer = 28 + Math.random() * 28;
      addLog(`Weather shift: ${state.weather}.`);
      if (state.weather === "Red tide warning") state.heat += 1;
    }

    if (state.payoutTimer <= 0) {
      state.payoutTimer = 30;
      const revenue = state.businesses.reduce((sum, business) => sum + business.level * business.revenue, 0);
      if (revenue > 0) {
        state.credits += revenue;
        state.rep += Math.max(1, Math.floor(revenue / 70));
        state.heat = Math.max(0, state.heat - upgradeLevel("hull") - businessLevel("abyss"));
        addLog(`Businesses paid ${revenue} credits through hidden canals.`);
        toast(`Business payout: ${revenue} credits`);
        saveProgress();
      }
      state.day += 1;
    }
  }

  function updateCast(dt) {
    if (!state.cast) {
      ui.tensionFill.style.width = "0%";
      ui.castStatus.textContent = "Ready to cast";
      ui.castProgress.textContent = "0%";
      return;
    }

    const cast = state.cast;
    cast.timer += dt;
    const rodSafety = 1 + upgradeLevel("rod") * 0.08;
    const bitePulse = Math.sin(cast.timer * 4.2) * 10 + Math.cos(cast.timer * 1.7) * 5;
    const reelPressure = state.reeling ? (27 - upgradeLevel("rod") * 2.4) * dt : -22 * dt * rodSafety;
    cast.tension += bitePulse * dt + reelPressure + (Math.random() - 0.5) * 4 * dt;
    cast.tension = clamp(cast.tension, 0, 115);

    const sweet = cast.tension >= 46 && cast.tension <= 82;
    if (state.reeling && sweet) {
      cast.progress += (22 + upgradeLevel("rod") * 4 + businessLevel("baitlab") * 2) * dt;
    } else if (state.reeling) {
      cast.progress += 5 * dt;
    } else {
      cast.progress -= 4 * dt;
    }
    cast.progress = clamp(cast.progress, 0, 100);

    if (cast.tension >= 112) {
      addLog(`${cast.fish.name} broke the monowire near ${state.currentDistrict.name}.`);
      toast("Line snapped. Ease off the reel next cast.");
      state.heat += 1;
      state.cast = null;
      state.reeling = false;
      return;
    }

    if (cast.progress >= 100) finishCatch(cast.fish);

    ui.tensionFill.style.width = `${Math.round(cast.tension)}%`;
    ui.castStatus.textContent = state.reeling ? "Reeling" : `${cast.fish.rarity} bite`;
    ui.castProgress.textContent = `${Math.round(cast.progress)}%`;
  }

  function castLine() {
    if (state.cast) {
      toast("Already hooked. Reel it in.");
      return;
    }
    if (state.inventory.length >= holdCapacity()) {
      toast("Cryo hold full. Sell or upgrade at the dock.");
      return;
    }
    const fish = chooseFish(state.currentDistrict.habitat);
    state.cast = {
      fish,
      timer: 0,
      tension: 36 + Math.random() * 20,
      progress: 0,
      x: state.boat.x + Math.sin(state.boat.rot) * (4 + Math.random() * 3),
      z: state.boat.z + Math.cos(state.boat.rot) * (4 + Math.random() * 3)
    };
    addLog(`Hooked a ${fish.rarity} signal in ${state.currentDistrict.habitat}.`);
  }

  function finishCatch(fish) {
    const value = fishValue(fish);
    const catchItem = {
      id: fish.id,
      name: fish.name,
      rarity: fish.rarity,
      habitat: fish.habitat,
      value
    };
    state.inventory.unshift(catchItem);
    state.seenFish.add(fish.id);
    state.rep += rarityRep(fish.rarity);
    state.trust = clamp(state.trust + (fish.rarity === "Legendary" ? 2 : 1), 0, 100);
    if (fish.rarity === "Legendary") state.heat += 1;
    addLog(`Caught ${fish.name}. ${fish.rarity}. ${value} credits market value.`);
    toast(`Caught ${fish.name}`);
    state.cast = null;
    state.reeling = false;
    saveProgress();
    renderDock();
  }

  function chooseFish(habitat) {
    const rarity = chooseRarity();
    const habitatPool = fishData.filter((fish) => fish.habitat === habitat);
    const rarityPool = habitatPool.filter((fish) => fish.rarity === rarity);
    const pool = rarityPool.length ? rarityPool : habitatPool.length ? habitatPool : fishData;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function chooseRarity() {
    const sonar = upgradeLevel("sonar");
    const grid = state.trust >= 75 ? 0.55 : state.trust >= 55 ? 0.25 : 0;
    const legacyBoost = state.legacy === "Leviathan" ? 0.8 : state.legacy === "Deep Diver" ? 0.35 : 0;
    const entries = Object.entries(rarityMeta).map(([name, meta]) => {
      const rareBonus = ["Rare", "Epic", "Legendary"].includes(name) ? 1 + sonar * 0.22 + grid + legacyBoost : 1;
      const commonBrake = name === "Common" ? Math.max(0.45, 1 - sonar * 0.08) : 1;
      return [name, meta.weight * rareBonus * commonBrake];
    });
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [name, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return name;
    }
    return "Common";
  }

  function sellHold() {
    if (!state.inventory.length) {
      toast("No fish in the hold.");
      return;
    }
    const total = state.inventory.reduce((sum, fish) => sum + fish.value, 0);
    state.credits += total;
    state.inventory = [];
    state.rep += Math.max(1, Math.floor(total / 140));
    state.heat = Math.max(0, state.heat + Math.ceil(total / 900) - businessLevel("market"));
    addLog(`Sold the hold for ${total} credits through ${state.currentDistrict.faction}.`);
    toast(`Sold catch: ${total} credits`);
    saveProgress();
    renderDock();
  }

  function invest(id) {
    const business = state.businesses.find((item) => item.id === id);
    if (!business) return;
    const cost = businessCost(business);
    if (state.credits < cost) {
      toast("Not enough credits.");
      return;
    }
    state.credits -= cost;
    business.level += 1;
    state.rep += 2;
    state.heat += business.id === "market" ? 2 : 1;
    addLog(`${business.name} upgraded to level ${business.level}.`);
    toast(`${business.name} expanded`);
    saveProgress();
    renderDock();
  }

  function buyUpgrade(id) {
    const upgrade = state.upgrades.find((item) => item.id === id);
    if (!upgrade || upgrade.level >= upgrade.max) return;
    const cost = upgradeCost(upgrade);
    if (state.credits < cost) {
      toast("Not enough credits.");
      return;
    }
    state.credits -= cost;
    upgrade.level += 1;
    addLog(`${upgrade.name} upgraded to level ${upgrade.level}.`);
    toast(`${upgrade.name} installed`);
    saveProgress();
    renderDock();
  }

  function talkQuantum(choice) {
    const outcomes = {
      memory: ["Quantum Cupcake shares a lower-canal memory with Blizzard.", 12, 1, 1],
      ocean: ["Her implant maps a warm current through the Grid.", 8, 0, 2],
      secret: ["Blizzard keeps the cargo ledger hidden for now.", -4, -1, 3]
    };
    const [message, trust, rep, heat] = outcomes[choice] || outcomes.ocean;
    state.trust = clamp(state.trust + trust, 0, 100);
    state.rep = Math.max(0, state.rep + rep);
    state.heat = Math.max(0, state.heat + heat);
    addLog(message);
    toast("Quantum's trust shifted");
    saveProgress();
    renderDock();
  }

  function chooseLegacy(legacy) {
    if (!legacy) return;
    state.legacy = legacy;
    const text = {
      "Tide King": "The black-market routes answer to Blizzard.",
      "Deep Diver": "The trenches open old doors.",
      Protector: "Lower districts receive flood barriers and clean water.",
      Leviathan: "The Abyssal Grid recognizes a new voice."
    }[legacy];
    state.trust = clamp(state.trust + (legacy === "Protector" ? 8 : legacy === "Leviathan" ? 4 : 2), 0, 100);
    state.rep += 6;
    state.heat += legacy === "Tide King" ? 4 : 1;
    addLog(text);
    toast(`${legacy} path chosen`);
    saveProgress();
    renderDock();
  }

  function renderHud() {
    ui.credits.textContent = state.credits;
    ui.trust.textContent = `${Math.round(state.trust)}%`;
    ui.heat.textContent = state.heat;
    ui.rep.textContent = state.rep;
    ui.districtLabel.textContent = `${state.currentDistrict.name} / ${state.weather}`;
    ui.habitatLabel.textContent = state.currentDistrict.habitat;
    ui.inventoryCount.textContent = `${state.inventory.length}/${holdCapacity()} in hold`;
    ui.needle.style.transform = `translate(-50%, -100%) rotate(${-state.boat.rot}rad)`;
    ui.missionTitle.textContent = missionTitle();
    ui.missionText.textContent = missionText();
    ui.inventoryList.innerHTML = state.inventory.slice(0, 5).map((fish) => (
      `<li><span>${esc(fish.name)}</span><span class="rarity-${fish.rarity}">${fish.rarity}</span></li>`
    )).join("") || "<li><span>Hold empty</span><span>Cast</span></li>";
    ui.eventLog.innerHTML = state.log.slice(0, 5).map((item) => `<div>${esc(item)}</div>`).join("");
  }

  function missionTitle() {
    if (state.heat >= 12) return "Corporate Patrols Closing";
    if (state.trust >= 80) return "The Grid Whispers Back";
    if (state.legacy) return `${state.legacy} Rising`;
    if (state.inventory.length >= holdCapacity()) return "The Hold Is Full";
    return "The Ocean Remembers";
  }

  function missionText() {
    if (state.heat >= 12) return "ORCA drones are sweeping the canals. Sell quietly, upgrade the hull, or let the nightclub bury the heat.";
    if (state.trust >= 80) return "Quantum Cupcake can hear leviathan speech below the harbor. Legendary schools are more likely to surface.";
    if (state.legacy) return `Blizzard's ${state.legacy} choices are changing who controls Blizzard Bay.`;
    return `Fish ${state.currentDistrict.habitat}, then dock to fund ramen routes, bait labs, and the Abyss Current.`;
  }

  function renderDock() {
    if (!ui.dockContent) return;
    const tab = state.activeTab;
    if (tab === "market") ui.dockContent.innerHTML = renderMarket();
    if (tab === "business") ui.dockContent.innerHTML = renderBusiness();
    if (tab === "relationship") ui.dockContent.innerHTML = renderRelationship();
    if (tab === "legacy") ui.dockContent.innerHTML = renderLegacy();
    if (tab === "collection") ui.dockContent.innerHTML = renderCollection();
  }

  function renderMarket() {
    const total = state.inventory.reduce((sum, fish) => sum + fish.value, 0);
    const catchRows = state.inventory.slice(0, 8).map((fish) => (
      `<div class="fish-row"><span>${esc(fish.name)}</span><span class="rarity-${fish.rarity}">${fish.rarity} / ${fish.value}</span></div>`
    )).join("") || '<div class="fish-row"><span>No catch loaded</span><span>0</span></div>';
    return `
      <div class="dock-grid">
        <article class="dock-card hero-card">
          <p class="eyebrow">Black-Market Fishing</p>
          <h3>Current Hold Value: ${total} credits</h3>
          <p>${state.currentDistrict.faction} buyers are paying extra for ${state.currentDistrict.habitat} mutations during ${state.weather.toLowerCase()}.</p>
          <button data-action="sell" class="primary">Sell Hold</button>
        </article>
        <article class="dock-card">
          <p class="eyebrow">Hold</p>
          <div class="fish-list">${catchRows}</div>
        </article>
        <article class="dock-card">
          <p class="eyebrow">Boat Upgrades</p>
          ${state.upgrades.map((upgrade) => `
            <div class="fish-row">
              <span>${upgrade.name} L${upgrade.level}/${upgrade.max}</span>
              <button data-action="upgrade" data-upgrade="${upgrade.id}">${upgrade.level >= upgrade.max ? "Max" : upgradeCost(upgrade)}</button>
            </div>
          `).join("")}
        </article>
      </div>
    `;
  }

  function renderBusiness() {
    return `
      <div class="dock-grid">
        ${state.businesses.map((business) => `
          <article class="dock-card">
            <p class="eyebrow">Level ${business.level}</p>
            <h3>${business.name}</h3>
            <p>${business.effect}</p>
            <div class="stat-row"><span>Revenue per payout</span><strong>${business.level * business.revenue}</strong></div>
            <button data-action="invest" data-business="${business.id}" class="primary">Invest ${businessCost(business)}</button>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderRelationship() {
    return `
      <div class="dock-grid">
        <article class="dock-card hero-card">
          <p class="eyebrow">Relationship System</p>
          <h3>Quantum Cupcake Trust: ${Math.round(state.trust)}%</h3>
          <div class="progress-track"><span style="width:${state.trust}%"></span></div>
          <p>${state.trust >= 75 ? "She lets the implant sing through the boat's sonar." : "She is watching whether Blizzard chooses survival, empire, or mercy."}</p>
        </article>
        <article class="dock-card">
          <h3>Share A Lower-Canal Memory</h3>
          <p>Open up about the dock years before the bay drowned.</p>
          <button data-action="talk" data-choice="memory">Trust +12</button>
        </article>
        <article class="dock-card">
          <h3>Ask The Ocean</h3>
          <p>Let her neural implant read the current under the boat.</p>
          <button data-action="talk" data-choice="ocean">Trust +8</button>
        </article>
        <article class="dock-card">
          <h3>Keep The Cargo Ledger Hidden</h3>
          <p>Protect the empire, but risk the bond.</p>
          <button data-action="talk" data-choice="secret">Heat +3</button>
        </article>
      </div>
    `;
  }

  function renderLegacy() {
    const paths = [
      ["Tide King", "Rule the black-market fishing economy and nightlife."],
      ["Deep Diver", "Explore old trenches for lost marine technology."],
      ["Protector", "Rebuild the poor districts from the water upward."],
      ["Leviathan", "Merge Blizzard Bay with cybernetic ocean intelligence."]
    ];
    return `
      <div class="dock-grid">
        <article class="dock-card hero-card">
          <p class="eyebrow">Choose Blizzard's Legacy</p>
          <h3>${state.legacy || "No path chosen yet"}</h3>
          <p>Every path changes catch odds, heat, trust, and business pressure.</p>
        </article>
        ${paths.map(([name, text]) => `
          <article class="dock-card">
            <h3>${name}</h3>
            <p>${text}</p>
            <button data-action="legacy" data-legacy="${name}" class="${state.legacy === name ? "primary" : ""}">${state.legacy === name ? "Chosen" : "Choose"}</button>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderCollection() {
    const seen = fishData.filter((fish) => state.seenFish.has(fish.id));
    const unseen = fishData.filter((fish) => !state.seenFish.has(fish.id)).slice(0, 40);
    const rows = [...seen.slice(0, 60), ...unseen].slice(0, 80).map((fish) => {
      const known = state.seenFish.has(fish.id);
      return `<div class="fish-row"><span>${known ? esc(fish.name) : "Undiscovered signal"}</span><span class="rarity-${fish.rarity}">${fish.rarity} / ${fish.habitat}</span></div>`;
    }).join("");
    return `
      <div class="dock-grid">
        <article class="dock-card hero-card">
          <p class="eyebrow">Fishdex</p>
          <h3>${state.seenFish.size} / ${fishData.length} unique fish discovered</h3>
          <p>The attached Neon Tide CSV is loaded into the game as the full fish index with rarity and habitat data.</p>
        </article>
        <article class="dock-card" style="grid-column:1 / -1">
          <div class="fish-list">${rows}</div>
        </article>
      </div>
    `;
  }

  function renderTutorial() {
    const card = tutorialCards[state.tutorialIndex];
    ui.tutorialTitle.textContent = card.title;
    ui.tutorialText.textContent = card.text;
    ui.tutorialSteps.innerHTML = tutorialCards.map((_, index) => `<span class="${index === state.tutorialIndex ? "active" : ""}"></span>`).join("");
  }

  function setTutorial(index) {
    state.tutorialIndex = clamp(index, 0, tutorialCards.length - 1);
    renderTutorial();
  }

  function closeTutorial() {
    state.tutorialDone = true;
    saveProgress();
    closeModal(ui.tutorial);
  }

  function toggleDock(force) {
    const shouldOpen = typeof force === "boolean" ? force : !ui.dock.open;
    if (shouldOpen) {
      renderDock();
      openModal(ui.dock);
    } else {
      closeModal(ui.dock);
    }
  }

  function openModal(modal) {
    if (!modal) return;
    if (typeof modal.showModal === "function" && !modal.open) modal.showModal();
    else modal.setAttribute("open", "");
  }

  function closeModal(modal) {
    if (!modal) return;
    if (typeof modal.close === "function" && modal.open) modal.close();
    else modal.removeAttribute("open");
  }

  function addLog(message) {
    state.log.unshift(message);
    state.log = state.log.slice(0, 12);
  }

  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ui.toast.classList.remove("show"), 2200);
  }

  function upgradeLevel(id) {
    return state.upgrades.find((item) => item.id === id)?.level || 0;
  }

  function businessLevel(id) {
    return state.businesses.find((item) => item.id === id)?.level || 0;
  }

  function holdCapacity() {
    return 8 + upgradeLevel("hold") * 4;
  }

  function fishValue(fish) {
    const base = rarityMeta[fish.rarity]?.value || 20;
    const marketBonus = 1 + businessLevel("ramen") * 0.08 + businessLevel("market") * 0.12;
    const risk = districts.find((district) => district.habitat === fish.habitat)?.risk || 1;
    return Math.round(base * marketBonus * risk);
  }

  function rarityRep(rarity) {
    return { Common: 1, Uncommon: 2, Rare: 3, Epic: 5, Legendary: 9 }[rarity] || 1;
  }

  function businessCost(business) {
    return Math.round(business.cost * Math.pow(business.level + 1, 1.65));
  }

  function upgradeCost(upgrade) {
    return Math.round(upgrade.cost * Math.pow(upgrade.level + 1, 1.55));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false }) || canvas.getContext("experimental-webgl");
    if (!gl) return createFallbackRenderer(canvas);

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const loc = {
      pos: gl.getAttribLocation(program, "aPosition"),
      color: gl.getAttribLocation(program, "aColor"),
      projection: gl.getUniformLocation(program, "uProjection"),
      view: gl.getUniformLocation(program, "uView"),
      model: gl.getUniformLocation(program, "uModel"),
      time: gl.getUniformLocation(program, "uTime"),
      water: gl.getUniformLocation(program, "uWater")
    };

    const meshes = {
      water: makeMesh(gl, planeMesh(58, 30)),
      boat: makeMesh(gl, boxMesh(1.2, 0.38, 2.1, [0.04, 0.16, 0.2, 1], [0.2, 0.84, 1, 1])),
      cabin: makeMesh(gl, boxMesh(0.72, 0.52, 0.72, [0.06, 0.11, 0.14, 1], [1, 0.3, 0.72, 1])),
      tower: makeMesh(gl, boxMesh(1, 1, 1, [0.04, 0.08, 0.12, 1], [0.17, 0.71, 1, 1])),
      beacon: makeMesh(gl, boxMesh(0.34, 2.6, 0.34, [0.1, 0.22, 0.25, 1], [0.35, 1, 0.7, 1])),
      line: makeMesh(gl, boxMesh(0.035, 0.035, 1, [1, 0.77, 0.28, 1], [0.2, 0.85, 1, 1])),
      fish: {}
    };
    Object.keys(rarityMeta).forEach((rarity) => {
      meshes.fish[rarity] = makeMesh(gl, fishMesh(rarityMeta[rarity].color));
    });

    const cityBlocks = createCityBlocks();
    const fishActors = createFishActors();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function draw(mesh, model, water) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
      gl.enableVertexAttribArray(loc.pos);
      gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colors);
      gl.enableVertexAttribArray(loc.color);
      gl.vertexAttribPointer(loc.color, 4, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(loc.model, false, model);
      gl.uniform1f(loc.water, water ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }

    return {
      render(time) {
        resizeCanvas(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.02, 0.05, 0.08, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform1f(loc.time, time);

        const aspect = canvas.width / Math.max(1, canvas.height);
        const projection = perspective(Math.PI / 3, aspect, 0.1, 120);
        const eye = [
          state.boat.x - Math.sin(state.boat.rot) * 7.5,
          5.1,
          state.boat.z - Math.cos(state.boat.rot) * 7.5
        ];
        const center = [state.boat.x, 0.35, state.boat.z];
        const view = lookAt(eye, center, [0, 1, 0]);
        gl.uniformMatrix4fv(loc.projection, false, projection);
        gl.uniformMatrix4fv(loc.view, false, view);

        draw(meshes.water, modelMatrix(0, -0.08, 0, 0, 1, 1, 1), true);

        for (const block of cityBlocks) {
          const shimmer = 1 + Math.sin(time * block.pulse + block.x) * 0.06;
          draw(meshes.tower, modelMatrix(block.x, block.h / 2 - 0.1, block.z, 0, block.w, block.h * shimmer, block.d), false);
        }

        for (const district of districts) {
          draw(meshes.beacon, modelMatrix(district.x, 1.18, district.z, time * 0.15, 1, 1, 1), false);
        }

        for (const fish of fishActors) {
          const x = fish.x + Math.sin(time * fish.speed + fish.phase) * fish.range;
          const z = fish.z + Math.cos(time * fish.speed + fish.phase) * fish.range;
          const y = -0.28 + Math.sin(time * 2.4 + fish.phase) * 0.14;
          draw(meshes.fish[fish.rarity], modelMatrix(x, y, z, time * fish.turn + fish.phase, fish.scale, fish.scale, fish.scale), false);
        }

        if (state.cast) {
          const dx = state.cast.x - state.boat.x;
          const dz = state.cast.z - state.boat.z;
          const length = Math.max(0.1, Math.hypot(dx, dz));
          const angle = Math.atan2(dx, dz);
          draw(meshes.line, modelMatrix(state.boat.x + dx / 2, 0.16, state.boat.z + dz / 2, angle, 1, 1, length), false);
        }

        draw(meshes.boat, modelMatrix(state.boat.x, 0.18, state.boat.z, state.boat.rot, 1, 1, 1), false);
        draw(meshes.cabin, modelMatrix(
          state.boat.x - Math.sin(state.boat.rot) * 0.12,
          0.62,
          state.boat.z - Math.cos(state.boat.rot) * 0.12,
          state.boat.rot,
          1,
          1,
          1
        ), false);
      }
    };
  }

  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform float uTime;
    uniform float uWater;
    varying vec4 vColor;
    varying float vFog;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      if (uWater > 0.5) {
        world.y += sin((world.x + uTime * 3.1) * 0.52) * 0.08;
        world.y += cos((world.z - uTime * 2.2) * 0.38) * 0.06;
      }
      vec4 viewPos = uView * world;
      gl_Position = uProjection * viewPos;
      vFog = smoothstep(10.0, 52.0, abs(viewPos.z));
      vColor = aColor;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;
    varying float vFog;
    void main() {
      vec3 fog = vec3(0.015, 0.052, 0.072);
      vec3 color = mix(vColor.rgb, fog, vFog * 0.78);
      gl_FragColor = vec4(color, vColor.a);
    }
  `;

  function createProgram(gl, vertexSource, fragmentSource) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
    }
    return program;
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader compile failed");
    }
    return shader;
  }

  function makeMesh(gl, data) {
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    const colors = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colors);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.colors), gl.STATIC_DRAW);
    return { positions, colors, count: data.positions.length / 3 };
  }

  function planeMesh(size, steps) {
    const positions = [];
    const colors = [];
    const half = size / 2;
    const step = size / steps;
    for (let x = 0; x < steps; x += 1) {
      for (let z = 0; z < steps; z += 1) {
        const x0 = -half + x * step;
        const x1 = x0 + step;
        const z0 = -half + z * step;
        const z1 = z0 + step;
        pushQuad(positions, [x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]);
        const tint = ((x + z) % 2) * 0.05;
        pushColor(colors, [0.02 + tint, 0.22, 0.28, 0.92], 6);
      }
    }
    return { positions, colors };
  }

  function boxMesh(w, h, d, colorA, colorB) {
    const x = w / 2;
    const y = h / 2;
    const z = d / 2;
    const faces = [
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
      [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
      [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]],
      [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]],
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]],
      [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]
    ];
    const positions = [];
    const colors = [];
    faces.forEach((face, index) => {
      pushQuad(positions, face[0], face[1], face[2], face[3]);
      pushColor(colors, index % 2 ? colorA : colorB, 6);
    });
    return { positions, colors };
  }

  function fishMesh(color) {
    const c2 = [Math.min(1, color[0] + 0.18), Math.min(1, color[1] + 0.12), Math.min(1, color[2] + 0.16), 1];
    const positions = [
      0, 0.18, 0, -0.72, 0, 0.22, 0, -0.18, 0,
      0, 0.18, 0, 0.78, 0, 0.16, 0, -0.18, 0,
      0, 0.18, 0, 0, -0.18, 0, 0, 0, -0.25,
      -0.72, 0, 0.22, -1.04, 0.24, 0, -1.04, -0.24, 0,
      0.78, 0, 0.16, 1.08, 0.1, 0, 0.78, -0.11, 0.16
    ];
    const colors = [];
    pushColor(colors, color, 6);
    pushColor(colors, c2, 3);
    pushColor(colors, color, 6);
    return { positions, colors };
  }

  function pushQuad(out, a, b, c, d) {
    out.push(...a, ...b, ...c, ...a, ...c, ...d);
  }

  function pushColor(out, color, count) {
    for (let i = 0; i < count; i += 1) out.push(...color);
  }

  function createCityBlocks() {
    const blocks = [];
    for (let i = 0; i < 54; i += 1) {
      const side = i % 4;
      const edge = 24 + Math.random() * 6;
      const x = side < 2 ? -26 + Math.random() * 52 : (side === 2 ? -edge : edge);
      const z = side < 2 ? (side === 0 ? -edge : edge) : -24 + Math.random() * 48;
      blocks.push({
        x,
        z,
        w: 0.6 + Math.random() * 1.8,
        d: 0.6 + Math.random() * 1.8,
        h: 1.8 + Math.random() * 7,
        pulse: 0.6 + Math.random() * 1.8
      });
    }
    return blocks;
  }

  function createFishActors() {
    const rarities = Object.keys(rarityMeta);
    return Array.from({ length: 46 }, (_, index) => {
      const district = districts[index % districts.length];
      return {
        x: district.x + (Math.random() - 0.5) * 8,
        z: district.z + (Math.random() - 0.5) * 8,
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.8,
        turn: 0.4 + Math.random() * 0.8,
        range: 0.5 + Math.random() * 1.8,
        scale: 0.28 + Math.random() * 0.34
      };
    });
  }

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ]);
  }

  function lookAt(eye, center, up) {
    let zx = eye[0] - center[0];
    let zy = eye[1] - center[1];
    let zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1
    ]);
  }

  function modelMatrix(x, y, z, rotY, sx, sy, sz) {
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    return new Float32Array([
      c * sx, 0, -s * sx, 0,
      0, sy, 0, 0,
      s * sz, 0, c * sz, 0,
      x, y, z, 1
    ]);
  }

  function resizeCanvas(canvas) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.floor(canvas.clientWidth * ratio);
    const height = Math.floor(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function createFallbackRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    return {
      render(time) {
        resizeCanvas(canvas);
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, "#061018");
        gradient.addColorStop(0.55, "#0a2630");
        gradient.addColorStop(1, "#031016");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(53,217,255,.24)";
        for (let y = h * 0.52; y < h; y += 24) {
          ctx.beginPath();
          for (let x = 0; x < w; x += 18) {
            const wave = Math.sin(x * 0.02 + time * 2 + y * 0.02) * 8;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }
        ctx.fillStyle = "#ff4dbd";
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.56);
        ctx.lineTo(w / 2 - 34, h * 0.62);
        ctx.lineTo(w / 2 + 42, h * 0.62);
        ctx.closePath();
        ctx.fill();
      }
    };
  }

  window.NeonTide = { state, districts, fishData };
  init();
})();
