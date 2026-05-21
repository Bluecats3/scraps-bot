const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 3000;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env file");
}

const usedFacts = [];
const rooms = {};

const fallbackRounds = {
    science: [
        {
            facts: [
                "Your heart beats about 100,000 times a day.",
                "Lightning is hotter than the Sun's surface.",
                "Humans can breathe safely in outer space."
            ],
            fakeIndex: 2,
            explanation: "Space has no breathable air for humans."
        }
    ],
    history: [
        {
            facts: [
                "Ancient Egyptians built pyramids.",
                "The Great Wall is in China.",
                "Dinosaurs helped build the Roman roads."
            ],
            fakeIndex: 2,
            explanation: "Dinosaurs lived long before humans."
        }
    ],
    animals: [
        {
            facts: [
                "Octopuses have three hearts.",
                "Butterflies taste with their feet.",
                "Bananas grow on pine trees."
            ],
            fakeIndex: 2,
            explanation: "Bananas grow on large herb plants."
        }
    ],
    interesting: [
        {
            facts: [
                "Honey can stay good for thousands of years.",
                "Sharks existed before trees.",
                "Clouds are made of cotton candy."
            ],
            fakeIndex: 2,
            explanation: "Clouds are made of tiny water droplets or ice."
        }
    ]
};

function createRoomCode() {
    return Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
}

function getModeRules(mode) {
    if (mode === "science") {
        return `
Topic: science, human body, nature, space, and technology.
Make 3 kid-friendly science facts.
Exactly 2 statements are true.
Exactly 1 statement is fake.
`;
    }

    if (mode === "history") {
        return `
Topic: history, geography, ancient places, famous people, inventions, and world events.
Make 3 kid-friendly history or geography facts.
Exactly 2 statements are true.
Exactly 1 statement is fake.
`;
    }

    if (mode === "animals") {
        return `
Topic: animals, food, drinks, plants, trees, and nature.
Make 3 kid-friendly animal or nature facts.
Exactly 2 statements are true.
Exactly 1 statement is fake.
`;
    }

    return `
Topic: interesting, fun, weird, surprising, and strange-but-true facts.
Make 3 kid-friendly interesting facts.
Exactly 2 statements are true.
Exactly 1 statement is fake.
`;
}

async function generateRound(mode = "interesting") {
    const modeRules = getModeRules(mode);

    try {
        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            temperature: 1.1,
            input: `
Create one kid-friendly Scraps Bot game round.

Mode:
${mode}

Mode rules:
${modeRules}

General rules:
- Return ONLY valid JSON.
- No markdown.
- No extra text.
- Make exactly 3 options.
- Exactly 2 options must be true.
- Exactly 1 option must be fake scrap.
- Safe for kids.
- No scary, violent, political, adult, or gross content.
- Keep each option under 15 words.
- Explanation must be under 20 words.
- Make the fake answer believable but clearly false.
- Do not repeat facts.
- Avoid these already-used options:

${usedFacts.slice(-60).map(f => `- ${f}`).join("\n")}

JSON format:
{
  "facts": ["option 1", "option 2", "option 3"],
  "fakeIndex": 0,
  "explanation": "short explanation"
}
`
        });

        const text =
            response.output?.[0]?.content?.[0]?.text || "";

        const round = JSON.parse(text);

        if (
            !Array.isArray(round.facts) ||
            round.facts.length !== 3 ||
            typeof round.fakeIndex !== "number" ||
            round.fakeIndex < 0 ||
            round.fakeIndex > 2 ||
            typeof round.explanation !== "string"
        ) {
            throw new Error("Invalid round format");
        }

        usedFacts.push(...round.facts);

        if (usedFacts.length > 100) {
            usedFacts.splice(0, usedFacts.length - 100);
        }

        return round;

    } catch (error) {
        console.error("Round generation error:", error.message);

        const modeFallbacks =
            fallbackRounds[mode] || fallbackRounds.interesting;

        return modeFallbacks[
            Math.floor(Math.random() * modeFallbacks.length)
        ];
    }
}

app.get("/round", async (req, res) => {
    const mode = req.query.mode || "interesting";
    const round = await generateRound(mode);
    res.json(round);
});

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("createRoom", (playerName) => {
        const code = createRoomCode();

        rooms[code] = {
            players: [],
            scores: {},
            currentRound: null,
            mode: "interesting"
        };

        socket.join(code);

        rooms[code].players.push({
            id: socket.id,
            name: playerName || "Player"
        });

        rooms[code].scores[socket.id] = 0;

        socket.emit("roomCreated", code);
        io.to(code).emit("playersUpdated", rooms[code].players);
        io.to(code).emit("scoreUpdated", rooms[code].scores);

        console.log("Room created:", code);
    });

    socket.on("joinRoom", ({ code, playerName }) => {
        code = code.toUpperCase();

        if (!rooms[code]) {
            socket.emit("errorMessage", "Room not found");
            return;
        }

        socket.join(code);

        rooms[code].players.push({
            id: socket.id,
            name: playerName || "Player"
        });

        rooms[code].scores[socket.id] = 0;

        socket.emit("roomJoined", code);
        io.to(code).emit("playersUpdated", rooms[code].players);
        io.to(code).emit("scoreUpdated", rooms[code].scores);

        console.log(playerName, "joined", code);
    });

    socket.on("startRound", async ({ code, mode }) => {
        code = code.toUpperCase();

        if (!rooms[code]) {
            socket.emit("errorMessage", "Room not found");
            return;
        }

        const round = await generateRound(mode || rooms[code].mode || "interesting");

        rooms[code].currentRound = round;
        rooms[code].mode = mode || "interesting";

        io.to(code).emit("newRound", round);
    });

    socket.on("submitAnswer", ({ code, answerIndex }) => {
        code = code.toUpperCase();

        const room = rooms[code];

        if (!room || !room.currentRound) return;

        const round = room.currentRound;
        const correct = answerIndex === round.fakeIndex;

        if (correct) {
            room.scores[socket.id]++;
        }

        io.to(code).emit("scoreUpdated", room.scores);

        socket.emit("answerResult", {
            correct,
            explanation: round.explanation
        });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);

        for (const code in rooms) {
            rooms[code].players = rooms[code].players.filter(
                player => player.id !== socket.id
            );

            delete rooms[code].scores[socket.id];

            io.to(code).emit("playersUpdated", rooms[code].players);
            io.to(code).emit("scoreUpdated", rooms[code].scores);

            if (rooms[code].players.length === 0) {
                delete rooms[code];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Scraps Bot multiplayer server running on port ${PORT}`);
});
