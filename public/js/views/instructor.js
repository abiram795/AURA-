const InstructorView = {
  async render(container) {
    if (!AppState.currentUser || AppState.currentUser.role !== 'instructor') {
      window.location.hash = '#/login';
      return;
    }

    // Load dynamic analytics, courses list, users and attendance logs
    const [analytics, courses, users, attendanceLogs] = await Promise.all([
      API.getInstructorAnalytics(),
      API.getCourses(),
      API.getUsers(),
      API.getAttendance()
    ]);

    // Active Tab state
    let activeTab = 'instructor-analytics';

    const renderTabs = () => {
      container.innerHTML = `
        <div class="tab-container">
          <button class="tab-btn ${activeTab === 'instructor-analytics' ? 'active' : ''}" data-target="instructor-analytics"><i class="fa-solid fa-chart-pie"></i> Platform Analytics</button>
          <button class="tab-btn ${activeTab === 'course-builder' ? 'active' : ''}" data-target="course-builder"><i class="fa-solid fa-folder-plus"></i> Course Creator</button>
          <button class="tab-btn ${activeTab === 'quiz-builder' ? 'active' : ''}" data-target="quiz-builder"><i class="fa-solid fa-circle-question"></i> Quiz Builder</button>
          <button class="tab-btn ${activeTab === 'student-attendance' ? 'active' : ''}" data-target="student-attendance"><i class="fa-solid fa-clipboard-user"></i> Student Attendance</button>
        </div>

        <div class="tab-content ${activeTab === 'instructor-analytics' ? 'active' : ''}" id="instructor-analytics">
          <div class="analytics-summary-grid">
            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-users stat-icon" style="color: var(--primary);"></i>
              </div>
              <div class="stat-val">${analytics.totalStudents || 0}</div>
              <div class="stat-lbl">Active Students Enrolled</div>
            </div>

            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-book-bookmark stat-icon" style="color: var(--secondary);"></i>
              </div>
              <div class="stat-val">${analytics.activeCourses || 0}</div>
              <div class="stat-lbl">Hosted Courses</div>
            </div>

            <div class="stat-box">
              <div class="stat-header">
                <i class="fa-solid fa-circle-check stat-icon" style="color: var(--success);"></i>
              </div>
              <div class="stat-val">
                ${analytics.courseStats?.length > 0 
                  ? Math.round(analytics.courseStats.reduce((acc, c) => acc + c.completionRate, 0) / analytics.courseStats.length) 
                  : 0}%
              </div>
              <div class="stat-lbl">Avg Course Completion Rate</div>
            </div>
          </div>

          <!-- Course Analytics Standings Table -->
          <div class="card">
            <h3 class="card-title">Course Analytics Breakdown</h3>
            <p class="card-subtitle">Real-time metrics tracking student engagement, lesson completions, and quiz performance.</p>
            <div style="overflow-x: auto; margin-top: var(--spacing-md);">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>Course Title</th>
                    <th>Students Enrolled</th>
                    <th>Average Syllabus Progress</th>
                    <th>Completion Rate</th>
                    <th>Average Quiz Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${analytics.courseStats?.map(c => `
                    <tr>
                      <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(c.title)}</td>
                      <td>${c.enrolled} Students</td>
                      <td>
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                          <div class="progress-track" style="width: 80px; height: 6px;">
                            <div class="progress-bar-fill" style="width: ${c.avgProgress}%;"></div>
                          </div>
                          <span>${c.avgProgress}%</span>
                        </div>
                      </td>
                      <td><span class="badge ${c.completionRate >= 50 ? 'badge-success' : 'badge-primary'}">${c.completionRate}%</span></td>
                      <td><span style="font-weight: bold; color: var(--secondary);">${c.avgQuizScore}%</span></td>
                    </tr>
                  `).join('') || `<tr><td colspan="5" style="text-align:center;">No course stats available.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- COURSE BUILDER TAB -->
        <div class="tab-content ${activeTab === 'course-builder' ? 'active' : ''}" id="course-builder">
          <div class="card">
            <h2 class="card-title">Create a New Course</h2>
            <p class="card-subtitle">Seed lessons, syllabi, and outline modules into the global course catalog.</p>
            
            <form id="course-builder-form" style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-top: var(--spacing-md);">
              <div class="form-group">
                <label>Course Title</label>
                <input type="text" id="builder-course-title" placeholder="e.g. Master Neural Networks" required>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea id="builder-course-desc" placeholder="Write a short summary of course learning outcomes..." required style="height: 60px;"></textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Category</label>
                  <select id="builder-course-category">
                    <option value="Prompt Engineering">Prompt Engineering</option>
                    <option value="Generative Media">Generative Media</option>
                    <option value="Deep Learning">Deep Learning</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Difficulty</label>
                  <select id="builder-course-difficulty">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Duration</label>
                  <input type="text" id="builder-course-duration" placeholder="e.g. 2h 45m" required>
                </div>
              </div>

              <!-- Module list container -->
              <div class="builder-section-header">
                <h3 style="font-size: 15px; font-weight: 700;"><i class="fa-solid fa-cubes"></i> Course Modules & Syllabus Outline</h3>
                <button type="button" class="btn btn-secondary btn-sm" id="builder-add-module-btn"><i class="fa-solid fa-plus"></i> Add Module</button>
              </div>
              
              <div id="builder-modules-list" style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                <!-- Dynamic modules injected here -->
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top: var(--spacing-md); display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" id="builder-publish-course-btn">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Publish Course Catalog
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- QUIZ BUILDER TAB -->
        <div class="tab-content ${activeTab === 'quiz-builder' ? 'active' : ''}" id="quiz-builder">
          <div class="card">
            <h2 class="card-title">Create a Lesson Quiz</h2>
            <p class="card-subtitle">Draft multiple-choice questions, verify correct index states, and input explainers.</p>
            
            <form id="quiz-builder-form" style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-top: var(--spacing-md);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Select Target Course</label>
                  <select id="quiz-builder-course-select" required>
                    <option value="">-- Choose Course --</option>
                    ${courses.map(c => `<option value="${c.id}">${escapeHTML(c.title)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Select Target Lesson</label>
                  <select id="quiz-builder-lesson-select" required disabled>
                    <option value="">-- Choose Lesson --</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Quiz Title</label>
                <input type="text" id="quiz-builder-title" placeholder="e.g. Master CNN Architectures" required>
              </div>

              <div class="builder-section-header">
                <h3 style="font-size: 15px; font-weight: 700;"><i class="fa-solid fa-list-check"></i> Questions Checklist</h3>
                <button type="button" class="btn btn-secondary btn-sm" id="quiz-builder-add-question-btn"><i class="fa-solid fa-plus"></i> Add Question</button>
              </div>

              <div id="quiz-questions-list" style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                <!-- Dynamic questions injected here -->
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top: var(--spacing-md); display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" id="quiz-builder-submit-btn">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Publish Lesson Quiz
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- STUDENT ATTENDANCE TAB -->
        <div class="tab-content ${activeTab === 'student-attendance' ? 'active' : ''}" id="student-attendance">
          <div class="card">
            <h2 class="card-title">Daily Student Attendance logs</h2>
            <p class="card-subtitle">Real-time attendance logs showing today's class check-ins (9:00 AM Attendance Staking).</p>
            
            <div style="overflow-x: auto; margin-top: var(--spacing-md);">
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Check-in Schedule</th>
                    <th>Attendance Status</th>
                    <th>Time Verified</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const students = users.filter(u => u.role === 'student');
                    const presentIds = new Set(attendanceLogs.map(log => log.user_id || log.userId));
                    if (students.length === 0) {
                      return `<tr><td colspan="5" style="text-align: center; padding: var(--spacing-xl); color: var(--text-muted);">No students registered yet.</td></tr>`;
                    }
                    return students.map(student => {
                      const isPresent = presentIds.has(student.id);
                      // Instructors standard morning stake check-in schedule is 9:00 AM
                      const targetCheckInHour = 9; 
                      return `
                        <tr>
                          <td style="font-weight: 700; color: var(--text-primary);">${escapeHTML(student.username)}</td>
                          <td style="color: var(--text-secondary);">${escapeHTML(student.email)}</td>
                          <td style="color: var(--text-muted); font-size: 13px;">
                            <i class="fa-solid fa-clock"></i> 0${targetCheckInHour}:00 AM check-in class
                          </td>
                          <td>
                            ${isPresent 
                              ? `<span class="badge badge-success" style="background-color: var(--success); color: white;"><i class="fa-solid fa-circle-check"></i> Present</span>` 
                              : `<span class="badge badge-secondary"><i class="fa-solid fa-xmark"></i> Absent</span>`
                            }
                          </td>
                          <td style="font-weight: 600; color: ${isPresent ? 'var(--success)' : 'var(--text-muted)'}; font-size: 13px;">
                            ${isPresent ? `0${targetCheckInHour}:00 AM (Staked)` : '—'}
                          </td>
                        </tr>
                      `;
                    }).join('');
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Bind Tab Switchers
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.getAttribute('data-target');
          renderTabs();
        });
      });

      // Course Builder Actions
      bindCourseBuilder();

      // Quiz Builder Actions
      bindQuizBuilder();
    };

    // Course Builder Form logic
    const bindCourseBuilder = () => {
      const modulesList = container.querySelector('#builder-modules-list');
      const addModuleBtn = container.querySelector('#builder-add-module-btn');
      const form = container.querySelector('#course-builder-form');

      let moduleCounter = 0;

      const addModuleNode = () => {
        moduleCounter++;
        const modId = `mod-${Date.now()}-${moduleCounter}`;
        
        const card = document.createElement('div');
        card.className = 'builder-nested-card';
        card.id = modId;
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Module Element</h4>
            <button type="button" class="btn btn-secondary btn-sm remove-module-btn" style="color: var(--danger); padding: 2px 8px; font-size: 11px;"><i class="fa-solid fa-trash"></i> Delete Module</button>
          </div>
          <div class="form-group">
            <label>Module Title</label>
            <input type="text" class="module-title-input" placeholder="e.g. Module 1: Basics" required>
          </div>
          <div style="margin-top: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs);">
              <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Lessons List</label>
              <button type="button" class="btn btn-secondary btn-sm add-lesson-btn" style="padding: 2px 8px; font-size: 11px;"><i class="fa-solid fa-plus"></i> Add Lesson</button>
            </div>
            <div class="module-lessons-container" style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-xs);">
              <!-- Dynamic lessons -->
            </div>
          </div>
        `;

        modulesList.appendChild(card);

        // Delete module
        card.querySelector('.remove-module-btn').addEventListener('click', () => card.remove());

        // Add Lesson helper
        const lessonsContainer = card.querySelector('.module-lessons-container');
        const addLessonBtn = card.querySelector('.add-lesson-btn');
        let lessonCounter = 0;

        const addLessonNode = () => {
          lessonCounter++;
          const lesNode = document.createElement('div');
          lesNode.className = 'card';
          lesNode.style.padding = 'var(--spacing-md)';
          lesNode.style.borderStyle = 'dashed';
          lesNode.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs);">
              <h5 style="font-size: 12px; font-weight: 700; color: var(--secondary);">Lesson Object</h5>
              <button type="button" class="btn btn-secondary btn-sm remove-lesson-btn" style="color: var(--danger); padding: 1px 6px; font-size: 10px;"><i class="fa-solid fa-trash-can"></i> Remove</button>
            </div>
            <div class="form-group">
              <label style="font-size: 11px;">Lesson Title</label>
              <input type="text" class="lesson-title-input" placeholder="e.g. Convolution Basics" required>
            </div>
            <div class="form-group">
              <label style="font-size: 11px;">Video URL</label>
              <input type="text" class="lesson-video-input" value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" placeholder="MP4 direct URL..." required>
            </div>
            <div class="form-group">
              <label style="font-size: 11px;">HTML Lesson Content</label>
              <textarea class="lesson-content-input" placeholder="Write paragraphs, lists, HTML content here..." required style="height: 60px; font-size: 12px;"></textarea>
            </div>
          `;

          lessonsContainer.appendChild(lesNode);

          lesNode.querySelector('.remove-lesson-btn').addEventListener('click', () => lesNode.remove());
        };

        addLessonBtn.addEventListener('click', addLessonNode);
        addLessonNode(); // Auto add one lesson by default
      };

      addModuleBtn.addEventListener('click', addModuleNode);
      addModuleNode(); // Add one module by default

      // Publish Course Submit
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const modulesData = [];
        let totalLessonsCount = 0;

        container.querySelectorAll('.builder-nested-card').forEach(modCard => {
          const modTitle = modCard.querySelector('.module-title-input').value.trim();
          const lessonsData = [];

          modCard.querySelectorAll('.module-lessons-container .card').forEach(lesCard => {
            totalLessonsCount++;
            lessonsData.push({
              id: `les_${Date.now()}_${totalLessonsCount}`,
              title: lesCard.querySelector('.lesson-title-input').value.trim(),
              videoUrl: lesCard.querySelector('.lesson-video-input').value.trim(),
              content: lesCard.querySelector('.lesson-content-input').value.trim(),
              downloads: []
            });
          });

          modulesData.push({
            id: `mod_${Date.now()}_${modulesData.length + 1}`,
            title: modTitle,
            lessons: lessonsData
          });
        });

        if (modulesData.length === 0 || totalLessonsCount === 0) {
          alert('Error: You must add at least one module containing one lesson.');
          return;
        }

        const publishBtn = container.querySelector('#builder-publish-course-btn');
        publishBtn.disabled = true;
        publishBtn.innerHTML = `<span class="spinner btn-sm"></span> Publishing...`;

        try {
          const newCourse = {
            title: container.querySelector('#builder-course-title').value.trim(),
            description: container.querySelector('#builder-course-desc').value.trim(),
            instructorId: AppState.currentUser.id,
            instructorName: AppState.currentUser.username,
            category: container.querySelector('#builder-course-category').value,
            difficulty: container.querySelector('#builder-course-difficulty').value,
            duration: container.querySelector('#builder-course-duration').value.trim(),
            modules: modulesData,
            quizzes: []
          };

          await API.createCourse(newCourse);
          alert('Course successfully published and added to global catalog!');
          activeTab = 'instructor-analytics';
          renderTabs();
        } catch (err) {
          console.error(err);
          alert('Failed to publish course.');
          publishBtn.disabled = false;
          publishBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Publish Course Catalog`;
        }
      });
    };

    // Quiz Builder Form logic
    const bindQuizBuilder = () => {
      const courseSelect = container.querySelector('#quiz-builder-course-select');
      const lessonSelect = container.querySelector('#quiz-builder-lesson-select');
      const questionsList = container.querySelector('#quiz-questions-list');
      const addQuestionBtn = container.querySelector('#quiz-builder-add-question-btn');
      const form = container.querySelector('#quiz-builder-form');

      // Populate lesson selector dynamically
      courseSelect.addEventListener('change', () => {
        const cId = courseSelect.value;
        if (!cId) {
          lessonSelect.innerHTML = '<option value="">-- Choose Lesson --</option>';
          lessonSelect.disabled = true;
          return;
        }

        const courseObj = courses.find(c => c.id === cId);
        if (courseObj) {
          const lessonsList = courseObj.modules.flatMap(m => m.lessons);
          lessonSelect.innerHTML = `
            <option value="">-- Choose Lesson --</option>
            ${lessonsList.map(l => `<option value="${l.id}">${escapeHTML(l.title)}</option>`).join('')}
          `;
          lessonSelect.disabled = false;
        }
      });

      let questionCounter = 0;

      const addQuestionNode = () => {
        questionCounter++;
        const qNode = document.createElement('div');
        qNode.className = 'card';
        qNode.style.padding = 'var(--spacing-md)';
        qNode.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--primary);">Question ${questionCounter}</h4>
            <button type="button" class="btn btn-secondary btn-sm remove-question-btn" style="color: var(--danger); padding: 1px 6px; font-size: 10px;"><i class="fa-solid fa-trash-can"></i> Remove</button>
          </div>
          
          <div class="form-group">
            <label style="font-size: 11px;">Question Text</label>
            <input type="text" class="q-text-input" placeholder="e.g. What does CNN stand for?" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
            <div class="form-group">
              <label style="font-size: 10px;">Option 1</label>
              <input type="text" class="q-opt-0" placeholder="Option 1" required>
            </div>
            <div class="form-group">
              <label style="font-size: 10px;">Option 2</label>
              <input type="text" class="q-opt-1" placeholder="Option 2 (Correct)" required>
            </div>
            <div class="form-group">
              <label style="font-size: 10px;">Option 3</label>
              <input type="text" class="q-opt-2" placeholder="Option 3" required>
            </div>
            <div class="form-group">
              <label style="font-size: 10px;">Option 4</label>
              <input type="text" class="q-opt-3" placeholder="Option 4" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-md); margin-top: var(--spacing-sm);">
            <div class="form-group">
              <label style="font-size: 11px;">Correct Option Index</label>
              <select class="q-correct-idx">
                <option value="0">Option 1</option>
                <option value="1">Option 2</option>
                <option value="2">Option 3</option>
                <option value="3">Option 4</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-size: 11px;">Correct Explanatory Text</label>
              <input type="text" class="q-explanation" placeholder="Provide detailed explanation for correct index choice..." required>
            </div>
          </div>
        `;

        questionsList.appendChild(qNode);

        qNode.querySelector('.remove-question-btn').addEventListener('click', () => {
          qNode.remove();
          // Reset count titles
          let qIdx = 0;
          container.querySelectorAll('#quiz-questions-list .card h4').forEach(h4 => {
            qIdx++;
            h4.textContent = `Question ${qIdx}`;
          });
          questionCounter = qIdx;
        });
      };

      addQuestionBtn.addEventListener('click', addQuestionNode);
      addQuestionNode(); // Add one question by default

      // Submit Quiz
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const courseId = courseSelect.value;
        const lessonId = lessonSelect.value;
        const title = container.querySelector('#quiz-builder-title').value.trim();

        const questionsData = [];
        container.querySelectorAll('#quiz-questions-list .card').forEach(qCard => {
          const options = [
            qCard.querySelector('.q-opt-0').value.trim(),
            qCard.querySelector('.q-opt-1').value.trim(),
            qCard.querySelector('.q-opt-2').value.trim(),
            qCard.querySelector('.q-opt-3').value.trim()
          ];

          questionsData.push({
            question: qCard.querySelector('.q-text-input').value.trim(),
            options,
            correctAnswerIndex: parseInt(qCard.querySelector('.q-correct-idx').value),
            explanation: qCard.querySelector('.q-explanation').value.trim()
          });
        });

        if (questionsData.length === 0) {
          alert('Error: You must add at least one question.');
          return;
        }

        const submitBtn = container.querySelector('#quiz-builder-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner btn-sm"></span> Publishing...`;

        try {
          const quizData = {
            lessonId,
            title,
            questions: questionsData
          };

          await API.createQuiz(courseId, quizData);
          alert('Quiz successfully published and linked to the lesson!');
          activeTab = 'instructor-analytics';
          renderTabs();
        } catch (err) {
          console.error(err);
          alert('Failed to publish quiz.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Publish Lesson Quiz`;
        }
      });
    };

    // Initial render
    renderTabs();
  }
};

Router.register('/instructor', InstructorView);
