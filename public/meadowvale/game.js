"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const TILE = 32;
const MAP_W = 38;
const MAP_H = 28;
const tools = [
  { name: "Hoe", icon: "⌁" },
  { name: "Can", icon: "♧" },
  { name: "Parsnip Seeds", icon: "●" },
  { name: "Potato Seeds", icon: "◉" },
  { name: "Axe", icon: "⌕" },
  { name: "Pickaxe", icon: "⛏" }
];
let selected = 0;
let running = false;
let keys = {};
let pointer = { x: 0, y: 0 };
let map, crops, trees, rocks, player, camera, day, time, money, energy;
let weather = "clear";
let friendships = { Mara: 2, Eli: 1, June: 0 };
let festivalWon = false;
let audioEnabled = false;
let toastTimer;
const textureCache = new Map();
const loadedTextures = new Map();
const textureLoading = new Map();

function loadTexture(path) {
  if (loadedTextures.has(path)) return loadedTextures.get(path);
  if (textureLoading.has(path)) return textureLoading.get(path);
  const image = new Image();
  image.decoding = "async";
  image.src = `assets/textures/${path}`;
  const promise = image.decode()
    .then(() => {
      loadedTextures.set(path, image);
      return image;
    })
    .catch(() => null);
  textureLoading.set(path, promise);
  return promise;
}

function drawTexture(path, x, y, width = TILE, height = TILE) {
  const loaded = loadedTextures.get(path);
  if (!loaded) {
    loadTexture(path);
    return false;
  }
  ctx.drawImage(loaded, x, y, width, height);
  return true;
}

function drawSpriteSheet(path, frame, frameWidth, frameHeight, columns, x, y, width = frameWidth * 2, height = frameHeight * 2) {
  const image = loadedTextures.get(path);
  if (!image) {
    loadTexture(path);
    return false;
  }
  const sourceX = (frame % columns) * frameWidth;
  const sourceY = Math.floor(frame / columns) * frameHeight;
  ctx.drawImage(image, sourceX, sourceY, frameWidth, frameHeight, Math.round(x), Math.round(y), width, height);
  return true;
}
const villagers = [
  { name: "Mara", x: 9, y: 14, direction: "down", hair: "#5a382d", shirt: "#c86f52", apron: "#e4c48a", skin: "#d99b76" },
  { name: "Eli", x: 12, y: 18, direction: "left", hair: "#9a632f", shirt: "#5e8b79", apron: "#52715f", skin: "#e0ad82" },
  { name: "June", x: 16, y: 11, direction: "right", hair: "#302d38", shirt: "#7887b4", apron: "#9ca9c9", skin: "#9d684f" }
];

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * ratio);
  canvas.height = Math.round(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function hash(seed) {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seeded(seed) {
  let state = hash(String(seed));
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function textureValue(x, y, salt = 0) {
  const value = Math.imul((x + 41) ^ ((y + 29) * 374761393), 668265263 + salt);
  return (Math.imul(value ^ value >>> 13, 1274126177) >>> 0) / 4294967295;
}

function drawPixelTexture(sx, sy, x, y, width, height, base, colors) {
  const cacheKey = `${x}:${y}:${width}:${height}:${base}:${colors.join(",")}`;
  let texture = textureCache.get(cacheKey);
  if (!texture) {
    texture = document.createElement("canvas");
    texture.width = width;
    texture.height = height;
    const textureCtx = texture.getContext("2d");
    textureCtx.fillStyle = base;
    textureCtx.fillRect(0, 0, width, height);
    for (let py = 0; py < height; py += 4) {
      for (let px = (py / 4) % 2 * 4; px < width; px += 8) {
        const noise = textureValue(x * 5 + px, y * 5 + py);
        const colorIndex = Math.floor(noise * colors.length);
        textureCtx.fillStyle = colors[colorIndex];
        textureCtx.fillRect(px, py, 2 + (noise > 0.7 ? 2 : 0), 2);
      }
    }
    textureCache.set(cacheKey, texture);
  }
  ctx.drawImage(texture, sx, sy);
}

function newGame() {
  const random = seeded(Date.now());
  map = Array.from({ length: MAP_H }, (_, y) =>
    Array.from({ length: MAP_W }, (_, x) => {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) return "water";
      if ((x < 5 && y > 19) || (x > 12 && x < 16 && y < 7)) return "path";
      return random() > 0.96 ? "flowers" : "grass";
    })
  );
  crops = {};
  trees = [];
  rocks = [];
  for (let y = 1; y < 13; y++) for (let x = 1; x < 9; x++) {
    if ((x === 1 || x === 2 || x === 8 || random() > 0.52) && y !== 9) trees.push({ x, y });
  }
  for (let y = 2; y < 12; y++) for (let x = 18; x < 34; x++) {
    if (random() > 0.76) trees.push({ x, y });
  }
  for (let y = 13; y < MAP_H - 2; y++) for (let x = 17; x < 34; x++) {
    if (random() > 0.88) rocks.push({ x, y });
  }
  for (let y = 12; y <= 23; y++) for (let x = 5; x <= 16; x++) {
    if ((x === 5 || y === 23) && !((x === 11 && y === 23))) map[y][x] = "path";
  }
  map[8][16] = "path";
  map[9][16] = "path";
  for (let y = 13; y <= 20; y++) {
    for (let x = 16; x <= 17; x++) map[y][x] = "path";
  }
  for (let y = 13; y <= 24; y += 5) {
    for (let x = 6; x <= 10; x++) {
      map[y][x] = "tilled";
      crops[keyCrop(x, y)] = { type: x % 2 ? "parsnip" : "potato", age: 5, watered: false };
    }
  }
  for (let y = 13; y <= 24; y += 5) {
    for (let x = 12; x <= 15; x++) {
      map[y][x] = "tilled";
      crops[keyCrop(x, y)] = { type: x % 2 ? "potato" : "parsnip", age: 5, watered: false };
    }
  }
  player = { x: 10 * TILE, y: 15 * TILE, vx: 0, vy: 0, w: 20, h: 28, direction: "down", energy: 270, inv: { parsnipSeed: 12, potatoSeed: 8 } };
  camera = { x: 0, y: 0 };
  day = 1; time = 6 * 60; money = 480; energy = 270;
  running = true;
  document.getElementById("start-screen").hidden = true;
  document.getElementById("hud").hidden = false;
  renderInventory();
  updateHud();
}

function save() {
  localStorage.setItem("meadowvale-save", JSON.stringify({ map, crops, trees, rocks, player, day, time, money, energy }));
  showToast("Farm saved");
}

function load() {
  const raw = localStorage.getItem("meadowvale-save");
  if (!raw) return false;
  const data = JSON.parse(raw);
  ({ map, crops, trees, rocks, player, day, time, money, energy } = data);
  energy = Math.min(270, Math.max(0, energy));
  camera = { x: 0, y: 0 };
  running = true;
  document.getElementById("start-screen").hidden = true;
  document.getElementById("hud").hidden = false;
  renderInventory();
  updateHud();
  return true;
}

function keyCrop(x, y) {
  return `${x},${y}`;
}

function cropAt(tx, ty) {
  return crops[keyCrop(tx, ty)];
}

function useTool() {
  const tx = Math.floor(pointer.x / TILE);
  const ty = Math.floor(pointer.y / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
  if (Math.hypot(tx * TILE + TILE / 2 - player.x, ty * TILE + TILE / 2 - player.y) > 76) return;

  if (selected === 0) {
    if (map[ty][tx] === "grass" || map[ty][tx] === "flowers") {
      map[ty][tx] = "tilled";
      useEnergy(2);
    }
  } else if (selected === 1) {
    if (map[ty][tx] === "tilled" && !cropAt(tx, ty)?.watered) {
      crops[keyCrop(tx, ty)] = cropAt(tx, ty) || { type: null, age: 0, watered: true };
      if (cropAt(tx, ty).type) cropAt(tx, ty).watered = true;
      map[ty][tx] = "watered";
      useEnergy(2);
    }
  } else if (selected >= 2 && selected <= 3) {
    const seed = selected === 2 ? "parsnipSeed" : "potatoSeed";
    if (["tilled", "watered"].includes(map[ty][tx]) && player.inv[seed] > 0 && !cropAt(tx, ty)?.type) {
      player.inv[seed]--;
      crops[keyCrop(tx, ty)] = { type: seed === "parsnipSeed" ? "parsnip" : "potato", age: 0, watered: map[ty][tx] === "watered" };
      useEnergy(3);
      renderInventory();
    }
  } else if (selected === 4) {
    const tree = trees.find(item => item.x === tx && item.y === ty);
    if (tree) {
      trees.splice(trees.indexOf(tree), 1);
      player.inv.wood = (player.inv.wood || 0) + 3;
      renderInventory();
      showToast("Chopped 3 wood");
    }
  } else if (selected === 5) {
    const rock = rocks.find(item => item.x === tx && item.y === ty);
    if (rock) {
      rocks.splice(rocks.indexOf(rock), 1);
      player.inv.stone = (player.inv.stone || 0) + 2;
      renderInventory();
      showToast("Collected stone");
    }
  }
}

function harvest(tx, ty) {
  const crop = cropAt(tx, ty);
  const days = crop.type === "parsnip" ? 4 : 6;
  if (crop?.type && crop.age >= days) {
    delete crops[keyCrop(tx, ty)];
    map[ty][tx] = "tilled";
    player.inv[crop.type] = (player.inv[crop.type] || 0) + (crop.type === "potato" && Math.random() > 0.85 ? 2 : 1);
    money += crop.type === "parsnip" ? 35 : 80;
    renderInventory();
    showToast(`${crop.type === "parsnip" ? "Parsnip" : "Potato"} harvested`);
  }
}

function useEnergy(amount) {
  energy = Math.max(0, energy - amount);
  updateHud();
  if (energy === 0) showToast("Too tired to keep working");
}

function advanceDay() {
  if (time >= 26 * 60 && energy > 0) showToast("Past midnight — exhausted");
  day++;
  time = 6 * 60;
  const gameSeason = ["spring", "summer", "fall", "winter"][Math.floor((day - 1) / 28) % 4];
  if (typeof applySeason === "function" && gameSeason !== activeSeason) applySeason(gameSeason);
  weather = ["clear", "clear", "rain", "clear", "storm"][day % 5];
  energy = 270;
  Object.values(crops).forEach(crop => {
    if (crop.type && crop.watered) crop.age++;
    crop.watered = false;
  });
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (map[y][x] === "watered") map[y][x] = "tilled";
  }
  updateHud();
  save();
  showToast(`Spring ${day}, 6:00`);
}

function updateHud() {
  const hour = Math.floor(time / 60);
  const minute = Math.floor(time % 60 / 10) * 10;
  const seasonIndex = Math.floor((day - 1) / 28) % 4;
  const seasonName = ["Spring", "Summer", "Fall", "Winter"][seasonIndex];
  document.getElementById("date").textContent = `${seasonName} ${((day - 1) % 28) + 1} · ${hour}:${String(minute).padStart(2, "0")}`;
  document.getElementById("money").textContent = `${money} coins`;
  document.getElementById("energy-fill").style.width = `${energy / 270 * 100}%`;
  document.getElementById("weather").textContent = weather[0].toUpperCase() + weather.slice(1);
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.style.opacity = 0, 1800);
}

function renderInventory() {
  document.getElementById("inventory").innerHTML = tools.map((tool, i) => {
    const count = i === 2 ? player?.inv.parsnipSeed || 0 : i === 3 ? player?.inv.potatoSeed || 0 : "";
    return `<div class="slot ${i === selected ? "selected" : ""}" data-slot="${i}"><div class="slot-icon">${tool.icon}</div><span class="slot-name">${tool.name}</span>${count !== "" ? `<span class="slot-count">${count}</span>` : ""}</div>`;
  }).join("");
}

function blocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  if (map[ty][tx] === "water") return true;
  if (trees.some(tree => tree.x === tx && tree.y === ty)) return true;
  if (rocks.some(rock => rock.x === tx && rock.y === ty)) return true;
  return false;
}

function update(dt) {
  if (!running) return;
  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  const up = keys.ArrowUp || keys.KeyW;
  const down = keys.ArrowDown || keys.KeyS;
  let dx = (right ? 1 : 0) - (left ? 1 : 0);
  let dy = (down ? 1 : 0) - (up ? 1 : 0);
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length; dy /= length;
    if (Math.abs(dx) > Math.abs(dy)) player.direction = dx > 0 ? "right" : "left";
    else player.direction = dy > 0 ? "down" : "up";
    const speed = 240 * dt;
    const nx = player.x + dx * speed;
    const ny = player.y + dy * speed;
    if (!blocked(Math.floor(nx / TILE), Math.floor((player.y + player.h / 2) / TILE))) player.x = nx;
    if (!blocked(Math.floor((player.x + player.w / 2) / TILE), Math.floor(ny / TILE))) player.y = ny;
  }
  const cameraTargetX = Math.max(0, Math.min(MAP_W * TILE - innerWidth, player.x - innerWidth / 2));
  const cameraTargetY = Math.max(0, Math.min(MAP_H * TILE - innerHeight, player.y - innerHeight / 2));
  const cameraEase = 1 - Math.pow(0.0005, dt);
  camera.x += (cameraTargetX - camera.x) * cameraEase;
  camera.y += (cameraTargetY - camera.y) * cameraEase;
  time += dt * 8;
  if (time >= 26 * 60) advanceDay();
}

function drawTile(x, y) {
  const sx = x * TILE - camera.x;
  const sy = y * TILE - camera.y;
  const type = map[y][x];
  const seasonalGrass = {
    spring: ["#6fac4f", "#7ebe57", "#568f43", "#8acb61", "#669d48"],
    summer: ["#4f963d", "#62ad43", "#397835", "#73b94b", "#578f37"],
    fall: ["#a48a43", "#b99d48", "#816f34", "#c2ad57", "#8d7838"],
    winter: ["#aeb9a1", "#cbd0bd", "#879681", "#d8dbc8", "#929f87"]
  }[activeSeason];
  const textureName = type === "water" ? "terrain/water.png"
    : type === "path" ? "terrain/path.png"
    : type === "tilled" || type === "watered" ? "terrain/tilled.png"
    : type === "flowers" ? "terrain/flowers.png"
    : "terrain/grass.png";
  if (loadedTextures.has(textureName)) {
    ctx.drawImage(loadedTextures.get(textureName), sx, sy, TILE, TILE);
    if (type === "flowers") return;
  } else if (type !== "flowers") {
    loadTexture(textureName);
  }

  if (type === "water") {
    drawPixelTexture(sx, sy, x, y, TILE, TILE, "#4f9fb8", ["#68b3c7", "#397f9c", "#8bd0d7"]);
    const wave = Math.floor(textureValue(x, y, 19) * 3);
    const shimmer = Math.floor(performance.now() / 700 + x + y) % 16;
    ctx.fillStyle = "#b5dfe1";
    ctx.fillRect(sx + 3 + wave, sy + 13, 16, 2);
    ctx.fillRect(sx + 20 + wave, sy + 23, 7, 1);
    ctx.fillStyle = "#8bcfd5";
    ctx.fillRect(sx + 7 + shimmer % 12, sy + 6, 5, 1);
    ctx.fillStyle = "#3c839d";
    ctx.fillRect(sx + 24 - wave, sy + 18, 8, 1);
  } else if (type === "path") {
    drawPixelTexture(sx, sy, x, y, TILE, TILE, "#caa866", ["#dfc283", "#ad884b", "#8f703f"]);
    ctx.fillStyle = "#b69255";
    ctx.fillRect(sx + 4, sy + 8, 3, 2);
    ctx.fillRect(sx + 22, sy + 23, 5, 2);
    ctx.fillStyle = "#d9b972";
    ctx.fillRect(sx + 13, sy + 18, 4, 3);
    ctx.fillStyle = "#80613a";
    ctx.fillRect(sx + 27, sy + 11, 2, 2);
  } else if (type === "tilled" || type === "watered") {
    const watered = type === "watered";
    drawPixelTexture(sx, sy, x, y, TILE, TILE, watered ? "#4a425c" : "#765039", watered ? ["#625b75", "#39334a", "#827b92"] : ["#96704f", "#62412f", "#b48761"]);
    ctx.fillStyle = watered ? "#302d41" : "#503727";
    if (!["tilled", "watered"].includes(map[y - 1]?.[x])) ctx.fillRect(sx + 2, sy + 3, TILE - 4, 2);
    if (!["tilled", "watered"].includes(map[y + 1]?.[x])) ctx.fillRect(sx + 2, sy + TILE - 5, TILE - 4, 2);
    if (!["tilled", "watered"].includes(map[y]?.[x - 1])) ctx.fillRect(sx + 3, sy + 2, 2, TILE - 4);
    if (!["tilled", "watered"].includes(map[y]?.[x + 1])) ctx.fillRect(sx + TILE - 5, sy + 2, 2, TILE - 4);
    ctx.fillStyle = watered ? "#302d41" : "#503727";
    for (let row = 0; row < 4; row++) ctx.fillRect(sx + 2, sy + row * 8 + 3, TILE - 4, 2);
    ctx.fillStyle = watered ? "#6e7896" : "#c39970";
    for (let row = 0; row < 4; row++) {
      ctx.fillRect(sx + 6 + ((x + row) % 3) * 7, sy + row * 8 + 4, 5, 1);
      ctx.fillRect(sx + 22 - ((x + row) % 4) * 3, sy + row * 8 + 1, 3, 1);
    }
  } else {
    drawPixelTexture(sx, sy, x, y, TILE, TILE, seasonalGrass[0], seasonalGrass.slice(1));
    ctx.fillStyle = "#497c38";
    ctx.fillRect(sx + 7 + ((x * 11 + y * 5) % 12), sy + 21, 2, 6);
    ctx.fillRect(sx + 18 + ((x * 7 + y * 3) % 8), sy + 8, 2, 5);
    ctx.fillStyle = "#87c85b";
    ctx.fillRect(sx + 8, sy + 20, 1, 3);
    ctx.fillRect(sx + 19, sy + 7, 1, 3);
    ctx.fillStyle = "#3f7835";
    ctx.fillRect(sx + 9, sy + 23, 3, 1);
    ctx.fillRect(sx + 27, sy + 11, 3, 1);
    ctx.fillStyle = "#5a973f";
    ctx.fillRect(sx + 3 + ((x * 9 + y) % 8), sy + 4, 4, 2);
    ctx.fillRect(sx + 24, sy + 26 - ((x + y) % 5), 5, 2);
    if (type === "flowers") {
      const pink = y % 2 === 0;
      ctx.fillStyle = "#3f7837";
      ctx.fillRect(sx + 14, sy + 12, 2, 8);
      ctx.fillStyle = pink ? "#f1b2c0" : "#f4d65d";
      ctx.fillRect(sx + 11, sy + 10, 8, 7);
      ctx.fillStyle = "#fff0a3";
      ctx.fillRect(sx + 14, sy + 12, 3, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx + 12, sy + 9, 2, 2);
      ctx.fillRect(sx + 18, sy + 15, 2, 2);
      ctx.fillStyle = "#4c8a3d";
      ctx.fillRect(sx + 10, sy + 17, 4, 2);
      ctx.fillRect(sx + 17, sy + 18, 3, 1);
    }
  }
}

function drawCrop(tx, ty, crop) {
  const sx = tx * TILE - camera.x + 16;
  const sy = ty * TILE - camera.y + 25;
  const mature = crop.age >= (crop.type === "parsnip" ? 4 : 6);
  const stage = Math.min(3, Math.floor(crop.age / (crop.type === "parsnip" ? 2 : 3)));
  ctx.fillStyle = "#315f2d";
  ctx.fillRect(sx - 9, sy - 8, 3, 10);
  ctx.fillRect(sx + 5, sy - 8, 3, 10);
  ctx.fillRect(sx - 2, sy - 13, 4, 15);
  ctx.fillStyle = "#6f9d45";
  ctx.fillRect(sx - 7, sy - 11, 2, 5);
  ctx.fillRect(sx + 8, sy - 10, 2, 5);
  if (crop.watered) {
    ctx.fillStyle = "#cbe2df88";
    ctx.fillRect(sx - 8, sy - 9, 2, 2);
    ctx.fillRect(sx + 2, sy - 14, 2, 2);
  }
  ctx.fillStyle = mature ? (crop.type === "parsnip" ? "#eee0aa" : "#b9cf62") : "#78b34f";
  ctx.fillRect(sx - 11, sy - 7, 7, 4);
  ctx.fillRect(sx + 4, sy - 7, 7, 4);
  if (stage >= 2) {
    ctx.fillRect(sx - 15, sy - 5, 6, 3);
    ctx.fillRect(sx + 9, sy - 5, 6, 3);
  }
  if (mature) {
    ctx.fillRect(sx - 4, sy - 1, 8, 7);
    ctx.fillStyle = crop.type === "parsnip" ? "#fff2c6" : "#dfe99a";
    ctx.fillRect(sx - 3, sy, 6, 2);
  }
  ctx.fillStyle = mature ? "#ffffff55" : "#9dd067";
  ctx.fillRect(sx - 10, sy - 7, 2, 2);
  ctx.fillRect(sx - 1, sy - 12, 2, 2);
}

function drawTree(tree) {
  const sx = tree.x * TILE - camera.x + 16;
  const sy = tree.y * TILE - camera.y + 16;
  ctx.fillStyle = "#2f442e55";
  ctx.fillRect(sx - 15, sy + 27, 34, 5);
  ctx.fillStyle = "#70462d";
  ctx.fillRect(sx - 4, sy + 2, 8, 28);
  ctx.fillStyle = "#91613b";
  ctx.fillRect(sx - 2, sy + 5, 2, 22);
  ctx.fillStyle = "#5d3927";
  ctx.fillRect(sx - 3, sy + 18, 5, 2);
  ctx.fillRect(sx + 2, sy + 25, 4, 2);
  ctx.fillStyle = "#a87547";
  ctx.fillRect(sx - 1, sy + 8, 1, 5);
  ctx.fillRect(sx + 4, sy + 14, 1, 3);
  ctx.fillStyle = "#315f2f";
  ctx.fillRect(sx - 16, sy - 15, 32, 24);
  ctx.fillRect(sx - 11, sy - 23, 22, 10);
  ctx.fillStyle = "#4d8839";
  ctx.fillRect(sx - 12, sy - 12, 24, 8);
  ctx.fillRect(sx - 6, sy - 20, 12, 6);
  ctx.fillStyle = "#70a94c";
  ctx.fillRect(sx - 10, sy - 14, 8, 5);
  ctx.fillRect(sx + 3, sy - 21, 6, 4);
  ctx.fillStyle = "#274f2a";
  ctx.fillRect(sx - 14, sy - 5, 7, 4);
  ctx.fillRect(sx + 8, sy - 10, 6, 5);
  ctx.fillStyle = "#8bc25a";
  ctx.fillRect(sx - 8, sy - 18, 4, 2);
  ctx.fillRect(sx + 9, sy - 16, 3, 2);
  ctx.fillRect(sx - 5, sy - 25, 5, 2);
}

function drawRock(rock) {
  const sx = rock.x * TILE - camera.x + 5;
  const sy = rock.y * TILE - camera.y + 7;
  ctx.fillStyle = "#52605a55";
  ctx.fillRect(sx - 2, sy + 20, 28, 4);
  ctx.fillStyle = "#77827e";
  ctx.fillRect(sx, sy + 5, 22, 15);
  ctx.fillRect(sx + 3, sy + 2, 16, 5);
  ctx.fillStyle = "#aab0a7";
  ctx.fillRect(sx + 3, sy + 2, 13, 7);
  ctx.fillRect(sx + 6, sy, 7, 3);
  ctx.fillStyle = "#d2d6c9";
  ctx.fillRect(sx + 5, sy + 3, 7, 3);
  ctx.fillStyle = "#59645f";
  ctx.fillRect(sx + 14, sy + 10, 6, 7);
  ctx.fillRect(sx + 3, sy + 15, 4, 4);
  ctx.fillStyle = "#909a91";
  ctx.fillRect(sx + 1, sy + 12, 5, 2);
  ctx.fillRect(sx + 11, sy + 18, 4, 2);
  ctx.fillStyle = "#69756f";
  ctx.fillRect(sx + 9, sy + 6, 2, 5);
  ctx.fillRect(sx + 10, sy + 10, 5, 2);
  ctx.fillRect(sx + 17, sy + 14, 3, 2);
}

function drawPlayer() {
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;
  const walking = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || keys.KeyA || keys.KeyD || keys.KeyW || keys.KeyS;
  const step = walking && Math.floor(performance.now() / 160) % 2;
  const front = player.direction === "down";
  const back = player.direction === "up";
  const left = player.direction === "left";

  ctx.fillStyle = "#314c3555";
  ctx.fillRect(sx, sy + 29, 20, 5);
  const directionOffset = player.direction === "left" ? 12 : player.direction === "right" ? 8 : player.direction === "up" ? 4 : 0;
  const frame = walking ? directionOffset + step : directionOffset;
  if (drawSpriteSheet("characters/player_sheet.png", frame, 16, 32, 4, sx - 6, sy - 2, 32, 64)) return;

  ctx.fillStyle = "#314c3555";
  ctx.fillRect(sx + 2, sy + 29, 16, 4);
  ctx.fillStyle = "#50382b";
  ctx.fillRect(sx + 3, sy + 1, 14, 6);
  ctx.fillRect(sx + 1, sy + 4, 18, 4);
  ctx.fillStyle = "#302019";
  ctx.fillRect(sx + 2, sy + 7, 16, 2);

  ctx.fillStyle = "#d9a77f";
  ctx.fillRect(sx + 4, sy + 7, 12, 9);
  ctx.fillStyle = "#efc49d";
  ctx.fillRect(sx + 6, sy + 8, 8, 2);
  ctx.fillStyle = "#3a302d";
  if (front) {
    ctx.fillRect(sx + (left ? 6 : 12), sy + 10, 2, 2);
    ctx.fillRect(sx + 7, sy + 14, 6, 1);
  } else if (!back) {
    ctx.fillRect(sx + (left ? 5 : 13), sy + 10, 2, 2);
  }
  ctx.fillStyle = "#5279a6";
  ctx.fillRect(sx + 3, sy + 16, 14, 9);
  ctx.fillStyle = "#82a9ca";
  ctx.fillRect(sx + 5, sy + 17, 10, 2);
  ctx.fillStyle = "#d9a77f";
  ctx.fillRect(sx + 1 - (step ? 1 : 0), sy + 17, 3, 7);
  ctx.fillRect(sx + 16 + (step ? 1 : 0), sy + 17, 3, 7);
  ctx.fillStyle = "#7babc8";
  ctx.fillRect(sx + 4, sy + 24, 5, 5 + (step ? 1 : 0));
  ctx.fillRect(sx + 11, sy + 24, 5, 5 + (step ? 0 : 1));
  ctx.fillStyle = "#3d352f";
  ctx.fillRect(sx + 3, sy + 28 + (step ? 1 : 0), 7, 3);
  ctx.fillRect(sx + 10, sy + 28 + (step ? 0 : 1), 7, 3);
  ctx.fillStyle = "#f1d06d";
  ctx.fillRect(sx + 8, sy + 17, 4, 2);
}

function drawVillager(villager) {
  const sx = villager.x * TILE - camera.x + 6;
  const sy = villager.y * TILE - camera.y + 2;
  const front = villager.direction === "down";
  ctx.fillStyle = "#314c3555";
  ctx.fillRect(sx + 1, sy + 29, 18, 4);
  const normalizedName = villager.name.toLowerCase();
  const directionOffset = villager.direction === "left" ? 12 : villager.direction === "right" ? 8 : villager.direction === "up" ? 4 : 0;
  if (drawSpriteSheet(`characters/${normalizedName}_sheet.png`, directionOffset, 16, 32, 4, sx - 6, sy - 2, 32, 64)) return;
  ctx.fillStyle = villager.hair;
  ctx.fillRect(sx + 3, sy, 14, 6);
  ctx.fillRect(sx + 1, sy + 3, 18, 4);
  ctx.fillStyle = villager.skin;
  ctx.fillRect(sx + 4, sy + 7, 12, 8);
  ctx.fillStyle = "#382c29";
  if (front) ctx.fillRect(sx + 7, sy + 10, 2, 2);
  if (front) ctx.fillRect(sx + 13, sy + 10, 2, 2);
  ctx.fillStyle = villager.shirt;
  ctx.fillRect(sx + 3, sy + 16, 14, 9);
  ctx.fillStyle = villager.apron;
  ctx.fillRect(sx + 7, sy + 17, 6, 8);
  ctx.fillStyle = villager.skin;
  ctx.fillRect(sx, sy + 17, 3, 7);
  ctx.fillRect(sx + 17, sy + 17, 3, 7);
  ctx.fillStyle = "#3b4650";
  ctx.fillRect(sx + 4, sy + 24, 5, 6);
  ctx.fillRect(sx + 11, sy + 24, 5, 6);
  ctx.fillStyle = "#29272b";
  ctx.fillRect(sx + 3, sy + 28, 7, 3);
  ctx.fillRect(sx + 10, sy + 28, 7, 3);
}

function drawFarmhouse() {
  const x = 15 * TILE - camera.x;
  const y = 5 * TILE - camera.y;
  ctx.fillStyle = "#2b2d2355";
  ctx.fillRect(x - 9, y + 92, 146, 18);
  ctx.fillStyle = "#4f342877";
  ctx.fillRect(x + 128, y + 52, 8, 57);
  ctx.fillRect(x + 10, y + 109, 126, 7);

  // Roof
  ctx.fillStyle = "#4a2d20";
  ctx.fillRect(x - 14, y + 2, 156, 12);
  ctx.fillRect(x - 7, y - 8, 142, 13);
  ctx.fillStyle = "#682f25";
  ctx.fillRect(x - 8, y, 144, 54);
  ctx.fillStyle = "#983d31";
  ctx.fillRect(x + 1, y - 1, 126, 43);
  for (let row = 0; row < 5; row++) {
    ctx.fillStyle = row % 2 ? "#802f28" : "#ad4834";
    ctx.fillRect(x + 4 + (row % 2) * 7, y + row * 9, 120, 7);
  }
  ctx.fillStyle = "#be5237";
  for (let col = 0; col < 14; col++) {
    ctx.fillRect(x + col * 9 + 2, y + 2 + (col % 2) * 4, 6, 8);
  }
  ctx.fillStyle = "#542d25";
  ctx.fillRect(x + 56, y - 10, 22, 13);
  ctx.fillRect(x + 52, y - 14, 30, 7);
  ctx.fillStyle = "#bbb06c";
  ctx.fillRect(x + 56, y - 12, 22, 4);

  // Timber walls
  ctx.fillStyle = "#d7a96a";
  ctx.fillRect(x, y + 46, 128, 63);
  ctx.fillStyle = "#9b673e";
  ctx.fillRect(x, y + 46, 128, 6);
  ctx.fillRect(x, y + 101, 128, 8);
  ctx.fillStyle = "#b77d48";
  ctx.fillRect(x + 1, y + 52, 7, 49);
  ctx.fillRect(x + 120, y + 52, 7, 49);
  for (let row = 0; row < 4; row++) {
    ctx.fillStyle = row % 2 ? "#c89358" : "#ddb67b";
    ctx.fillRect(x + 8, y + 57 + row * 11, 112, 7);
  }
  ctx.fillStyle = "#72462f";
  ctx.fillRect(x + 8, y + 52, 112, 5);

  // Door
  ctx.fillStyle = "#633622";
  ctx.fillRect(x + 48, y + 65, 32, 44);
  ctx.fillStyle = "#ad7441";
  ctx.fillRect(x + 52, y + 69, 24, 40);
  ctx.fillStyle = "#dba96d";
  ctx.fillRect(x + 55, y + 72, 18, 34);
  ctx.fillStyle = "#4b2922";
  ctx.fillRect(x + 58, y + 75, 12, 20);
  ctx.fillStyle = "#9d3931";
  ctx.fillRect(x + 60, y + 78, 8, 14);
  ctx.fillStyle = "#d6b95d";
  ctx.fillRect(x + 73, y + 91, 2, 2);

  // Porch and chimney
  ctx.fillStyle = "#7b4a2e";
  ctx.fillRect(x - 9, y + 107, 146, 8);
  ctx.fillStyle = "#b48352";
  ctx.fillRect(x - 4, y + 104, 136, 5);
  ctx.fillStyle = "#6d472f";
  ctx.fillRect(x + 18, y + 112, 92, 5);

  // Shutters and windows characteristic of the valley farmhouse.
  ctx.fillStyle = "#4c4a31";
  ctx.fillRect(x + 12, y + 61, 26, 20);
  ctx.fillRect(x + 90, y + 61, 26, 20);
  ctx.fillStyle = "#79b4c1";
  ctx.fillRect(x + 16, y + 65, 18, 12);
  ctx.fillRect(x + 94, y + 65, 18, 12);
  ctx.fillStyle = "#c8dfc1";
  ctx.fillRect(x + 23, y + 65, 2, 12);
  ctx.fillRect(x + 16, y + 70, 18, 2);
  ctx.fillRect(x + 101, y + 65, 2, 12);
  ctx.fillRect(x + 94, y + 70, 18, 2);
  ctx.fillStyle = "#e4d29b";
  ctx.fillRect(x + 16, y + 67, 5, 4);
  ctx.fillRect(x + 94, y + 67, 5, 4);

  // Mailbox beside the farmhouse path.
  const mailboxX = x + 142;
  const mailboxY = y + 108;
  ctx.fillStyle = "#4b392c";
  ctx.fillRect(mailboxX + 5, mailboxY, 4, 24);
  ctx.fillStyle = "#b53d32";
  ctx.fillRect(mailboxX, mailboxY - 6, 16, 12);
  ctx.fillStyle = "#d95b48";
  ctx.fillRect(mailboxX + 2, mailboxY - 4, 12, 8);
  ctx.fillStyle = "#f0c66c";
  ctx.fillRect(mailboxX + 12, mailboxY - 9, 5, 5);

  if (!drawTexture("buildings/farmhouse.png", x - 14, y - 14, 156, 136)) return;
}

function drawPond() {
  const sx = 34 * TILE - camera.x;
  const sy = 12 * TILE - camera.y;
  ctx.fillStyle = "#9b783d";
  ctx.fillRect(sx - 44, sy - 30, 150, 128);
  ctx.fillStyle = "#46a7c1";
  ctx.fillRect(sx - 36, sy - 22, 134, 112);
  ctx.fillStyle = "#77cad1";
  ctx.fillRect(sx - 24, sy - 10, 110, 90);
  ctx.fillStyle = "#3b819f";
  ctx.fillRect(sx - 28, sy + 8, 21, 3);
  ctx.fillRect(sx + 39, sy + 60, 36, 4);
  ctx.fillRect(sx + 54, sy + 20, 25, 3);
  ctx.fillStyle = "#d0ece1";
  ctx.fillRect(sx - 12, sy + 18, 28, 2);
  ctx.fillRect(sx + 25, sy - 3, 17, 2);
  ctx.fillRect(sx + 2, sy + 72, 31, 2);
  ctx.fillStyle = "#7bb64b";
  ctx.fillRect(sx + 90, sy + 27, 10, 18);
  ctx.fillStyle = "#d8d39c";
  ctx.fillRect(sx - 2, sy + 9, 5, 3);
  ctx.fillRect(sx + 68, sy + 48, 4, 3);
}

function drawStardewBackdrop() {
  const startX = 1 * TILE - camera.x;
  const sy = -camera.y;

  // Dense woodland wall, matching the forest edge on the left of the reference.
  ctx.fillStyle = "#183f28";
  ctx.fillRect(startX - 12, sy, 42, innerHeight);
  for (let row = 0; row < 18; row++) {
    const x = startX + ((row * 29) % 44) - 24;
    const y = sy + row * 31;
    ctx.fillStyle = "#205231";
    ctx.fillRect(x + 9, y + 12, 8, 22);
    ctx.fillStyle = "#356f32";
    ctx.fillRect(x, y, 30, 18);
    ctx.fillRect(x + 7, y - 8, 17, 12);
    ctx.fillStyle = "#4e8736";
    ctx.fillRect(x + 3, y + 1, 8, 5);
    ctx.fillRect(x + 18, y - 4, 6, 4);
  }

}

function drawPixelFence() {
  ctx.fillStyle = "#4f3828";
  ctx.fillRect(5 * TILE - camera.x, 12 * TILE - camera.y + 9, 11 * TILE, 4);
  ctx.fillRect(5 * TILE - camera.x, 25 * TILE - camera.y + 9, 11 * TILE, 4);
  ctx.fillRect(5 * TILE - camera.x + 9, 12 * TILE - camera.y, 4, 13 * TILE);
  ctx.fillRect(16 * TILE - camera.x + 9, 12 * TILE - camera.y, 4, 13 * TILE);
  ctx.fillStyle = "#8b5d3b";
  for (let x = 5; x <= 16; x++) {
    ctx.fillRect(x * TILE - camera.x + 2, 12 * TILE - camera.y - 2, 7, 18);
    ctx.fillRect(x * TILE - camera.x + 2, 25 * TILE - camera.y - 2, 7, 18);
  }
  ctx.fillStyle = "#9b7048";
  for (let y = 12; y <= 25; y++) {
    ctx.fillRect(5 * TILE - camera.x + 1, y * TILE - camera.y + 1, 9, 16);
    ctx.fillRect(16 * TILE - camera.x + 1, y * TILE - camera.y + 1, 9, 16);
  }
}

function draw() {
  ctx.fillStyle = "#5f9a4b";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  const startX = Math.max(0, Math.floor(camera.x / TILE));
  const endX = Math.min(MAP_W, Math.ceil((camera.x + innerWidth) / TILE));
  const startY = Math.max(0, Math.floor(camera.y / TILE));
  const endY = Math.min(MAP_H, Math.ceil((camera.y + innerHeight) / TILE));
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) drawTile(x, y);
  drawStardewBackdrop();
  drawPond();
  drawFarmhouse();
  drawPixelFence();

  const worldEntities = [
    ...rocks.map(rock => ({ y: rock.y * TILE + 26, draw: () => drawRock(rock) })),
    ...trees.map(tree => ({ y: tree.y * TILE + 48, draw: () => drawTree(tree) })),
    ...villagers.map(villager => ({ y: villager.y * TILE + 30, draw: () => drawVillager(villager) })),
    { y: player.y + player.h, draw: drawPlayer },
  ];
  for (const [key, crop] of Object.entries(crops)) {
    const [x, y] = key.split(",").map(Number);
    worldEntities.push({ y: y * TILE + 28, draw: () => drawCrop(x, y, crop) });
  }
  worldEntities.sort((a, b) => a.y - b.y);
  for (const entity of worldEntities) entity.draw();

  if (pointer.x && pointer.y && camera) {
    const tx = Math.floor(pointer.x / TILE);
    const ty = Math.floor(pointer.y / TILE);
    if (tx >= startX && tx < endX && ty >= startY && ty < endY) {
      ctx.strokeStyle = "rgba(255, 244, 170, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(tx * TILE - camera.x + 1, ty * TILE - camera.y + 1, TILE - 2, TILE - 2);
    }
  }
  drawWeather();
  if (typeof time === "number") {
    const hour = time / 60;
    const evening = Math.max(0, Math.min(1, (hour - 17) / 4));
    const morning = Math.max(0, 1 - Math.min(1, (hour - 5) / 2));
    ctx.fillStyle = evening
      ? `rgba(91, 53, 92, ${0.08 + evening * 0.22})`
      : `rgba(255, 171, 75, ${morning * 0.16})`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }
}

let last = performance.now();
let fpsFrameCount = 0;
let fpsSampleStart = last;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  if (running) draw();
  fpsFrameCount++;
  if (now - fpsSampleStart >= 500) {
    const fps = Math.round(fpsFrameCount * 1000 / (now - fpsSampleStart));
    const counter = document.getElementById("fps-counter");
    if (counter) counter.textContent = `${fps} FPS`;
    fpsFrameCount = 0;
    fpsSampleStart = now;
  }
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
const tutorialPages = [
  {
    title: "Welcome to Meadowvale",
    text: "Your grandmother has left you a quiet piece of land and a new beginning. Restore the farm, learn the valley, and make this place feel like home.",
    objectives: ["Clear and cultivate the overgrown farm", "Earn coins and build lasting friendships"]
  },
  {
    title: "Move and explore",
    text: "Use WASD or the arrow keys to walk. Follow the paths around your fields, meet villagers, and find useful places across the valley.",
    objectives: ["Move close to a villager or shopkeeper", "Explore the pond, farmhouse, and fenced fields"]
  },
  {
    title: "Grow your first crops",
    text: "Choose the hoe, click nearby grass to till soil, select seeds with keys 3 or 4, then use the watering can.",
    objectives: ["Till a few soil tiles", "Plant and water parsnips or potatoes"]
  },
  {
    title: "Work through the day",
    text: "Tools use energy. Watch the clock and weather, save with F, and advance the day with T once your work is finished.",
    objectives: ["Harvest mature crops for coins", "Manage time and energy carefully"]
  },
  {
    title: "Make the valley yours",
    text: "Fish with P, talk to villagers with E, open friendships with C, and join the seasonal festival with Y.",
    objectives: ["Build friendships and earn coins", "Complete seasonal goals and restore the farm"]
  }
];
let tutorialIndex = 0;
function showTutorial() {
  tutorialIndex = 0;
  renderTutorial();
  document.getElementById("tutorial").hidden = false;
}
function renderTutorial() {
  const page = tutorialPages[tutorialIndex];
  document.getElementById("tutorial-step").textContent = `${tutorialIndex + 1} / ${tutorialPages.length}`;
  document.getElementById("tutorial-title").textContent = page.title;
  document.getElementById("tutorial-text").textContent = page.text;
  document.getElementById("tutorial-objectives").innerHTML = page.objectives.map(objective => `<li>${objective}</li>`).join("");
  document.getElementById("tutorial-back").disabled = tutorialIndex === 0;
  document.getElementById("tutorial-next").textContent = tutorialIndex === tutorialPages.length - 1 ? "Begin playing" : "Next";
}

const recolorButtons = document.querySelectorAll(".recolor-button");
let activeRecolor = "vibrant";
let activeSeason = "spring";
let activeLighting = "natural";
function updateVisualFilter() {
  const recolor = activeRecolor === "earthy"
    ? "sepia(.12) saturate(.78) contrast(.96)"
    : "saturate(1.38) brightness(1.04) contrast(1.05)";
  const seasons = {
    spring: "hue-rotate(0deg) saturate(1.08) brightness(1.02)",
    summer: "hue-rotate(-4deg) saturate(1.18) brightness(1.08) contrast(1.03)",
    fall: "sepia(.18) hue-rotate(-12deg) saturate(1.16) brightness(.98)",
    winter: "saturate(.58) brightness(1.12) contrast(.92) hue-rotate(7deg)"
  };
  const lighting = {
    natural: "",
    golden: "sepia(.16) saturate(1.18) brightness(1.08)",
    soft: "saturate(.92) brightness(1.06) contrast(.92)"
  };
  document.getElementById("game").style.filter = `${recolor} ${seasons[activeSeason]} ${lighting[activeLighting]}`.trim();
}
function applyRecolor(name) {
  const canvas = document.getElementById("game");
  activeRecolor = name;
  recolorButtons.forEach(button => button.classList.toggle("active", button.dataset.recolor === name));
  localStorage.setItem("meadowvale-recolor", name);
  updateVisualFilter();
}
const savedRecolor = localStorage.getItem("meadowvale-recolor") || "vibrant";
applyRecolor(savedRecolor);
recolorButtons.forEach(button => button.addEventListener("click", () => applyRecolor(button.dataset.recolor)));

const seasonButtons = document.querySelectorAll(".season-button");
const lightingButtons = document.querySelectorAll(".lighting-button");
function applySeason(name) {
  const canvas = document.getElementById("game");
  ["spring", "summer", "fall", "winter"].forEach(season => canvas.classList.toggle(`season-${season}`, season === name));
  seasonButtons.forEach(button => button.classList.toggle("active", button.dataset.season === name));
  localStorage.setItem("meadowvale-season", name);
  activeSeason = name;
  updateVisualFilter();
}
function applyLighting(name) {
  const canvas = document.getElementById("game");
  ["natural", "golden", "soft"].forEach(light => canvas.classList.toggle(`lighting-${light}`, light === name));
  lightingButtons.forEach(button => button.classList.toggle("active", button.dataset.lighting === name));
  localStorage.setItem("meadowvale-lighting", name);
  activeLighting = name;
  updateVisualFilter();
}
applySeason(localStorage.getItem("meadowvale-season") || "spring");
applyLighting(localStorage.getItem("meadowvale-lighting") || "natural");
seasonButtons.forEach(button => button.addEventListener("click", () => applySeason(button.dataset.season)));
lightingButtons.forEach(button => button.addEventListener("click", () => applyLighting(button.dataset.lighting)));
window.addEventListener("keydown", event => {
  keys[event.code] = true;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
  if (!audioEnabled) audioEnabled = true;
  if (/Digit[1-6]/.test(event.code)) {
    selected = Number(event.code.slice(-1)) - 1;
    renderInventory();
  }
  if (event.code === "KeyE") talkToShop();
  if (event.code === "KeyF") save();
  if (event.code === "KeyT") advanceDay();
  if (event.code === "KeyP") startFishing();
  if (event.code === "KeyY") playFestival();
  if (event.code === "KeyC") {
    const panel = document.getElementById("community-panel");
    panel.hidden = !panel.hidden;
    renderCommunity();
  }
});
window.addEventListener("keyup", event => keys[event.code] = false);
canvas.addEventListener("mousemove", event => {
  if (!camera) return;
  pointer.x = event.clientX + camera.x;
  pointer.y = event.clientY + camera.y;
});
canvas.addEventListener("pointerdown", event => {
  if (!running || !camera || !player) return;
  pointer.x = event.clientX + camera.x;
  pointer.y = event.clientY + camera.y;
  const tx = Math.floor(pointer.x / TILE);
  const ty = Math.floor(pointer.y / TILE);
  const crop = cropAt(tx, ty);
  if (crop?.type && crop.age >= (crop.type === "parsnip" ? 4 : 6)) harvest(tx, ty);
  else useTool();
});
document.getElementById("new-world").addEventListener("click", () => {
  newGame();
  if (localStorage.getItem("meadowvale-tutorial-complete") !== "true") showTutorial();
});
document.getElementById("tutorial-back").addEventListener("click", () => {
  tutorialIndex = Math.max(0, tutorialIndex - 1);
  renderTutorial();
});
document.getElementById("tutorial-next").addEventListener("click", () => {
  if (tutorialIndex < tutorialPages.length - 1) {
    tutorialIndex++;
    renderTutorial();
  } else {
    document.getElementById("tutorial").hidden = true;
    localStorage.setItem("meadowvale-tutorial-complete", "true");
  }
});
document.getElementById("load-world").addEventListener("click", () => {
  if (!load()) showToast("No saved farm found");
});
document.getElementById("shop-close").addEventListener("click", () => document.getElementById("npc-panel").hidden = true);
document.getElementById("community-close").addEventListener("click", () => document.getElementById("community-panel").hidden = true);
document.getElementById("inventory").addEventListener("click", event => {
  const slot = event.target.closest(".slot");
  if (!slot) return;
  selected = Number(slot.dataset.slot);
  renderInventory();
});

function talkToShop() {
  const panel = document.getElementById("npc-panel");
  panel.hidden = false;
  friendships.Mara = Math.min(10, friendships.Mara + 1);
  document.getElementById("dialogue").textContent = "Mara: Welcome to the Morningbell Shop. Need seeds for tomorrow?";
  document.getElementById("shop-items").innerHTML = [
    ["Parsnip seeds", "parsnipSeed", 20],
    ["Potato seeds", "potatoSeed", 35]
  ].map(([name, key, price]) => `<div class="shop-row"><span>${name} · ${price} coins</span><button data-buy="${key}" data-price="${price}">Buy</button></div>`).join("");
}

function renderCommunity() {
  document.getElementById("friendships").innerHTML = Object.entries(friendships).map(([name, hearts]) =>
    `<div class="friend-row">${name}: <span class="hearts">${"♥".repeat(hearts)}${"♡".repeat(Math.max(0, 10 - hearts))}</span></div>`
  ).join("");
}

function startFishing() {
  if (energy < 5) return showToast("Too tired to fish");
  useEnergy(5);
  const caught = seeded(Date.now())() > 0.35;
  if (caught) {
    money += 45;
    showToast("Caught a silverfin! · 45 coins");
    renderCommunity();
  } else {
    showToast("The fish got away");
  }
  updateHud();
}

function playFestival() {
  const score = Math.floor(seeded(Date.now())() * 4) + 1;
  festivalWon = score >= 3;
  if (festivalWon) {
    money += 100;
    showToast(`Festival won! · score ${score} · 100 coins`);
  } else {
    showToast(`Festival complete · score ${score}`);
  }
  updateHud();
}

function playTone(frequency = 440, duration = 0.08) {
  if (!audioEnabled) return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(0.025, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function drawWeather() {
  const count = weather === "storm" ? 140 : weather === "rain" ? 100 : weather === "snow" ? 75 : 0;
  for (let i = 0; i < count; i++) {
    const x = (i * 97 + performance.now() * (weather === "snow" ? 0.02 : 0.12)) % innerWidth;
    const y = (i * 53 + performance.now() * (weather === "snow" ? 0.025 : 0.22)) % innerHeight;
    ctx.fillStyle = weather === "snow" ? "#eef4f1" : "#d4edf2";
    if (weather === "snow") ctx.fillRect(x, y, 3, 3);
    else ctx.fillRect(x, y, 1, weather === "storm" ? 15 : 10);
  }
  if (activeSeason === "fall") {
    ctx.fillStyle = "#d78345aa";
    for (let i = 0; i < 28; i++) {
      const x = (i * 149 + performance.now() * 0.035) % innerWidth;
      const y = (i * 71 + performance.now() * 0.055) % innerHeight;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((performance.now() * 0.001 + i) % 6.28);
      ctx.fillRect(-3, -2, 7, 4);
      ctx.restore();
    }
  }
}

document.getElementById("shop-items").addEventListener("click", event => {
  const button = event.target.closest("[data-buy]");
  if (!button) return;
  const price = Number(button.dataset.price);
  if (money < price) return showToast("Not enough coins");
  money -= price;
  player.inv[button.dataset.buy] = (player.inv[button.dataset.buy] || 0) + 5;
  renderInventory();
  updateHud();
});

resize();
requestAnimationFrame(loop);
