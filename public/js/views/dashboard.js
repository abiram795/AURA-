const DashboardView = {
  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const user = AppState.currentUser;
    const progressList = await API.getProgress(user.id);
    const courses = await API.getCourses();

    // Check if role is instructor
    if (user.role === 'instructor') {
      container.innerHTML = `
        <div style="max-width: 600px; margin: var(--spacing-xl) auto; text-align: center;" class="card">
          <i class="fa-solid fa-chalkboard-user" style="font-size: 56px; color: var(--primary); margin-bottom: var(--spacing-md);"></i>
          <h2>Welcome to the Instructor Workspace</h2>
          <p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">You are currently logged in as an instructor. Access your students' analytics and create new courses through the Instructor Portal.</p>
          <a href="#/instructor" class="btn btn-primary">Go to Instructor Portal</a>
        </div>
      `;
      return;
    }

    // 1. Calculate Stats
    const totalCoursesEnrolled = progressList.length;
    const completedCoursesCount = progressList.filter(p => p.completedAt !== null).length;
    
    // Average Quiz Score
    let sumQuizScores = 0;
    let quizCount = 0;
    progressList.forEach(p => {
      const scores = Object.values(p.quizScores);
      scores.forEach(s => {
        sumQuizScores += s;
        quizCount++;
      });
    });
    const avgQuizScore = quizCount > 0 ? Math.round(sumQuizScores / quizCount) : 0;

    // XP progress to next level
    const xpNeededForCurrentLevel = (user.level - 1) * 200;
    const xpNeededForNextLevel = user.level * 200;
    const levelProgressXp = user.xp - xpNeededForCurrentLevel;
    const levelXpDiff = xpNeededForNextLevel - xpNeededForCurrentLevel;
    const levelProgressPercent = Math.min(100, Math.max(0, Math.round((levelProgressXp / levelXpDiff) * 100)));

    // 2. Recommend next lesson
    let recommendedLesson = null;
    let recommendedCourseId = null;
    
    for (const prog of progressList) {
      const course = courses.find(c => c.id === prog.courseId);
      if (!course) continue;

      // Find first incomplete lesson
      for (const mod of course.modules) {
        const incomplete = mod.lessons.find(les => !prog.completedLessons.includes(les.id));
        if (incomplete) {
          recommendedLesson = incomplete;
          recommendedCourseId = course.id;
          break;
        }
      }
      if (recommendedLesson) break;
    }

    // 3. Goals Progress
    const goalXp = user.goals ? user.goals.daily : 50;
    const completedXp = user.goals ? user.goals.completedToday : 0;
    const goalPercent = Math.min(100, Math.round((completedXp / goalXp) * 100));

    // Render HTML Structure
    container.innerHTML = `
      <div class="dashboard-grid">
        <!-- LEFT: Stats, Banner, Recommendations, Courses -->
        <div class="dashboard-section">
          <!-- Summary Header Cards -->
          <div class="dashboard-stats-grid">
            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-angle-up stat-icon xp"></i>
                <span class="badge badge-primary">Lv. ${user.level}</span>
              </div>
              <div class="stat-val">${user.xp}</div>
              <div class="stat-lbl" data-i18n="xp-lbl">XP Points</div>
              <div class="progress-track" style="margin-top: 6px; height: 4px;">
                <div class="progress-bar-fill" style="width: ${levelProgressPercent}%;"></div>
              </div>
              <div style="font-size: 9px; color: var(--text-muted); text-align: right; margin-top: 2px;">${levelProgressPercent}% to Lv. ${user.level + 1}</div>
            </div>

            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-graduation-cap stat-icon"></i>
              </div>
              <div class="stat-val">${completedCoursesCount} <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">/ ${totalCoursesEnrolled}</span></div>
              <div class="stat-lbl" data-i18n="courses-finished">Courses Completed</div>
            </div>

            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-star stat-icon quiz"></i>
              </div>
              <div class="stat-val">${avgQuizScore}%</div>
              <div class="stat-lbl" data-i18n="quiz-avg-lbl">Avg Quiz Score</div>
            </div>

            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-fire stat-icon streak"></i>
                <span style="font-size: 11px; font-weight: 700; color: var(--accent-streak);"><i class="fa-solid fa-bolt"></i> Streak</span>
              </div>
              <div class="stat-val">${user.streak} <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">days</span></div>
              <div class="stat-lbl" data-i18n="streak-lbl">Streak</div>
            </div>
          </div>

          <!-- Daily Goal Progress Banner -->
          <div class="goals-banner">
            <div class="goals-banner-left">
              <i class="fa-solid fa-bullseye"></i>
              <div class="goals-banner-text">
                <h4 data-i18n="active-goals">Daily Learning Goal</h4>
                <p id="goal-helper-txt">Earn ${completedXp}/${goalXp} XP today to keep your streak!</p>
              </div>
            </div>
            <div style="width: 140px; display: flex; flex-direction: column; gap: var(--spacing-xs);">
              <div class="progress-track">
                <div class="progress-bar-fill" style="width: ${goalPercent}%; background: var(--secondary);"></div>
              </div>
              <span style="font-size: 11px; text-align: right; color: var(--text-secondary); font-weight: 700;">${goalPercent}% Met</span>
            </div>
          </div>

          <!-- Recommended Next Lesson -->
          ${recommendedLesson ? `
            <div class="card" style="border-left: 4px solid var(--secondary);">
              <div class="card-header">
                <span class="badge badge-secondary" data-i18n="next-lesson-recom">Recommended Next Lesson</span>
                <span class="badge badge-success"><i class="fa-solid fa-bolt"></i> +15 XP</span>
              </div>
              <div class="card-body">
                <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${escapeHTML(recommendedLesson.title)}</h2>
                <p style="margin-top: var(--spacing-xs); font-size: 13px;">Pick up right where you left off and keep your streak going strong.</p>
              </div>
              <div class="card-footer" style="padding-top: var(--spacing-sm); border: none;">
                <div></div>
                <a href="#/course/${recommendedCourseId}" class="btn btn-primary btn-sm" data-i18n="continue-btn">
                  <i class="fa-solid fa-play"></i> Continue Lesson
                </a>
              </div>
            </div>
          ` : `
            <div class="card" style="text-align: center; padding: var(--spacing-xl);">
              <i class="fa-solid fa-champagne-glasses" style="font-size: 48px; color: var(--success); margin-bottom: var(--spacing-md);"></i>
              <h3>All caught up!</h3>
              <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">You've finished all lessons in your enrolled courses, or you haven't enrolled yet.</p>
              <a href="#/courses" class="btn btn-secondary btn-sm" data-i18n="browse-catalog-btn">Browse Course Catalog</a>
            </div>
          `}

          <!-- Enrolled Courses Progress Feed -->
          <div>
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: var(--spacing-md);">My Enrolled Courses</h3>
            <div class="enrolled-courses-list">
              ${totalCoursesEnrolled === 0 ? `
                <div class="card" style="text-align: center; padding: var(--spacing-xl);">
                  <p data-i18n="empty-enrolled" style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">You are not enrolled in any courses yet.</p>
                  <a href="#/courses" class="btn btn-primary btn-sm" data-i18n="browse-catalog-btn">Browse Course Catalog</a>
                </div>
              ` : progressList.map(prog => {
                const course = courses.find(c => c.id === prog.courseId);
                if (!course) return '';
                const totalLessons = course.modules.flatMap(m => m.lessons).length;
                const completedCount = prog.completedLessons.length;
                const courseProgressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                
                return `
                  <div class="course-progress-card" onclick="window.location.hash='#/course/${course.id}'">
                    <img src="${course.image}" class="course-progress-img" alt="${escapeHTML(course.title)}">
                    <div class="course-progress-info">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h4 class="course-progress-title">${escapeHTML(course.title)}</h4>
                        <span class="badge ${courseProgressPercent === 100 ? 'badge-success' : 'badge-primary'}">${courseProgressPercent === 100 ? 'Complete' : `${courseProgressPercent}%`}</span>
                      </div>
                      
                      <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); margin-top: var(--spacing-sm);">
                        <div class="progress-track">
                          <div class="progress-bar-fill" style="width: ${courseProgressPercent}%;"></div>
                        </div>
                        <div class="course-progress-meta">
                          <span>${completedCount} / ${totalLessons} lessons completed</span>
                          <span>&bull;</span>
                          <span>${course.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- RIGHT: Streak Tracker, Deadlines Calendar, Recent Activity -->
        <div class="dashboard-section">
          <!-- Streak Flame Details -->
          <div class="card" style="text-align: center;">
            <h4 data-i18n="streak-tracker-title" style="font-size: 14px; font-weight: 700; color: var(--text-secondary);">Streak Flame Tracker</h4>
            <div style="font-size: 48px; color: var(--accent-streak); margin: var(--spacing-sm) 0; position: relative;">
              <i class="fa-solid fa-fire" style="animation: flameGlow 1.5s infinite alternate;"></i>
              <span style="position: absolute; top: 58%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; font-weight: 900; color: #fff;">${user.streak}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary);">Keep learning daily to level up and build streak rewards!</p>
          </div>

          <!-- Calendar View Component -->
          <div class="calendar-widget">
            <div class="calendar-header">
              <span class="calendar-header-title" id="calendar-month-name">August 2026</span>
              <div style="display: flex; gap: var(--spacing-xs);">
                <button class="btn btn-secondary btn-icon btn-sm" id="cal-prev-btn"><i class="fa-solid fa-chevron-left"></i></button>
                <button class="btn btn-secondary btn-icon btn-sm" id="cal-next-btn"><i class="fa-solid fa-chevron-right"></i></button>
              </div>
            </div>
            <div class="calendar-grid" id="calendar-grid-box"></div>
          </div>

          <!-- Activity Feed -->
          <div class="card">
            <h4 style="font-size: 14px; font-weight: 700;" data-i18n="activities-title">Recent Actions</h4>
            <div class="activity-feed" id="dashboard-activity-feed">
              <div class="activity-item">
                <div class="activity-icon-container"><i class="fa-solid fa-check"></i></div>
                <div class="activity-item-content">
                  <span class="activity-item-text">Log in identity confirmed.</span>
                  <span class="activity-item-time">Just now</span>
                </div>
              </div>
              ${completedCoursesCount > 0 ? `
                <div class="activity-item">
                  <div class="activity-icon-container" style="color: var(--success);"><i class="fa-solid fa-award"></i></div>
                  <div class="activity-item-content">
                    <span class="activity-item-text">Course completion registered.</span>
                    <span class="activity-item-time">1 hour ago</span>
                  </div>
                </div>
              ` : ''}
              ${user.xp > 340 ? `
                <div class="activity-item">
                  <div class="activity-icon-container" style="color: var(--secondary);"><i class="fa-solid fa-star"></i></div>
                  <div class="activity-item-content">
                    <span class="activity-item-text">Scored 100% on a course quiz.</span>
                    <span class="activity-item-time">Yesterday</span>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Calendar logic
    this.renderCalendar();
    
    // Dynamic Goals message language injection
    const lang = AppState.currentLanguage;
    const msg = AppState.translations[lang]['xp-goal-msg'] || 'Earn {current}/{goal} XP today!';
    document.getElementById('goal-helper-txt').textContent = msg.replace('{current}', completedXp).replace('{goal}', goalXp);

    AppState.applyTranslations();
  },

  renderCalendar() {
    const gridBox = document.getElementById('calendar-grid-box');
    if (!gridBox) return;

    // Use current date: August 2026 for mock consistency, or actual client time
    const todayDate = new Date();
    const currentMonth = todayDate.getMonth();
    const currentYear = todayDate.getFullYear();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    document.getElementById('calendar-month-name').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Get first day of month
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // Get last day of month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Calendar labels
    const daysLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let gridHTML = daysLabels.map(l => `<div class="calendar-day-label">${l}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      gridHTML += `<div class="calendar-day empty"></div>`;
    }

    // Days cells
    for (let d = 1; d <= lastDay; d++) {
      const isToday = d === todayDate.getDate();
      
      // Let's create some dynamic events!
      // Event on d = todayDate.getDate() + 2 (Mock deadline)
      // Event on d = todayDate.getDate() + 5 (Mock Quiz)
      let classList = 'calendar-day';
      let titleAttr = '';

      if (isToday) classList += ' today';
      if (d === todayDate.getDate() + 2) {
        classList += ' has-event';
        titleAttr = 'title="Assignment Deadline"';
      }
      if (d === todayDate.getDate() + 5) {
        classList += ' has-quiz';
        titleAttr = 'title="Quiz Scheduled"';
      }

      gridHTML += `
        <div class="${classList}" ${titleAttr} onclick="alert('Calendar Event: ${titleAttr ? titleAttr.slice(7, -1) : 'No events scheduled for this day.'}')">
          ${d}
        </div>
      `;
    }

    gridBox.innerHTML = gridHTML;
  }
};

Router.register('/dashboard', DashboardView);
