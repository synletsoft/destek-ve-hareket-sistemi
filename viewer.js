import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ASSET = "./kaynak/";
const bone = (id, label, node, card, view = "front") => ({ id, label, node, card: `${ASSET}kartlar/${card}.png`, view, category: "bones" });
const bones = [
  bone("skull", "Kafatası", "Kafatası", "kafatası"),
  bone("upper-jaw", "Üst çene kemiği", "ÜstÇene", "üst çene kemiği"),
  bone("lower-jaw", "Alt çene kemiği", "Alt_Çene", "alt çene kemiği"),
  bone("clavicle", "Köprücük kemiği", "Köprücük_Kemiği", "Köprücük Kemiği"),
  bone("scapula", "Kürek kemiği", "Kürek_Kemiği", "Kürek Kemikleri", "back"),
  bone("sternum", "Göğüs kemiği", "Göğüs", "Göğüs kemiği"),
  bone("ribs", "Kaburga kemiği", "Kaburga", "Kaburga Kemiği"),
  bone("spine", "Omurga", "Omurga", "Omurga", "back"),
  bone("humerus", "Pazu kemiği", "Pazu", "Pazu Kemiği"),
  bone("forearm", "Ön kol kemiği", "Ön_Kol", "Ön Kol Kemiği"),
  bone("back-arm", "Arka kol kemiği", "Arka_Kol", "Arka Kol Kemiği"),
  bone("hand", "El kemikleri", "El_Kemikleri", "El Kemikleri"),
  bone("pelvis", "Kalça kemiği", "Kalça_", "Kalça Kemiği"),
  bone("sacrum", "Kuyruk sokumu", "Kuyruk_Sokumu", "Kuyruk Sokumu", "back"),
  bone("femur", "Uyluk kemiği", "Uyluk_Kemiği", "Uyluk Kemiği"),
  bone("patella", "Diz kapağı", "Diz_Kapağı", "Diz Kapağı"),
  bone("tibia", "Kaval kemiği", "Kaval_Kemiği", "Kaval Kemiği"),
  bone("fibula", "Baldır kemiği", "Baldır_Kemiği", "Baldır Kemiği"),
  bone("foot", "Ayak kemikleri", "Ayak_Kemikleri", "Ayak Kemikleri"),
];
const special = [
  { id: "joints", label: "Eklemler", node: "Eklemler", category: "joints", description: "Eklemler, kemiklerin birleştiği bölgelerdir. Hareketin yönünü ve genişliğini belirler. Modelde mavi eklem katmanını seçip döndürerek farklı açılardan inceleyin." },
  { id: "ligaments", label: "Eklem bağları", node: "Eklem_Bağları", category: "ligaments", description: "Eklem bağları, kemikleri eklem çevresinde birbirine bağlayan güçlü doku bantlarıdır. Eklemleri destekler ve hareketin sınırlarını korumaya yardımcı olur." },
];
const items = [...bones, ...special];
const byId = new Map(items.map(item => [item.id, item]));
const categories = [
  { id: "bones", label: "Kemikler", image: " Kemiklerbt.png", activeImage: " Kemiklerbt2.png", count: bones.length },
  { id: "joints", label: "Eklemler", image: "eklemlerbt.png", activeImage: "eklemlerbt2.png", count: 1 },
  { id: "ligaments", label: "Eklem bağları", image: "eklembağbt.png", activeImage: "eklembağbt2.png", count: 1 },
];
const directions = {
  front: new THREE.Vector3(-1, 0.04, 0).normalize(),
  back: new THREE.Vector3(1, 0.04, 0).normalize(),
  left: new THREE.Vector3(0, 0.04, 1).normalize(),
  right: new THREE.Vector3(0, 0.04, -1).normalize(),
};
const $ = selector => document.querySelector(selector);
const app = $("#app");
const canvas = $("#scene");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.005, 100);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.setClearColor(0, 0);
scene.add(new THREE.HemisphereLight(0xf5f9ff, 0x736556, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
keyLight.position.set(3, 5, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xc3d9f9, 1.1);
fillLight.position.set(-5, 2, -4);
scene.add(fillLight);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.rotateSpeed = .65;
controls.zoomSpeed = 1.1;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
camera.position.set(0, 0, 4);

const structureObjects = new Map();
const objectIds = new Map();
const originalMaterials = new Map();
const hiddenIds = new Set();
let model = null;
let modelBox = new THREE.Box3();
let modelSize = new THREE.Vector3(1, 2, 1);
let center = new THREE.Vector3();
let selectedId = null;
let categoryId = "bones";
let isolated = false;
let labelsShown = false;
let currentView = "front";
let cameraTween = null;
let dragging = null;
let toastTimer = null;
let renderNeeded = true;
let soundEnabled = false;
let audioContext = null;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function renderCategories() {
  const container = $("#categoryList");
  container.replaceChildren();
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button${category.id === categoryId ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category.id === categoryId));
    button.setAttribute("aria-label", category.label);
    button.innerHTML = `<img class="category-art" alt="" src="${ASSET}${category.id === categoryId ? category.activeImage : category.image}">`;
    button.addEventListener("click", () => setCategory(category.id));
    container.append(button);
  }
}

function renderStructureList() {
  const list = $("#structureList");
  list.replaceChildren();
  const visibleItems = categoryId === "bones" ? bones : special.filter(item => item.category === categoryId);
  list.setAttribute("aria-label", `${categories.find(category => category.id === categoryId).label} yapıları`);
  for (const item of visibleItems) {
    const row = document.createElement("div");
    row.className = `structure-row${selectedId === item.id ? " active" : ""}`;
    const select = document.createElement("button");
    select.type = "button";
    select.className = "structure-select";
    select.textContent = item.label;
    select.setAttribute("aria-label", `${item.label} yapısına odaklan`);
    select.addEventListener("click", () => selectItem(item.id));
    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.className = "visibility-button";
    visibility.textContent = "◉";
    visibility.title = `${item.label} göster veya gizle`;
    visibility.setAttribute("aria-label", visibility.title);
    visibility.setAttribute("aria-pressed", String(!hiddenIds.has(item.id)));
    visibility.addEventListener("click", () => toggleVisibility(item.id));
    row.append(select, visibility);
    list.append(row);
  }
}

function setCategory(id) {
  categoryId = id;
  renderCategories();
  if (id === "bones") {
    selectedId = null;
    isolated = false;
    applyVisibility();
    updateCard();
    updateSelectionUi();
    closeCard();
    goHome();
  } else {
    selectItem(id);
  }
  renderStructureList();
}

function updateSelectionUi() {
  const item = byId.get(selectedId);
  $("#selectionText").textContent = item ? item.label : "Bir yapı seçin";
  $("#openCardButton").disabled = !item;
  $("#isolateButton").setAttribute("aria-pressed", String(isolated));
  $("#isolateButton").disabled = !item;
  renderStructureList();
}

function updateCard() {
  const content = $("#cardContent");
  content.replaceChildren();
  const item = byId.get(selectedId);
  if (!item) {
    content.innerHTML = `<div class="card-placeholder"><span>✦</span><p>Bir yapı seçerek kaynak bilgi kartını görüntüleyin.</p></div>`;
    $("#cardPosition").textContent = "—";
  } else if (item.card) {
    const image = document.createElement("img");
    image.alt = `${item.label} bilgi kartı`;
    image.src = item.card;
    image.addEventListener("error", () => {
      content.innerHTML = `<div class="card-placeholder"><span>✦</span><p>${item.label} kart görseli yüklenemedi.</p></div>`;
    }, { once: true });
    content.append(image);
    $("#cardPosition").textContent = `${bones.indexOf(item) + 1} / ${bones.length}`;
  } else {
    const summary = document.createElement("div");
    summary.className = "category-summary";
    const img = document.createElement("img");
    img.src = `${ASSET}${categories.find(category => category.id === item.category).image}`;
    img.alt = "";
    const title = document.createElement("h3");
    title.textContent = item.label;
    const description = document.createElement("p");
    description.textContent = item.description;
    summary.append(img, title, description);
    content.append(summary);
    $("#cardPosition").textContent = "Katman";
  }
  $("#previousButton").disabled = !item || item.category !== "bones";
  $("#nextButton").disabled = !item || item.category !== "bones";
}

function openCard() { $("#infoPanel").classList.remove("closed", "mobile-hidden"); app.classList.add("card-open"); }
function closeCard() { $("#infoPanel").classList.add("closed", "mobile-hidden"); app.classList.remove("card-open"); }

function loadModel() {
  const loader = new GLTFLoader();
  $("#loading").classList.remove("hidden");
  $("#error").classList.add("hidden");
  loader.load("./destek-web.glb", gltf => {
    model = gltf.scene;
    scene.add(model);
    model.updateWorldMatrix(true, true);
    modelBox.setFromObject(model);
    modelBox.getCenter(center);
    modelBox.getSize(modelSize);
    for (const item of items) {
      const node = model.getObjectByName(item.node);
      if (!node) console.warn(`Model node missing: ${item.node}`);
      const meshes = [];
      node?.traverse(object => {
        if (!object.isMesh) return;
        meshes.push(object);
        objectIds.set(object, item.id);
        originalMaterials.set(object, object.material);
      });
      structureObjects.set(item.id, meshes);
    }
    const maxExtent = modelSize.length();
    camera.near = Math.max(.001, maxExtent / 2000);
    camera.far = maxExtent * 25;
    camera.updateProjectionMatrix();
    controls.minDistance = maxExtent * .12;
    controls.maxDistance = maxExtent * 5;
    applyVisibility();
    goHome(true);
    $("#loading").classList.add("hidden");
    renderNeeded = true;
  }, progress => {
    if (progress.total) {
      const percent = Math.min(100, Math.round(progress.loaded / progress.total * 100));
      $("#loadingProgress").style.width = `${percent}%`;
      $("#loadingText").textContent = `Model yükleniyor · %${percent}`;
    }
  }, error => {
    console.error("Model load error", error);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  });
}

function mobileOffset(distance, selected = false) {
  if (!matchMedia("(max-width: 760px) and (orientation: portrait)").matches) return 0;
  const homeShift = -.09 - Math.max(0, 700 - app.clientHeight) / 4400;
  return distance * (selected ? -.14 : homeShift);
}

function cameraDistance(box, padding = 1.35) {
  const size = box.getSize(new THREE.Vector3());
  const height = Math.max(size.y, modelSize.y * .13);
  const width = Math.max(size.x, modelSize.x * .13);
  const vertical = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const horizontal = width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  return Math.max(vertical, horizontal, modelSize.length() * .16) * padding;
}

function moveCamera(target, direction, distance, immediate = false) {
  const position = target.clone().addScaledVector(direction, distance);
  if (immediate || reduceMotion.matches) {
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
    cameraTween = null;
    renderNeeded = true;
  } else {
    cameraTween = {
      fromPosition: camera.position.clone(), toPosition: position,
      fromTarget: controls.target.clone(), toTarget: target,
      start: performance.now(), duration: 850,
    };
  }
}

function goHome(immediate = false) {
  if (!model) return;
  const portrait = matchMedia("(max-width: 760px) and (orientation: portrait)").matches;
  const portraitPadding = Math.max(2.05, 1620 / app.clientHeight);
  const distance = cameraDistance(modelBox, portrait ? portraitPadding : 1.48);
  const target = center.clone();
  target.y += mobileOffset(distance);
  moveCamera(target, directions[currentView], distance, immediate);
}

function focusSelected(immediate = false) {
  if (!model || !selectedId) return;
  const objects = structureObjects.get(selectedId) || [];
  if (!objects.length) return;
  const box = new THREE.Box3();
  objects.forEach(object => box.expandByObject(object));
  const distance = cameraDistance(box, selectedId === "joints" || selectedId === "ligaments" ? 1.75 : 3.8);
  const target = box.getCenter(new THREE.Vector3());
  target.y += mobileOffset(distance, true);
  const view = byId.get(selectedId).view || currentView;
  currentView = view;
  updateViewButtons();
  moveCamera(target, directions[view], distance, immediate);
}

function selectItem(id, { open = true } = {}) {
  if (!byId.has(id)) return;
  selectedId = id;
  categoryId = byId.get(id).category;
  hiddenIds.delete(id);
  isolated = false;
  renderCategories();
  applyVisibility();
  updateSelectionUi();
  updateCard();
  if (open) openCard();
  focusSelected();
  announce(`${byId.get(id).label} seçildi`);
}

function applyVisibility() {
  for (const item of items) {
    for (const mesh of structureObjects.get(item.id) || []) {
      mesh.visible = !hiddenIds.has(item.id) && (!isolated || selectedId === item.id);
      const original = originalMaterials.get(mesh);
      if (mesh.material !== original) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
        mesh.material = original;
      }
      if (item.id === selectedId && mesh.visible) {
        const tint = material => {
          const clone = material.clone();
          if (clone.emissive) { clone.emissive.setHex(0x996039); clone.emissiveIntensity = .25; }
          return clone;
        };
        mesh.material = Array.isArray(original) ? original.map(tint) : tint(original);
      }
    }
  }
  updateLabels();
  renderNeeded = true;
}

function toggleVisibility(id) {
  if (hiddenIds.has(id)) hiddenIds.delete(id); else hiddenIds.add(id);
  if (id === selectedId && hiddenIds.has(id)) { selectedId = null; isolated = false; updateCard(); }
  applyVisibility();
  updateSelectionUi();
}

function showAll() {
  hiddenIds.clear();
  isolated = false;
  applyVisibility();
  updateSelectionUi();
  announce("Tüm yapılar gösteriliyor");
}

function toggleIsolation() {
  if (!selectedId) return;
  isolated = !isolated;
  applyVisibility();
  updateSelectionUi();
  announce(isolated ? "Seçili yapı izole edildi" : "Tüm yapılar gösteriliyor");
}

function updateViewButtons() {
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === currentView));
}

function setView(view) {
  currentView = view;
  updateViewButtons();
  if (!model) return;
  if (selectedId) {
    const objects = structureObjects.get(selectedId) || [];
    const box = new THREE.Box3();
    objects.forEach(object => box.expandByObject(object));
    const distance = cameraDistance(box, selectedId === "joints" || selectedId === "ligaments" ? 1.75 : 3.8);
    const target = box.getCenter(new THREE.Vector3());
    target.y += mobileOffset(distance, true);
    moveCamera(target, directions[view], distance);
  } else goHome();
}

function updateLabels() {
  const layer = $("#modelLabels");
  layer.replaceChildren();
  if (!labelsShown || !model) return;
  const source = selectedId ? [byId.get(selectedId)] : categoryId === "bones" ? bones : special.filter(item => item.category === categoryId);
  for (const item of source) {
    if (hiddenIds.has(item.id) || (isolated && selectedId !== item.id)) continue;
    const label = document.createElement("span");
    label.className = "model-label";
    label.textContent = item.label;
    label.dataset.id = item.id;
    layer.append(label);
  }
  positionLabels();
}

function positionLabels() {
  if (!labelsShown || !model) return;
  const rect = canvas.getBoundingClientRect();
  for (const label of $("#modelLabels").children) {
    const objects = structureObjects.get(label.dataset.id) || [];
    const box = new THREE.Box3();
    objects.forEach(object => box.expandByObject(object));
    if (box.isEmpty()) continue;
    const point = box.getCenter(new THREE.Vector3()).project(camera);
    label.style.display = point.z < -1 || point.z > 1 ? "none" : "block";
    label.style.left = `${(point.x * .5 + .5) * rect.width}px`;
    label.style.top = `${(-point.y * .5 + .5) * rect.height}px`;
  }
}

function announce(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function playClick() {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(680, now + .065);
    gain.gain.setValueAtTime(.025, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .07);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + .075);
  } catch (error) { console.warn("Ses oynatılamadı", error); }
}

function setMenu(open) {
  $("#topMenu").classList.toggle("hidden", !open);
  $("#menuButton").setAttribute("aria-expanded", String(open));
  $("#menuButton").setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
}

function resize() {
  const width = app.clientWidth, height = app.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 760 ? 1.5 : 2));
  renderer.setSize(width, height, false);
  renderNeeded = true;
}

function animate(now) {
  requestAnimationFrame(animate);
  if (cameraTween) {
    const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
    const smooth = t * t * (3 - 2 * t);
    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, smooth);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, smooth);
    if (t >= 1) cameraTween = null;
    renderNeeded = true;
  }
  if (controls.autoRotate) renderNeeded = true;
  const changed = controls.update();
  if (changed) renderNeeded = true;
  if (renderNeeded) {
    renderer.render(scene, camera);
    positionLabels();
    renderNeeded = false;
  }
}

canvas.addEventListener("pointerdown", event => { dragging = { x: event.clientX, y: event.clientY }; cameraTween = null; });
canvas.addEventListener("pointerup", event => {
  if (!dragging || Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 7 || !model) { dragging = null; return; }
  dragging = null;
  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObject(model, true).filter(result => result.object.visible && objectIds.has(result.object));
  const hit = hits.find(result => byId.get(objectIds.get(result.object)).category === categoryId) || hits[0];
  if (hit) selectItem(objectIds.get(hit.object));
});

$("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
$("#menuButton").addEventListener("click", () => setMenu($("#topMenu").classList.contains("hidden")));
$("#menuStructuresButton").addEventListener("click", () => {
  if (matchMedia("(max-width: 760px), (max-height: 500px)").matches) $("#mobileListToggle").click();
  else app.classList.toggle("sidebar-hidden");
  setMenu(false);
});
$("#helpButton").addEventListener("click", () => setMenu(false));
document.addEventListener("pointerdown", event => {
  if (!$("#topMenu").contains(event.target) && !$("#menuButton").contains(event.target)) setMenu(false);
});
$("#soundButton").addEventListener("click", event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute("aria-pressed", String(soundEnabled));
  event.currentTarget.setAttribute("aria-label", soundEnabled ? "Sesi kapat" : "Sesi aç");
  event.currentTarget.title = soundEnabled ? "Sesi kapat" : "Sesi aç";
  event.currentTarget.querySelector("img").src = soundEnabled ? "./kaynak/sesbt-1.png" : "./kaynak/sesbt.png";
});
$("#shareButton").addEventListener("click", async () => {
  try {
    if (navigator.share) await navigator.share({ title: document.title, url: location.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); announce("Bağlantı kopyalandı"); }
    else announce("Paylaşmak için adres çubuğundaki bağlantıyı kopyalayın");
  } catch (error) {
    if (error.name !== "AbortError") announce("Paylaşım başlatılamadı");
  }
});
$("#helpCloseButton").addEventListener("click", () => $("#helpDialog").close());
$("#helpDoneButton").addEventListener("click", () => $("#helpDialog").close());
$("#resetButton").addEventListener("click", () => { selectedId = null; isolated = false; hiddenIds.clear(); currentView = "front"; updateViewButtons(); applyVisibility(); updateCard(); updateSelectionUi(); goHome(); closeCard(); });
$("#fullscreenButton").addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : app.requestFullscreen?.());
$("#rotateButton").addEventListener("click", event => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 1.2; event.currentTarget.setAttribute("aria-pressed", String(controls.autoRotate)); renderNeeded = true; });
$("#isolateButton").addEventListener("click", toggleIsolation);
$("#labelsButton").addEventListener("click", event => { labelsShown = !labelsShown; event.currentTarget.setAttribute("aria-pressed", String(labelsShown)); updateLabels(); });
$("#showAllButton").addEventListener("click", showAll);
$("#openCardButton").addEventListener("click", openCard);
$("#closeCardButton").addEventListener("click", closeCard);
$("#previousButton").addEventListener("click", () => { const index = bones.findIndex(item => item.id === selectedId); if (index >= 0) selectItem(bones[(index - 1 + bones.length) % bones.length].id); });
$("#nextButton").addEventListener("click", () => { const index = bones.findIndex(item => item.id === selectedId); if (index >= 0) selectItem(bones[(index + 1) % bones.length].id); });
$("#mobileListToggle").addEventListener("click", event => { const closed = app.classList.toggle("mobile-list-closed"); event.currentTarget.setAttribute("aria-expanded", String(!closed)); });
$("#retryButton").addEventListener("click", loadModel);
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement || $("#helpDialog").open) return;
  const key = event.key.toLowerCase();
  if (key === "r") $("#resetButton").click();
  if (["1", "2", "3", "4"].includes(key)) setView(["front", "back", "left", "right"][Number(key) - 1]);
  if (key === "arrowright" && selectedId && byId.get(selectedId).category === "bones") $("#nextButton").click();
  if (key === "arrowleft" && selectedId && byId.get(selectedId).category === "bones") $("#previousButton").click();
});
window.addEventListener("resize", () => { resize(); if (model) selectedId ? focusSelected(true) : goHome(true); });
controls.addEventListener("change", () => { renderNeeded = true; });
app.addEventListener("click", playClick);

renderCategories();
renderStructureList();
updateSelectionUi();
updateViewButtons();
$("#openCardButton").disabled = true;
closeCard();
resize();
loadModel();
requestAnimationFrame(animate);
