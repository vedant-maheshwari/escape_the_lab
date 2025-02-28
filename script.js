// Game state
let gameState = {
    topic: '',
    difficulty: 'medium',
    questionsPerLevel: 3,
    totalLevels: 5,
    currentLevel: 1,
    currentQuestion: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    questions: [],
    startTime: null,
    levelFailureThreshold: 0.5 // Need 50% correct to pass
};

// DOM Elements - Get them when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    const configSection = document.getElementById('config-section');
    const gameArea = document.getElementById('game-area');
    const loader = document.getElementById('loader');
    const startButton = document.getElementById('start-game');
    const errorMessage = document.getElementById('error-message');
    const questionsContainer = document.getElementById('questions-container');
    const levelDescription = document.getElementById('level-description');
    const currentLevelElement = document.getElementById('current-level');
    const remainingQuestionsElement = document.getElementById('remaining-questions');
    const progressFill = document.getElementById('progress-fill');
    const door = document.getElementById('door');
    const doorText = document.getElementById('door-text');
    const nextLevelSection = document.getElementById('next-level');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const levelFailedSection = document.getElementById('level-failed');
    const retryLevelBtn = document.getElementById('retry-level');
    const gameOverSection = document.getElementById('game-over');
    const playAgainBtn = document.getElementById('play-again');

    // Stats elements
    const statsTopic = document.getElementById('stats-topic');
    const statsDifficulty = document.getElementById('stats-difficulty');
    const statsLevels = document.getElementById('stats-levels');
    const statsCorrect = document.getElementById('stats-correct');
    const statsTime = document.getElementById('stats-time');
    
    // Set default values
    document.getElementById('difficulty').value = 'medium';
    document.getElementById('questionsPerLevel').value = '3';
    document.getElementById('totalLevels').value = '5';

    // Event Listeners
    startButton.addEventListener('click', startGame);
    nextLevelBtn.addEventListener('click', loadNextLevel);
    retryLevelBtn.addEventListener('click', retryLevel);
    playAgainBtn.addEventListener('click', resetGame);

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Update remaining questions counter
    function updateRemainingQuestions() {
        const remaining = gameState.questions.length - gameState.currentQuestion;
        remainingQuestionsElement.textContent = remaining === 1 ? 
            '1 Question' : `${remaining} Questions`;
    }

    // Start the game
    function startGame() {
        console.log("Start game button clicked");
        
        gameState.topic = document.getElementById('topic').value.trim();
        gameState.difficulty = document.getElementById('difficulty').value;
        gameState.questionsPerLevel = parseInt(document.getElementById('questionsPerLevel').value);
        gameState.totalLevels = parseInt(document.getElementById('totalLevels').value);
        
        if (!gameState.topic) {
            alert('Please enter a subject area');
            return;
        }
        
        console.log("Topic:", gameState.topic);
        console.log("Difficulty:", gameState.difficulty);
        console.log("Questions Per Level:", gameState.questionsPerLevel);
        console.log("Total Levels:", gameState.totalLevels);
        
        if (!configSection || !loader || !gameArea) {
            console.error("Missing required DOM elements");
            return;
        }
        
        configSection.style.display = 'none';
        loader.style.display = 'block';
        errorMessage.style.display = 'none';
        
        gameState.startTime = new Date();
        loadLevel();
    }

    // Load level questions
    async function loadLevel() {
        currentLevelElement.textContent = `Level ${gameState.currentLevel}`;
        progressFill.style.width = ((gameState.currentLevel - 1) / gameState.totalLevels * 100) + '%';
        
        gameState.currentQuestion = 0;
        gameState.correctAnswers = 0;
        
        try {
            loader.style.display = 'block';
            
            // Fetch questions from the server
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: gameState.topic,
                    numQuestions: gameState.questionsPerLevel,
                    difficulty: adjustDifficulty(),
                    level: gameState.currentLevel
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const questionsData = await response.json();
            
            gameState.questions = questionsData.questions;
            levelDescription.textContent = questionsData.level_description || 
                `Level ${gameState.currentLevel}: The laboratory grows more ominous as you progress deeper.`;
            
            displayQuestion();
            
            loader.style.display = 'none';
            gameArea.style.display = 'block';
            levelFailedSection.style.display = 'none';
            nextLevelSection.style.display = 'none';
            door.classList.remove('door-open');
            doorText.textContent = 'LOCKED';
            
            updateRemainingQuestions();
        } catch (error) {
            console.error("Failed to load level:", error);
            showError("Failed to load questions. Please try again.");
            loader.style.display = 'none';
            configSection.style.display = 'block';
        }
    }

    // Adjust difficulty based on level
    function adjustDifficulty() {
        const baseDifficulty = gameState.difficulty;
        if (gameState.currentLevel > 3) {
            if (baseDifficulty === 'easy') return 'medium';
            if (baseDifficulty === 'medium') return 'hard';
        }
        return baseDifficulty;
    }

    // Display current question
    function displayQuestion() {
        const question = gameState.questions[gameState.currentQuestion];
        questionsContainer.innerHTML = '';
        
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = `${gameState.currentQuestion + 1}. ${question.question}`;
        questionElement.appendChild(questionText);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options';
        
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.setAttribute('data-option', option.charAt(0));
            optionElement.addEventListener('click', () => selectOption(optionElement, question.correct_answer));
            optionsContainer.appendChild(optionElement);
        });
        
        questionElement.appendChild(optionsContainer);
        questionsContainer.appendChild(questionElement);
        
        updateRemainingQuestions();
    }

    // Handle option selection
    function selectOption(optionElement, correctAnswer) {
        if (optionElement.classList.contains('correct') || 
            optionElement.classList.contains('incorrect')) {
            return;
        }
        
        const selectedOption = optionElement.getAttribute('data-option');
        const isCorrect = selectedOption === correctAnswer;
        
        optionElement.classList.add('selected');
        
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            const optionLetter = option.getAttribute('data-option');
            if (optionLetter === correctAnswer) {
                option.classList.add('correct');
            } else if (option === optionElement && !isCorrect) {
                option.classList.add('incorrect');
            }
            option.style.pointerEvents = 'none';
        });
        
        if (isCorrect) {
            gameState.correctAnswers++;
        }
        gameState.totalAnswers++;
        
        setTimeout(() => {
            gameState.currentQuestion++;
            if (gameState.currentQuestion < gameState.questions.length) {
                displayQuestion();
            } else {
                finishLevel();
            }
        }, 1500);
    }

    // Finish level and check if passed
    function finishLevel() {
        const successRate = gameState.correctAnswers / gameState.questions.length;
        const passed = successRate >= gameState.levelFailureThreshold;
        
        if (passed) {
            door.classList.add('door-open');
            doorText.textContent = 'UNLOCKED';
            nextLevelSection.style.display = 'block';
            questionsContainer.innerHTML = '';
            remainingQuestionsElement.textContent = 'Level Complete!';
            progressFill.style.width = (gameState.currentLevel / gameState.totalLevels * 100) + '%';
        } else {
            levelFailedSection.style.display = 'block';
            questionsContainer.innerHTML = '';
            remainingQuestionsElement.textContent = 'Level Failed!';
        }
    }

    // Load next level
    function loadNextLevel() {
        if (gameState.currentLevel >= gameState.totalLevels) {
            showGameOver();
            return;
        }
        
        gameState.currentLevel++;
        gameArea.style.display = 'none';
        loader.style.display = 'block';
        loadLevel();
    }

    // Retry current level
    function retryLevel() {
        gameArea.style.display = 'none';
        loader.style.display = 'block';
        loadLevel();
    }

    // Show game over screen
    function showGameOver() {
        gameArea.style.display = 'none';
        gameOverSection.style.display = 'block';
        
        const endTime = new Date();
        const timeElapsed = Math.floor((endTime - gameState.startTime) / 1000);
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        
        statsTopic.textContent = gameState.topic;
        statsDifficulty.textContent = gameState.difficulty;
        statsLevels.textContent = gameState.totalLevels;
        statsCorrect.textContent = `${gameState.correctAnswers}/${gameState.totalAnswers}`;
        statsTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Reset game
    function resetGame() {
        gameOverSection.style.display = 'none';
        configSection.style.display = 'block';
        
        gameState = {
            topic: '',
            difficulty: 'medium',
            questionsPerLevel: 3,
            totalLevels: 5,
            currentLevel: 1,
            currentQuestion: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            questions: [],
            startTime: null,
            levelFailureThreshold: 0.5
        };
        
        document.getElementById('topic').value = '';
        document.getElementById('difficulty').value = 'medium';
        document.getElementById('questionsPerLevel').value = '3';
        document.getElementById('totalLevels').value = '5';
    }
});