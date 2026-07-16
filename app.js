// Fake It - lógica do jogo
const LS_KEY = 'fakeit_v2';

function loadSaved(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }catch(e){ return {}; }
}
function savePrefs(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify({
      players,
      imp: impostorCount,
      dur: durationMinutes,
      cats: Array.from(selectedCategories),
    }));
  }catch(e){ /* localStorage indisponível (ex: modo privado) */ }
}

const saved = loadSaved();
let players = Array.isArray(saved.players) ? saved.players.slice() : [];
let impostors = new Set();
let secret = {word: '', hint: ''};
let currentIndex = 0;
let order = [];
let countdown = null;

// palavras importadas de `palavras.js` — fallback para vazio
const WORDS = window.WORDS || [];

// DOM - setup
const playerNameInput = document.getElementById('playerName');
const addPlayerBtn = document.getElementById('addPlayer');
const playersList = document.getElementById('playersList');
const playerCountEl = document.getElementById('playerCount');
const minPlayersHint = document.getElementById('minPlayersHint');
const impCountEl = document.getElementById('impCount');
const impMinus = document.getElementById('impMinus');
const impPlus = document.getElementById('impPlus');
const durationEl = document.getElementById('duration');
const durMinus = document.getElementById('durMinus');
const durPlus = document.getElementById('durPlus');
const startGameBtn = document.getElementById('startGame');

const setupPanel = document.getElementById('setup');
const passView = document.getElementById('passView');
const passDots = document.getElementById('passDots');
const passName = document.getElementById('passName');
const passReadyBtn = document.getElementById('passReadyBtn');

const playerView = document.getElementById('playerView');
const revealDots = document.getElementById('revealDots');
const playerCard = document.getElementById('playerCard');
const cardEyebrow = document.getElementById('cardEyebrow');
const playerNameLabel = document.getElementById('playerNameLabel');
const revealBanner = document.getElementById('revealBanner');
const roleLabel = document.getElementById('roleLabel');
const secretWord = document.getElementById('secretWord');
const impostorHint = document.getElementById('impostorHint');
const sheetNote = document.getElementById('sheetNote');
const continueBtn = document.getElementById('continueBtn');

const timerView = document.getElementById('timerView');
const timerDisplay = document.getElementById('timerDisplay');
const timerSub = document.getElementById('timerSub');
const ringFg = document.getElementById('ringFg');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// state
let impostorCount = typeof saved.imp === 'number' ? saved.imp : 1;
let durationMinutes = typeof saved.dur === 'number' ? saved.dur : 3;
let revealed = false;
const selectedCategories = new Set(Array.isArray(saved.cats) ? saved.cats : []);
const usedWords = new Set();

function maxImpostors(){
  return Math.max(1, Math.floor(players.length / 2) || 1);
}

function updateStartButton(){
  const canStart = players.length >= 3 && selectedCategories.size > 0;
  startGameBtn.disabled = !canStart;
  minPlayersHint.classList.toggle('hidden', players.length >= 3);
}

function renderPlayers(){
  playersList.innerHTML = '';
  playerCountEl.textContent = players.length;
  players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'pchip';
    const avatar = document.createElement('span');
    avatar.className = 'pchip-avatar';
    avatar.textContent = p[0].toUpperCase();
    const nameSpan = document.createElement('span');
    nameSpan.textContent = p;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pchip-x';
    btn.textContent = '✕';
    btn.onclick = () => { players.splice(idx, 1); renderPlayers(); updateStartButton(); savePrefs(); };
    li.appendChild(avatar);
    li.appendChild(nameSpan);
    li.appendChild(btn);
    playersList.appendChild(li);
  });
  const max = maxImpostors();
  if (impostorCount > max) { impostorCount = max; impCountEl.textContent = impostorCount; }
  impMinus.disabled = impostorCount <= 1;
  impPlus.disabled = impostorCount >= max;
}

function shakeInput(){
  playerNameInput.classList.remove('shake');
  void playerNameInput.offsetWidth;
  playerNameInput.classList.add('shake');
  setTimeout(() => playerNameInput.classList.remove('shake'), 400);
}

function addPlayer(){
  const name = playerNameInput.value.trim();
  if (!name) { shakeInput(); return; }
  if (players.includes(name)) { playerNameInput.value = ''; return; }
  players.push(name);
  playerNameInput.value = '';
  playerNameInput.focus();
  renderPlayers();
  updateStartButton();
  savePrefs();
}

addPlayerBtn.addEventListener('click', addPlayer);
playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer(); });

impPlus.addEventListener('click', () => {
  const max = maxImpostors();
  impostorCount = Math.min(max, impostorCount + 1);
  impCountEl.textContent = impostorCount;
  impMinus.disabled = impostorCount <= 1;
  impPlus.disabled = impostorCount >= max;
  savePrefs();
});
impMinus.addEventListener('click', () => {
  impostorCount = Math.max(1, impostorCount - 1);
  impCountEl.textContent = impostorCount;
  impMinus.disabled = impostorCount <= 1;
  impPlus.disabled = impostorCount >= maxImpostors();
  savePrefs();
});

durPlus.addEventListener('click', () => { durationMinutes = Math.min(20, durationMinutes + 1); durationEl.textContent = durationMinutes; savePrefs(); });
durMinus.addEventListener('click', () => { durationMinutes = Math.max(1, durationMinutes - 1); durationEl.textContent = durationMinutes; savePrefs(); });

function pickRandomWord(){
  const pool = WORDS.filter(w => selectedCategories.size === 0 || selectedCategories.has(w.category));
  if (pool.length === 0) return null;

  let notUsed = pool.filter(w => !usedWords.has(w.word));
  if (notUsed.length === 0) {
    usedWords.clear();
    notUsed = pool.slice();
  }

  const idx = Math.floor(Math.random() * notUsed.length);
  const chosen = notUsed[idx];
  usedWords.add(chosen.word);
  return chosen;
}

function shuffledIndices(n){
  const arr = Array.from({length: n}, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickImpostors(){
  impostors = new Set();
  const indices = players.map((_, i) => i);
  for (let i = 0; i < impostorCount; i++) {
    if (indices.length === 0) break;
    const j = Math.floor(Math.random() * indices.length);
    impostors.add(indices[j]);
    indices.splice(j, 1);
  }
}

function renderDots(container){
  container.innerHTML = '';
  order.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i < currentIndex ? ' done' : i === currentIndex ? ' cur' : '');
    container.appendChild(dot);
  });
}

function showView(view){
  setupPanel.classList.toggle('hidden', view !== 'setup');
  passView.classList.toggle('hidden', view !== 'pass');
  playerView.classList.toggle('hidden', view !== 'reveal');
  timerView.classList.toggle('hidden', view !== 'timer');
}

startGameBtn.addEventListener('click', () => {
  if (players.length < 3) return;
  impostorCount = Math.max(1, Math.min(impostorCount, maxImpostors()));
  impCountEl.textContent = impostorCount;
  secret = pickRandomWord();
  if (!secret) { alert('Nenhuma palavra disponível nas categorias selecionadas. Selecione mais categorias.'); return; }
  pickImpostors();
  order = shuffledIndices(players.length);
  currentIndex = 0;
  savePrefs();
  showPass();
});

function showPass(){
  renderDots(passDots);
  passName.textContent = players[order[currentIndex]];
  showView('pass');
}

passReadyBtn.addEventListener('click', showReveal);

function showReveal(){
  revealed = false;
  closeBanner();
  const i = order[currentIndex];
  const name = players[i];
  renderDots(revealDots);
  cardEyebrow.textContent = `Jogador ${currentIndex + 1} de ${order.length}`;
  playerNameLabel.textContent = name;
  if (impostors.has(i)) {
    roleLabel.textContent = 'IMPOSTOR';
    roleLabel.classList.remove('role-player');
    secretWord.textContent = '—';
    impostorHint.textContent = 'Dica: ' + secret.hint;
    impostorHint.classList.remove('hidden');
    sheetNote.textContent = 'Disfarce. Ninguém pode saber.';
    revealBanner.classList.add('sheet-imp');
  } else {
    roleLabel.textContent = 'PALAVRA';
    roleLabel.classList.add('role-player');
    secretWord.textContent = secret.word;
    impostorHint.classList.add('hidden');
    sheetNote.textContent = 'Memorize e não deixe escapar.';
    revealBanner.classList.remove('sheet-imp');
  }
  showView('reveal');
}

continueBtn.addEventListener('click', () => {
  currentIndex++;
  if (currentIndex >= order.length) {
    startTimer(durationMinutes * 60);
    showView('timer');
  } else {
    showPass();
  }
});

// ===== Drag / swipe-to-reveal (bottom sheet) =====
const cardContent = document.getElementById('cardContent');
const banner = revealBanner;
const MAX_DRAG = 180;
const SWIPE_THRESHOLD = 70;
let dragStartY = null;
let dragging = false;
let dragPointerId = null;
let sheetOpen = false;

function setSheetPercent(pct){
  banner.style.transform = `translateY(${pct}%)`;
}
function openBanner(){
  sheetOpen = true;
  revealed = true;
  banner.classList.remove('dragging');
  setSheetPercent(0);
}
function closeBanner(){
  sheetOpen = false;
  revealed = false;
  banner.classList.remove('dragging');
  setSheetPercent(100);
}

function dragMove(clientY){
  const dy = sheetOpen ? clientY - dragStartY : dragStartY - clientY;
  const prog = Math.max(0, Math.min(1, dy / MAX_DRAG));
  setSheetPercent(sheetOpen ? prog * 100 : 100 - prog * 100);
}
function dragEnd(clientY){
  const dy = sheetOpen ? clientY - dragStartY : dragStartY - clientY;
  dragStartY = null;
  banner.classList.remove('dragging');
  if (dy > SWIPE_THRESHOLD) {
    sheetOpen ? closeBanner() : openBanner();
  } else {
    sheetOpen ? openBanner() : closeBanner();
  }
}

cardContent.addEventListener('pointerdown', (e) => {
  if (e.isPrimary === false) return;
  dragging = true;
  dragPointerId = e.pointerId;
  dragStartY = e.clientY;
  banner.classList.add('dragging');
  try { cardContent.setPointerCapture(e.pointerId); } catch(_){ }
});
cardContent.addEventListener('pointermove', (e) => {
  if (!dragging || dragStartY === null || e.pointerId !== dragPointerId) return;
  dragMove(e.clientY);
});
cardContent.addEventListener('pointerup', (e) => {
  if (!dragging || e.pointerId !== dragPointerId) return;
  dragging = false;
  dragPointerId = null;
  try { cardContent.releasePointerCapture(e.pointerId); } catch(_){ }
  dragEnd(e.clientY);
});
cardContent.addEventListener('pointercancel', () => { dragging = false; dragStartY = null; banner.classList.remove('dragging'); });
cardContent.addEventListener('click', () => { if (!sheetOpen && !dragging) openBanner(); });

// Swipe-down no próprio sheet para fechar (não conflita com o botão Continuar)
let sheetStartY = null;
banner.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  sheetStartY = e.clientY;
  dragStartY = e.clientY;
  banner.classList.add('dragging');
  try { banner.setPointerCapture(e.pointerId); } catch(_){ }
});
banner.addEventListener('pointermove', (e) => {
  if (sheetStartY === null) return;
  dragMove(e.clientY);
});
banner.addEventListener('pointerup', (e) => {
  if (sheetStartY === null) return;
  sheetStartY = null;
  try { banner.releasePointerCapture(e.pointerId); } catch(_){ }
  dragEnd(e.clientY);
});
banner.addEventListener('pointercancel', () => { sheetStartY = null; banner.classList.remove('dragging'); });

// ===== Timer =====
let timeLeft = 0;
let running = false;
const CIRC = 2 * Math.PI * 130;
ringFg.setAttribute('stroke-dasharray', CIRC);

function formatTime(s){
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function updateRing(total){
  const frac = Math.max(0, timeLeft) / total;
  ringFg.setAttribute('stroke-dashoffset', CIRC * (1 - frac));
}

let timerTotal = 0;
function startTimer(seconds){
  timerTotal = seconds;
  timeLeft = seconds;
  timerDisplay.textContent = formatTime(timeLeft);
  timerSub.textContent = 'Discussão em andamento';
  timerView.classList.remove('time-up');
  updateRing(timerTotal);
  running = true;
  pauseBtn.textContent = 'Pausar';
  clearInterval(countdown);
  countdown = setInterval(() => {
    if (!running) return;
    timeLeft--;
    updateRing(timerTotal);
    if (timeLeft <= 0) {
      timeLeft = 0;
      timerDisplay.textContent = '00:00';
      timerSub.textContent = 'Tempo esgotado!';
      timerView.classList.add('time-up');
      clearInterval(countdown);
    } else {
      timerDisplay.textContent = formatTime(timeLeft);
    }
  }, 1000);
}

function stopTimer(){ clearInterval(countdown); countdown = null; running = false; }

pauseBtn.addEventListener('click', () => {
  running = !running;
  pauseBtn.textContent = running ? 'Pausar' : 'Retomar';
  timerSub.textContent = running ? 'Discussão em andamento' : 'Pausado';
});
resetBtn.addEventListener('click', () => {
  stopTimer();
  startTimer(durationMinutes * 60);
});

const showImpostorBtn = document.getElementById('showImpostorBtn');
const impostorReveal = document.getElementById('impostorReveal');
showImpostorBtn.addEventListener('click', () => {
  const names = Array.from(impostors).map(i => players[i]);
  const label = names.length > 1 ? 'Impostores' : 'Impostor';
  impostorReveal.textContent = `${label}: ${names.join(', ')}`;
  impostorReveal.classList.remove('hidden');
  setTimeout(() => impostorReveal.classList.add('hidden'), 7000);
});

const backToStartBtn = document.getElementById('backToStartBtn');
backToStartBtn.addEventListener('click', () => {
  stopTimer();
  showView('setup');
});

// ===== Categories =====
function buildCategoryControls(){
  const container = document.getElementById('categories');
  container.innerHTML = '';
  const categories = Array.from(new Set(WORDS.map(w => w.category).filter(Boolean)));
  if (categories.length === 0) { container.textContent = 'Nenhuma categoria disponível.'; return; }

  if (selectedCategories.size === 0 && !saved.cats) {
    categories.forEach(c => selectedCategories.add(c));
  }

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (selectedCategories.has(cat) ? ' on' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      if (selectedCategories.has(cat)) selectedCategories.delete(cat);
      else selectedCategories.add(cat);
      btn.classList.toggle('on', selectedCategories.has(cat));
      updateStartButton();
      savePrefs();
    });
    container.appendChild(btn);
  });
}

document.getElementById('selectAllCats').addEventListener('click', () => {
  document.querySelectorAll('#categories .chip').forEach(btn => {
    selectedCategories.add(btn.textContent);
    btn.classList.add('on');
  });
  updateStartButton();
  savePrefs();
});
document.getElementById('clearCats').addEventListener('click', () => {
  selectedCategories.clear();
  document.querySelectorAll('#categories .chip').forEach(btn => btn.classList.remove('on'));
  updateStartButton();
  savePrefs();
});

// init
function init(){
  impCountEl.textContent = impostorCount;
  durationEl.textContent = durationMinutes;
  renderPlayers();
  buildCategoryControls();
  updateStartButton();
  closeBanner();
}

init();
