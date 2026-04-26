let lang = "de";
let chosenKey = null;
let waitingForKey = false;

let stepIndex = 0;
let lastIncoming = "";

let isKeyDown = false;
let keyDownTime = 0;
let currentMorseChar = "";
let typedMorseChars = [];
let charTimer = null;

const dotLimit = 220;
const letterPause = 900;

const morseMap = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
  G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-",
  "?": "..--.."
};

const reverseMorseMap = {};
Object.keys(morseMap).forEach(k => reverseMorseMap[morseMap[k]] = k);

const texts = {
  de: {
    keyUnset: "Noch keine Taste gewählt.",
    keySet: "Morsetaste:",
    chooseKey: "Drücke jetzt deine gewünschte Morsetaste.",
    start: "Prüfung starten",
    correct: "Richtig. Nachricht gesendet.",
    wrong: "Noch nicht korrekt. Prüfe deinen Funkspruch.",
    repeat: "Antwort nochmals hören",
    passed: "Die Prüfung ist bestanden. Das Passwort 3 wird nun gemorst:"
  },
  en: {
    keyUnset: "No key selected yet.",
    keySet: "Morse key:",
    chooseKey: "Press your chosen Morse key now.",
    start: "Start exam",
    correct: "Correct. Message sent.",
    wrong: "Not correct yet. Check your radio message.",
    repeat: "Hear answer again",
    passed: "The exam is passed. Password 3 is now sent in Morse:"
  }
};

const steps = [
  {
    video: "titanic1.mp4",
    task: {
      de: "Melde den Seenotfall.\n\nCQD CQD CQD DE MGY MGY MGY",
      en: "Send the distress call.\n\nCQD CQD CQD DE MGY MGY MGY"
    },
    expected: "CQD CQD CQD DE MGY MGY MGY",
    incoming: "MCP DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
  },
  {
    task: {
      de: "MCP DE MGY\n\nSOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "MCP DE MGY\n\nCOME AT ONCE WE HAVE STRUCK ICEBERG"
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
    task: {
      de: "MGY DE MPA\n\nWAS IST IHRE POSITION",
      en: "MGY DE MPA\n\nWHAT IS YOUR POSITION"
    },
    expected: {
      de: "MGY DE MPA WAS IST IHRE POSITION",
      en: "MGY DE MPA WHAT IS YOUR POSITION"
    },
    incoming: {
      de: "MGY DE MCP VERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE MCP RECEIVED COMING AT FULL SPEED"
    }
  },
  {
    task: {
      de: "MGY DE MPA\n\n41.44 N 50.24 W\n\nFORDERE SOFORTIGE HILFE AN",
      en: "MGY DE MPA\n\n41.44 N 50.24 W\n\nREQUIRE IMMEDIATE ASSISTANCE"
    },
    expected: {
      de: "MGY DE MPA 41.44 N 50.24 W FORDERE SOFORTIGE HILFE AN",
      en: "MGY DE MPA 41.44 N 50.24 W REQUIRE IMMEDIATE ASSISTANCE"
    },
    incoming: {
      de: "MGY DE MPA SIND UNTERWEGS",
      en: "MGY DE MPA ON OUR WAY"
    }
  },
  {
    task: {
      de: "MGY DE MCP\n\nVERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE MCP\n\nRECEIVED COMING AT FULL SPEED"
    },
    expected: {
      de: "MGY DE MCP VERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE MCP RECEIVED COMING AT FULL SPEED"
    },
    incoming: {
      de: "MGY DE MPA SIND UNTERWEGS",
      en: "MGY DE MPA ON OUR WAY"
    }
  },
  {
    video: "titanic2.mp4",
    task: {
      de: "MGY DE MPA\n\nSIND UNTERWEGS",
      en: "MGY DE MPA\n\nON OUR WAY"
    },
    expected: {
      de: "MGY DE MPA SIND UNTERWEGS",
      en: "MGY DE MPA ON OUR WAY"
    },
    incoming: ""
  },
  {
    task: {
      de: "Sende den letzten Notruf.\n\nMGY CQD CQD DE MGY\nWE ARE SINKING FAST\nPASSENGERS BEING PUT INTO BOATS",
      en: "Send the final distress call.\n\nMGY CQD CQD DE MGY\nWE ARE SINKING FAST\nPASSENGERS BEING PUT INTO BOATS"
    },
    expected: "MGY CQD CQD DE MGY WE ARE SINKING FAST PASSENGERS BEING PUT INTO BOATS",
    finalVideo: "titanic3.mp4"
  }
];

function selectLang(selected) {
  lang = selected;
  document.getElementById("keyButton").textContent =
    lang === "de" ? "Taste wählen" : "Choose key";
  document.getElementById("keyInfo").textContent = chosenKey
    ? `${texts[lang].keySet} ${chosenKey}`
    : texts[lang].keyUnset;
  document.getElementById("startButton").textContent = texts[lang].start;
  document.getElementById("repeatButton").textContent = texts[lang].repeat;
}

document.getElementById("keyButton").addEventListener("click", () => {
  waitingForKey = true;
  document.getElementById("keyInfo").textContent = texts[lang].chooseKey;
});

document.addEventListener("keydown", (event) => {
  if (waitingForKey) {
    event.preventDefault();
    chosenKey = event.code;
    waitingForKey = false;
    document.getElementById("keyInfo").textContent = `${texts[lang].keySet} ${event.key}`;
    document.getElementById("startButton").disabled = false;
    return;
  }

  if (!document.getElementById("gameScreen").classList.contains("active")) return;
  if (event.code !== chosenKey) return;
  if (isKeyDown) return;

  event.preventDefault();
  isKeyDown = true;
  keyDownTime = Date.now();
});

document.addEventListener("keyup", (event) => {
  if (!document.getElementById("gameScreen").classList.contains("active")) return;
  if (event.code !== chosenKey) return;

  event.preventDefault();
  isKeyDown = false;

  const duration = Date.now() - keyDownTime;
  const symbol = duration < dotLimit ? "." : "-";

  currentMorseChar += symbol;
  document.getElementById("currentSymbol").textContent = currentMorseChar;

  clearTimeout(charTimer);
  charTimer = setTimeout(commitCurrentChar, letterPause);
});

document.getElementById("startButton").addEventListener("click", () => {
  document.getElementById("startScreen").classList.remove("active");
  document.getElementById("gameScreen").classList.add("active");
  stepIndex = 0;
  loadStep();
});

document.getElementById("checkButton").addEventListener("click", checkInput);
document.getElementById("repeatButton").addEventListener("click", repeatIncoming);

function commitCurrentChar() {
  if (!currentMorseChar) return;

  const letter = reverseMorseMap[currentMorseChar] || "?";
  typedMorseChars.push(letter);

  currentMorseChar = "";
  document.getElementById("currentSymbol").textContent = "–";
}

function loadStep() {
  const step = steps[stepIndex];

  typedMorseChars = [];
  currentMorseChar = "";
  document.getElementById("currentSymbol").textContent = "–";
  hideFeedback();

  document.getElementById("taskCard").textContent = getLangValue(step.task);

  if (step.video) {
    playVideo(step.video);
  }

  if (step.incoming) {
    lastIncoming = getLangValue(step.incoming);
    playIncoming(lastIncoming);
  } else {
    lastIncoming = "";
    document.getElementById("incomingStrip").textContent = "";
  }
}

function checkInput() {
  commitCurrentChar();

  const step = steps[stepIndex];
  const user = normalize(typedMorseChars.join(""));
  const expected = normalize(getLangValue(step.expected));

  if (user === expected) {
    showFeedback(texts[lang].correct, "correct");

    setTimeout(() => {
      if (step.finalVideo) {
        playVideo(step.finalVideo, finishExam);
      } else {
        stepIndex++;
        loadStep();
      }
    }, 900);

  } else {
    showFeedback(texts[lang].wrong, "wrong");
  }
}

function showFeedback(text, type) {
  const box = document.getElementById("feedback");
  box.textContent = text;
  box.className = `show ${type}`;
}

function hideFeedback() {
  const box = document.getElementById("feedback");
  box.textContent = "";
  box.className = "";
}

function finishExam() {
  document.getElementById("gameScreen").classList.remove("active");
  document.getElementById("passedScreen").classList.add("active");

  document.getElementById("passedText").textContent = texts[lang].passed;

  const password = "GUGLIELMO MARCONI";
  const morse = textToMorse(password);
  document.getElementById("passwordMorse").textContent = morse;
  playMorse(password);
}

function repeatIncoming() {
  if (lastIncoming) playIncoming(lastIncoming);
}

function playIncoming(message) {
  const morse = textToMorse(message);
  document.getElementById("incomingStrip").textContent = morse;
  playMorse(message);
}

function playVideo(src, callback) {
  const video = document.getElementById("videoPlayer");
  video.src = src;
  video.onended = callback || null;
  video.play().catch(() => {});
}

function getLangValue(value) {
  if (typeof value === "string") return value;
  return value[lang];
}

function normalize(text) {
  return text
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function textToMorse(text) {
  return normalizeForMorse(text)
    .split("")
    .map(char => {
      if (char === " ") return "   ";
      return morseMap[char] || "";
    })
    .join(" ");
}

function normalizeForMorse(text) {
  return text
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS");
}

function playMorse(text) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let time = ctx.currentTime + 0.1;

  const unit = 0.08;
  const freq = 650;

  const normalized = normalizeForMorse(text);

  for (const char of normalized) {
    if (char === " ") {
      time += unit * 7;
      continue;
    }

    const code = morseMap[char];
    if (!code) continue;

    for (const symbol of code) {
      const duration = symbol === "." ? unit : unit * 3;
      tone(ctx, time, duration, freq);
      time += duration + unit;
    }

    time += unit * 2;
  }
}

function tone(ctx, start, duration, freq) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = freq;
  osc.type = "sine";

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}
