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
  { id: "joints", label: "Eklemler", node: "Eklemler", category: "joints", card: `${ASSET}kartlar/Eklemler.png` },
  { id: "ligaments", label: "Eklem bağları", node: "Eklem_Bağları", category: "ligaments", card: `${ASSET}kartlar/Eklem Bağı.png` },
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
renderer.toneMappingExposure = 1.08;
renderer.setClearColor(0, 0);
scene.add(new THREE.HemisphereLight(0xf5f9ff, 0x736556, 1.7));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
keyLight.position.set(3, 5, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xc3d9f9, .7);
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
const highlightMaterials = new Set();
const highlightColor = new THREE.Color(0xffe3ab);
// Bone anatomy is the permanent base; the other two layers are independent switches.
const visibleLayers = new Set(["bones"]);
const compactDevice = matchMedia("(max-width: 900px), (pointer: coarse)");
let model = null;
let modelBox = new THREE.Box3();
let modelSize = new THREE.Vector3(1, 2, 1);
let center = new THREE.Vector3();
let selectedId = null;
let labelsShown = false;
let currentView = "front";
let cameraTween = null;
let dragging = null;
const activePointers = new Set();
let toastTimer = null;
let renderNeeded = true;
let highlightUntil = 0;
let soundEnabled = false;
let audioContext = null;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function renderCategories() {
  const container = $("#categoryList");
  for (const category of categories) {
    let button = container.querySelector(`[data-layer="${category.id}"]`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.layer = category.id;
      const image = document.createElement("img");
      image.className = "category-art";
      image.alt = "";
      image.draggable = false;
      button.append(image);
      button.addEventListener("click", () => toggleLayer(category.id));
      container.append(button);
    }
    const visible = visibleLayers.has(category.id);
    button.className = `category-button${visible ? " active" : ""}`;
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", category.label);
    const showingCard = selectedId === category.id && !$("#infoPanel").classList.contains("closed");
    button.title = category.id === "bones" ? "Kemikler her zaman görünür · Tüm iskelete dön" : `${category.label}: ${visible && showingCard ? "gizle" : visible ? "bilgi kartını aç" : "göster"}`;
    button.querySelector("img").src = `${ASSET}${visible ? category.activeImage : category.image}`;
  }
}

function toggleLayer(id) {
  if (id === "bones") {
    selectedId = null;
    applyVisibility();
    updateCard();
    closeCard();
    goHome();
    return;
  }
  if (visibleLayers.has(id)) {
    if (selectedId !== id || $("#infoPanel").classList.contains("closed")) {
      selectItem(id, { focus: false });
      return;
    }
    visibleLayers.delete(id);
    if (selectedId === id) {
      selectedId = null;
      updateCard();
      closeCard();
    }
    renderCategories();
    applyVisibility();
  } else {
    visibleLayers.add(id);
    // Keep the camera still so the change can be compared on the same joint.
    selectItem(id, { focus: false });
  }
}

function updateCard() {
  const content = $("#cardContent");
  const item = byId.get(selectedId);
  content.replaceChildren();
  $("#cardControls").hidden = !item || item.category !== "bones";
  $("#infoPanel").setAttribute("aria-label", item ? `${item.label} bilgi kartı` : "Bilgi kartı");
  if (!item) return;
  const image = document.createElement("img");
  image.alt = `${item.label} bilgi kartı`;
  image.src = item.card;
  image.draggable = false;
  image.addEventListener("error", () => {
    const message = document.createElement("p");
    message.className = "card-placeholder";
    message.textContent = `${item.label} kart görseli yüklenemedi.`;
    content.replaceChildren(message);
  }, { once: true });
  content.append(image);
  content.scrollTop = 0;
  $("#cardPosition").textContent = item.category === "bones" ? `${bones.indexOf(item) + 1} / ${bones.length}` : "";
}

function openCard() { $("#infoPanel").classList.remove("closed"); app.classList.add("card-open"); renderCategories(); resize(); }
function closeCard() { $("#infoPanel").classList.add("closed"); app.classList.remove("card-open"); renderCategories(); resize(); }

function loadModel() {
  const loader = new GLTFLoader();
  $("#loading").classList.remove("hidden");
  $("#error").classList.add("hidden");
  const modelUrl = compactDevice.matches ? "./destek-web.glb" : "./destek-detail.glb";
  loader.load(modelUrl, gltf => {
    model = gltf.scene;
    scene.add(model);
    model.updateWorldMatrix(true, true);
    modelBox.setFromObject(model);
    modelBox.getCenter(center);
    modelBox.getSize(modelSize);
    const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), compactDevice.matches ? 4 : 8);
    model.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const map of [material.map, material.normalMap, material.roughnessMap]) {
          if (map) map.anisotropy = anisotropy;
        }
      }
    });
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

function cameraDistance(box, padding = 1.2, minimumModelScale = .12, view = currentView) {
  const size = box.getSize(new THREE.Vector3());
  const direction = directions[view];
  const height = Math.max(size.y, modelSize.y * .1);
  const width = Math.max(Math.abs(direction.x) * size.z + Math.abs(direction.z) * size.x, modelSize.y * .05);
  const depth = Math.abs(direction.x) * size.x + Math.abs(direction.z) * size.z;
  const vertical = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const horizontal = width / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  return Math.max(vertical, horizontal, modelSize.length() * minimumModelScale) * padding + depth * .5;
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
  const distance = cameraDistance(modelBox, 1.12);
  const target = center.clone();
  moveCamera(target, directions[currentView], distance, immediate);
}

function focusSelected(immediate = false, usePreferredView = false) {
  if (!model || !selectedId) return;
  if (byId.get(selectedId).category !== "bones") { goHome(immediate); return; }
  const objects = structureObjects.get(selectedId) || [];
  if (!objects.length) return;
  const box = new THREE.Box3();
  objects.forEach(object => box.expandByObject(object));
  const bone = byId.get(selectedId).category === "bones";
  const view = usePreferredView ? byId.get(selectedId).view || currentView : currentView;
  const distance = cameraDistance(box, bone ? 2.6 : 1.12, bone ? .08 : .12, view);
  const target = box.getCenter(new THREE.Vector3());
  currentView = view;
  updateViewButtons();
  moveCamera(target, directions[view], distance, immediate);
}

function selectItem(id, { open = true, focus = true } = {}) {
  if (!byId.has(id)) return;
  selectedId = id;
  visibleLayers.add(byId.get(id).category);
  renderCategories();
  applyVisibility();
  updateCard();
  if (open) openCard();
  if (focus) focusSelected(false, true);
}

function applyVisibility() {
  highlightMaterials.clear();
  for (const item of items) {
    for (const mesh of structureObjects.get(item.id) || []) {
      mesh.visible = visibleLayers.has(item.category);
      const original = originalMaterials.get(mesh);
      if (mesh.material !== original) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
        mesh.material = original;
      }
      if (item.id === selectedId && item.category === "bones" && mesh.visible) {
        const tint = material => {
          const clone = material.clone();
          if (clone.color) clone.color.lerp(highlightColor, .14);
          if (clone.emissive) {
            clone.emissive.setHex(0xb67b37);
            clone.emissiveIntensity = .3;
            highlightMaterials.add(clone);
          }
          return clone;
        };
        mesh.material = Array.isArray(original) ? original.map(tint) : tint(original);
      }
    }
  }
  highlightUntil = selectedId && highlightMaterials.size && !reduceMotion.matches ? performance.now() + 2400 : 0;
  updateLabels();
  renderNeeded = true;
}

function showAll() {
  categories.forEach(category => visibleLayers.add(category.id));
  renderCategories();
  applyVisibility();
  announce("Tüm katmanlar gösteriliyor");
}

function resetViewer() {
  selectedId = null;
  visibleLayers.clear();
  visibleLayers.add("bones");
  currentView = "front";
  labelsShown = false;
  controls.autoRotate = false;
  $("#rotateButton").setAttribute("aria-pressed", "false");
  $("#labelsButton").setAttribute("aria-pressed", "false");
  renderCategories();
  updateViewButtons();
  applyVisibility();
  updateCard();
  closeCard();
  setViewMenu(false);
  goHome();
}

function setViewMenu(open) {
  $("#viewControls").classList.toggle("hidden", !open);
  $("#viewButton").setAttribute("aria-expanded", String(open));
  $("#viewButton").setAttribute("aria-label", open ? "Kamera açılarını kapat" : "Kamera açılarını aç");
}

function updateViewButtons() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === currentView);
    button.setAttribute("aria-pressed", String(button.dataset.view === currentView));
  });
}

function setView(view) {
  currentView = view;
  updateViewButtons();
  setViewMenu(false);
  if (!model) return;
  if (selectedId && byId.get(selectedId).category === "bones") focusSelected();
  else goHome();
}

function updateLabels() {
  const layer = $("#modelLabels");
  layer.replaceChildren();
  if (!labelsShown || !model) return;
  const source = selectedId ? [byId.get(selectedId)] : items;
  for (const item of source) {
    if (!visibleLayers.has(item.category)) continue;
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
  const appRect = app.getBoundingClientRect();
  for (const label of $("#modelLabels").children) {
    const objects = structureObjects.get(label.dataset.id) || [];
    const box = new THREE.Box3();
    objects.forEach(object => box.expandByObject(object));
    if (box.isEmpty()) continue;
    const point = box.getCenter(new THREE.Vector3()).project(camera);
    const visible = point.z >= -1 && point.z <= 1 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1;
    label.style.display = visible ? "block" : "none";
    if (!visible) continue;
    const x = THREE.MathUtils.clamp((point.x * .5 + .5) * rect.width, label.offsetWidth / 2 + 2, rect.width - label.offsetWidth / 2 - 2);
    const y = THREE.MathUtils.clamp((-point.y * .5 + .5) * rect.height, label.offsetHeight / 2 + 2, rect.height - label.offsetHeight / 2 - 2);
    label.style.left = `${rect.left - appRect.left + x}px`;
    label.style.top = `${rect.top - appRect.top + y}px`;
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
  const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compactDevice.matches ? 1.5 : 2));
  renderer.setSize(width, height, false);
  renderNeeded = true;
}

function animate(now) {
  requestAnimationFrame(animate);
  if (highlightUntil && now < highlightUntil) {
    const glow = .29 + .11 * Math.sin(now * .009);
    highlightMaterials.forEach(material => { material.emissiveIntensity = glow; });
    renderNeeded = true;
  } else if (highlightUntil) {
    highlightMaterials.forEach(material => { material.emissiveIntensity = .3; });
    highlightUntil = 0;
    renderNeeded = true;
  }
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

canvas.addEventListener("pointerdown", event => {
  activePointers.add(event.pointerId);
  dragging = activePointers.size === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null;
  cameraTween = null;
});
canvas.addEventListener("pointermove", event => {
  if (dragging && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 7) dragging.moved = true;
});
canvas.addEventListener("pointercancel", event => { activePointers.delete(event.pointerId); dragging = null; });
canvas.addEventListener("pointerup", event => {
  activePointers.delete(event.pointerId);
  if (!dragging || dragging.id !== event.pointerId || dragging.moved || Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 7 || !model) { dragging = null; return; }
  dragging = null;
  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObject(model, true).filter(result => result.object.visible && objectIds.has(result.object));
  const hit = hits[0];
  if (hit) selectItem(objectIds.get(hit.object));
});

$("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
$("#menuButton").addEventListener("click", () => setMenu($("#topMenu").classList.contains("hidden")));
$("#menuHomeButton").addEventListener("click", () => { resetViewer(); setMenu(false); });
$("#helpButton").addEventListener("click", () => setMenu(false));
document.addEventListener("pointerdown", event => {
  if (!$("#topMenu").contains(event.target) && !$("#menuButton").contains(event.target)) setMenu(false);
  if (!$("#viewControls").contains(event.target) && !$("#viewButton").contains(event.target)) setViewMenu(false);
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
$("#resetButton").addEventListener("click", resetViewer);
$("#fullscreenButton").addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : app.requestFullscreen?.());
$("#rotateButton").addEventListener("click", event => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 1.2; event.currentTarget.setAttribute("aria-pressed", String(controls.autoRotate)); renderNeeded = true; });
$("#viewButton").addEventListener("click", () => setViewMenu($("#viewControls").classList.contains("hidden")));
$("#labelsButton").addEventListener("click", event => { labelsShown = !labelsShown; event.currentTarget.setAttribute("aria-pressed", String(labelsShown)); updateLabels(); });
$("#showAllButton").addEventListener("click", showAll);
$("#closeCardButton").addEventListener("click", closeCard);
$("#previousButton").addEventListener("click", () => { const index = bones.findIndex(item => item.id === selectedId); if (index >= 0) selectItem(bones[(index - 1 + bones.length) % bones.length].id); });
$("#nextButton").addEventListener("click", () => { const index = bones.findIndex(item => item.id === selectedId); if (index >= 0) selectItem(bones[(index + 1) % bones.length].id); });
$("#retryButton").addEventListener("click", loadModel);
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement || $("#helpDialog").open) return;
  const key = event.key.toLowerCase();
  if (key === "r") $("#resetButton").click();
  if (["1", "2", "3", "4"].includes(key)) setView(["front", "back", "left", "right"][Number(key) - 1]);
  if (key === "arrowright") { event.preventDefault(); selectItem(bones[(bones.findIndex(item => item.id === selectedId) + 1) % bones.length].id); }
  if (key === "arrowleft") { event.preventDefault(); const index = bones.findIndex(item => item.id === selectedId); selectItem(bones[(index <= 0 ? bones.length : index) - 1].id); }
  if (key === "escape") { setViewMenu(false); setMenu(false); }
});
window.addEventListener("resize", () => { resize(); if (model) selectedId ? focusSelected(true) : goHome(true); });
new ResizeObserver(resize).observe(canvas);
controls.addEventListener("change", () => { renderNeeded = true; });
app.addEventListener("click", playClick);

renderCategories();
updateViewButtons();
updateCard();
closeCard();
resize();
loadModel();
requestAnimationFrame(animate);
