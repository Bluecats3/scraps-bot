const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env file");
}

const usedFacts = [];

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

app.get("/round", async (req, res) => {
    const mode = req.query.mode || "interesting";
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

        res.json(round);

    } catch (error) {
        console.error("Round generation error:", error.message);

        const modeFallbacks =
            fallbackRounds[mode] || fallbackRounds.interesting;

        const fallback =
            modeFallbacks[
                Math.floor(Math.random() * modeFallbacks.length)
            ];

        res.json(fallback);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Scraps Bot running on port ${PORT}`);
});
