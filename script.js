/* ================= 1. DATA MASTER MUFRODAT ================= */
const mufrodatList = [
  { id: 1, arabic: 'كِتَابٌ', latin: 'kitābun', indo: 'buku', icon: 'fa-book' },
  { id: 2, arabic: 'قَلَمٌ', latin: 'qalamun', indo: 'pena', icon: 'fa-pen' },
  { id: 3, arabic: 'قَلَمُ رَصَاصٍ', latin: 'qalamu raṣāṣin', indo: 'pensil', icon: 'fa-pencil' },
  { id: 4, arabic: 'مِمْحَاةٌ', latin: 'mimḥātun', indo: 'penghapus', icon: 'fa-eraser' },
  { id: 5, arabic: 'مِسْطَرَةٌ', latin: 'misṭaratun', indo: 'penggaris', icon: 'fa-ruler' },
  { id: 6, arabic: 'مِبْرَاةٌ', latin: 'mibrātun', indo: 'rautan', icon: 'fa-vector-square' },
  { id: 7, arabic: 'دَفْتَرٌ', latin: 'daftarun', indo: 'buku tulis', icon: 'fa-book-open' },
  { id: 8, arabic: 'حَقِيبَةٌ مَدْرَسِيَّةٌ', latin: 'ḥaqībatun madrasiyyatun', indo: 'tas sekolah', icon: 'fa-bag-shopping' },
  { id: 9, arabic: 'مِقَصٌّ', latin: 'miqaṣṣun', indo: 'gunting', icon: 'fa-scissors' },
  { id: 10, arabic: 'صَمْغٌ', latin: 'ṣamghun', indo: 'lem', icon: 'fa-box-tissue' },
  { id: 11, arabic: 'سَبُّورَةٌ', latin: 'sabbūratun', indo: 'papan tulis', icon: 'fa-chalkboard' },
  { id: 12, arabic: 'طَبْشُورَةٌ', latin: 'ṭabshūratun', indo: 'kapur tulis', icon: 'fa-square' },
  { id: 13, arabic: 'كُرَّاسَةٌ', latin: 'kurrāsatun', indo: 'buku catatan', icon: 'fa-note-sticky' },
  { id: 14, arabic: 'مِقْلَمَةٌ', latin: 'miqlamatun', indo: 'tempat pensil', icon: 'fa-box' },
  { id: 15, arabic: 'مِمْحَاةٌ لَوْنِيَّةٌ', latin: 'mimḥātun lawniyyatun', indo: 'penghapus berwarna', icon: 'fa-palette' }
];

/* ================= 2. USER APP STATE ================= */
let userState = {
  name: 'Siswa Juara',
  points: 0,
  currentMufrodatIdx: 0,
  learnedSet: new Set(),
  badges: {
    mufrodat: false,
    tebak: false,
    juara: false
  },
  lastQuizScore: 0,
  quizCorrectCount: 0,
  quizWrongCount: 0
};

// Load state from local storage if available
function loadSavedState() {
  const saved = localStorage.getItem('arabic_app_sd_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      userState.name = parsed.name || 'Siswa Juara';
      userState.points = parsed.points || 0;
      userState.badges = parsed.badges || userState.badges;
      userState.lastQuizScore = parsed.lastQuizScore || 0;
      userState.quizCorrectCount = parsed.quizCorrectCount || 0;
      userState.quizWrongCount = parsed.quizWrongCount || 0;
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
  }
  document.getElementById('user-name-input').value = userState.name;
  updateHeaderPoints();
}

function saveUserData() {
  userState.name = document.getElementById('user-name-input').value || 'Siswa Juara';
  localStorage.setItem('arabic_app_sd_state', JSON.stringify({
    name: userState.name,
    points: userState.points,
    badges: userState.badges,
    lastQuizScore: userState.lastQuizScore,
    quizCorrectCount: userState.quizCorrectCount,
    quizWrongCount: userState.quizWrongCount
  }));
}

function addPoints(pts) {
  userState.points += pts;
  updateHeaderPoints();
  saveUserData();
}

function updateHeaderPoints() {
  document.getElementById('header-points').innerText = userState.points;
}

/* ================= 3. NAVIGATION ROUTING ================= */
function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Initializers per page
  if (pageId === 'mufrodat') updateMufrodatCard();
  if (pageId === 'game1') initGame1();
  if (pageId === 'game2') initGame2();
  if (pageId === 'game4') initGame4();
  if (pageId === 'quiz') startQuiz();
  if (pageId === 'results') renderResultsPage();
}

/* ================= 4. SUARA (PENGATURAN SUARA LAKI-LAKI) ================= */
// Website ini memakai suara bawaan perangkat (Web Speech API), jadi jenis suaranya
// bisa berbeda di tiap laptop/HP. Klik ikon gear di pojok kanan bawah untuk
// memilih suara Arab dan mengatur nada & kecepatan, termasuk suara terpisah
// untuk Umar dan Utsman di halaman dialog.
//
// Opsional: kalau suatu saat ada folder "audio/" berisi file mp3, ubah menjadi true.
const GUNAKAN_MP3 = false;

const VOICE_STORAGE_KEY = 'arabicVoiceSettings';
const VOICE_TARGETS = ['default', 'umar', 'utsman'];
const VOICE_TARGET_NAMES = { default: 'Umum', umar: 'Umar', utsman: 'Utsman' };

// Nada awal: Umar sedikit lebih tinggi, Utsman lebih berat, supaya terdengar beda
const voiceSettings = {
  default: { voiceURI: '', pitch: 0.7, rate: 0.8 },
  umar:    { voiceURI: '', pitch: 1.0, rate: 0.8 },
  utsman:  { voiceURI: '', pitch: 0.5, rate: 0.8 }
};
let voiceTarget = 'default';   // yang sedang diatur di panel

function loadVoiceSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || '{}');
    // format lama (satu pengaturan saja) dianggap pengaturan "Umum"
    const source = (saved && saved.voiceURI !== undefined) ? { default: saved } : saved;
    VOICE_TARGETS.forEach(t => {
      const x = source && source[t];
      if (!x) return;
      if (typeof x.voiceURI === 'string') voiceSettings[t].voiceURI = x.voiceURI;
      if (typeof x.pitch === 'number') voiceSettings[t].pitch = x.pitch;
      if (typeof x.rate === 'number') voiceSettings[t].rate = x.rate;
    });
  } catch (e) { /* abaikan */ }
}

function saveVoiceSettings() {
  try { localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(voiceSettings)); } catch (e) { /* abaikan */ }
}

// Nama suara yang diketahui perempuan / laki-laki (tidak lengkap, hanya tebakan)
const FEMALE_VOICE_RE = /female|woman|hoda|zariyah|salma|laila|leila|amal|fatima|zira|maryam|noura|hala/i;
const MALE_VOICE_RE = /\bmale\b|hamed|naayf|majed|maged|tarik|tariq|madi|shakir|tarek|fahad|omar/i;

function getArabicVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(v =>
    (v.lang || '').toLowerCase().replace('_', '-').startsWith('ar'));
}

// Urutan kandidat: suara laki-laki dulu, lalu yang bukan perempuan, lalu sisanya
function getVoiceCandidates() {
  const voices = getArabicVoices();
  const male = voices.filter(v => !FEMALE_VOICE_RE.test(v.name) && MALE_VOICE_RE.test(v.name));
  const notFemale = voices.filter(v => !FEMALE_VOICE_RE.test(v.name) && !male.includes(v));
  const rest = voices.filter(v => !male.includes(v) && !notFemale.includes(v));
  return male.concat(notFemale, rest);
}

function pickArabicVoice(target) {
  target = VOICE_TARGETS.includes(target) ? target : 'default';
  const voices = getArabicVoices();
  if (!voices.length) return null;
  const chosen = voices.find(v => v.voiceURI === voiceSettings[target].voiceURI);
  if (chosen) return chosen;
  const cand = getVoiceCandidates();
  const notFemale = cand.filter(v => !FEMALE_VOICE_RE.test(v.name));
  // Utsman otomatis memakai suara laki-laki kedua (kalau ada), supaya beda dengan Umar
  if (target === 'utsman' && notFemale.length > 1) return notFemale[1];
  return cand[0];
}

/* ---- Audio mp3 (hanya aktif kalau GUNAKAN_MP3 = true) ---- */
let currentAudio = null;

function audioKey(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function stopAllSpeech() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// speaker: 'umar' | 'utsman' | kosong (suara umum)
function speakText(text, speaker) {
  stopAllSpeech();
  if (!GUNAKAN_MP3) { speakWithBrowserVoice(text, speaker); return; }
  const audio = new Audio('audio/' + audioKey(text) + '.mp3');
  currentAudio = audio;
  const fallback = () => {
    if (currentAudio === audio) { currentAudio = null; speakWithBrowserVoice(text, speaker); }
  };
  audio.addEventListener('error', fallback);
  const p = audio.play();
  if (p && p.catch) p.catch(fallback);
}

function speakWithBrowserVoice(text, speaker) {
  if (!('speechSynthesis' in window)) {
    alert("Perangkat tidak mendukung suara audio.");
    return;
  }
  const target = VOICE_TARGETS.includes(speaker) ? speaker : 'default';
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickArabicVoice(target);
  utterance.lang = voice ? voice.lang : 'ar-SA';
  if (voice) utterance.voice = voice;
  utterance.pitch = voiceSettings[target].pitch;   // nada: kecil = lebih berat
  utterance.rate = voiceSettings[target].rate;     // kecepatan: kecil = lebih pelan
  window.speechSynthesis.speak(utterance);
}

/* ---- Panel pengaturan suara ---- */
function toggleVoicePanel() {
  const panel = document.getElementById('voice-panel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) populateVoiceList();
}

function tesSuaraPanel() {
  speakText('السَّلَامُ عَلَيْكُمْ', voiceTarget === 'default' ? undefined : voiceTarget);
}

function refreshVoiceLabels() {
  const cfg = voiceSettings[voiceTarget];
  const pitch = document.getElementById('voice-pitch');
  const rate = document.getElementById('voice-rate');
  if (pitch) pitch.value = cfg.pitch;
  if (rate) rate.value = cfg.rate;
  const pv = document.getElementById('voice-pitch-val');
  const rv = document.getElementById('voice-rate-val');
  if (pv) pv.textContent = Number(cfg.pitch).toFixed(1);
  if (rv) rv.textContent = Number(cfg.rate).toFixed(1);
}

function populateVoiceList() {
  const select = document.getElementById('voice-select');
  const info = document.getElementById('voice-info');
  if (!select) return;
  const voices = getArabicVoices();
  select.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = voiceTarget === 'utsman'
    ? 'Otomatis (suara laki-laki kedua, kalau ada)'
    : 'Otomatis (cari suara laki-laki)';
  select.appendChild(auto);
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = v.name + ' (' + v.lang + ')';
    select.appendChild(opt);
  });
  const savedURI = voiceSettings[voiceTarget].voiceURI;
  select.value = voices.some(v => v.voiceURI === savedURI) ? savedURI : '';
  if (info) {
    if (!voices.length) {
      info.textContent = 'Perangkat ini belum punya suara Arab. Coba buka di Microsoft Edge, atau pasang suara Arab di pengaturan perangkat.';
    } else {
      const chosen = pickArabicVoice(voiceTarget);
      let msg = 'Suara ' + VOICE_TARGET_NAMES[voiceTarget] + ': ' + (chosen ? chosen.name : '-') + '. Ada ' + voices.length + ' suara Arab di perangkat ini.';
      if (getVoiceCandidates().filter(v => !FEMALE_VOICE_RE.test(v.name)).length < 2) {
        msg += ' Hanya 1 suara laki-laki, jadi Umar dan Utsman dibedakan lewat nada.';
      }
      info.textContent = msg;
    }
  }
}

function initVoicePanel() {
  loadVoiceSettings();
  const target = document.getElementById('voice-target');
  const select = document.getElementById('voice-select');
  const pitch = document.getElementById('voice-pitch');
  const rate = document.getElementById('voice-rate');
  if (!target || !select || !pitch || !rate) return;

  refreshVoiceLabels();
  const tes = () => tesSuaraPanel();

  target.addEventListener('change', () => {
    voiceTarget = target.value;
    refreshVoiceLabels();
    populateVoiceList();
  });
  select.addEventListener('change', () => {
    voiceSettings[voiceTarget].voiceURI = select.value;
    saveVoiceSettings();
    populateVoiceList();
    tes();
  });
  pitch.addEventListener('input', () => {
    voiceSettings[voiceTarget].pitch = parseFloat(pitch.value);
    saveVoiceSettings(); refreshVoiceLabels();
  });
  pitch.addEventListener('change', tes);
  rate.addEventListener('input', () => {
    voiceSettings[voiceTarget].rate = parseFloat(rate.value);
    saveVoiceSettings(); refreshVoiceLabels();
  });
  rate.addEventListener('change', tes);

  populateVoiceList();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    // sebagian browser baru selesai memuat daftar suara beberapa saat kemudian
    setTimeout(populateVoiceList, 500);
    setTimeout(populateVoiceList, 1500);
  }
}

initVoicePanel();

/* ================= 5. MUFRODAT MODULE LOGIC ================= */
function updateMufrodatCard() {
  const item = mufrodatList[userState.currentMufrodatIdx];
  document.getElementById('mufrodat-progress').innerText = `${userState.currentMufrodatIdx + 1} dari ${mufrodatList.length} Kosakata`;
  document.getElementById('mufrodat-arabic').innerText = item.arabic;
  document.getElementById('mufrodat-latin').innerText = item.latin;
  document.getElementById('mufrodat-indonesian').innerText = item.indo;

  const visualContainer = document.getElementById('mufrodat-visual');
  visualContainer.innerHTML = `<i class="fa-solid ${item.icon}"></i>`;

  // Mark as learned
  userState.learnedSet.add(item.id);
  if (userState.learnedSet.size >= 15 && !userState.badges.mufrodat) {
    userState.badges.mufrodat = true;
    saveUserData();
  }
}

function nextMufrodat() {
  if (userState.currentMufrodatIdx < mufrodatList.length - 1) {
    userState.currentMufrodatIdx++;
    updateMufrodatCard();
  } else {
    userState.currentMufrodatIdx = 0;
    updateMufrodatCard();
  }
}

function prevMufrodat() {
  if (userState.currentMufrodatIdx > 0) {
    userState.currentMufrodatIdx--;
    updateMufrodatCard();
  }
}

function repeatMufrodat() {
  playCurrentMufrodatAudio();
}

function playCurrentMufrodatAudio() {
  const item = mufrodatList[userState.currentMufrodatIdx];
  speakText(item.arabic);
}

/* ================= 6. GAME 1: TEBAK GAMBAR ================= */
let g1CurrentItem = null;

function initGame1() {
  const feedback = document.getElementById('g1-feedback');
  feedback.classList.add('hidden');

  // Random item
  g1CurrentItem = mufrodatList[Math.floor(Math.random() * mufrodatList.length)];

  // Update visual
  document.getElementById('g1-image').innerHTML = `<i class="fa-solid ${g1CurrentItem.icon}"></i>`;

  // Prepare 3 choices (1 correct, 2 distractors)
  let choices = [g1CurrentItem];
  while (choices.length < 3) {
    let rand = mufrodatList[Math.floor(Math.random() * mufrodatList.length)];
    if (!choices.includes(rand)) choices.push(rand);
  }
  choices.sort(() => Math.random() - 0.5);

  const optionsDiv = document.getElementById('g1-options');
  optionsDiv.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'btn-shadow bg-amber-50 hover:bg-amber-100 text-slate-800 font-bold py-3.5 px-4 rounded-2xl border-2 border-amber-300 font-arabic text-2xl tracking-wide flex items-center justify-between';
    btn.innerHTML = `<span>${choice.arabic}</span> <i class="fa-solid fa-volume-high text-amber-500 text-base" onclick="event.stopPropagation(); speakText('${choice.arabic}')"></i>`;
    btn.onclick = () => checkGame1Answer(choice, btn);
    optionsDiv.appendChild(btn);
  });
}

function checkGame1Answer(selected, btnEl) {
  const feedback = document.getElementById('g1-feedback');
  feedback.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-800', 'bg-rose-100', 'text-rose-800');

  if (selected.id === g1CurrentItem.id) {
    addPoints(10);
    userState.badges.tebak = true;
    feedback.classList.add('bg-emerald-100', 'text-emerald-800');
    feedback.innerHTML = `⭐ مُمْتَازٌ! أَحْسَنْتَ!<br><span class="text-sm font-normal">Hebat! Bagus sekali! (+10 Poin)</span>`;
    speakText("مُمْتَازٌ");
    setTimeout(initGame1, 1800);
  } else {
    feedback.classList.add('bg-rose-100', 'text-rose-800');
    feedback.innerHTML = `حَاوِلْ مَرَّةً أُخْرَى!<br><span class="text-sm font-normal">Ayo coba sekali lagi!</span>`;
    speakText("حَاوِلْ مَرَّةً أُخْرَى");
  }
}

/* ================= 7. GAME 2: COCOKKAN KATA & GAMBAR ================= */
let g2SelectedPicture = null;
let g2SelectedWord = null;
let g2MatchedPairs = 0;
let g2TotalPairs = 4;

function initGame2() {
  g2SelectedPicture = null;
  g2SelectedWord = null;
  g2MatchedPairs = 0;
  document.getElementById('g2-status').classList.add('hidden');

  // Pick 4 random items
  const shuffled = [...mufrodatList].sort(() => Math.random() - 0.5);
  const selectedItems = shuffled.slice(0, g2TotalPairs);

  // Render Left (Pictures)
  const picsDiv = document.getElementById('g2-pictures');
  picsDiv.innerHTML = '';
  selectedItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'g2-pic-card bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-purple-100 rounded-xl text-purple-600 flex items-center justify-center text-2xl">
          <i class="fa-solid ${item.icon}"></i>
        </div>
        <span class="font-bold text-slate-700 text-sm">${item.indo}</span>
      </div>
      <i class="fa-solid fa-circle-check text-slate-300 check-icon text-xl"></i>
    `;
    div.onclick = () => selectG2Picture(div, item);
    picsDiv.appendChild(div);
  });

  // Render Right (Words - Shuffled)
  const wordsDiv = document.getElementById('g2-words');
  wordsDiv.innerHTML = '';
  const wordsShuffled = [...selectedItems].sort(() => Math.random() - 0.5);
  wordsShuffled.forEach(item => {
    const div = document.createElement('div');
    div.className = 'g2-word-card bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all';
    div.dataset.id = item.id;
    div.innerHTML = `
      <span class="font-arabic text-2xl text-slate-800 font-bold">${item.arabic}</span>
      <i class="fa-solid fa-volume-high text-slate-400 hover:text-purple-600" onclick="event.stopPropagation(); speakText('${item.arabic}')"></i>
    `;
    div.onclick = () => selectG2Word(div, item);
    wordsDiv.appendChild(div);
  });
}

function selectG2Picture(el, item) {
  if (el.classList.contains('matched')) return;
  document.querySelectorAll('.g2-pic-card').forEach(card => card.classList.remove('border-purple-500', 'bg-purple-50'));
  el.classList.add('border-purple-500', 'bg-purple-50');
  g2SelectedPicture = { el, item };
  checkG2Match();
}

function selectG2Word(el, item) {
  if (el.classList.contains('matched')) return;
  document.querySelectorAll('.g2-word-card').forEach(card => card.classList.remove('border-purple-500', 'bg-purple-50'));
  el.classList.add('border-purple-500', 'bg-purple-50');
  g2SelectedWord = { el, item };
  checkG2Match();
}

function checkG2Match() {
  if (!g2SelectedPicture || !g2SelectedWord) return;

  if (g2SelectedPicture.item.id === g2SelectedWord.item.id) {
    // Success Match
    g2SelectedPicture.el.classList.add('matched', 'bg-emerald-50', 'border-emerald-400');
    g2SelectedWord.el.classList.add('matched', 'bg-emerald-50', 'border-emerald-400');

    g2SelectedPicture.el.querySelector('.check-icon').className = 'fa-solid fa-circle-check text-emerald-500 text-xl';

    speakText(g2SelectedWord.item.arabic);
    addPoints(10);
    g2MatchedPairs++;

    g2SelectedPicture = null;
    g2SelectedWord = null;

    if (g2MatchedPairs >= g2TotalPairs) {
      document.getElementById('g2-status').classList.remove('hidden');
    }
  } else {
    // Mismatch feedback
    const pEl = g2SelectedPicture.el;
    const wEl = g2SelectedWord.el;
    pEl.classList.add('bg-rose-50', 'border-rose-300');
    wEl.classList.add('bg-rose-50', 'border-rose-300');

    setTimeout(() => {
      pEl.classList.remove('bg-rose-50', 'border-rose-300', 'border-purple-500', 'bg-purple-50');
      wEl.classList.remove('bg-rose-50', 'border-rose-300', 'border-purple-500', 'bg-purple-50');
    }, 800);

    g2SelectedPicture = null;
    g2SelectedWord = null;
  }
}

/* ================= 8. GAME 3: SUSUN HURUF ================= */
let g4TargetItem = null;
let g4UserAnswerLetters = [];

// Helper: Split Arabic word into clean isolated letters array
const arabicLetterMap = {
  'كِتَابٌ': ['ك', 'ت', 'ا', 'ب'],
  'قَلَمٌ': ['ق', 'ل', 'م'],
  'مِمْحَاةٌ': ['م', 'م', 'ح', 'ا', 'ة'],
  'مِسْطَرَةٌ': ['م', 'س', 'ط', 'ر', 'ة'],
  'دَفْتَرٌ': ['د', 'ف', 'ت', 'ر'],
  'صَمْغٌ': ['ص', 'م', 'غ']
};

function initGame4() {
  const feedback = document.getElementById('g4-feedback');
  feedback.classList.add('hidden');
  g4UserAnswerLetters = [];

  // Pick item with defined short letters
  const easyKeys = Object.keys(arabicLetterMap);
  const randKey = easyKeys[Math.floor(Math.random() * easyKeys.length)];
  g4TargetItem = mufrodatList.find(m => m.arabic === randKey) || mufrodatList[0];

  // Set Hint Icon
  document.getElementById('g4-hint-image').innerHTML = `<i class="fa-solid ${g4TargetItem.icon}"></i>`;

  // Get target letters
  const targetLetters = arabicLetterMap[g4TargetItem.arabic] || ['ك', 'ت', 'ا', 'ب'];

  // Render Scrambled Letters Pool
  const poolLetters = [...targetLetters].sort(() => Math.random() - 0.5);
  const poolDiv = document.getElementById('g4-letter-pool');
  poolDiv.innerHTML = '';

  poolLetters.forEach((char, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-12 h-12 bg-rose-100 border-2 border-rose-300 rounded-2xl font-arabic text-2xl font-bold text-rose-800 hover:bg-rose-200 transition-transform active:scale-95';
    btn.innerText = char;
    btn.onclick = () => selectGame4Letter(char, btn);
    poolDiv.appendChild(btn);
  });

  renderGame4Slots();
}

function selectGame4Letter(char, btnEl) {
  g4UserAnswerLetters.push(char);
  btnEl.disabled = true;
  btnEl.classList.add('opacity-40');
  renderGame4Slots();
}

function renderGame4Slots() {
  const slotsDiv = document.getElementById('g4-answer-slots');
  slotsDiv.innerHTML = '';
  g4UserAnswerLetters.forEach((char, idx) => {
    const slot = document.createElement('div');
    slot.className = 'w-12 h-12 bg-rose-500 text-white rounded-2xl font-arabic text-2xl font-bold flex items-center justify-center shadow-md pop-in';
    slot.innerText = char;
    slotsDiv.appendChild(slot);
  });
}

function resetGame4Current() {
  initGame4();
}

function checkGame4Answer() {
  const targetLetters = arabicLetterMap[g4TargetItem.arabic] || ['ك', 'ت', 'ا', 'ب'];
  const userStr = g4UserAnswerLetters.join('');
  const targetStr = targetLetters.join('');

  const feedback = document.getElementById('g4-feedback');
  feedback.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-800', 'bg-rose-100', 'text-rose-800');

  if (userStr === targetStr) {
    addPoints(10);
    feedback.classList.add('bg-emerald-100', 'text-emerald-800');
    feedback.innerHTML = `مُمْتَازٌ! JAWABAN BENAR!<br><span class="text-sm font-normal">Kata: ${g4TargetItem.arabic} (${g4TargetItem.indo})</span>`;
    speakText(g4TargetItem.arabic);
    setTimeout(initGame4, 2000);
  } else {
    feedback.classList.add('bg-rose-100', 'text-rose-800');
    feedback.innerHTML = `Susunan belum tepat. Ayo coba lagi!`;
  }
}

/* ================= 9. KUIS EVALUASI AKHIR (10 SOAL) ================= */
let quizState = {
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  questions: []
};

function generateQuizQuestions() {
  let qList = [];
  const shuffled = [...mufrodatList].sort(() => Math.random() - 0.5);

  for (let i = 0; i < 10; i++) {
    const item = shuffled[i % shuffled.length];
    let type = 'arti'; // 4 soal
    if (i >= 4 && i < 7) type = 'gambar'; // 3 soal
    if (i >= 7 && i < 9) type = 'arab'; // 2 soal
    if (i === 9) type = 'audio'; // 1 soal

    // Generate 3 distractors
    let options = [item];
    while (options.length < 4) {
      let rand = mufrodatList[Math.floor(Math.random() * mufrodatList.length)];
      if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    qList.push({
      type,
      item,
      options
    });
  }
  return qList;
}

function startQuiz() {
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.correctCount = 0;
  quizState.wrongCount = 0;
  quizState.questions = generateQuizQuestions();
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  document.getElementById('quiz-progress-text').innerText = `Soal ${quizState.currentIndex + 1} dari 10`;

  const feedbackBox = document.getElementById('quiz-feedback-box');
  feedbackBox.classList.add('hidden');

  const qText = document.getElementById('quiz-question-text');
  const visualContainer = document.getElementById('quiz-visual-container');
  const badge = document.getElementById('quiz-type-badge');

  if (q.type === 'arti') {
    badge.innerText = 'Pilih Arti Bahasa Indonesia';
    qText.innerText = `Apa arti dari kosakata berikut?`;
    visualContainer.innerHTML = `<div class="font-arabic text-5xl text-sky-700 font-bold py-2">${q.item.arabic}</div>`;
  } else if (q.type === 'gambar') {
    badge.innerText = 'Tebak Nama Benda';
    qText.innerText = `Apa nama bahasa Arab untuk benda ini?`;
    visualContainer.innerHTML = `
      <div class="w-32 h-32 mx-auto bg-sky-50 rounded-2xl flex items-center justify-center text-6xl text-sky-600 border-2 border-sky-200">
        <i class="fa-solid ${q.item.icon}"></i>
      </div>
    `;
  } else if (q.type === 'arab') {
    badge.innerText = 'Pilih Bahasa Arab yang Tepat';
    qText.innerText = `Manakah kata Bahasa Arab untuk "${q.item.indo}"?`;
    visualContainer.innerHTML = `<div class="text-2xl font-bold text-emerald-600 py-2">"${q.item.indo}"</div>`;
  } else if (q.type === 'audio') {
    badge.innerText = 'Dengar Pelafalan';
    qText.innerText = `Dengarkan suara dan pilih gambar yang cocok!`;
    visualContainer.innerHTML = `
      <button onclick="speakText('${q.item.arabic}')" class="btn-shadow bg-mintGreen text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 border-b-4 border-emerald-700">
        <i class="fa-solid fa-volume-high text-xl"></i> Putar Suara Bahasa Arab
      </button>
    `;
    speakText(q.item.arabic);
  }

  // Options rendering
  const optsContainer = document.getElementById('quiz-options-container');
  optsContainer.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn btn-shadow bg-slate-50 hover:bg-sky-50 text-slate-800 font-bold p-4 rounded-2xl border-2 border-slate-200 text-center transition-all flex flex-col items-center justify-center gap-1';

    if (q.type === 'arti') {
      btn.innerHTML = `<span class="text-lg">${opt.indo}</span>`;
    } else if (q.type === 'gambar' || q.type === 'arab') {
      btn.innerHTML = `<span class="font-arabic text-2xl">${opt.arabic}</span> <span class="text-xs text-slate-400 font-normal">(${opt.latin})</span>`;
    } else if (q.type === 'audio') {
      btn.innerHTML = `<i class="fa-solid ${opt.icon} text-3xl text-sky-500 mb-1"></i><span class="text-sm">${opt.indo}</span>`;
    }

    btn.onclick = () => selectQuizAnswer(opt, btn);
    optsContainer.appendChild(btn);
  });
}

function selectQuizAnswer(selectedOpt, btnEl) {
  const q = quizState.questions[quizState.currentIndex];
  const allBtns = document.querySelectorAll('.quiz-opt-btn');
  allBtns.forEach(b => b.disabled = true);

  const feedbackBox = document.getElementById('quiz-feedback-box');
  const feedbackText = document.getElementById('quiz-feedback-text');
  feedbackBox.classList.remove('hidden');

  if (selectedOpt.id === q.item.id) {
    btnEl.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-900');
    feedbackText.className = 'font-bold text-lg text-emerald-600';
    feedbackText.innerText = '✨ Jawabanmu Benar! (+10 Poin)';
    quizState.score += 10;
    quizState.correctCount++;
    addPoints(10);
    speakText("أَحْسَنْتَ");
  } else {
    btnEl.classList.add('bg-rose-100', 'border-rose-400', 'text-rose-900');
    feedbackText.className = 'font-bold text-lg text-rose-600';
    feedbackText.innerText = `Kurang tepat. Jawaban yang benar: ${q.item.arabic} (${q.item.indo})`;
    quizState.wrongCount++;
  }
}

function nextQuizQuestion() {
  quizState.currentIndex++;
  if (quizState.currentIndex < 10) {
    renderQuizQuestion();
  } else {
    // Quiz finished
    userState.lastQuizScore = quizState.score;
    userState.quizCorrectCount = quizState.correctCount;
    userState.quizWrongCount = quizState.wrongCount;
    if (quizState.score >= 80) userState.badges.juara = true;
    saveUserData();
    showPage('results');
  }
}

/* ================= 10. HALAMAN HASIL / RAPOR ================= */
function renderResultsPage() {
  const score = userState.lastQuizScore;
  document.getElementById('res-score').innerText = score;
  document.getElementById('res-total-points').innerText = userState.points;
  document.getElementById('res-learned-count').innerText = `${userState.learnedSet.size} / 15`;
  document.getElementById('res-quiz-ratio').innerText = `${userState.quizCorrectCount} / ${userState.quizWrongCount}`;

  const badgeEl = document.getElementById('res-badge');
  const badgeSub = document.getElementById('res-badge-sub');

  if (score >= 90) {
    badgeEl.innerText = 'بَطَلٌ!';
    badgeSub.innerText = 'Hebat sekali!';
  } else if (score >= 70) {
    badgeEl.innerText = 'جَيِّدٌ جِدًّا';
    badgeSub.innerText = 'Sangat bagus!';
  } else if (score >= 50) {
    badgeEl.innerText = 'جَيِّدٌ';
    badgeSub.innerText = 'Bagus, terus berlatih!';
  } else {
    badgeEl.innerText = 'هَيَّا نَتَعَلَّمْ مَرَّةً أُخْرَى';
    badgeSub.innerText = 'Ayo belajar lagi!';
  }

  // Badges highlight
  if (userState.badges.mufrodat) document.getElementById('badge-mufrodat').classList.remove('opacity-50', 'bg-slate-100');
  if (userState.badges.tebak) document.getElementById('badge-tebak').classList.remove('opacity-50', 'bg-slate-100');
  if (userState.badges.juara) document.getElementById('badge-juara').classList.remove('opacity-50', 'bg-slate-100');
}

/* Initialize app state on load */
window.onload = function() {
  loadSavedState();
};
