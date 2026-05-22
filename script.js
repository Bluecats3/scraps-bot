

let multiplayerRoomCode = "";

console.log("SCRAPS BOT LOADED");

let score = 0;
let streak = 0;
let roundNumber = 1;
let currentRound = null;
let answered = false;
let gameMode = "interesting";

let currentRequestId = 0;
let isLoadingRound = false;

// =========================
// SOUNDS
// =========================

const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");
const pointSound = new Audio("sounds/point.mp3");
const introSound = new Audio("sounds/intro.mp3");

function playSound(sound) {
    const soundClone = sound.cloneNode();
    soundClone.volume = 1;
    soundClone.play().catch(() => {});
}



// =========================
// SCREENS
// =========================

const modeScreen = document.getElementById("modeScreen");
const gameScreen = document.getElementById("gameScreen");

const rulesScreen = document.getElementById("rulesScreen");



// ADD THESE HERE ↓↓↓

function openRules() {

    modeScreen.classList.add("hidden");

    rulesScreen.classList.remove("hidden");
}

function closeRules() {

    rulesScreen.classList.add("hidden");

    modeScreen.classList.remove("hidden");
}

// =========================
// ROBOT
// =========================

function getActiveRobot() {
    return document.querySelector("#gameScreen .robot");
}

function robotHappy() {
    const robot = getActiveRobot();

    if (!robot) return;

    robot.classList.remove("mad");
    robot.classList.add("happy");

    setTimeout(() => {
        robot.classList.remove("happy");
    }, 900);
}

function robotMad() {
    const robot = getActiveRobot();

    if (!robot) return;

    robot.classList.remove("happy");
    robot.classList.add("mad");

    setTimeout(() => {
        robot.classList.remove("mad");
    }, 500);
}

function scrapsTalk(text) {
    document.getElementById("scrapsText").textContent = text;
}

// =========================
// SOLO GAME
// =========================

function startGame(mode, resetScore = false) {
    currentRequestId++;

    gameMode = mode;

    introSound.currentTime = 0;
    introSound.play().catch(() => {});

    modeScreen.classList.add("hidden");
    
    gameScreen.classList.remove("hidden");

    if (resetScore) {
        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    nextRound();
}

async function nextRound() {
    const requestId = ++currentRequestId;

    isLoadingRound = true;
    answered = false;

    const robot = getActiveRobot();

    if (robot) {
        robot.classList.remove("happy");
        robot.classList.remove("mad");
    }

        const loadingMessages = [
    "DIGGING THROUGH FACTS AND SCRAP...",
    "SCANNING THE INTERNET FOR WEIRDNESS...",
    "CHECKING FOR SCRAP...",
    "ANALYZING QUESTIONABLE INFORMATION...",
    "SEARCHING FOR SUSPICIOUS FACTS...",
    "VERIFYING STRANGE CLAIMS...",
    "LOOKING FOR FAKE FACTS...",
    "SCANNING HUMAN KNOWLEDGE...",
    "DETECTING POSSIBLE NONSENSE..."
];

const randomMessage =
    loadingMessages[
        Math.floor(Math.random() * loadingMessages.length)
    ];

scrapsTalk(randomMessage);

    
document.getElementById("resultBox").innerHTML = "";
document.getElementById("score").textContent = score;
document.getElementById("streak").textContent = streak;
document.getElementById("roundNumber").textContent = roundNumber;


    const container = document.getElementById("factButtons");
    container.innerHTML = "";

    try {
        const response = await fetch(`/round?mode=${gameMode}`);
        const round = await response.json();

        if (requestId !== currentRequestId) {
            return;
        }

        if (
            !round ||
            !Array.isArray(round.facts) ||
            round.facts.length !== 3 ||
            typeof round.fakeIndex !== "number"
        ) {
            throw new Error("Bad round data");
        }

        currentRound = round;

        container.innerHTML = "";

        scrapsTalk("I FOUND 2 REAL FACTS AND 1 SCRAP!");

        round.facts.forEach((fact, index) => {
            const btn = document.createElement("button");

            btn.className = "factBtn";
            btn.textContent = fact;

            btn.onclick = () => {
                checkAnswer(index, btn);
            };

            container.appendChild(btn);
        });

    } catch (error) {
        console.error("Round load error:", error);
        scrapsTalk("MY CIRCUITS JAMMED.");
    } finally {
        isLoadingRound = false;
    }
}

function checkAnswer(index, button) {
    if (answered) return;

    answered = true;

    const buttons = document.querySelectorAll(".factBtn");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    const correct = currentRound.fakeIndex;

    if (index === correct) {
        score++;
        streak++;

        playSound(correctSound);
        playSound(pointSound);

        button.classList.add("correct");

        const correctMessages = [
    "YAY! MORE SCRAP!",
    "SCRAP DETECTED!",
    "CORRECT SCRAP IDENTIFICATION!",
    "YOU FOUND THE FAKE!",
    "EXCELLENT SCRAP WORK.",
    "SCRAP BOT APPROVES.",
    "CORRECT! HUMAN SUCCESS.",
    "THAT FACT WAS TOTAL SCRAP.",
    "YOU OUTSMARTED THE SCRAP.",
    "SCRAP CONFIRMED.",
    "CORRECT ANSWER DETECTED.",
    "FAKE FACT ELIMINATED.",
    "THAT WAS DEFINITELY SCRAP.",
    "SCRAP HUNTER LEVEL INCREASING.",
    "NICE WORK, HUMAN."
];

const randomCorrectMessage =
    correctMessages[
        Math.floor(Math.random() * correctMessages.length)
    ];

scrapsTalk(randomCorrectMessage);

        robotHappy();

    } else {
        streak = 0;

        playSound(wrongSound);

        button.classList.add("wrong");

        buttons[correct].classList.add("correct");

        const wrongMessages = [
    "THAT IS NOT SCRAP!",
    "NEGATIVE. REAL FACT DETECTED.",
    "INCORRECT SCRAP IDENTIFICATION.",
    "YOU FOUND A REAL FACT.",
    "THAT FACT IS AUTHENTIC.",
    "SCRAP BOT DISAGREES.",
    "MY CIRCUITS SAY NO.",
    "THAT ONE IS REAL.",
    "SCRAP DETECTOR FAILED.",
    "INCORRECT! TRY AGAIN.",
    "HUMAN ERROR DETECTED.",
    "YOU MISSED THE SCRAP!",
    "THAT IS CERTIFIED REAL.",
    "WARNING: FALSE SCRAP REPORT."
];

const randomWrongMessage =
    wrongMessages[
        Math.floor(Math.random() * wrongMessages.length)
    ];

scrapsTalk(randomWrongMessage);

        robotMad();
    }

    document.getElementById("resultBox").innerHTML =
        currentRound.explanation;

    document.getElementById("score").textContent = score;
    document.getElementById("streak").textContent = streak;
    document.getElementById("roundNumber").textContent = roundNumber;

    roundNumber++;

    setTimeout(() => {
        if (!gameScreen.classList.contains("hidden")) {
            nextRound();
        }
    }, 2200);
}

// =========================
// MULTIPLAYER
// =========================



// =========================
// BACK TO MENU
// =========================

function backToMenu(resetGame = false) {
    currentRequestId++;
    isLoadingRound = false;

    modeScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");
    multiplayerScreen.classList.add("hidden");

    document.getElementById("factButtons").innerHTML = "";
    document.getElementById("resultBox").innerHTML = "";

    if (resetGame) {
        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    answered = false;
}
