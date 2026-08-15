const QuizView = {
  async render(container, params) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const quizId = params.id;
    const userId = AppState.currentUser.id;
    const courses = await API.getCourses();

    // Find matching course and quiz
    let targetCourse = null;
    let quiz = null;

    for (const c of courses) {
      const q = c.quizzes?.find(x => x.id === quizId);
      if (q) {
        targetCourse = c;
        quiz = q;
        break;
      }
    }

    if (!quiz || !targetCourse) {
      container.innerHTML = `
        <div style="padding: var(--spacing-xl); text-align: center;" class="card">
          <h2>Quiz not found</h2>
          <p style="color: var(--text-secondary);">The requested quiz ID does not exist.</p>
          <a href="#/dashboard" class="btn btn-primary btn-sm" style="margin-top: var(--spacing-lg);">Back to Dashboard</a>
        </div>
      `;
      return;
    }

    let currentQuestionIndex = 0;
    let score = 0; // count of correct answers
    const questions = quiz.questions;

    const renderQuestion = () => {
      const q = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex === questions.length - 1;

      container.innerHTML = `
        <div class="quiz-container card">
          <div class="card-header">
            <span class="badge badge-primary">${escapeHTML(quiz.title)}</span>
            <span class="quiz-progress" style="font-weight: 600;">Question ${currentQuestionIndex + 1} of ${questions.length}</span>
          </div>

          <div class="card-body quiz-question-box">
            <div class="quiz-question-text">${escapeHTML(q.question)}</div>
            
            <div class="quiz-options-list" id="quiz-options-box">
              ${q.options.map((opt, idx) => `
                <button class="quiz-option-btn" data-idx="${idx}">
                  <span>${escapeHTML(opt)}</span>
                  <i class="fa-regular fa-circle" id="icon-${idx}"></i>
                </button>
              `).join('')}
            </div>

            <!-- Explanation box (hidden by default) -->
            <div class="quiz-explanation-box" id="quiz-explanation-feed" style="display: none; margin-top: var(--spacing-lg);">
              <strong>Explanation:</strong> <span id="explanation-text-content">${escapeHTML(q.explanation)}</span>
            </div>
          </div>

          <div class="card-footer" style="border: none; padding-top: 0; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" id="quiz-next-btn" style="display: none;">
              ${isLastQuestion ? 'View Results' : 'Next Question <i class="fa-solid fa-arrow-right"></i>'}
            </button>
          </div>
        </div>
      `;

      // Bind choice click events
      const optionButtons = container.querySelectorAll('.quiz-option-btn');
      const nextBtn = container.querySelector('#quiz-next-btn');
      const explanationFeed = container.querySelector('#quiz-explanation-feed');

      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const selectedIdx = parseInt(btn.getAttribute('data-idx'));
          const correctIdx = q.correctAnswerIndex;
          
          // Disable all buttons
          optionButtons.forEach(b => b.disabled = true);
          
          // Highlight correct / wrong answers
          optionButtons.forEach((b, idx) => {
            const icon = b.querySelector(`#icon-${idx}`);
            if (idx === correctIdx) {
              b.classList.add('correct');
              icon.className = 'fa-solid fa-circle-check';
            } else if (idx === selectedIdx) {
              b.classList.add('wrong');
              icon.className = 'fa-solid fa-circle-xmark';
            }
          });

          if (selectedIdx === correctIdx) {
            score++;
          }

          // Show explanation
          explanationFeed.style.display = 'block';
          
          // Show next question button
          nextBtn.style.display = 'inline-flex';
        });
      });

      // Next Question action
      nextBtn.addEventListener('click', () => {
        if (isLastQuestion) {
          renderResults();
        } else {
          currentQuestionIndex++;
          renderQuestion();
        }
      });
    };

    const renderResults = async () => {
      const percentage = Math.round((score / questions.length) * 100);
      
      container.innerHTML = `
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span style="font-size: 13px; color: var(--text-muted);">Saving your score...</span>
        </div>
      `;

      // Submit score to backend
      let xpEarned = 0;
      let leveledUp = false;
      let user = null;

      try {
        const res = await API.submitQuizScore(userId, targetCourse.id, quiz.id, percentage);
        xpEarned = res.xpEarned;
        leveledUp = res.leveledUp;
        user = res.user;
        
        // Update global AppState user reference
        if (user) {
          AppState.setUser(user);
        }
      } catch (e) {
        console.error('Quiz submission error:', e);
      }

      let headerFeedback = 'Keep Learning!';
      let accentClass = 'badge-warning';
      if (percentage === 100) {
        headerFeedback = 'Perfect Score!';
        accentClass = 'badge-success';
      } else if (percentage >= 70) {
        headerFeedback = 'Great Job!';
        accentClass = 'badge-primary';
      }

      container.innerHTML = `
        <div class="quiz-container card quiz-results-card">
          <span class="badge ${accentClass}" style="margin-bottom: var(--spacing-md);">${headerFeedback}</span>
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: var(--spacing-md);">Quiz Finished</h2>

          <div class="quiz-percentage-circle" style="border-color: ${percentage >= 70 ? 'var(--success)' : 'var(--danger)'};">
            ${percentage}%
            <span>Score</span>
          </div>

          <p style="color: var(--text-secondary); font-size: 14px; max-width: 400px; margin-bottom: var(--spacing-lg);">
            You answered <strong>${score} out of ${questions.length}</strong> questions correctly.
            ${xpEarned > 0 
              ? `<br><span style="color: var(--success); font-weight: 700;"><i class="fa-solid fa-star"></i> +${xpEarned} XP Awarded!</span>` 
              : '<br><span style="color: var(--text-muted);">Review lessons and retry to improve your score.</span>'
            }
            ${leveledUp ? `<br><span style="color: var(--primary); font-weight: 700;"><i class="fa-solid fa-circle-arrow-up"></i> Level Up! You reached Level ${user.level}!</span>` : ''}
          </p>

          <div style="display: flex; gap: var(--spacing-md); width: 100%; justify-content: center;">
            <button class="btn btn-secondary" id="quiz-retry-btn">
              <i class="fa-solid fa-arrow-rotate-right"></i> Retry Quiz
            </button>
            <a href="#/course/${targetCourse.id}" class="btn btn-primary">
              <i class="fa-solid fa-graduation-cap"></i> Return to Lesson
            </a>
          </div>
        </div>
      `;

      container.querySelector('#quiz-retry-btn').addEventListener('click', () => {
        currentQuestionIndex = 0;
        score = 0;
        renderQuestion();
      });
    };

    // Initial call to start the quiz
    renderQuestion();
  }
};

Router.register('/quiz/:id', QuizView);
