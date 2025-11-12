// Fake It - protótipo simples
const players = [];
let impostors = new Set();
let secret = {word: '', hint: ''};
let currentIndex = 0;
let countdown = null;

// sample words with hint for impostor
const WORDS = [
  {word: 'Festa na Praia', hint: 'Sol, areia e música'},
  {word: 'Esponja', hint: 'Absorve água'},
  {word: 'Pizza', hint: 'Queijo e molho'},
  {word: 'Cachorro', hint: 'Melhor amigo do homem'},
  {word: 'Cinema', hint: 'Sessão à noite'},
  {word: 'Praia', hint: 'Mar e areia'},
  {word: 'Praça', hint: 'Espaço público'},
  {word: 'Elevador', hint: 'Sobe e desce'}
];

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
let durationSeconds = 180;
let revealed = false;

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

durPlus.addEventListener('click', ()=>{ durationSeconds = Math.min(60*60, durationSeconds+30); durationEl.textContent = durationSeconds; });
durMinus.addEventListener('click', ()=>{ durationSeconds = Math.max(30, durationSeconds-30); durationEl.textContent = durationSeconds; });

function pickRandomWord(){
  const idx = Math.floor(Math.random()*WORDS.length);
  return WORDS[idx];
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
    startTimer(durationSeconds);
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
resetBtn.addEventListener('click', ()=>{ stopTimer(); startTimer(durationSeconds); running = true; pauseBtn.textContent = 'Pausar'; });

// init UI defaults
function init(){
  impCountEl.textContent = impostorCount;
  durationEl.textContent = durationSeconds;
  renderPlayers();
}

init();
