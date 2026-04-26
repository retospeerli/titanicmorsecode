let lang = "de";
let key = "Space";
let waitingKey = false;

let step = 0;
let input = "";
let currentSymbol = "";

const UNIT = 100;
const DOT = UNIT * 2;
const LETTER = UNIT * 3;
const FINISH = 3000;

const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
  Z: "--..", "?": "..--.."
};

const REV = Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));

const FLOW = [
  {type:"video",src:"titanic1.mp4"},
  {type:"send",msg:"CQD CQD CQD DE MGY MGY MGY"},
  {type:"receive",msg:"MGY DE MCP COME AT ONCE WE HAVE STRUCK ICEBERG"},
  {type:"send",msg:"MCP DE MGY COME AT ONCE WE HAVE STRUCK ICEBERG"},
  {type:"receive",msg:"MGY DE MPA WHAT IS YOUR POSITION"},
  {type:"send",msg:"MPA DE MGY 41.44 N 50.24 W REQUIRE IMMEDIATE ASSISTANCE"},
  {type:"receive",msg:"MGY DE MCP RECEIVED COMING AT FULL SPEED"},
  {type:"receive",msg:"MGY DE MPA ON OUR WAY"},
  {type:"video",src:"titanic2.mp4"},
  {type:"send",msg:"MGY CQD CQD DE MGY WE ARE SINKING FAST PASSENGERS BEING PUT INTO BOATS"},
  {type:"video",src:"titanic3.mp4"},
  {type:"end"}
];

/* UI */
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

/* START */
document.getElementById("startBtn").onclick = ()=>{
  startScreen.classList.remove("active");
  appScreen.classList.add("active");
  next();
};

document.getElementById("keyBtn").onclick=()=>{
  waitingKey=true;
  document.getElementById("keyInfo").textContent="Taste drücken...";
};

document.addEventListener("keydown",(e)=>{
  if(waitingKey){
    key=e.code;
    waitingKey=false;
    document.getElementById("keyInfo").textContent="Taste: "+e.key;
    return;
  }
  if(e.code===key) pressStart();
});

document.addEventListener("keyup",(e)=>{
  if(e.code===key) pressEnd();
});

/* MORSE INPUT */
let down=false,t0=0,timer;

function pressStart(){
  if(down) return;
  down=true;
  t0=Date.now();
}

function pressEnd(){
  if(!down) return;
  down=false;
  let d=Date.now()-t0;
  currentSymbol+=d<DOT?".":"-";
  symbol.textContent=currentSymbol;

  clearTimeout(timer);
  timer=setTimeout(finishLetter,LETTER);

  clearTimeout(window.finish);
  window.finish=setTimeout(checkSend,FINISH);
}

function finishLetter(){
  input+=REV[currentSymbol]||"?";
  currentSymbol="";
  symbol.textContent="–";
}

/* FLOW */
function next(){
  input="";
  currentSymbol="";
  symbol.textContent="–";
  feedback.className="";
  feedback.textContent="";
  receiveBox.classList.remove("active");

  let s=FLOW[step];

  if(s.type==="video"){
    setBG("video");
    popup(s.src);
    return;
  }

  if(s.type==="send"){
    setBG("task");
    taskCard.textContent="Sende:\n\n"+s.msg;
  }

  if(s.type==="receive"){
    setBG("task");
    taskCard.textContent="Hören + eingeben";
    receiveBox.classList.add("active");
    receiveInput.value="";
    receiveInput.focus();
    play(s.msg);
    strip.textContent=toMorse(s.msg);
  }

  if(s.type==="end"){
    finish();
  }
}

/* CHECK */
function checkSend(){
  if(norm(input)===norm(FLOW[step].msg)){
    ok();
  } else {
    fail();
  }
}

document.getElementById("checkBtn").onclick=()=>{
  let val=receiveInput.value;
  if(norm(val)===norm(FLOW[step].msg)){
    ok();
  } else {
    fail();
  }
};

function ok(){
  feedback.textContent="OK";
  feedback.className="show";
  setTimeout(()=>{step++;next();},500);
}

function fail(){
  feedback.textContent="??";
  feedback.className="show";
  play("?");
  setTimeout(next,1200);
}

/* END */
function finish(){
  appScreen.classList.remove("active");
  endScreen.classList.add("active");
  setBG("start");
  let p="GUGLIELMO MARCONI";
  document.getElementById("password").textContent=toMorse(p);
  play(p);
}

/* HELPERS */
function norm(t){return t.toUpperCase().replace(/\s/g,"");}

function setBG(x){
  document.body.className="";
  document.body.classList.add("bg-"+x);
}

function popup(src){
  let d=document.createElement("div");
  d.className="videoOverlay";
  d.innerHTML=`<video src="${src}" autoplay></video><button>Skip</button>`;
  document.body.appendChild(d);
  d.querySelector("button").onclick=()=>{d.remove();step++;next();};
  d.querySelector("video").onended=()=>{d.remove();step++;next();};
}

/* AUDIO */
let ctx=new AudioContext();

async function play(txt){
  for(let c of txt){
    if(c===" "){await sleep(UNIT*7);continue;}
    let m=MORSE[c];
    if(!m) continue;
    for(let s of m){
      tone(s==="."?UNIT:UNIT*3);
      await sleep(s==="."?UNIT:UNIT*3);
      stop();
      await sleep(UNIT);
    }
    await sleep(UNIT*2);
  }
}

function tone(){
  let o=ctx.createOscillator();
  let g=ctx.createGain();
  o.frequency.value=650;
  g.gain.value=0.2;
  o.connect(g);g.connect(ctx.destination);
  o.start();
  window.osc=o;
}

function stop(){
  if(window.osc){window.osc.stop();window.osc=null;}
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function toMorse(t){
  return t.split("").map(c=>MORSE[c]||"").join(" ");
}
