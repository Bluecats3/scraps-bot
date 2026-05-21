const socket = io();

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
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

// =========================
// SCREENS
// =========================

const modeScreen = document.getElementById("modeScreen");
const gameScreen = document.getElementById("gameScreen");
const multiplayerScreen = document.getElementById("multiplayerScreen");

function openMultiplayerMenu() {
    modeScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    multiplayerScreen.classList.remove("hidden");
}

function closeMultiplayerMenu() {
    multiplayerScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
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
    multiplayerScreen.classList.add("hidden");
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

    scrapsTalk("DIGGING THROUGH FACTS AND SCRAP...");

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

        scrapsTalk("YAY! MORE SCRAP!");

        robotHappy();

    } else {
        streak = 0;

        playSound(wrongSound);

        button.classList.add("wrong");

        buttons[correct].classList.add("correct");

        scrapsTalk("THAT IS NOT SCRAP!");

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

const playerNameInput = document.getElementById("playerNameInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const startRoundBtn = document.getElementById("startRoundBtn");
const playersList = document.getElementById("playersList");

createRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim() || "Host";

    socket.emit("createRoom", playerName);
});

joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim() || "Player";
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!code) {
        alert("Enter a room code first.");
        return;
    }

    socket.emit("joinRoom", {
        code,
        playerName
    });
});

socket.on("roomCreated", (code) => {
    multiplayerRoomCode = code;

    roomCodeDisplay.textContent = `Room Code: ${code}`;
    startRoundBtn.style.display = "block";
});

socket.on("roomJoined", (code) => {
    multiplayerRoomCode = code;

    roomCodeDisplay.textContent = `Joined Room: ${code}`;
    startRoundBtn.style.display = "none";
});

socket.on("playersUpdated", (players) => {
    playersList.innerHTML = "<h3>Players</h3>";

    players.forEach(player => {
        const p = document.createElement("p");
        p.textContent = player.name;
        playersList.appendChild(p);
    });
});

startRoundBtn.addEventListener("click", () => {
    socket.emit("startRound", {
        code: multiplayerRoomCode,
        mode: gameMode || "interesting"
    });
});

socket.on("newRound", (round) => {
    currentRound = round;
    answered = false;

    multiplayerScreen.classList.add("hidden");
    modeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    showMultiplayerRound(round);
});

function showMultiplayerRound(round) {
    const container = document.getElementById("factButtons");

    container.innerHTML = "";
    document.getElementById("resultBox").innerHTML = "";

    scrapsTalk("MULTIPLAYER ROUND STARTED!");

    document.getElementById("score").textContent = score;
    document.getElementById("streak").textContent = streak;
    document.getElementById("roundNumber").textContent = roundNumber;

    round.facts.forEach((fact, index) => {
        const btn = document.createElement("button");

        btn.className = "factBtn";
        btn.textContent = fact;

        btn.onclick = () => {
            if (answered) return;

            answered = true;

            socket.emit("submitAnswer", {
                code: multiplayerRoomCode,
                answerIndex: index
            });
        };

        container.appendChild(btn);
    });
}

socket.on("answerResult", (result) => {
    const buttons = document.querySelectorAll(".factBtn");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    if (result.correct) {
        score++;
        streak++;

        playSound(correctSound);
        playSound(pointSound);

        scrapsTalk("YAY! MORE SCRAP!");
        robotHappy();

    } else {
        streak = 0;

        playSound(wrongSound);

        scrapsTalk("THAT IS NOT SCRAP!");
        robotMad();
    }

    document.getElementById("resultBox").innerHTML =
        result.explanation;

    document.getElementById("score").textContent = score;
    document.getElementById("streak").textContent = streak;

    roundNumber++;
    document.getElementById("roundNumber").textContent = roundNumber;
});

socket.on("scoreUpdated", (scores) => {
    console.log("Scores:", scores);
});

socket.on("errorMessage", (message) => {
    alert(message);
});

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
