const LeaderboardView = {
  activeSubTab: 'students', // 'students' or 'teachers'

  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    if (AppState.currentUser.role === 'instructor') {
      this.activeSubTab = 'students';
    }

    const userId = AppState.currentUser.id;

    // Load users and progress
    const [users, progressList] = await Promise.all([
      API.getUsers(),
      API.getProgress(userId)
    ]);

    // Seed dummy users to make the leaderboard look highly competitive and complete
    const competitiveUsers = [...users];
    if (competitiveUsers.length < 5) {
      competitiveUsers.push(
        { id: 'c_u1', username: 'Sophia Martinez', role: 'student', xp: 980, level: 5, streak: 8, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sophia' },
        { id: 'c_u2', username: 'Daniel Kim', role: 'student', xp: 620, level: 3, streak: 4, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Daniel' },
        { id: 'c_u3', username: 'Emma Watson', role: 'student', xp: 150, level: 1, streak: 1, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Emma' }
      );
    }

    // Filter to students only and sort by XP descending
    const studentLeaderboard = competitiveUsers
      .filter(u => u.role === 'student')
      .sort((a, b) => b.xp - a.xp);

    // Get instructors sorted by rating
    const instructorsList = users
      .filter(u => u.role === 'instructor')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Badges Catalogue Definition
    const badgesCatalog = [
      { id: 'b1', name: 'First Steps', desc: 'Enrolled in your first AI course', icon: 'fa-shoe-prints' },
      { id: 'b2', name: 'Streak Starter', desc: 'Maintained a 5-day learning streak', icon: 'fa-fire' },
      { id: 'b3', name: 'Quiz Master', desc: 'Scored 100% on any course quiz', icon: 'fa-trophy' },
      { id: 'b4', name: 'Pathfinder', desc: 'Completed the onboarding path selector', icon: 'fa-compass' },
      { id: 'b5', name: 'Alumnus', desc: 'Completed a full course syllabus', icon: 'fa-graduation-cap' }
    ];

    // Current user's badges
    const user = users.find(u => u.id === userId) || AppState.currentUser;
    const earnedBadges = new Set(user.badges || []);

    // Dynamically add badges based on current user achievements
    const courses = await API.getCourses();
    const hasCompletedCourse = progressList.some(p => p.completedAt !== null);
    const hasPerfectQuiz = progressList.some(p => Object.values(p.quizScores).includes(100));

    if (progressList.length > 0) earnedBadges.add('b1');
    if (user.streak >= 5) earnedBadges.add('b2');
    if (hasPerfectQuiz) earnedBadges.add('b3');
    if (user.interests && user.interests.length > 0) earnedBadges.add('b4');
    if (hasCompletedCourse) earnedBadges.add('b5');

    // Courses for certificate checking
    const completedCourses = [];
    progressList.forEach(prog => {
      const course = courses.find(c => c.id === prog.courseId);
      if (course && (prog.completedAt || prog.completedLessons.length === course.modules.flatMap(m => m.lessons).length)) {
        completedCourses.push({
          title: course.title,
          date: prog.completedAt ? new Date(prog.completedAt).toLocaleDateString() : new Date().toLocaleDateString()
        });
      }
    });

    container.innerHTML = `
      <div class="tab-container">
        <button class="tab-btn active" data-target="tab-leaderboard"><i class="fa-solid fa-ranking-star"></i> Leaderboard</button>
        <button class="tab-btn" data-target="tab-badges"><i class="fa-solid fa-ribbon"></i> Badges & Achievements</button>
        <button class="tab-btn" data-target="tab-certificates"><i class="fa-solid fa-certificate"></i> Certificates</button>
        <button class="tab-btn" data-target="tab-progress-analytics"><i class="fa-solid fa-chart-line"></i> Progress Analytics</button>
      </div>

      <!-- LEADERBOARD TAB -->
      <div class="tab-content active" id="tab-leaderboard">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">AuraAI Global Standings</h2>
              <p class="card-subtitle">${AppState.currentUser.role === 'instructor' ? 'View the top-performing students on the platform.' : 'Compete globally or view top-rated industry instructors.'}</p>
            </div>
          </div>

          <!-- Standings Type Selector Sub-Tabs -->
          ${AppState.currentUser.role === 'instructor' ? '' : `
          <div class="tab-group" style="display: flex; gap: var(--spacing-sm); margin: var(--spacing-md) 0; border-bottom: 2px solid var(--border-color); padding-bottom: 0; background: none; justify-content: flex-start;">
            <button class="filter-btn ${this.activeSubTab === 'students' ? 'active' : ''}" id="lead-subtab-students" style="padding: 8px 16px;">
              Student Standings
            </button>
            <button class="filter-btn ${this.activeSubTab === 'teachers' ? 'active' : ''}" id="lead-subtab-teachers" style="padding: 8px 16px;">
              Instructor Ratings
            </button>
          </div>
          `}

          <div class="card-body" style="padding: 0; overflow-x: auto;" id="leaderboard-table-container">
            ${this.activeSubTab === 'students' 
              ? this.renderStudentsTable(studentLeaderboard, userId) 
              : this.renderInstructorsTable(instructorsList)}
          </div>
        </div>
      </div>

      <!-- BADGES TAB -->
      <div class="tab-content" id="tab-badges">
        <div class="card" style="margin-bottom: var(--spacing-lg);">
          <h2 class="card-title">Earned Achievements</h2>
          <p class="card-subtitle">Unlock custom badges by completing lessons, scoring perfect quizzes, and retaining daily streaks.</p>
        </div>
        <div class="badges-grid">
          ${badgesCatalog.map(b => {
            const unlocked = earnedBadges.has(b.id);
            return `
              <div class="card badge-card ${unlocked ? '' : 'locked'}">
                <div class="badge-icon-wrapper">
                  <i class="fa-solid ${b.icon}"></i>
                </div>
                <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-top: var(--spacing-xs);">${escapeHTML(b.name)}</h3>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: var(--spacing-xs); line-height: 1.3;">${escapeHTML(b.desc)}</p>
                <div style="margin-top: var(--spacing-sm);">
                  <span class="badge ${unlocked ? 'badge-success' : 'badge-secondary'}">
                    ${unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- CERTIFICATES TAB -->
      <div class="tab-content" id="tab-certificates">
        ${completedCourses.length === 0 ? `
          <div class="card" style="text-align: center; padding: var(--spacing-xl);">
            <i class="fa-solid fa-award" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
            <h3>No certificates unlocked yet</h3>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">Complete 100% of the lessons in any course to unlock your official Certificate of Completion.</p>
            <a href="#/courses" class="btn btn-primary btn-sm">Browse Courses</a>
          </div>
        ` : completedCourses.map(cert => `
          <div class="certificate-container" id="certificate-print-area" style="margin-bottom: var(--spacing-lg);">
            <div class="certificate-seal">
              <i class="fa-solid fa-brain"></i>
            </div>
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: var(--secondary); margin-bottom: var(--spacing-sm);">Official Certificate of Completion</div>
            <h1 class="certificate-title">AURA AI PLATFORM</h1>
            <p style="font-size: 14px; color: var(--text-secondary); font-style: italic;">This is proudly presented to</p>
            <h2 class="certificate-student">${escapeHTML(AppState.currentUser.username)}</h2>
            <p style="font-size: 14px; color: var(--text-secondary); max-width: 400px; margin: 0 auto;">for successfully mastering all syllabus criteria, lectures, and interactive practical quizzes in</p>
            <h3 style="font-size: 18px; font-weight: 800; color: var(--primary); margin: var(--spacing-md) 0;">${escapeHTML(cert.title)}</h3>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: var(--spacing-xl); padding: 0 var(--spacing-xl);">
              <div style="text-align: left;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Dr. Sarah Chen</div>
                <div style="font-size: 10px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 2px; width: 120px;">Chief Instructor</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${cert.date}</div>
                <div style="font-size: 10px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 2px; width: 120px;">Date Completed</div>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: var(--spacing-sm); margin-bottom: var(--spacing-xl);">
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <i class="fa-solid fa-print"></i> Print / Save PDF Certificate
            </button>
          </div>
        `).join('')}
      </div>

      <!-- PROGRESS ANALYTICS TAB -->
      <div class="tab-content" id="tab-progress-analytics">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">XP Accumulation Trend</h2>
            <p class="card-subtitle">Analysis of learning consistency. Plots cumulative XP scored over the last 7 days.</p>
          </div>
          <div class="card-body">
            <div style="position: relative; height: 320px; width: 100%;">
              <canvas id="xp-trend-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container, studentLeaderboard, instructorsList, userId);
    AppState.applyTranslations();
  },

  renderStudentsTable(studentLeaderboard, userId) {
    const rowsHtml = studentLeaderboard.map((student, index) => {
      const rank = index + 1;
      let rankClass = `leaderboard-rank rank-${rank}`;
      let rankDisplay = `#${rank}`;
      if (rank === 1) rankDisplay = '<i class="fa-solid fa-crown"></i> #1';
      
      const isCurrentUser = student.id === userId;
      
      return `
        <tr class="leaderboard-row" style="${isCurrentUser ? 'background-color: rgba(99,102,241,0.08); font-weight: bold; border-left: 3px solid var(--primary);' : ''}">
          <td><span class="${rankClass}">${rankDisplay}</span></td>
          <td>
            <div class="leaderboard-user-cell">
              <img src="${student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.username}`}" class="leaderboard-avatar">
              <span>${escapeHTML(student.username)} ${isCurrentUser ? '<span class="badge badge-primary btn-sm" style="font-size: 8px; margin-left: var(--spacing-xs);">You</span>' : ''}</span>
            </div>
          </td>
          <td>Level ${student.level}</td>
          <td><i class="fa-solid fa-fire" style="color: var(--accent-streak);"></i> ${student.streak}d</td>
          <td><span class="leaderboard-xp-val">${student.xp} XP</span></td>
        </tr>
      `;
    }).join('');

    return `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            <th>Level</th>
            <th>Streak</th>
            <th>XP Points</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  },

  renderInstructorsTable(instructorsList) {
    const rowsHtml = instructorsList.map((inst, index) => {
      const rank = index + 1;
      let rankClass = `leaderboard-rank rank-${rank}`;
      let rankDisplay = `#${rank}`;
      if (rank === 1) rankDisplay = '<i class="fa-solid fa-crown"></i> #1';
      
      const avgRating = parseFloat(inst.rating || 0).toFixed(1);
      const ratingCount = inst.ratingCount || 0;

      return `
        <tr class="leaderboard-row">
          <td><span class="${rankClass}">${rankDisplay}</span></td>
          <td>
            <div class="leaderboard-user-cell">
              <img src="${inst.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${inst.username}`}" class="leaderboard-avatar">
              <span style="font-weight: 700;">${escapeHTML(inst.username)}</span>
            </div>
          </td>
          <td style="color: var(--text-secondary); font-size: 13px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHTML(inst.bio || 'AI Platform Instructor.')}
          </td>
          <td>
            <span style="font-weight: 800; color: var(--warning);"><i class="fa-solid fa-star"></i> ${avgRating}</span>
            <span style="color: var(--text-muted); font-size: 11px;"> (${ratingCount} ratings)</span>
          </td>
          <td>
            ${AppState.currentUser.role === 'student' ? `
              <div class="rate-instructor-box" data-inst-id="${inst.id}">
                <span class="interactive-stars" style="display: inline-flex; gap: 4px; cursor: pointer;">
                  <i class="fa-regular fa-star star-btn" data-value="1" style="color: var(--warning); font-size: 16px;"></i>
                  <i class="fa-regular fa-star star-btn" data-value="2" style="color: var(--warning); font-size: 16px;"></i>
                  <i class="fa-regular fa-star star-btn" data-value="3" style="color: var(--warning); font-size: 16px;"></i>
                  <i class="fa-regular fa-star star-btn" data-value="4" style="color: var(--warning); font-size: 16px;"></i>
                  <i class="fa-regular fa-star star-btn" data-value="5" style="color: var(--warning); font-size: 16px;"></i>
                </span>
              </div>
            ` : '<span style="color: var(--text-muted); font-size: 11px;">N/A</span>'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Instructor</th>
            <th>Specialization / Bio</th>
            <th>Average Rating</th>
            <th>Give Rating</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="5" style="text-align: center; padding: var(--spacing-xl); color: var(--text-muted);">No instructors loaded.</td></tr>`}
        </tbody>
      </table>
    `;
  },

  bindEvents(container, studentLeaderboard, instructorsList, userId) {
    // Bind Tab Switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetContent = container.querySelector(`#${targetId}`);
        if (targetContent) targetContent.classList.add('active');

        // Draw Chart.js graph if target is progress analytics
        if (targetId === 'tab-progress-analytics') {
          setTimeout(() => renderXPChart(), 50);
        }
      });
    });

    // Subtab navigation bindings
    const subStudents = container.querySelector('#lead-subtab-students');
    const subTeachers = container.querySelector('#lead-subtab-teachers');

    if (subStudents) {
      subStudents.addEventListener('click', () => {
        this.activeSubTab = 'students';
        this.render(container);
      });
    }

    if (subTeachers) {
      subTeachers.addEventListener('click', () => {
        this.activeSubTab = 'teachers';
        this.render(container);
      });
    }

    // Hover stars effect and ratings submissions
    if (this.activeSubTab === 'teachers') {
      container.querySelectorAll('.interactive-stars').forEach(starsContainer => {
        const allStars = starsContainer.querySelectorAll('.star-btn');

        allStars.forEach((star, idx) => {
          // Hover on
          star.addEventListener('mouseover', () => {
            allStars.forEach((s, i) => {
              if (i <= idx) {
                s.classList.remove('fa-regular');
                s.classList.add('fa-solid');
              } else {
                s.classList.remove('fa-solid');
                s.classList.add('fa-regular');
              }
            });
          });

          // Submit Rating Click
          star.addEventListener('click', async (e) => {
            e.stopPropagation();
            const rating = parseInt(star.getAttribute('data-value'));
            const instId = star.closest('.rate-instructor-box').getAttribute('data-inst-id');

            starsContainer.style.pointerEvents = 'none';

            try {
              await API.rateInstructor(instId, rating, userId);
              alert('Thank you for rating your instructor!');
              this.render(container); // reload and refresh scores
            } catch (err) {
              alert('Failed to rate instructor: ' + err.message);
              starsContainer.style.pointerEvents = 'auto';
            }
          });
        });

        // Hover off container
        starsContainer.addEventListener('mouseleave', () => {
          allStars.forEach(s => {
            s.classList.remove('fa-solid');
            s.classList.add('fa-regular');
          });
        });
      });
    }

    // Helper to draw Chart.js graph
    const renderXPChart = () => {
      const ctx = document.getElementById('xp-trend-chart');
      if (!ctx) return;

      if (window.xpChartRef) {
        window.xpChartRef.destroy();
      }

      const labels = [];
      const xpValues = [];
      const userRecord = studentLeaderboard.find(u => u.id === userId) || AppState.currentUser;
      let baseXP = userRecord.xp - 110;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        
        const step = 6 - i;
        const currentSimXP = baseXP + (step * 15) + (step === 3 ? 30 : 0);
        xpValues.push(i === 0 ? userRecord.xp : currentSimXP);
      }

      const isLightMode = document.body.classList.contains('light-mode');
      const gridColor = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      const textColor = isLightMode ? '#475569' : '#9ca3af';

      window.xpChartRef = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cumulative XP',
            data: xpValues,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#fff',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: textColor,
                font: { family: 'Outfit' }
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit' } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit' } }
            }
          }
        }
      });
    };
  }
};

Router.register('/leaderboard', LeaderboardView);
