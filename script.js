console.log("PROFESSOR SCRAPS AI MODE LOADED");

let score = 0;
let streak = 0;
let roundNumber = 1;
let currentRound = null;
let answered = false;
let gameMode = "facts";
let pendingHighScore = null;

const bannedWords = [
    "fuck", "shit", "bitch", "asshole", "damn",
    "dick", "piss", "slut", "whore", "cunt",
    "fag", "nigger"
];

function hasBadWord(name) {
    const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    return bannedWords.some(word => cleanName.includes(word));
}

function getActiveRobot() {
    return document.querySelector("#gameScreen .robot");
}

const correctSound = new Audio("sounds/correct.mp3");
const wrongSound = new Audio("sounds/wrong.mp3");
const pointSound = new Audio("sounds/point.mp3");
const introSound = new Audio("sounds/intro.mp3");

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function startGame(mode, resetScore = false) {
    gameMode = mode;
    
    introSound.currentTime = 0;
    introSound.play().catch(() => {});
    document.getElementById("modeScreen").classList.add("hidden");
    document.getElementById("leaderboardScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");

    if (resetScore) {
        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    nextRound();
}

async function nextRound() {
    answered = false;

    const robot = getActiveRobot();

    if (robot) {
        robot.classList.remove("happy");
        robot.classList.remove("mad");
    }

    scrapsTalk("SEARCHING FOR FAKE ANSWER...");

    document.getElementById("resultBox").innerHTML = "";
    document.getElementById("score").textContent = score;
    document.getElementById("streak").textContent = streak;
    document.getElementById("roundNumber").textContent = roundNumber;

    

    const container = document.getElementById("factButtons");
    container.innerHTML = "";

    try {
        const response = await fetch(`/round?mode=${gameMode}`);
        currentRound = await response.json();

        if (
            !currentRound ||
            !Array.isArray(currentRound.facts) ||
            currentRound.facts.length !== 3 ||
            typeof currentRound.fakeIndex !== "number"
        ) {
            throw new Error("Bad round data");
        }

        scrapsTalk("I found 2 real answers and 1 scrap!");

        currentRound.facts.forEach((fact, index) => {
            const btn = document.createElement("button");

            btn.className = "factBtn";
            btn.textContent = fact;
            btn.onclick = () => checkAnswer(index, btn);

            container.appendChild(btn);
        });

    } catch (error) {
        console.error("Round load error:", error);
        scrapsTalk("My circuits jammed. Try again.");
    }

    
}

function scrapsTalk(text) {
    document.getElementById("scrapsText").textContent = text;
}

function scrapsGrumpy(text) {
    document.getElementById("scrapsText").textContent = text;
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
        scrapsTalk("Yay! More scrap for my scrap pile!");
        robotHappy();

    } else {
        streak = 0;

        playSound(wrongSound);

        button.classList.add("wrong");
        buttons[correct].classList.add("correct");

        scrapsGrumpy("That's not scrap! Your sensors need cleaning!");
        robotMad();
    }

    document.getElementById("resultBox").innerHTML =
        currentRound.explanation;

    document.getElementById("score").textContent = score;
    document.getElementById("streak").textContent = streak;
    document.getElementById("roundNumber").textContent = roundNumber;

    roundNumber++;

setTimeout(() => {
    nextRound();
}, 2200);
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

function saveHighScore() {
    const scores =
        JSON.parse(localStorage.getItem("scrapsLeaderboard")) || [];

    const lowestScore =
        scores.length < 5
            ? 0
            : scores[scores.length - 1].score;

    if (score <= lowestScore) {
        alert("Score too low for the scrap board!");
        return;
    }

    pendingHighScore = score;

    document.getElementById("playerNameInput").value = "";
    document.getElementById("nameError").textContent = "";
    document.getElementById("nameModal").classList.remove("hidden");
}

function submitHighScoreName() {
    const input = document.getElementById("playerNameInput");
    const error = document.getElementById("nameError");

    const name = input.value.trim();

    if (name.length < 2) {
        error.textContent = "Name needs at least 2 letters.";
        return;
    }

    if (hasBadWord(name)) {
        error.textContent = "No bad words allowed in the scrap yard.";
        return;
    }

    const scores =
        JSON.parse(localStorage.getItem("scrapsLeaderboard")) || [];

    scores.push({
        name: name.toUpperCase(),
        score: pendingHighScore
    });

    scores.sort((a, b) => b.score - a.score);

    const topScores = scores.slice(0, 5);

    localStorage.setItem(
        "scrapsLeaderboard",
        JSON.stringify(topScores)
    );

    pendingHighScore = null;

    closeNameModal();
    showLeaderboard();
}

function closeNameModal() {
    document.getElementById("nameModal").classList.add("hidden");
}

function showLeaderboard() {
    document.getElementById("modeScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("leaderboardScreen").classList.remove("hidden");

    const scores =
        JSON.parse(localStorage.getItem("scrapsLeaderboard")) || [];

    const list = document.getElementById("leaderboardList");

    if (scores.length === 0) {
        list.innerHTML = `
            <p class="empty-board">
                No scrap champions yet!
            </p>
        `;

        return;
    }

    list.innerHTML = scores
        .map((item, index) => `
            <div class="leaderboard-entry">
                <div class="leaderboard-rank">#${index + 1}</div>
                <div class="leaderboard-name">${item.name}</div>
                <div class="leaderboard-score">${item.score}</div>
            </div>
        `)
        .join("");
}

function quitGame() {
    if (score > 0) {
        saveHighScore();
        return;
    }

    backToMenu(true);
}

function backToMenu(resetGame) {
    document.getElementById("modeScreen").classList.remove("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("leaderboardScreen").classList.add("hidden");

    const modal = document.getElementById("nameModal");

    if (modal) {
        modal.classList.add("hidden");
    }

    if (resetGame) {
        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    answered = false;
}
