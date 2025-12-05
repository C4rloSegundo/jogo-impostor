// Fake It - protótipo simples
const players = [];
let impostors = new Set();
let secret = {word: '', hint: ''};
let currentIndex = 0;
let countdown = null;

// palavras importadas de `palavras.js` — fallback para vazio
const WORDS = window.WORDS || [];

// DOM
const playerNameInput = document.getElementById('playerName');
const addPlayerBtn = document.getElementById('addPlayer');
const playersList = document.getElementById('playersList');
const impCountEl = document.getElementById('impCount');
const impMinus = document.getElementById('impMinus');
const impPlus = document.getElementById('impPlus');
const durationEl = document.getElementById('duration');
const durMinus = document.getElementById('durMinus');
const durPlus = document.getElementById('durPlus');
const startGameBtn = document.getElementById('startGame');

const setupPanel = document.getElementById('setup');
const playerView = document.getElementById('playerView');
const playerCard = document.getElementById('playerCard');
const playerNameLabel = document.getElementById('playerNameLabel');
const revealBanner = document.getElementById('revealBanner');
const roleLabel = document.getElementById('roleLabel');
const secretWord = document.getElementById('secretWord');
const impostorHint = document.getElementById('impostorHint');
const continueBtn = document.getElementById('continueBtn');
const backToSetup = document.getElementById('backToSetup');

const timerView = document.getElementById('timerView');
const timerDisplay = document.getElementById('timerDisplay');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// state
let impostorCount = 1;
let durationMinutes = 3;
let revealed = false;
// categories selected by the user (Set of category names)
let selectedCategories = new Set();
// words already used in previous rounds (avoid repeats until pool exhausted)
const usedWords = new Set();

function renderPlayers(){
  playersList.innerHTML = '';
  players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.textContent = p;
    const btn = document.createElement('button');
    btn.textContent = 'x';
    btn.className = 'remove';
    btn.onclick = ()=>{ players.splice(idx,1); renderPlayers(); }
    li.appendChild(btn);
    playersList.appendChild(li);
  });
}

addPlayerBtn.addEventListener('click', ()=>{
  const name = playerNameInput.value.trim();
  if(!name) return;
  players.push(name);
  playerNameInput.value = '';
  renderPlayers();
});

impPlus.addEventListener('click', ()=>{ impostorCount = Math.min(players.length-1, impostorCount+1); impCountEl.textContent = impostorCount; });
impMinus.addEventListener('click', ()=>{ impostorCount = Math.max(1, impostorCount-1); impCountEl.textContent = impostorCount; });

// duration now handled in minutes
durPlus.addEventListener('click', ()=>{ durationMinutes = Math.min(60, durationMinutes+1); durationEl.textContent = durationMinutes; });
durMinus.addEventListener('click', ()=>{ durationMinutes = Math.max(1, durationMinutes-1); durationEl.textContent = durationMinutes; });

function pickRandomWord(){
  // filter by selected categories (or all if none)
  const pool = WORDS.filter(w => {
    if(selectedCategories.size === 0) return true;
    return selectedCategories.has(w.category);
  });
  if(pool.length === 0) return null;

  // try to pick from words not used yet
  let notUsed = pool.filter(w => !usedWords.has(w.word));

  // if all words in the pool were already used, reset usedWords for a fresh round
  if(notUsed.length === 0){
    // clear usedWords so words can repeat again after exhaustion
    // (we clear globally to keep implementation simple)
    usedWords.clear();
    notUsed = pool.slice();
  }

  const idx = Math.floor(Math.random() * notUsed.length);
  const chosen = notUsed[idx];
  // mark chosen word as used so it won't repeat until pool is exhausted
  usedWords.add(chosen.word);
  return chosen;
}

function pickImpostors(){
  impostors = new Set();
  const indices = players.map((_,i)=>i);
  for(let i=0;i<impostorCount;i++){
    if(indices.length===0) break;
    const j = Math.floor(Math.random()*indices.length);
    impostors.add(indices[j]);
    indices.splice(j,1);
  }
}

startGameBtn.addEventListener('click', ()=>{
  if(players.length<3){ alert('Adicione pelo menos 3 jogadores.'); return; }
  // constrain impostorCount
  impostorCount = Math.max(1, Math.min(impostorCount, Math.floor(players.length/2)));
  impCountEl.textContent = impostorCount;
  // pick secret and impostors
  secret = pickRandomWord();
  if(!secret){ alert('Nenhuma palavra disponível nas categorias selecionadas. Selecione mais categorias.'); return; }
  pickImpostors();
  currentIndex = 0;
  // show first player card
  setupPanel.classList.add('hidden');
  playerView.classList.remove('hidden');
  showPlayer(currentIndex);
});

function showPlayer(i){
  revealed = false;
  // ensure banner is closed when showing new player
  try{ closeBanner(); }catch(e){ revealBanner.style.transform = 'translateY(100%)'; revealed = false; }
  const name = players[i];
  playerNameLabel.textContent = name;
  // prepare reveal content
  if(impostors.has(i)){
    roleLabel.textContent = 'IMPOSTOR';
    secretWord.textContent = '—';
    impostorHint.textContent = 'Dica: ' + secret.hint;
    impostorHint.style.display = 'block';
  } else {
    roleLabel.textContent = 'JOGADOR';
    secretWord.textContent = secret.word;
    impostorHint.style.display = 'none';
  }
}

continueBtn.addEventListener('click', ()=>{
  currentIndex++;
  if(currentIndex >= players.length){
    // all players seen -> start timer
    playerView.classList.add('hidden');
    startTimer(durationMinutes * 60);
    timerView.classList.remove('hidden');
  } else {
    showPlayer(currentIndex);
    // scroll to top of card
    playerCard.scrollTop = 0;
  }
});

backToSetup.addEventListener('click', ()=>{
  // stop any timer
  stopTimer();
  timerView.classList.add('hidden');
  playerView.classList.add('hidden');
  setupPanel.classList.remove('hidden');
});

// ===== Interações de arrastar / reveal interativo =====
const cardContent = document.getElementById('cardContent');
const banner = revealBanner; // já definido acima
let startY = null;
let pointerActive = false;
let currentPointerId = null;
const SWIPE_THRESHOLD = 80; // pixels para considerar reveal
const MAX_DRAG = 160; // px usado para calcular progress

// helper: set banner transform (percent 0..100)
function setBannerTranslatePercent(pct){
  // pct = 0 -> fully open (translateY(0%))
  // pct = 100 -> hidden (translateY(100%))
  banner.style.transform = `translateY(${pct}%)`;
}

// pointer down on card content starts the drag
function onPointerDown(e){
  if (e.isPrimary === false) return;
  pointerActive = true;
  currentPointerId = e.pointerId;
  startY = e.clientY;
  banner.classList.add('dragging'); // remove transition for live drag
  try { cardContent.setPointerCapture && cardContent.setPointerCapture(e.pointerId); } catch(_){ }
}

function onPointerMove(e){
  if (!pointerActive || startY === null || e.pointerId !== currentPointerId) return;
  const dy = startY - e.clientY; // positive = moving up
  if (dy <= 0){
    // dragging down or no move -> keep hidden position
    setBannerTranslatePercent(100);
    return;
  }
  const progress = Math.min(1, dy / MAX_DRAG);
  const pct = 100 - (progress * 100); // 100 -> hidden, 0 -> open
  setBannerTranslatePercent(pct);
}

function onPointerUp(e){
  if (!pointerActive || e.pointerId !== currentPointerId) return;
  const dy = startY - e.clientY;
  pointerActive = false;
  startY = null;
  currentPointerId = null;
  try { cardContent.releasePointerCapture && cardContent.releasePointerCapture(e.pointerId); } catch(_){ }
  banner.classList.remove('dragging');

  if (dy > SWIPE_THRESHOLD){
    // commit reveal
    openBanner();
  } else {
    // reset hide
    closeBanner();
  }
}

// Attach pointer events with sensible checks
cardContent.addEventListener('pointerdown', onPointerDown);
cardContent.addEventListener('pointermove', onPointerMove);
cardContent.addEventListener('pointerup', onPointerUp);
cardContent.addEventListener('pointercancel', () => { pointerActive=false; startY=null; banner.classList.remove('dragging'); });

// Fallback for touch-only environments (older iOS): map touch -> same handlers
cardContent.addEventListener('touchstart', (ev)=> {
  const t = ev.touches[0];
  startY = t.clientY;
  pointerActive = true;
  banner.classList.add('dragging');
});
cardContent.addEventListener('touchmove', (ev)=> {
  if (!pointerActive) return;
  const t = ev.touches[0];
  const dy = startY - t.clientY;
  if (dy <= 0) { setBannerTranslatePercent(100); return; }
  const progress = Math.min(1, dy / MAX_DRAG);
  setBannerTranslatePercent(100 - progress*100);
});
cardContent.addEventListener('touchend', (ev)=>{
  if (!pointerActive) return;
  const t = ev.changedTouches[0];
  const dy = startY - t.clientY;
  pointerActive = false;
  startY = null;
  banner.classList.remove('dragging');
  if (dy > SWIPE_THRESHOLD) openBanner(); else closeBanner();
});

// Também permitir tocar/clicar no card para revelar (fallback)
cardContent.addEventListener('click', (e)=>{
  // não conflitar quando já estiver aberta
  if (banner.classList.contains('open')) return;
  openBanner();
});

// Swipe-down no próprio banner para ocultar
let bannerStartY = null;
banner.addEventListener('pointerdown', (e)=>{
  bannerStartY = e.clientY;
  banner.classList.add('dragging');
  try { banner.setPointerCapture && banner.setPointerCapture(e.pointerId); } catch(_){ }
});
banner.addEventListener('pointermove', (e)=>{
  if (bannerStartY === null) return;
  const dy = e.clientY - bannerStartY; // positive when dragging down
  if (dy <= 0) { setBannerTranslatePercent(0); return; } // keep at top
  const progress = Math.min(1, dy / MAX_DRAG);
  setBannerTranslatePercent(progress * 100); // 0..100
});
banner.addEventListener('pointerup', (e)=>{
  if (bannerStartY === null) return;
  const dy = e.clientY - bannerStartY;
  bannerStartY = null;
  banner.classList.remove('dragging');
  try { banner.releasePointerCapture && banner.releasePointerCapture(e.pointerId); } catch(_){ }
  if (dy > SWIPE_THRESHOLD) closeBanner(); else openBanner();
});
banner.addEventListener('pointercancel', ()=>{ bannerStartY=null; banner.classList.remove('dragging'); });

// touch fallback for banner
banner.addEventListener('touchstart', (ev)=> { bannerStartY = ev.touches[0].clientY; banner.classList.add('dragging'); });
banner.addEventListener('touchmove', (ev)=> {
  if (bannerStartY === null) return;
  const t = ev.touches[0];
  const dy = t.clientY - bannerStartY;
  const pct = Math.max(0, Math.min(100, (dy / MAX_DRAG) * 100));
  setBannerTranslatePercent(pct);
});
banner.addEventListener('touchend', (ev)=> {
  if (bannerStartY === null) return;
  const t = ev.changedTouches[0];
  const dy = t.clientY - bannerStartY;
  bannerStartY = null;
  banner.classList.remove('dragging');
  if (dy > SWIPE_THRESHOLD) closeBanner(); else openBanner();
});

// ===== helpers to open/close the banner with classes =====
function openBanner(){
  banner.classList.add('open');
  banner.style.transform = ''; // let CSS handle it
  revealed = true;
}
function closeBanner(){
  banner.classList.remove('open');
  // ensure transform to hidden
  banner.style.transform = 'translateY(100%)';
  revealed = false;
}

// Override original reveal() to use openBanner()
function reveal(){
  if(revealed) return;
  // set content according to role (existing logic)
  const i = currentIndex;
  if(impostors.has(i)){
    roleLabel.textContent = 'IMPOSTOR';
    secretWord.textContent = '—';
    impostorHint.style.display = 'block';
  } else {
    roleLabel.textContent = 'PALAVRA';
    secretWord.textContent = secret.word;
    impostorHint.style.display = 'none';
  }
  openBanner();
}

// timer functions
let timeLeft = 0;
let running = false;
function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = (s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

function startTimer(seconds){
  timeLeft = seconds;
  timerDisplay.textContent = formatTime(timeLeft);
  running = true;
  countdown = setInterval(()=>{
    if(!running) return;
    timeLeft--;
    timerDisplay.textContent = formatTime(timeLeft);
    if(timeLeft<=0){ clearInterval(countdown); alert('Tempo esgotado!'); }
  }, 1000);
}

function stopTimer(){ clearInterval(countdown); countdown = null; running = false; }

pauseBtn.addEventListener('click', ()=>{ running = !running; pauseBtn.textContent = running? 'Pausar' : 'Retomar'; });
resetBtn.addEventListener('click', ()=>{ stopTimer(); startTimer(durationMinutes * 60); running = true; pauseBtn.textContent = 'Pausar'; });


// Botão para mostrar o impostor na tela de discussão (visual)
const showImpostorBtn = document.getElementById('showImpostorBtn');
const impostorReveal = document.getElementById('impostorReveal');
if (showImpostorBtn && impostorReveal) {
  showImpostorBtn.addEventListener('click', () => {
    const impostorNames = Array.from(impostors).map(i => players[i]).join(', ');
    impostorReveal.textContent = 'Impostor' + (impostors.size > 1 ? 'es' : '') + ': ' + impostorNames;
    impostorReveal.classList.remove('hidden');
    // Esconde automaticamente após 7 segundos
    setTimeout(() => {
      impostorReveal.classList.add('hidden');
    }, 7000);
  });
}

// Botão para voltar ao início sem perder nomes
const backToStartBtn = document.getElementById('backToStartBtn');
if (backToStartBtn) {
  backToStartBtn.addEventListener('click', () => {
    stopTimer();
    timerView.classList.add('hidden');
    setupPanel.classList.remove('hidden');
    // Não limpa o array players, apenas volta para o setup
    renderPlayers();
  });
}

// init UI defaults
function init(){
  impCountEl.textContent = impostorCount;
  durationEl.textContent = durationMinutes;
  renderPlayers();
  buildCategoryControls();
}

init();

// Build category checkboxes dynamically from WORDS
function buildCategoryControls(){
  const container = document.getElementById('categories');
  if(!container) return;
  container.innerHTML = '';
  const categories = Array.from(new Set(WORDS.map(w => w.category).filter(Boolean)));
  if(categories.length === 0){ container.textContent = 'Nenhuma categoria disponível.'; return; }

  // helper to (re)populate selectedCategories - default to all selected
  categories.forEach(cat => selectedCategories.add(cat));

  // Select all / clear all buttons
  const actions = document.createElement('div');
  actions.className = 'categories-actions';
  actions.style.marginBottom = '6px';
  const selectAllBtn = document.createElement('button');
  selectAllBtn.textContent = 'Selecionar tudo';
  selectAllBtn.addEventListener('click', ()=>{
    selectedCategories.clear();
    categories.forEach(c=>selectedCategories.add(c));
    // check all boxes
    container.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked = true);
  });
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Limpar';
  clearBtn.style.marginLeft = '6px';
  clearBtn.addEventListener('click', ()=>{
    selectedCategories.clear();
    container.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked = false);
  });
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  container.appendChild(actions);

  const list = document.createElement('div');
  list.className = 'categories-list';
  categories.forEach(cat => {
    const id = `cat_${cat.replace(/\s+/g,'_')}`;
    const label = document.createElement('label');
    label.style.display = 'inline-block';
    label.style.marginRight = '8px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = true;
    cb.addEventListener('change', (e)=>{
      if(e.target.checked) selectedCategories.add(cat); else selectedCategories.delete(cat);
    });
    const span = document.createElement('span');
    span.textContent = ' ' + cat;
    label.appendChild(cb);
    label.appendChild(span);
    list.appendChild(label);
  });
  container.appendChild(list);
}
