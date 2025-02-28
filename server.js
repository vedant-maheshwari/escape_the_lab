const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware to parse JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from the current directory
app.use(express.static(path.join(__dirname)));

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to generate content from the LLM
const generate = async (prompt) => {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
};

// API endpoint to generate questions
app.post('/api/questions', async (req, res) => {
    const { topic, numQuestions, difficulty, level } = req.body;

    if (!topic || !numQuestions || !difficulty || !level) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const difficultyLevel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    const prompt = `
        Generate ${numQuestions} multiple-choice questions about ${topic} at a ${difficultyLevel} difficulty level.

        For each question:
        1. Make the question appropriate for Level ${level} (where higher levels are more challenging)
        2. Provide exactly 4 answer choices labeled A, B, C, and D
        3. Indicate which letter is the correct answer
        4. Format the response as a JSON array of objects with structure:
           {
             "question": "The question text",
             "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
             "correct_answer": "A" (just the letter)
           }
        5. Also include a "level_description" field with a short atmospheric description for Level ${level} of a mysterious laboratory-themed escape room game.
    `;

    try {
        const result = await generate(prompt);
        // Parse the response assuming it’s a valid JSON string
        let jsonResponse;
        try {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonResponse = JSON.parse(jsonMatch[0]);
            } else {
                jsonResponse = JSON.parse(result);
            }

            let levelDescription = "";
            const descMatch = result.match(/"level_description":\s*"([^"]*)"/);
            if (descMatch && descMatch[1]) {
                levelDescription = descMatch[1];
            } else {
                // Fallback description if not provided
                levelDescription = `Level ${level}: The laboratory grows more ominous as you progress deeper.`;
            }

            res.json({
                questions: jsonResponse,
                level_description: levelDescription
            });
        } catch (parseError) {
            console.error("Failed to parse LLM response:", parseError);
            res.status(500).json({ error: "Failed to parse response from LLM" });
        }
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: "Failed to generate questions" });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});