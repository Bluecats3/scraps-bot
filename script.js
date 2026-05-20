console.log("PROFESSOR SCRAPS AI MODE LOADED");

/* ========================= */
/* GAME STATE */
/* ========================= */

let score = 0;
let streak = 0;
let roundNumber = 1;

let currentRound = null;

let answered = false;

let gameMode = "facts";

/* ========================= */
/* ROBOT */
/* ========================= */

function getActiveRobot() {
    return document.querySelector("#gameScreen .robot");
}

/* ========================= */
/* START GAME */
/* ========================= */

function startGame(mode) {

    gameMode = mode;

    document
        .getElementById("modeScreen")
        .classList.add("hidden");

    document
        .getElementById("leaderboardScreen")
        .classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.remove("hidden");

    score = 0;
    streak = 0;
    roundNumber = 1;

    nextRound();
}

/* ========================= */
/* NEXT ROUND */
/* ========================= */

async function nextRound() {

    answered = false;

    const robot = getActiveRobot();

    if (robot) {
        robot.classList.remove("happy");
        robot.classList.remove("mad");
    }

    scrapsTalk(
        "Professor Scraps is digging through the scrap pile..."
    );

    document.getElementById("resultBox").innerHTML = "";

    document.getElementById("score").textContent =
        score;

    document.getElementById("streak").textContent =
        streak;

    document.getElementById("roundNumber").textContent =
        roundNumber;

    const nextBtn =
        document.getElementById("nextBtn");

    /* HIDE BUTTON WHILE LOADING */

    nextBtn.style.display = "none";

    const container =
        document.getElementById("factButtons");

    container.innerHTML = "";

    try {

        const response =
            await fetch(`/round?mode=${gameMode}`);

        currentRound = await response.json();

        if (
            !currentRound ||
            !Array.isArray(currentRound.facts) ||
            currentRound.facts.length !== 3 ||
            typeof currentRound.fakeIndex !== "number"
        ) {
            throw new Error("Bad round data");
        }

        scrapsTalk(
            "I found 2 real answers and 1 scrap!"
        );

        currentRound.facts.forEach((fact, index) => {

            const btn =
                document.createElement("button");

            btn.className = "factBtn";

            btn.textContent = fact;

            btn.onclick = () =>
                checkAnswer(index, btn);

            container.appendChild(btn);
        });

    } catch (error) {

        console.error(
            "Round load error:",
            error
        );

        scrapsTalk(
            "My circuits jammed. Try again."
        );
    }

    /* SHOW BUTTON AGAIN */

   nextBtn.style.display = "";
}

/* ========================= */
/* ROBOT TALK */
/* ========================= */

function scrapsTalk(text) {

    document.getElementById("scrapsText")
        .textContent = text;
}

function scrapsGrumpy(text) {

    document.getElementById("scrapsText")
        .textContent = text;
}

/* ========================= */
/* CHECK ANSWER */
/* ========================= */

function checkAnswer(index, button) {

    if (answered) return;

    answered = true;

    const buttons =
        document.querySelectorAll(".factBtn");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    const correct =
        currentRound.fakeIndex;

    /* CORRECT */

    if (index === correct) {

        score++;
        streak++;

        button.classList.add("correct");

        scrapsTalk(
            "Yay! More scrap for my scrap pile!"
        );

        robotHappy();

    }

    /* WRONG */

    else {

        streak = 0;

        button.classList.add("wrong");

        buttons[correct]
            .classList.add("correct");

        scrapsGrumpy(
            "That's not scrap! Your sensors need cleaning!"
        );

        robotMad();
    }

    /* EXPLANATION */

    document.getElementById("resultBox")
        .innerHTML =
        currentRound.explanation;

    /* UPDATE SCORE */

    document.getElementById("score")
        .textContent = score;

    document.getElementById("streak")
        .textContent = streak;

    document.getElementById("roundNumber")
        .textContent = roundNumber;

    roundNumber++;

    /* SHOW NEXT BUTTON */

    document.getElementById("nextBtn")
        .disabled = false;

    /* SAVE HIGH SCORE */

    
}

/* ========================= */
/* HAPPY ROBOT */
/* ========================= */

function robotHappy() {

    const robot = getActiveRobot();

    if (!robot) return;

    robot.classList.remove("mad");

    robot.classList.add("happy");

    setTimeout(() => {

        robot.classList.remove("happy");

    }, 900);
}

/* ========================= */
/* MAD ROBOT */
/* ========================= */

function robotMad() {

    const robot = getActiveRobot();

    if (!robot) return;

    robot.classList.remove("happy");

    robot.classList.add("mad");

    setTimeout(() => {

        robot.classList.remove("mad");

    }, 500);
}

/* ========================= */
/* SAVE HIGH SCORE */
/* ========================= */

function saveHighScore() {

    const scores =
        JSON.parse(
            localStorage.getItem(
                "scrapsLeaderboard"
            )
        ) || [];

    const lowestScore =
        scores.length < 5
            ? 0
            : scores[scores.length - 1].score;

    if (score <= lowestScore) return;

    const alreadyExists =
        scores.some(
            item =>
                item.name === "PLAYER" &&
                item.score === score
        );

    if (alreadyExists) return;

    const name =
        prompt(
            "New high score! Enter your name:"
        );

    if (!name) return;

    scores.push({
        name: name,
        score: score
    });

    scores.sort((a, b) =>
        b.score - a.score
    );

    const topScores =
        scores.slice(0, 5);

    localStorage.setItem(
        "scrapsLeaderboard",
        JSON.stringify(topScores)
    );
}

/* ========================= */
/* SHOW LEADERBOARD */
/* ========================= */

function showLeaderboard() {

    document
        .getElementById("modeScreen")
        .classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.add("hidden");

    document
        .getElementById("leaderboardScreen")
        .classList.remove("hidden");

    const scores =
        JSON.parse(
            localStorage.getItem(
                "scrapsLeaderboard"
            )
        ) || [];

    const list =
        document.getElementById(
            "leaderboardList"
        );

    /* EMPTY */

    if (scores.length === 0) {

        list.innerHTML = `
            <p class="empty-board">
                No scrap champions yet!
            </p>
        `;

        return;
    }

    /* SHOW SCORES */

    list.innerHTML = scores
        .map((item, index) => `
            <div class="leaderboard-entry">

                <div class="leaderboard-rank">
                    #${index + 1}
                </div>

                <div class="leaderboard-name">
                    ${item.name}
                </div>

                <div class="leaderboard-score">
                    ${item.score}
                </div>

            </div>
        `)
        .join("");
}

function quitGame() {

    if (score > 0) {

        const save =
            confirm(
                `Your score is ${score}.\n\nSave to leaderboard before quitting?`
            );

        if (save) {
            saveHighScore();
        }
    }

    backToMenu(true);
}

/* ========================= */
/* MENU */
/* ========================= */

function backToMenu(resetGame) {

    document
        .getElementById("modeScreen")
        .classList.remove("hidden");

    document
        .getElementById("gameScreen")
        .classList.add("hidden");

    document
        .getElementById("leaderboardScreen")
        .classList.add("hidden");

    if (resetGame) {

        score = 0;
        streak = 0;
        roundNumber = 1;
    }

    answered = false;
}
