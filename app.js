const MORSE_MAP = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
  Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-",
  "?": "..--.."
};

const REVERSE_MORSE = {};
Object.keys(MORSE_MAP).forEach((key) => {
  REVERSE_MORSE[MORSE_MAP[key]] = key;
});

let lang = "de";
let stepIndex = 0;

let morseKeyCode = "Space";
let morseKeyLabel = "Leertaste";
let waitingForKeyChoice = false;

let audioCtx = null;
let oscillator = null;
let gainNode = null;

let isPressing = false;
let pressStartTime = 0;

let currentInputSymbols = "";
let recognizedLetters = [];

let finalizeLetterTimer = null;
let finishAttemptTimer = null;

let lastIncomingMessage = "";

const UNIT = 110;
const DOT_MAX = UNIT * 2.2;
const LETTER_PAUSE = UNIT * 3.2;
const FINISH_PAUSE = 3000;

const ERROR_SIGNAL = "?";

const steps = [
  {
    type: "video",
    src: "titanic1.mp4"
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nCQD CQD CQD DE MGY MGY MGY",
      en: "Transmit this message:\n\nCQD CQD CQD DE MGY MGY MGY"
    },
    expected: "CQD CQD CQD DE MGY MGY MGY",
    incoming: "MCP DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nMCP DE MGY\nSOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "Transmit this message:\n\nMCP DE MGY\nCOME AT ONCE WE HAVE STRUCK ICEBERG"
    },
    expected: {
      de: "MCP DE MGY SOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "MCP DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
    },
    incoming: {
      de: "MGY DE MPA WAS IST IHRE POSITION",
      en: "MGY DE MPA WHAT IS YOUR POSITION"
    }
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nMPA DE MGY\n41.44 N 50.24 W\nFORDERE SOFORTIGE HILFE AN",
      en: "Transmit this message:\n\nMPA DE MGY\n41.44 N 50.24 W\nREQUIRE IMMEDIATE ASSISTANCE"
    },
    expected: {
      de: "MPA DE MGY 41.44 N 50.24 W FORDERE SOFORTIGE HILFE AN",
      en: "MPA DE MGY 41.44 N 50.24 W REQUIRE IMMEDIATE ASSISTANCE"
    },
    incoming: {
      de: "MGY DE MCP VERSTANDEN FAHREN MIT VOLLER KRAFT",
      en: "MGY DE MCP RECEIVED COMING AT FULL SPEED"
    }
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nMGY DE MCP\nVERSTANDEN FAHREN MIT VOLLER KRAFT",
      en: "Transmit this message:\n\nMGY DE MCP\nRECEIVED COMING AT FULL SPEED"
    },
    expected: {
      de: "MGY DE MCP VERSTANDEN FAHREN MIT VOLLER KRAFT",
      en: "MGY DE MCP RECEIVED COMING AT FULL SPEED"
    },
    incoming: {
      de: "MGY DE MPA SIND UNTERWEGS",
      en: "MGY DE MPA ON OUR WAY"
    }
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nMGY DE MPA\nSIND UNTERWEGS",
      en: "Transmit this message:\n\nMGY DE MPA\nON OUR WAY"
    },
    expected: {
      de: "MGY DE MPA SIND UNTERWEGS",
      en: "MGY DE MPA ON OUR WAY"
    },
    nextVideo: "titanic2.mp4"
  },
  {
    type: "send",
    task: {
      de: "Sende diese Nachricht:\n\nMGY CQD CQD DE MGY\nWE ARE SINKING FAST\nPASSENGERS BEING PUT INTO BOATS",
      en: "Transmit this message:\n\nMGY CQD CQD DE MGY\nWE ARE SINKING FAST\nPASSENGERS BEING PUT INTO BOATS"
    },
    expected: "MGY CQD CQD DE MGY WE ARE SINKING FAST PASSENGERS BEING PUT INTO BOATS",
    finalVideo: "titanic3.mp4"
  }
];

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const passedScreen = document.getElementById("passedScreen");

const videoPlayer = document.getElementById("videoPlayer");
const taskCard = document.getElementById("taskCard");
const incomingStrip = document.getElementById("incomingStrip");
const currentSymbol = document.getElementById("currentSymbol");
const checkButton = document.getElementById("checkButton");
const repeatButton = document.getElementById("repeatButton");
const feedback = document.getElementById("feedback");
const passwordMorse = document.getElementById("passwordMorse");
const passedText = document.getElementById("passedText");

const keyButton = document.getElementById("keyButton");
const keyInfo = document.getElementById("keyInfo");
const startButton = document.getElementById("startButton");

function selectLang(selected) {
  lang = selected;
  keyInfo.textContent = `Morsetaste: ${morseKeyLabel}`;
}

keyButton.addEventListener("click", () => {
  waitingForKeyChoice = true;
  keyInfo.textContent = lang === "de"
    ? "Drücke jetzt deine gewünschte Morsetaste."
    : "Press your chosen Morse key now.";
});

startButton.addEventListener("click", startExam);
checkButton.addEventListener("click", finishAttemptManually);
repeatButton.addEventListener("click", repeatIncoming);

document.addEventListener("keydown", (event) => {
  if (waitingForKeyChoice) {
    event.preventDefault();
    morseKeyCode = event.code;
    morseKeyLabel = getReadableKeyName(event);
    waitingForKeyChoice = false;
    keyInfo.textContent = `Morsetaste: ${morseKeyLabel}`;
    startButton.disabled = false;
    return;
  }

  if (!gameScreen.classList.contains("active")) return;
  if (event.code !== morseKeyCode) return;
  if (event.repeat) return;

  event.preventDefault();
  handlePressStart();
});

document.addEventListener("keyup", (event) => {
  if (!gameScreen.classList.contains("active")) return;
  if (event.code !== morseKeyCode) return;

  event.preventDefault();
  handlePressEnd();
});

window.addEventListener("blur", () => {
  if (isPressing) handlePressEnd();
});

function startExam() {
  startScreen.classList.remove("active");
  gameScreen.classList.add("active");
  passedScreen.classList.remove("active");

  stepIndex = 0;
  loadStep();
}

function loadStep() {
  resetInput();
  clearFeedback();

  const step = steps[stepIndex];

  if (step.type === "video") {
    showVideoPopup(step.src, () => {
      stepIndex++;
      loadStep();
    });
    return;
  }

  taskCard.textContent = getLangValue(step.task);
  incomingStrip.textContent = "";
  lastIncomingMessage = "";

  videoPlayer.style.display = "none";
}

function finishAttemptManually() {
  finalizeCurrentLetter();
  checkCurrentStep();
}

function checkCurrentStep() {
  const step = steps[stepIndex];
  const userText = normalize(recognizedLetters.join(""));
  const expectedText = normalize(getLangValue(step.expected));

  if (userText === expectedText) {
    showFeedback(lang === "de" ? "Richtig." : "Correct.", "correct");

    setTimeout(async () => {
      if (step.incoming) {
        lastIncomingMessage = getLangValue(step.incoming);
        incomingStrip.textContent = textToMorse(lastIncomingMessage);
        await playTextAsMorse(lastIncomingMessage);
      }

      if (step.nextVideo) {
        await wait(600);
        showVideoPopup(step.nextVideo, () => {
          stepIndex++;
          loadStep();
        });
        return;
      }

      if (step.finalVideo) {
        await wait(600);
        showVideoPopup(step.finalVideo, finishExam);
        return;
      }

      stepIndex++;
      loadStep();
    }, 800);

  } else {
    showFeedback(lang === "de" ? "Nicht verstanden." : "Not understood.", "wrong");
    playTextAsMorse(ERROR_SIGNAL);
    resetInput();
  }
}

function finishExam() {
  gameScreen.classList.remove("active");
  passedScreen.classList.add("active");

  passedText.textContent = lang === "de"
    ? "Die Prüfung ist bestanden. Passwort 3 wird nun gemorst:"
    : "The exam is passed. Password 3 is now sent in Morse:";

  const password = "GUGLIELMO MARCONI";
  passwordMorse.textContent = textToMorse(password);
  playTextAsMorse(password);
}

function repeatIncoming() {
  if (!lastIncomingMessage) return;
  incomingStrip.textContent = textToMorse(lastIncomingMessage);
  playTextAsMorse(lastIncomingMessage);
}

function handlePressStart() {
  if (isPressing) return;

  clearTimeout(finalizeLetterTimer);
  clearTimeout(finishAttemptTimer);

  ensureAudio();
  startTone();

  isPressing = true;
  pressStartTime = performance.now();
}

function handlePressEnd() {
  if (!isPressing) return;

  isPressing = false;
  stopTone();

  const duration = performance.now() - pressStartTime;
  const symbol = duration < DOT_MAX ? "." : "-";

  currentInputSymbols += symbol;
  currentSymbol.textContent = currentInputSymbols;

  clearTimeout(finalizeLetterTimer);
  finalizeLetterTimer = setTimeout(finalizeCurrentLetter, LETTER_PAUSE);

  clearTimeout(finishAttemptTimer);
  finishAttemptTimer = setTimeout(() => {
    finalizeCurrentLetter();
    checkCurrentStep();
  }, FINISH_PAUSE);
}

function finalizeCurrentLetter() {
  if (!currentInputSymbols) return;

  const decoded = REVERSE_MORSE[currentInputSymbols] || "?";
  recognizedLetters.push(decoded);

  currentInputSymbols = "";
  currentSymbol.textContent = "–";
}

function resetInput() {
  recognizedLetters = [];
  currentInputSymbols = "";
  currentSymbol.textContent = "–";

  clearTimeout(finalizeLetterTimer);
  clearTimeout(finishAttemptTimer);
}

function showVideoPopup(src, callback) {
  let overlay = document.createElement("div");
  overlay.className = "videoOverlay";

  overlay.innerHTML = `
    <div class="videoPopup">
      <video id="popupVideo" src="${src}" autoplay playsinline controls></video>
      <button id="skipVideoBtn">Skip</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const popupVideo = document.getElementById("popupVideo");
  const skipBtn = document.getElementById("skipVideoBtn");

  function closePopup() {
    popupVideo.pause();
    overlay.remove();
    if (callback) callback();
  }

  popupVideo.onended = closePopup;
  skipBtn.onclick = closePopup;

  popupVideo.play().catch(() => {});
}

function showFeedback(text, type) {
  feedback.textContent = text;
  feedback.className = `show ${type}`;
}

function clearFeedback() {
  feedback.textContent = "";
  feedback.className = "";
}

function normalize(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeForMorse(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS");
}

function textToMorse(text) {
  return normalizeForMorse(text)
    .split("")
    .map((char) => {
      if (char === " ") return "   ";
      return MORSE_MAP[char] || "";
    })
    .join(" ");
}

function getLangValue(value) {
  if (typeof value === "string") return value;
  return value[lang];
}

function getReadableKeyName(event) {
  if (event.code === "Space") return "Leertaste";
  if (event.code.startsWith("Key")) return event.code.replace("Key", "");
  if (event.code.startsWith("Digit")) return event.code.replace("Digit", "");
  if (event.code.startsWith("Numpad")) return "Num " + event.code.replace("Numpad", "");
  return event.key || event.code;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function startTone() {
  ensureAudio();
  stopTone();

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 650;
  gainNode.gain.value = 0.18;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
}

function stopTone() {
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (err) {}
    oscillator.disconnect();
    oscillator = null;
  }

  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

async function playTextAsMorse(text) {
  ensureAudio();

  checkButton.disabled = true;
  repeatButton.disabled = true;

  const normalized = normalizeForMorse(text);

  for (const char of normalized) {
    if (char === " ") {
      await wait(UNIT * 7);
      continue;
    }

    const pattern = MORSE_MAP[char];
    if (!pattern) continue;

    await playMorsePattern(pattern);
    await wait(UNIT * 3);
  }

  checkButton.disabled = false;
  repeatButton.disabled = false;
}

async function playMorsePattern(pattern) {
  for (let i = 0; i < pattern.length; i++) {
    const symbol = pattern[i];
    const duration = symbol === "." ? UNIT : UNIT * 3;

    startTone();
    await wait(duration);
    stopTone();

    if (i < pattern.length - 1) {
      await wait(UNIT);
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
