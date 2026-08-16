const DashboardView = {
  activeTab: 'dash-overview',
  currentCalMonth: new Date().getMonth(),
  currentCalYear: new Date().getFullYear(),
  currentAnalyticsMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  chartInstance: null,

  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const user = AppState.currentUser;
    const progressList = await API.getProgress(user.id);
    const courses = await API.getCourses();

    // If role is instructor, redirect to instructor portal
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

    // 1. Calculations & Metrics
    const enrolledCoursesCount = progressList.length;
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

    // Goals Progress
    const goalXp = user.goals ? user.goals.daily : 50;
    const completedXp = user.goals ? user.goals.completedToday : 0;
    const goalPercent = Math.min(100, Math.round((completedXp / goalXp) * 100));

    // Recommend next lesson
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

    // Render HTML Shell
    container.innerHTML = `
      <div style="margin-bottom: var(--spacing-md);">
        <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 2px;">Welcome back, ${escapeHTML(user.username)}!</h1>
        <p style="color: var(--text-secondary); font-size: 13px;">Track your course curriculum, analytics performance, and certification milestones.</p>
      </div>

      <!-- Dashboard Tabs -->
      <div class="tab-container" style="margin-bottom: var(--spacing-lg); display: flex; gap: var(--spacing-xs); border-bottom: 1px solid var(--border-glass); padding-bottom: 8px;">
        <button class="tab-btn ${this.activeTab === 'dash-overview' ? 'active' : ''}" data-target="dash-overview"><i class="fa-solid fa-house"></i> Overview</button>
        <button class="tab-btn ${this.activeTab === 'dash-my-courses' ? 'active' : ''}" data-target="dash-my-courses"><i class="fa-solid fa-graduation-cap"></i> My Courses</button>
        <button class="tab-btn ${this.activeTab === 'dash-certificates' ? 'active' : ''}" data-target="dash-certificates"><i class="fa-solid fa-award"></i> Certificates</button>
        <button class="tab-btn ${this.activeTab === 'dash-analytics' ? 'active' : ''}" data-target="dash-analytics"><i class="fa-solid fa-chart-line"></i> Learning Analytics</button>
      </div>

      <!-- TAB CONTENTS -->
      <div class="dashboard-tab-content-container">
        
        <!-- 1. OVERVIEW TAB -->
        <div class="tab-content-pane" id="dash-overview" style="display: ${this.activeTab === 'dash-overview' ? 'block' : 'none'};">
          <div class="dashboard-grid">
            
            <!-- LEFT COLUMN -->
            <div class="dashboard-section" style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
              
              <!-- Stats summary box -->
              <div class="dashboard-stats-grid">
                <div class="stat-box">
                  <div class="stat-header">
                    <span class="stat-label">Cumulative XP</span>
                    <i class="fa-solid fa-star" style="color: var(--primary);"></i>
                  </div>
                  <div class="stat-value">${user.xp}</div>
                  <p class="stat-subtitle">Level ${user.level} &bull; ${levelProgressPercent}% completed</p>
                </div>
                <div class="stat-box">
                  <div class="stat-header">
                    <span class="stat-label">Active Streak</span>
                    <i class="fa-solid fa-fire" style="color: var(--accent-streak);"></i>
                  </div>
                  <div class="stat-value">${user.streak} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">Days</span></div>
                  <p class="stat-subtitle">Longest: ${user.longestStreak || user.streak} days</p>
                </div>
                <div class="stat-box">
                  <div class="stat-header">
                    <span class="stat-label">Quiz Accuracy</span>
                    <i class="fa-solid fa-check-double" style="color: var(--secondary);"></i>
                  </div>
                  <div class="stat-value">${avgQuizScore}%</div>
                  <p class="stat-subtitle">Across ${quizCount} quizzes</p>
                </div>
                <div class="stat-box">
                  <div class="stat-header">
                    <span class="stat-label">Courses Completed</span>
                    <i class="fa-solid fa-graduation-cap" style="color: var(--success);"></i>
                  </div>
                  <div class="stat-value">${completedCoursesCount} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">/ ${enrolledCoursesCount}</span></div>
                  <p class="stat-subtitle">${enrolledCoursesCount - completedCoursesCount} in progress</p>
                </div>
              </div>

              <!-- Daily Goal progress -->
              <div class="card" style="padding: var(--spacing-md); background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h4 style="font-size: 14px; font-weight: 700; color: var(--text-primary);"><i class="fa-solid fa-bullseye"></i> Daily Learning Target</h4>
                  <span class="badge ${goalPercent === 100 ? 'badge-success' : 'badge-primary'}">${goalPercent}%</span>
                </div>
                <div class="progress-track" style="margin: var(--spacing-sm) 0;">
                  <div class="progress-bar-fill" style="width: ${goalPercent}%;"></div>
                </div>
                <p style="font-size: 12px; color: var(--text-secondary);" id="goal-helper-txt">Earn ${completedXp}/${goalXp} XP today!</p>
              </div>

              <!-- Recommended lesson -->
              ${recommendedLesson ? `
                <div class="card" style="border-left: 4px solid var(--primary);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="badge badge-secondary">Recommended Next Lesson</span>
                    <span class="badge badge-success"><i class="fa-solid fa-bolt"></i> +15 XP</span>
                  </div>
                  <div class="card-body" style="padding: var(--spacing-sm) 0;">
                    <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${escapeHTML(recommendedLesson.title)}</h2>
                    <p style="margin-top: var(--spacing-xs); font-size: 13px; color: var(--text-secondary);">Pick up right where you left off and keep your streak going strong.</p>
                  </div>
                  <div class="card-footer" style="padding: var(--spacing-sm) 0 0 0; border: none; display: flex; justify-content: flex-end;">
                    <a href="#/course/${recommendedCourseId}" class="btn btn-primary btn-sm">
                      <i class="fa-solid fa-play"></i> Continue Lesson
                    </a>
                  </div>
                </div>
              ` : `
                <div class="card" style="text-align: center; padding: var(--spacing-xl);">
                  <i class="fa-solid fa-champagne-glasses" style="font-size: 48px; color: var(--success); margin-bottom: var(--spacing-md);"></i>
                  <h3>All caught up!</h3>
                  <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">You've finished all lessons in your enrolled courses, or you haven't enrolled yet.</p>
                  <a href="#/courses" class="btn btn-secondary btn-sm">Browse Course Catalog</a>
                </div>
              `}
            </div>

            <!-- RIGHT COLUMN -->
            <div class="dashboard-section" style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
              
              <!-- Calendar View -->
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
                <h4 style="font-size: 14px; font-weight: 700; margin-bottom: var(--spacing-sm);"><i class="fa-solid fa-clock-rotate-left"></i> Recent Actions</h4>
                <div class="activity-feed">
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
        </div>

        <!-- 2. MY COURSES TAB -->
        <div class="tab-content-pane" id="dash-my-courses" style="display: ${this.activeTab === 'dash-my-courses' ? 'block' : 'none'};">
          <div style="margin-bottom: var(--spacing-md); display: flex; gap: var(--spacing-sm); align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 8px;">
            <button class="btn btn-secondary btn-sm" id="course-filter-in-progress" style="background: var(--bg-tertiary);">In Progress</button>
            <button class="btn btn-secondary btn-sm" id="course-filter-completed" style="background: transparent;">Completed</button>
            <button class="btn btn-secondary btn-sm" id="course-filter-all" style="background: transparent;">All Enrolled</button>
          </div>

          <div class="enrolled-courses-list" id="dashboard-enrolled-grid">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- 3. CERTIFICATES TAB -->
        <div class="tab-content-pane" id="dash-certificates" style="display: ${this.activeTab === 'dash-certificates' ? 'block' : 'none'};">
          <div id="dashboard-certificates-container">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- 4. ANALYTICS TAB -->
        <div class="tab-content-pane" id="dash-analytics" style="display: ${this.activeTab === 'dash-analytics' ? 'block' : 'none'};">
          <div class="dashboard-grid">
            
            <!-- LEFT: Chart & Controls -->
            <div class="dashboard-section" style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
              <div class="card" style="padding: var(--spacing-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary);"><i class="fa-solid fa-chart-area"></i> Cumulative XP Progression</h3>
                  
                  <select class="video-speed-select" id="analytics-month-selector" style="padding: 6px 12px; background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-glass); font-size: 13px;">
                    <!-- Months dynamically populated -->
                  </select>
                </div>
                
                <div style="position: relative; height: 300px; width: 100%;">
                  <canvas id="monthly-trend-chart"></canvas>
                </div>
              </div>
            </div>

            <!-- RIGHT: Monthly breakdown stats -->
            <div class="dashboard-section" style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
              <div class="card">
                <h4 style="font-size: 14px; font-weight: 700; border-bottom: 1px solid var(--border-glass); padding-bottom: var(--spacing-xs); margin-bottom: var(--spacing-sm);" id="monthly-breakdown-title">Month Performance</h4>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-md);" id="monthly-stats-panel">
                  <!-- Populated dynamically -->
                </div>
              </div>

              <!-- Streak widgets -->
              <div class="card" style="text-align: center; padding: var(--spacing-md);">
                <h4 style="font-size: 14px; font-weight: 700;">Streak Flame Tracker</h4>
                <div style="font-size: 48px; color: var(--accent-streak); margin: var(--spacing-sm) 0; position: relative; display: inline-block;">
                  <i class="fa-solid fa-fire"></i>
                  <span style="position: absolute; top: 58%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; font-weight: 900; color: var(--text-inverse);">${user.streak}</span>
                </div>
                <p style="font-size: 12px; color: var(--text-secondary);">Longest streak achieved: <strong>${user.longestStreak || user.streak} days</strong></p>
                <div style="display: flex; flex-direction: column; gap: 4px; text-align: left; margin-top: var(--spacing-md); border-top: 1px solid var(--border-glass); padding-top: var(--spacing-sm);">
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Total learning hours:</span>
                    <strong>${user.totalLearningHours || 0} hrs</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Streak reward level:</span>
                    <strong>x${1 + Math.floor(user.streak / 7) * 0.1} XP multiplier</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;

    // 2. Setup Events and Sub-systems
    this.setupTabListeners(container);
    this.renderCalendar(container);
    this.renderMyCourses(container, progressList, courses, 'in-progress');
    this.renderCertificates(container, user, courses);
    this.setupAnalyticsPanel(container, user);
  },

  setupTabListeners(container) {
    const tabs = container.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-target');
        this.activeTab = target;

        container.querySelectorAll('.tab-content-pane').forEach(pane => {
          pane.style.display = 'none';
        });
        const activePane = container.querySelector(`#${target}`);
        if (activePane) activePane.style.display = 'block';

        // Redraw chart if analytics selected
        if (target === 'dash-analytics') {
          const user = AppState.currentUser;
          this.renderAnalyticsChart(user, this.currentAnalyticsMonth);
        }
      });
    });
  },

  renderCalendar(container) {
    const gridBox = container.querySelector('#calendar-grid-box');
    const title = container.querySelector('#calendar-month-name');
    if (!gridBox || !title) return;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    title.textContent = `${monthNames[this.currentCalMonth]} ${this.currentCalYear}`;

    const firstDayIndex = new Date(this.currentCalYear, this.currentCalMonth, 1).getDay();
    const lastDay = new Date(this.currentCalYear, this.currentCalMonth + 1, 0).getDate();

    const daysLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let gridHTML = daysLabels.map(l => `<div class="calendar-day-label">${l}</div>`).join('');

    for (let i = 0; i < firstDayIndex; i++) {
      gridHTML += `<div class="calendar-day empty"></div>`;
    }

    const todayDate = new Date();
    for (let d = 1; d <= lastDay; d++) {
      const isToday = d === todayDate.getDate() && this.currentCalMonth === todayDate.getMonth() && this.currentCalYear === todayDate.getFullYear();
      let classList = 'calendar-day';
      let titleAttr = '';

      if (isToday) classList += ' today';
      if (d === 15) {
        classList += ' has-event';
        titleAttr = 'title="Interactive Lab Scheduled"';
      }
      if (d === 22) {
        classList += ' has-quiz';
        titleAttr = 'title="Deadline: Course Review Quiz"';
      }

      gridHTML += `
        <div class="${classList}" ${titleAttr} onclick="alert('Calendar Event: ${titleAttr ? titleAttr.slice(7, -1) : 'No events scheduled for this day.'}')">
          ${d}
        </div>
      `;
    }

    gridBox.innerHTML = gridHTML;

    // Attach Month Picker Triggers
    const prevBtn = container.querySelector('#cal-prev-btn');
    const nextBtn = container.querySelector('#cal-next-btn');

    prevBtn.onclick = () => {
      this.currentCalMonth--;
      if (this.currentCalMonth < 0) {
        this.currentCalMonth = 11;
        this.currentCalYear--;
      }
      this.renderCalendar(container);
    };

    nextBtn.onclick = () => {
      this.currentCalMonth++;
      if (this.currentCalMonth > 11) {
        this.currentCalMonth = 0;
        this.currentCalYear++;
      }
      this.renderCalendar(container);
    };
  },

  renderMyCourses(container, progressList, courses, filterType) {
    const listGrid = container.querySelector('#dashboard-enrolled-grid');
    if (!listGrid) return;

    // Setup filter button backgrounds
    const inProgressBtn = container.querySelector('#course-filter-in-progress');
    const completedBtn = container.querySelector('#course-filter-completed');
    const allBtn = container.querySelector('#course-filter-all');

    if (inProgressBtn && completedBtn && allBtn) {
      inProgressBtn.style.background = filterType === 'in-progress' ? 'var(--bg-tertiary)' : 'transparent';
      completedBtn.style.background = filterType === 'completed' ? 'var(--bg-tertiary)' : 'transparent';
      allBtn.style.background = filterType === 'all' ? 'var(--bg-tertiary)' : 'transparent';

      inProgressBtn.onclick = () => this.renderMyCourses(container, progressList, courses, 'in-progress');
      completedBtn.onclick = () => this.renderMyCourses(container, progressList, courses, 'completed');
      allBtn.onclick = () => this.renderMyCourses(container, progressList, courses, 'all');
    }

    // Filter courses
    let filtered = progressList;
    if (filterType === 'in-progress') {
      filtered = progressList.filter(p => p.completedAt === null);
    } else if (filterType === 'completed') {
      filtered = progressList.filter(p => p.completedAt !== null);
    }

    if (filtered.length === 0) {
      listGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: var(--spacing-xl); color: var(--text-secondary);">
          <i class="fa-solid fa-graduation-cap" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <h3>No courses matching filter</h3>
          <p>Browse the course catalog to enroll and start learning.</p>
        </div>
      `;
      return;
    }

    listGrid.innerHTML = filtered.map(prog => {
      const course = courses.find(c => c.id === prog.courseId);
      if (!course) return '';
      const totalLessons = course.modules.flatMap(m => m.lessons).length;
      const completedCount = prog.completedLessons.length;
      const courseProgressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isFinished = prog.completedAt !== null || courseProgressPercent === 100;

      return `
        <div class="course-progress-card" onclick="window.location.hash='#/course/${course.id}'" style="display: flex; gap: var(--spacing-md); background: var(--bg-secondary); border: 1px solid var(--border-glass); border-radius: var(--border-radius-md); padding: var(--spacing-md); cursor: pointer; transition: transform var(--transition-fast);">
          <div class="course-card-img-wrapper skeleton" style="width: 80px; height: 80px; border-radius: var(--border-radius-sm); overflow: hidden; flex-shrink: 0; background-color: var(--bg-tertiary);">
            <img src="${course.image}" 
                 loading="lazy"
                 onload="this.parentElement.classList.remove('skeleton');"
                 onerror="this.onerror=null; this.src=window.getCoursePlaceholderSVG('${escapeHTML(course.title)}', '${escapeHTML(course.category)}'); this.parentElement.classList.remove('skeleton');" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 alt="${escapeHTML(course.title)}">
          </div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: var(--spacing-xs);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0;">${escapeHTML(course.title)}</h4>
              <span class="badge ${isFinished ? 'badge-success' : 'badge-primary'}">${isFinished ? 'Complete' : `${courseProgressPercent}%`}</span>
            </div>
            
            <div class="progress-track" style="margin: 4px 0;">
              <div class="progress-bar-fill" style="width: ${courseProgressPercent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>${completedCount} / ${totalLessons} lessons completed</span>
              <span>&bull;</span>
              <span>${course.category}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCertificates(container, user, courses) {
    const certBox = container.querySelector('#dashboard-certificates-container');
    if (!certBox) return;

    const certList = user.certificates || [];
    if (certList.length === 0) {
      certBox.innerHTML = `
        <div class="card" style="text-align: center; padding: var(--spacing-xxl);">
          <i class="fa-solid fa-award" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <h3>No certificates earned yet</h3>
          <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md); max-width: 450px; margin-left: auto; margin-right: auto;">
            Complete 100% of curriculum lectures and score high marks on module quizzes to automatically generate your verified Certificate of Completion.
          </p>
          <a href="#/courses" class="btn btn-primary btn-sm">Browse Courses</a>
        </div>
      `;
      return;
    }

    certBox.innerHTML = certList.map(cert => {
      const course = courses.find(c => c.id === cert.courseId);
      const completionDate = new Date(cert.completedAt).toLocaleDateString();
      const verificationUrl = `${window.location.origin}/#/verify/${cert.id}`;
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

      return `
        <div class="card" style="margin-bottom: var(--spacing-xl); padding: var(--spacing-lg); background-color: var(--bg-secondary); border: 1px solid var(--border-glass);">
          
          <!-- Elegant Certificate Printable Render Box -->
          <div class="premium-certificate" id="certificate-${cert.id}">
            <div class="cert-seal-ribbon">
              <i class="fa-solid fa-award cert-seal-icon"></i>
            </div>
            
            <div class="cert-header">
              <div class="cert-logo"><i class="fa-solid fa-brain"></i> AuraAI</div>
              <div class="cert-title-badge">Verified Academic Credential</div>
            </div>

            <div class="cert-title">Certificate of Completion</div>
            <div class="cert-subtitle">This official document is proudly presented to</div>
            <div class="cert-student-name">${escapeHTML(user.username)}</div>
            
            <p class="cert-meta-text">
              for successfully completing all curriculum requirements, advanced programming assignments, 
              and practical evaluation quizzes for the AuraAI professional learning track:
              <strong class="cert-course-title">${escapeHTML(cert.courseTitle)}</strong>
            </p>

            <div class="cert-footer-grid">
              <div class="cert-sig-block">
                <div class="cert-sig-handwritten">Dr. Sarah Chen</div>
                <div class="cert-sig-line">Chief Instructor</div>
              </div>
              
              <div class="cert-qr-block">
                <img class="cert-qr-code" src="${qrApi}" alt="Verification Link QR">
                <span class="cert-id-tag">${cert.id}</span>
              </div>

              <div class="cert-sig-block">
                <div style="font-weight: 600; font-size: 13px; color: #0F172A; font-family: monospace;">${completionDate}</div>
                <div class="cert-sig-line">Completion Date</div>
              </div>
            </div>
          </div>

          <!-- Sharing & Printing Actions -->
          <div style="display: flex; gap: var(--spacing-sm); justify-content: center; flex-wrap: wrap; margin-top: var(--spacing-md);">
            <button class="btn btn-secondary btn-sm" onclick="window.printCertificate('${cert.id}')">
              <i class="fa-solid fa-print"></i> Download / Print PDF
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.copyVerificationLink('${cert.id}')">
              <i class="fa-solid fa-link"></i> Copy Verification Link
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.shareCertificate('${escapeHTML(cert.courseTitle)}')">
              <i class="fa-solid fa-share-nodes"></i> Share Achievement
            </button>
          </div>

        </div>
      `;
    }).join('');
  },

  setupAnalyticsPanel(container, user) {
    const selector = container.querySelector('#analytics-month-selector');
    const statsPanel = container.querySelector('#monthly-stats-panel');
    const breakdownTitle = container.querySelector('#monthly-breakdown-title');
    if (!selector || !statsPanel) return;

    // Seed Month options from user monthlyActivity registry
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    let optionsHtml = '';
    
    // We display all months from Jan to Dec of current year
    for (let m = 0; m < 12; m++) {
      const val = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const isSelected = val === this.currentAnalyticsMonth ? 'selected' : '';
      optionsHtml += `<option value="${val}" ${isSelected}>${monthNames[m]} ${currentYear}</option>`;
    }
    selector.innerHTML = optionsHtml;

    const renderStats = (monthVal) => {
      this.currentAnalyticsMonth = monthVal;
      const monthParts = monthVal.split('-');
      const monthName = monthNames[parseInt(monthParts[1]) - 1];
      
      if (breakdownTitle) breakdownTitle.textContent = `${monthName} ${monthParts[0]} Performance`;

      const monthData = user.monthlyActivity && user.monthlyActivity[monthVal] || {
        xpEarned: 0,
        lessonsCompleted: 0,
        coursesCompleted: 0,
        achievementsUnlocked: []
      };

      statsPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-sm); border-radius: var(--border-radius-sm);">
          <span style="font-size: 13px; color: var(--text-secondary);">XP Earned:</span>
          <strong style="color: var(--primary); font-size: 15px;">+${monthData.xpEarned || 0} XP</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-sm); border-radius: var(--border-radius-sm);">
          <span style="font-size: 13px; color: var(--text-secondary);">Lessons Completed:</span>
          <strong style="color: var(--text-primary); font-size: 14px;">${monthData.lessonsCompleted || 0} Lessons</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: var(--spacing-sm); border-radius: var(--border-radius-sm);">
          <span style="font-size: 13px; color: var(--text-secondary);">Courses Completed:</span>
          <strong style="color: var(--success); font-size: 14px;">${monthData.coursesCompleted || 0} Courses</strong>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); background: var(--bg-tertiary); padding: var(--spacing-sm); border-radius: var(--border-radius-sm);">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Achievements Earned:</span>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
            ${monthData.achievementsUnlocked && monthData.achievementsUnlocked.length > 0 ? monthData.achievementsUnlocked.map(badgeId => {
              let label = 'First Course Completed';
              let color = 'badge-success';
              let icon = 'fa-award';

              if (badgeId === 'badge_7day_streak') { label = '7-Day Streak'; color = 'badge-primary'; icon = 'fa-fire'; }
              if (badgeId === 'badge_30day_streak') { label = '30-Day Streak'; color = 'badge-warning'; icon = 'fa-bolt'; }
              if (badgeId === 'badge_5_courses') { label = '5 Courses Finished'; color = 'badge-success'; icon = 'fa-graduation-cap'; }
              if (badgeId === 'badge_top_learner') { label = 'Top Learner'; color = 'badge-primary'; icon = 'fa-star'; }
              if (badgeId === 'b1') { label = 'Initial Goal'; color = 'badge-secondary'; icon = 'fa-compass'; }
              if (badgeId === 'b2') { label = 'Dedicated student'; color = 'badge-secondary'; icon = 'fa-bookmark'; }
              if (badgeId === 'b3') { label = 'Perfect quiz score'; color = 'badge-secondary'; icon = 'fa-face-smile'; }
              if (badgeId === 'b4') { label = 'Self starter'; color = 'badge-secondary'; icon = 'fa-user-pen'; }

              return `<span class="badge ${color}" style="font-size: 10px; padding: 4px 8px;"><i class="fa-solid ${icon}"></i> ${label}</span>`;
            }).join('') : '<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">No achievements earned this month.</span>'}
          </div>
        </div>
      `;

      // Update Chart representation
      this.renderAnalyticsChart(user, monthVal);
    };

    // Initial render
    renderStats(this.currentAnalyticsMonth);

    // Month Selector Change listener
    selector.onchange = (e) => {
      renderStats(e.target.value);
    };
  },

  renderAnalyticsChart(user, selectedMonthYear) {
    const ctx = document.getElementById('monthly-trend-chart');
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const monthData = user.monthlyActivity && user.monthlyActivity[selectedMonthYear] || { dailyXp: {} };
    const monthParts = selectedMonthYear.split('-');
    const daysInMonth = new Date(parseInt(monthParts[0]), parseInt(monthParts[1]), 0).getDate();
    
    const labels = [];
    const dataPoints = [];
    let runningXp = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(day.toString());
      const dailyEarned = monthData.dailyXp && monthData.dailyXp[day.toString()] || 0;
      runningXp += dailyEarned;
      dataPoints.push(runningXp);
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cumulative XP',
          data: dataPoints,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: '#F59E0B'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94A3B8', font: { size: 10 } }
          }
        }
      }
    });
  }
};

// Global Helpers for Certificate Actions
window.printCertificate = (certId) => {
  const container = document.getElementById(`certificate-${certId}`);
  if (!container) return;

  // Temporarily assign printing area ID
  container.id = 'certificate-print-area';
  window.print();
  // Restore ID
  container.id = `certificate-${certId}`;
};

window.copyVerificationLink = (certId) => {
  const url = `${window.location.origin}/#/verify/${certId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert(`Verification link copied to clipboard:\n${url}`);
  }).catch(err => {
    console.error('Failed to copy verification link:', err);
  });
};

window.shareCertificate = (courseTitle) => {
  const text = `I just mastered "${courseTitle}" on AuraAI and unlocked my Certificate of Completion! Check out my verified credentials here.`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

Router.register('/dashboard', DashboardView);
