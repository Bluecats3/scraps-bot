console.log("SCRAPS BOT LOADED");

let score = 0;
let streak = 0;
let roundNumber = 1;
let currentRound = null;
let answered = false;
let gameMode = "facts";

let currentRequestId = 0;
let isLoadingRound = false;

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

    currentRequestId++;

    gameMode = mode;

    introSound.currentTime = 0;
    introSound.play().catch(() => {});

    document.getElementById("modeScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");

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

        // cancel old requests
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

        // clear again just in case
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

function scrapsTalk(text) {
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

        if (!document.getElementById("gameScreen").classList.contains("hidden")) {
            nextRound();
        }

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

function backToMenu(resetGame = false) {

    // invalidate all loading requests
    currentRequestId++;

    isLoadingRound = false;

    document.getElementById("modeScreen").classList.remove("hidden");

    document.getElementById("gameScreen").classList.add("hidden");

    document.getElementById("factButtons").innerHTML = "";

    document.getElementById("resultBox").innerHTML = "";

    if (resetGame) {

        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    answered = false;
}
