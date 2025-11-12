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
  revealBanner.classList.add('hidden');
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

// swipe up detection on cardContent - use Pointer Events for better cross-platform support
const cardContent = document.getElementById('cardContent');
let startY = null;
let pointerActive = false;
const SWIPE_THRESHOLD = 80; // pixels to consider an upward swipe

cardContent.addEventListener('pointerdown', (e) => {
  // only consider primary pointers
  if (e.isPrimary !== undefined && !e.isPrimary) return;
  pointerActive = true;
  startY = e.clientY;
  // ensure we can track pointer until up
  cardContent.setPointerCapture && cardContent.setPointerCapture(e.pointerId);
});

cardContent.addEventListener('pointerup', (e) => {
  if (!pointerActive || startY === null) return;
  const endY = e.clientY;
  const dy = startY - endY; // positive when moved upward
  if (dy > SWIPE_THRESHOLD) {
    reveal();
  }
  pointerActive = false;
  startY = null;
  try { cardContent.releasePointerCapture && cardContent.releasePointerCapture(e.pointerId); } catch(_){}
});

cardContent.addEventListener('pointercancel', (e) => {
  pointerActive = false;
  startY = null;
});

// allow clicking/tapping to reveal as well
cardContent.addEventListener('click', (e)=>{ reveal(); });

function reveal(){
  if(revealed) return;
  revealed = true;
  // show the content
  revealBanner.classList.remove('hidden');
  // if impostor, show role and hint; if not, show word
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
