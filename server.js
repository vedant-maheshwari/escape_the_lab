const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generate = async (prompt) => {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
};

app.post('/api/questions', async (req, res) => {
    const { topic, numQuestions, difficulty, level, performanceScore } = req.body;

    if (!topic || !numQuestions || !difficulty || !level) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const difficultyLevel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    let difficultyAdjustment = '';
    if (performanceScore) {
        if (performanceScore > 80) difficultyAdjustment = ' (slightly harder)';
        else if (performanceScore < 50) difficultyAdjustment = ' (slightly easier)';
    }

    const prompt = `
        Generate ${numQuestions} multiple-choice questions about ${topic} at a ${difficultyLevel}${difficultyAdjustment} difficulty level.

        For each question:
        1. Make the question appropriate for Level ${level} (higher levels are more challenging)
        2. Provide exactly 4 answer choices labeled A, B, C, and D
        3. Indicate which letter is the correct answer
        4. Include a short explanation (20-30 words) of why the correct answer is correct
        5. Format the response as a JSON array of objects with structure:
           {
             "question": "The question text",
             "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
             "correct_answer": "A",
             "explanation": "Explanation text"
           }
    `;

    try {
        const result = await generate(prompt);
        let jsonResponse;
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonResponse = JSON.parse(jsonMatch[0]);
        else jsonResponse = JSON.parse(result);

        res.json({
            questions: jsonResponse
        });
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: "Failed to generate questions" });
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});