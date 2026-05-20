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
    facts: [
        {
            facts: [
                "Sharks existed before trees.",
                "Butterflies taste with their feet.",
                "The Moon is made of frozen cheese."
            ],
            fakeIndex: 2,
            explanation: "The Moon is rock, not cheese."
        }
    ],

    math: [
        {
            facts: [
                "4 + 5 = 9",
                "10 - 3 = 7",
                "6 × 2 = 15"
            ],
            fakeIndex: 2,
            explanation: "6 times 2 equals 12."
        }
    ],

    grammar: [
        {
            facts: [
                "The dog runs fast.",
                "She has a red backpack.",
                "They is going home."
            ],
            fakeIndex: 2,
            explanation: "Use 'They are,' not 'They is.'"
        }
    ]
};

function getModeRules(mode) {
    if (mode === "math") {
        return `
Make 3 simple math equations for kids.
Exactly 2 equations are correct.
Exactly 1 equation is wrong.
Use +, -, or × only.
`;
    }

    if (mode === "grammar") {
        return `
Make 3 short sentences for kids.
Exactly 2 sentences have correct grammar.
Exactly 1 sentence has bad grammar.
`;
    }

    return `
Make 3 weird educational statements.
Exactly 2 statements are true.
Exactly 1 statement is fake.
`;
}

app.get("/round", async (req, res) => {
    const mode = req.query.mode || "facts";
    const modeRules = getModeRules(mode);

    try {
        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            temperature: 1.1,
            input: `
Create one kid-friendly Professor Scraps game round.

Mode:
${mode}

Mode rules:
${modeRules}

General rules:
- Return ONLY valid JSON.
- No markdown.
- No extra text.
- Make exactly 3 options.
- Exactly 2 options must be correct.
- Exactly 1 option must be scrap.
- Safe for kids.
- Keep each option under 15 words.
- Explanation must be under 20 words.
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
            fallbackRounds[mode] || fallbackRounds.facts;

        const fallback =
            modeFallbacks[
                Math.floor(Math.random() * modeFallbacks.length)
            ];

        res.json(fallback);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Professor Scraps running on port ${PORT}`);
});
