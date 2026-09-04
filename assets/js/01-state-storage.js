let userName = '';
let userBirth = null;
let userSign = '';
let userSignIdx = 0;
let events = [];
let userBirthValue = '';
let chatHistories = {};
let bondProfile = null;
let archivedChats = [];
let oracleDepth = 'detailed';
let oracleTone = 'practical';
const CHAT_ARCHIVE_TTL = 2 * 60 * 60 * 1000;

function createEmptyChats() {
  return {
    oracle: [],
    tarot: [],
    dialogue: [],
    dialogue_energy: [],
    dream: []
  };
}

chatHistories = createEmptyChats();

function saveToStorage() {
  try {
    localStorage.setItem('veles_user', JSON.stringify({
      name: userName,
      birth: userBirthValue,
      chats: chatHistories,
      archivedChats: archivedChats,
      bond: bondProfile,
      depth: oracleDepth,
      tone: oracleTone,
      events: events.map(function(e) { return { text: e.text, ts: e.date.getTime() }; })
    }));
  } catch(e) {}
  if (typeof scheduleSyncToServer === 'function') scheduleSyncToServer();
}

function loadFromStorage() {
  try {
    var data = JSON.parse(localStorage.getItem('veles_user'));
    if (data && data.name && data.birth) {
      userName = data.name;
      userBirthValue = data.birth;
      userBirth = new Date(data.birth);
      if (data.events) {
        events = data.events.map(function(e) { return { text: e.text, date: new Date(e.ts) }; });
      }
      chatHistories = Object.assign(createEmptyChats(), data.chats || {});
      archivedChats = Array.isArray(data.archivedChats) ? data.archivedChats : [];
      oracleDepth = data.depth || 'detailed';
      oracleTone = data.tone || 'practical';
      archiveExpiredChats(Date.now(), true);
      bondProfile = data.bond || null;
      return true;
    }
  } catch(e) {}
  return false;
}

function clearStorage() {
  try { localStorage.removeItem('veles_user'); } catch(e) {}
  userName = '';
  userBirth = null;
  userSign = '';
  userSignIdx = 0;
  events = [];
  userBirthValue = '';
  chatHistories = createEmptyChats();
  archivedChats = [];
  bondProfile = null;
  document.getElementById('screen-profile').classList.remove('active');
  document.getElementById('screen-oracle').classList.remove('active');
  document.getElementById('screen-diary').classList.remove('active');
  document.getElementById('screen-diary-detail').classList.remove('active');
  document.getElementById('screen-bonds').classList.remove('active');
  document.getElementById('screen-onboard').classList.add('active');
  document.getElementById('mainNav').style.display = 'none';
  document.getElementById('chatArea').innerHTML = '';
  var diaryToolbar = document.getElementById('diaryToolbar');
  if (diaryToolbar) diaryToolbar.style.display = 'none';
  document.getElementById('nameInput').value = '';
  document.getElementById('birthInput').value = '';
}
