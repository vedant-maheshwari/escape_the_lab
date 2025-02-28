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
    levelFailureThreshold: 0.5,
    incorrectTopics: [],
    performanceScore: 0
};

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const configSection = document.getElementById('config-section');
    const gameArea = document.getElementById('game-area');
    const loader = document.getElementById('loader');
    const startButton = document.getElementById('start-game');
    const quitGameBtn = document.getElementById('quit-game');
    const errorMessage = document.getElementById('error-message');
    const questionsContainer = document.getElementById('questions-container');
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
    const statsTopic = document.getElementById('stats-topic');
    const statsDifficulty = document.getElementById('stats-difficulty');
    const statsLevels = document.getElementById('stats-levels');
    const statsCorrect = document.getElementById('stats-correct');
    const statsTime = document.getElementById('stats-time');
    const feedbackElement = document.getElementById('feedback');
    const progressChart = document.getElementById('progress-chart');

    // Set default values
    document.getElementById('difficulty').value = 'medium';
    document.getElementById('questionsPerLevel').value = '3';
    document.getElementById('totalLevels').value = '5';

    // Event Listeners
    startButton.addEventListener('click', startGame);
    quitGameBtn.addEventListener('click', quitGame);
    nextLevelBtn.addEventListener('click', loadNextLevel);
    retryLevelBtn.addEventListener('click', retryLevel);
    playAgainBtn.addEventListener('click', resetGame);

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => errorMessage.style.display = 'none', 5000);
    }

    // Update remaining questions counter
    function updateRemainingQuestions() {
        const remaining = gameState.questions.length - gameState.currentQuestion;
        remainingQuestionsElement.textContent = remaining === 1 ? '1 Question' : `${remaining} Questions`;
    }

    // Start the game
    function startGame() {
        gameState.topic = document.getElementById('topic').value.trim();
        gameState.difficulty = document.getElementById('difficulty').value;
        gameState.questionsPerLevel = parseInt(document.getElementById('questionsPerLevel').value);
        gameState.totalLevels = parseInt(document.getElementById('totalLevels').value);
        
        if (!gameState.topic) {
            alert('Please enter a subject area');
            return;
        }
        
        configSection.style.display = 'none';
        loader.style.display = 'block';
        errorMessage.style.display = 'none';
        
        gameState.startTime = new Date();
        loadLevel();
    }

    // Quit the game without losing scores
    function quitGame() {
        gameArea.style.display = 'none';
        configSection.style.display = 'block';
        gameState.questions = [];
        gameState.currentQuestion = 0;
    }

    // Load level questions
    async function loadLevel() {
        currentLevelElement.textContent = `Level ${gameState.currentLevel}`;
        progressFill.style.width = ((gameState.currentLevel - 1) / gameState.totalLevels * 100) + '%';
        
        gameState.currentQuestion = 0;
        gameState.questions = [];
        
        try {
            loader.style.display = 'block';
            const adjustedDifficulty = adjustDifficulty();
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: gameState.topic,
                    numQuestions: gameState.questionsPerLevel,
                    difficulty: adjustedDifficulty,
                    level: gameState.currentLevel,
                    performanceScore: gameState.performanceScore
                })
            });

            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

            const questionsData = await response.json();
            gameState.questions = questionsData.questions.map(q => ({
                ...q,
                topic: gameState.topic
            }));
            
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

    // Adjust difficulty based on performance
    function adjustDifficulty() {
        let baseDifficulty = gameState.difficulty;
        const perf = gameState.performanceScore;
        if (perf > 80) {
            if (baseDifficulty === 'easy') return 'medium';
            if (baseDifficulty === 'medium') return 'hard';
        } else if (perf < 50 && baseDifficulty !== 'easy') {
            if (baseDifficulty === 'hard') return 'medium';
            if (baseDifficulty === 'medium') return 'easy';
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
        
        question.options.forEach((option) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.setAttribute('data-option', option.charAt(0));
            optionElement.addEventListener('click', () => selectOption(optionElement, question.correct_answer, question.explanation));
            optionsContainer.appendChild(optionElement);
        });
        
        questionElement.appendChild(optionsContainer);
        questionsContainer.appendChild(questionElement);
        updateRemainingQuestions();
    }

    // Handle option selection with real-time feedback
    function selectOption(optionElement, correctAnswer, explanation) {
        if (optionElement.classList.contains('correct') || optionElement.classList.contains('incorrect')) return;
        
        const selectedOption = optionElement.getAttribute('data-option');
        const question = gameState.questions[gameState.currentQuestion];
        const isCorrect = selectedOption === correctAnswer;
        
        optionElement.classList.add('selected');
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            const optLetter = opt.getAttribute('data-option');
            if (optLetter === correctAnswer) opt.classList.add('correct');
            else if (opt === optionElement && !isCorrect) opt.classList.add('incorrect');
            opt.style.pointerEvents = 'none';
        });
        
        gameState.totalAnswers++;
        if (isCorrect) gameState.correctAnswers++;
        else gameState.incorrectTopics.push(question.topic);
        gameState.performanceScore = (gameState.correctAnswers / gameState.totalAnswers) * 100;

        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'explanation';
        explanationDiv.textContent = explanation || "No explanation provided.";
        questionsContainer.appendChild(explanationDiv);
        
        setTimeout(() => {
            gameState.currentQuestion++;
            if (gameState.currentQuestion < gameState.questions.length) displayQuestion();
            else finishLevel();
        }, 3000);
    }

    // Finish level
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
        gameState.currentQuestion = 0;
        gameState.questions = [];
        loadLevel();
    }

    // Show game over screen with feedback and progress chart
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
        
        feedbackElement.textContent = generateFeedback();
        saveQuizData();
        displayProgressChart();
    }

    // Generate feedback
    function generateFeedback() {
        const weakTopics = [...new Set(gameState.incorrectTopics)];
        const improvement = getImprovement();
        let feedback = '';
        
        if (weakTopics.length > 0) {
            feedback += `You struggled with: ${weakTopics.join(', ')}. Review these topics for improvement. `;
        } else {
            feedback += `Perfect! You nailed every question. Keep it up! `;
        }
        
        if (improvement !== null) {
            feedback += `Your performance ${improvement >= 0 ? 'improved' : 'decreased'} by ${Math.abs(improvement)}% since your last quiz.`;
        } else {
            feedback += `First quiz on this topic—great start!`;
        }
        
        return feedback;
    }

    // Calculate improvement
    function getImprovement() {
        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        const previousQuizzes = history.filter(q => q.topic === gameState.topic);
        if (previousQuizzes.length > 0) {
            const lastQuiz = previousQuizzes[previousQuizzes.length - 1];
            const lastCorrectRate = lastQuiz.correctAnswers / lastQuiz.totalQuestions;
            const currentCorrectRate = gameState.correctAnswers / gameState.totalAnswers;
            return ((currentCorrectRate - lastCorrectRate) * 100).toFixed(2);
        }
        return null;
    }

    // Save quiz data
    function saveQuizData() {
        const quizData = {
            topic: gameState.topic,
            correctAnswers: gameState.correctAnswers,
            totalQuestions: gameState.totalAnswers,
            date: new Date().toISOString()
        };
        let history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        history.push(quizData);
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    // Display progress chart
    function displayProgressChart() {
        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        const topicHistory = history.filter(h => h.topic === gameState.topic);
        if (topicHistory.length > 0) {
            const ctx = document.createElement('canvas');
            progressChart.innerHTML = '';
            progressChart.appendChild(ctx);
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: topicHistory.map(h => h.date.split('T')[0]),
                    datasets: [{
                        label: 'Accuracy (%)',
                        data: topicHistory.map(h => (h.correctAnswers / h.totalQuestions) * 100),
                        borderColor: '#8a0303',
                        fill: false
                    }]
                },
                options: {
                    scales: {
                        y: { beginAtZero: true, max: 100 }
                    }
                }
            });
        }
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
            levelFailureThreshold: 0.5,
            incorrectTopics: [],
            performanceScore: 0
        };
        document.getElementById('topic').value = '';
        document.getElementById('difficulty').value = 'medium';
        document.getElementById('questionsPerLevel').value = '3';
        document.getElementById('totalLevels').value = '5';
    }
});