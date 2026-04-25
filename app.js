let lang = "de";
let stepIndex = 0;
let lastIncoming = "";

const morseMap = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
  G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-"
};

const texts = {
  de: {
    task: "AUFTRAG",
    input: "MORSE-EINGABE",
    write: "Der vorgesetzte Funker befiehlt: Schreibe die Antwort auf Papier mit. Du siehst nur die Morsezeichen.",
    send: "Gib den Funkspruch in das unsichtbare Morse-Feld ein und sende ihn.",
    correct: "Richtig. Nachricht gesendet.",
    wrong: "Noch nicht korrekt. Prüfe deinen Funkspruch.",
    repeat: "Antwort nochmals hören",
    passed: "Die Prüfung ist bestanden. Das Passwort 3 wird nun gemorst:"
  },
  en: {
    task: "ORDER",
    input: "MORSE INPUT",
    write: "The senior radio operator orders: Write the answer down on paper. You only see the Morse code.",
    send: "Enter the radio message into the hidden Morse field and send it.",
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
    incoming: "DDK DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
  },
  {
    task: {
      de: "DDK DE MGY\n\nSOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "DDK DE MGY\n\nCOME AT ONCE WE HAVE STRUCK ICEBERG"
    },
    expected: {
      de: "DDK DE MGY SOFORT KOMMEN HABEN EISBERG GERAMMT",
      en: "DDK DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"
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
      de: "MGY DE DDK VERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE DDK RECEIVED COMING AT FULL SPEED"
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
      de: "MGY DE DDK\n\nVERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE DDK\n\nRECEIVED COMING AT FULL SPEED"
    },
    expected: {
      de: "MGY DE DDK VERSTANDEN KOMMEN MIT VOLLER GESCHWINDIGKEIT",
      en: "MGY DE DDK RECEIVED COMING AT FULL SPEED"
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

function startApp(selectedLang) {
  lang = selectedLang;
  document.getElementById("languageScreen").classList.remove("active");
  document.getElementById("gameScreen").classList.add("active");

  document.getElementById("taskLabel").textContent = texts[lang].task;
  document.getElementById("inputLabel").textContent = texts[lang].input;
  document.getElementById("repeatButton").textContent = texts[lang].repeat;

  stepIndex = 0;
  loadStep();
}

function loadStep() {
  const step = steps[stepIndex];

  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "";
  document.getElementById("morseInput").value = "";
  document.getElementById("instruction").textContent = texts[lang].send;

  const task = getLangValue(step.task);
  document.getElementById("taskText").textContent = task;

  if (step.video) {
    playVideo(step.video);
  }

  if (step.incoming) {
    lastIncoming = getLangValue(step.incoming);
    playIncoming(lastIncoming);
  } else {
    lastIncoming = "";
    document.getElementById("incomingMorse").textContent = "";
  }
}

function checkInput() {
  const step = steps[stepIndex];
  const user = normalize(document.getElementById("morseInput").value);
  const expected = normalize(getLangValue(step.expected));

  if (user === expected) {
    document.getElementById("feedback").textContent = texts[lang].correct;
    document.getElementById("feedback").className = "correct";

    setTimeout(() => {
      if (step.finalVideo) {
        playVideo(step.finalVideo, finishExam);
      } else {
        stepIndex++;
        loadStep();
      }
    }, 900);

  } else {
    document.getElementById("feedback").textContent = texts[lang].wrong;
    document.getElementById("feedback").className = "wrong";
  }
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

function playVideo(src, callback) {
  const video = document.getElementById("videoPlayer");
  video.src = src;
  video.style.display = "block";
  video.onended = callback || null;
  video.play().catch(() => {});
}

function playIncoming(message) {
  document.getElementById("instruction").textContent = texts[lang].write;
  const morse = textToMorse(message);
  document.getElementById("incomingMorse").textContent = morse;
  playMorse(message);
}

function repeatIncoming() {
  if (lastIncoming) {
    playIncoming(lastIncoming);
  }
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
    .replace(/\s+/g, " ")
    .trim();
}

function textToMorse(text) {
  return normalize(text)
    .split("")
    .map(char => {
      if (char === " ") return "   ";
      return morseMap[char] || "";
    })
    .join(" ");
}

function playMorse(text) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let time = ctx.currentTime + 0.1;

  const unit = 0.08;
  const freq = 650;

  const normalized = normalize(text);

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

document.getElementById("checkButton").addEventListener("click", checkInput);
document.getElementById("repeatButton").addEventListener("click", repeatIncoming);

document.getElementById("morseInput").addEventListener("keydown", function (event) {
  if (event.key === "Enter" && event.ctrlKey) {
    checkInput();
  }
});
