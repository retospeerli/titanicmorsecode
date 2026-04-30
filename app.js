let lang = "de";
let key = "Space";
let waitingKey = false;

let step = 0;
let input = "";
let currentSymbol = "";
let currentReceiveMessage = "";

const UNIT = 100;
const DOT = UNIT * 2;
const LETTER = UNIT * 3;
const CONTINUE_WAIT = 5000;
const RPT_AFTER_K_WAIT = 3000;
const MAX_ERRORS = 3;

const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
  Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-"
};

const REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const FLOW = [
  { type: "video", src: "titanic1.mp4" },

  { type: "send", msg: "CQD CQD CQD DE MGY MGY MGY", needsAK: false },

  {
    type: "receive",
    msg: {
      de: "MGY DE MCP VERSTANDEN AK",
      en: "MGY DE MCP RECEIVED AK"
    },
    akOptional: true
  },

  {
    type: "send",
    needsAK: true,
    msg: {
      de: "MCP DE MGY SOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "MCP DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
    }
  },

  {
    type: "receive",
    msg: {
      de: "MGY DE MCP WAS IST IHRE POSITION AK",
      en: "MGY DE MCP WHAT IS YOUR POSITION AK"
    },
    akOptional: true
  },

  {
    type: "send",
    needsAK: true,
    msg: {
      de: "MCP DE MGY 41.44 N 50.24 W FORDERE SOFORTIGE HILFE AN",
      en: "MCP DE MGY 41.44 N 50.24 W REQUIRE IMMEDIATE ASSISTANCE"
    }
  },

  {
    type: "receive",
    msg: {
      de: "MGY DE MCP VERSTANDEN FAHREN MIT VOLLER KRAFT AK",
      en: "MGY DE MCP RECEIVED COMING AT FULL SPEED AK"
    },
    akOptional: true
  },

  { type: "video", src: "titanic2.mp4" },

  {
    type: "send",
    needsAK: false,
    msg: {
      de: "MGY SOS SOS DE MGY WIR SINKEN SCHNELL PASSAGIERE IN BOOTE",
      en: "MGY SOS SOS DE MGY WE ARE SINKING FAST PASSENGERS BEING PUT INTO BOATS"
    }
  },

  { type: "video", src: "titanic3.mp4" },

  { type: "end" }
];

const startScreen = document.getElementById("startScreen");
const appScreen = document.getElementById("appScreen");
const endScreen = document.getElementById("endScreen");

const taskCard = document.getElementById("taskCard");
const receiveBox = document.getElementById("receiveBox");
const receiveInput = document.getElementById("receiveInput");
const receiveText = document.getElementById("receiveText");

const strip = document.getElementById("morseStrip");
const symbol = document.getElementById("symbol");
const feedback = document.getElementById("feedback");

let ctx = null;
let osc = null;
let down = false;
let t0 = 0;
let letterTimer = null;
let continueTimer = null;
let rptAfterKTimer = null;
let kIssued = false;
let playToken = 0;

document.getElementById("deBtn").onclick = () => setLang("de");
document.getElementById("enBtn").onclick = () => setLang("en");

document.getElementById("startBtn").onclick = () => {
  ensureAudio();
  startScreen.classList.remove("active");
  appScreen.classList.add("active");
  next();
};

document.getElementById("keyBtn").onclick = () => {
  waitingKey = true;
  document.getElementById("keyInfo").textContent =
    lang === "de" ? "Taste drücken ..." : "Press key ...";
};

document.getElementById("checkBtn").onclick = checkReceive;

document.getElementById("repeatBtn").onclick = () => {
  if (currentReceiveMessage) {
    strip.textContent = "";
    play(currentReceiveMessage, true);
  }
};

receiveInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkReceive();
});

document.addEventListener("keydown", (e) => {
  if (waitingKey) {
    e.preventDefault();
    key = e.code;
    waitingKey = false;
    document.getElementById("keyInfo").textContent =
      (lang === "de" ? "Taste: " : "Key: ") + readableKey(e);
    return;
  }

  const current = FLOW[step];
  if (!appScreen.classList.contains("active")) return;
  if (!current || current.type !== "send") return;
  if (e.code !== key || e.repeat) return;

  e.preventDefault();
  pressStart();
});

document.addEventListener("keyup", (e) => {
  const current = FLOW[step];
  if (!appScreen.classList.contains("active")) return;
  if (!current || current.type !== "send") return;
  if (e.code !== key) return;

  e.preventDefault();
  pressEnd();
});

window.addEventListener("blur", () => {
  if (down) pressEnd();
});

function setLang(l) {
  lang = l;

  document.getElementById("keyTitle").textContent =
    lang === "de" ? "Morsetaste wählen" : "Choose Morse key";

  document.getElementById("keyInfo").textContent =
    lang === "de" ? "Morsetaste: Leertaste" : "Morse key: Space";

  document.getElementById("keyBtn").textContent =
    lang === "de" ? "Taste wählen" : "Choose key";

  document.getElementById("symbolLabel").textContent =
    lang === "de" ? "Zeichen" : "Symbol";

  document.getElementById("endText").textContent =
    lang === "de" ? "Passwort 3 wird gemorst:" : "Password 3 is sent in Morse:";
}

function next() {
  clearTimers();
  stop();
  playToken++;

  input = "";
  currentSymbol = "";
  currentReceiveMessage = "";
  kIssued = false;

  symbol.textContent = "–";
  feedback.className = "";
  feedback.textContent = "";
  receiveBox.classList.remove("active");
  receiveInput.value = "";
  strip.textContent = "";

  const current = FLOW[step];
  if (!current) return;

  if (current.type === "video") {
    setBG("video");
    taskCard.textContent = "";
    popup(current.src);
    return;
  }

  if (current.type === "send") {
    setBG("task");
    const msg = getExpectedSendMessage(current);
    taskCard.textContent =
      (lang === "de" ? "Sende diese Nachricht:" : "Transmit this message:") +
      "\n\n" + msg;
    return;
  }

  if (current.type === "receive") {
    setBG("task");
    currentReceiveMessage = getMsg(current.msg);

    taskCard.textContent = lang === "de"
      ? "Höre die Morse-Nachricht.\nSchreibe sie auf Papier mit.\nTippe sie danach ein."
      : "Listen to the Morse message.\nWrite it down on paper.\nThen type it.";

    receiveText.textContent = lang === "de"
      ? "Empfangene Nachricht:"
      : "Received message:";

    receiveBox.classList.add("active");
    receiveInput.focus();

    play(currentReceiveMessage, true);
    return;
  }

  if (current.type === "end") finish();
}

function pressStart() {
  if (down) return;

  clearTimeout(letterTimer);
  clearTimeout(continueTimer);
  clearTimeout(rptAfterKTimer);

  kIssued = false;
  down = true;
  t0 = Date.now();

  feedback.className = "";
  feedback.textContent = "";

  tone();
}

function pressEnd() {
  if (!down) return;

  down = false;
  stop();

  const duration = Date.now() - t0;
  const part = duration < DOT ? "." : "-";

  currentSymbol += part;
  symbol.textContent = currentSymbol;

  appendStrip(part);

  clearTimeout(letterTimer);
  letterTimer = setTimeout(finishLetter, LETTER);

  clearTimeout(continueTimer);
  continueTimer = setTimeout(handleMorsePause, CONTINUE_WAIT);
}

function finishLetter() {
  if (!currentSymbol) return;

  input += REV[currentSymbol] || "?";
  appendStrip(" ");

  currentSymbol = "";
  symbol.textContent = "–";
}

function handleMorsePause() {
  finishLetter();

  const current = FLOW[step];
  if (!current || current.type !== "send") return;

  const expected = getExpectedSendMessage(current);
  const mistakes = levenshtein(norm(input), norm(expected));

  if (mistakes <= MAX_ERRORS) {
    ok(mistakes);
    return;
  }

  if (current.needsAK && norm(input).endsWith("AK")) {
    checkSend();
    return;
  }

  showContinueK();
}

function showContinueK() {
  feedback.textContent = "K";
  feedback.className = "show";
  play("K", false);

  kIssued = true;

  clearTimeout(rptAfterKTimer);
  rptAfterKTimer = setTimeout(() => {
    if (kIssued) fail();
  }, RPT_AFTER_K_WAIT);
}

function checkSend() {
  finishLetter();

  const current = FLOW[step];
  const expected = getExpectedSendMessage(current);
  const mistakes = levenshtein(norm(input), norm(expected));

  if (mistakes <= MAX_ERRORS) ok(mistakes);
  else fail();
}

function checkReceive() {
  const current = FLOW[step];
  if (!current || current.type !== "receive") return;

  const expected = getMsg(current.msg);
  const typed = receiveInput.value;

  let mistakes = levenshtein(norm(typed), norm(expected));

  if (current.akOptional) {
    const expectedWithoutAK = removeTrailingAK(expected);
    const mistakesWithoutAK = levenshtein(norm(typed), norm(expectedWithoutAK));
    mistakes = Math.min(mistakes, mistakesWithoutAK);
  }

  if (mistakes <= MAX_ERRORS) ok(mistakes);
  else fail();
}

function ok(mistakes = 0) {
  const qrk = getQRKScore(mistakes);

  feedback.textContent = `QRK ${qrk}`;
  feedback.className = "show";

  setTimeout(() => {
    step++;
    next();
  }, 2200);
}

function fail() {
  clearTimers();

  feedback.textContent = "RPT";
  feedback.className = "show";

  play("RPT", false);

  setTimeout(() => {
    next();
  }, 1600);
}

function getQRKScore(mistakes) {
  if (mistakes === 0) return 5;
  if (mistakes === 1) return 4;
  if (mistakes === 2) return 3;
  if (mistakes === 3) return 2;
  return 1;
}

function getExpectedSendMessage(stepObj) {
  const base = getMsg(stepObj.msg);
  return stepObj.needsAK ? `${base} AK` : base;
}

function removeTrailingAK(text) {
  return String(text || "")
    .replace(/\s+AK\s*$/i, "")
    .trim();
}

function finish() {
  setBG("start");

  appScreen.classList.remove("active");
  endScreen.classList.add("active");

  const password = "GUGLIELMO MARCONI";
  document.getElementById("password").textContent = toMorse(password);
  play(password, false);
}

function popup(src) {
  setBG("video");

  const d = document.createElement("div");
  d.className = "videoOverlay";
  d.innerHTML = `<video src="${src}" autoplay playsinline controls></video><button>Skip</button>`;
  document.body.appendChild(d);

  const video = d.querySelector("video");
  const button = d.querySelector("button");

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    video.pause();
    d.remove();
    step++;
    next();
  }

  button.onclick = close;
  video.onended = close;
  video.play().catch(() => {});
}

function setBG(x) {
  document.body.className = "";
  document.body.classList.add("bg-" + x);
}

function getMsg(value) {
  return typeof value === "string" ? value : value[lang];
}

function norm(t) {
  return String(t || "")
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[^A-Z0-9]/g, "");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function toMorse(t) {
  return String(t || "")
    .toUpperCase()
    .split("")
    .map(c => {
      if (c === " ") return "   ";
      return MORSE[c] || "";
    })
    .join(" ");
}

function appendStrip(text) {
  strip.textContent += text;
  strip.scrollLeft = strip.scrollWidth;
}

function readableKey(e) {
  if (e.code === "Space") return lang === "de" ? "Leertaste" : "Space";
  if (e.code.startsWith("Key")) return e.code.replace("Key", "");
  if (e.code.startsWith("Digit")) return e.code.replace("Digit", "");
  return e.key || e.code;
}

function ensureAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
}

function tone() {
  ensureAudio();
  stop();

  osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = 650;
  osc.type = "sine";
  gain.gain.value = 0.2;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
}

function stop() {
  if (osc) {
    try { osc.stop(); } catch (e) {}
    osc.disconnect();
    osc = null;
  }
}

async function play(txt, transcribe) {
  ensureAudio();

  const myToken = ++playToken;
  disableReceive(true);

  const clean = String(txt || "").toUpperCase();

  for (const c of clean) {
    if (myToken !== playToken) return;

    if (c === " ") {
      if (transcribe) appendStrip("   ");
      await sleep(UNIT * 7);
      continue;
    }

    const m = MORSE[c];
    if (!m) continue;

    for (const part of m) {
      if (myToken !== playToken) return;

      if (transcribe) appendStrip(part);

      tone();
      await sleep(part === "." ? UNIT : UNIT * 3);
      stop();
      await sleep(UNIT);
    }

    if (transcribe) appendStrip(" ");
    await sleep(UNIT * 2);
  }

  disableReceive(false);
}

function disableReceive(disabled) {
  document.getElementById("checkBtn").disabled = disabled;
  document.getElementById("repeatBtn").disabled = disabled;
}

function clearTimers() {
  clearTimeout(letterTimer);
  clearTimeout(continueTimer);
  clearTimeout(rptAfterKTimer);

  letterTimer = null;
  continueTimer = null;
  rptAfterKTimer = null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

setLang("de");
