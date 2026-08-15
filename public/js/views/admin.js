const AdminView = {
  activeTab: 'manage', // 'manage', 'add', 'attendance', 'add-student'
  attendanceSubTab: 'student', // 'student' or 'instructor'
  container: null,

  async render(container) {
    this.container = container;
    await this.renderTemplate();
  },

  async renderTemplate() {
    try {
      const courses = await API.getCourses();
      
      let users = [];
      let attendanceLogs = [];
      
      if (this.activeTab === 'attendance') {
        [users, attendanceLogs] = await Promise.all([
          API.getUsers(),
          API.getAttendance()
        ]);
      }

      this.container.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-lg);">
          <div>
            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-primary);"><i class="fa-solid fa-screwdriver-wrench"></i> Admin Dashboard</h1>
            <p style="color: var(--text-secondary);">Manage platform courses, view daily attendance logs, and create user accounts.</p>
          </div>

          <!-- Tabs -->
          <div class="tab-group" style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button class="tab-btn ${this.activeTab === 'manage' ? 'active' : ''}" id="admin-tab-manage">
              <i class="fa-solid fa-list-check"></i> Manage Courses (${courses.length})
            </button>
            <button class="tab-btn ${this.activeTab === 'add' ? 'active' : ''}" id="admin-tab-add">
              <i class="fa-solid fa-circle-plus"></i> Add Course
            </button>
            <button class="tab-btn ${this.activeTab === 'attendance' ? 'active' : ''}" id="admin-tab-attendance">
              <i class="fa-solid fa-clipboard-user"></i> Daily Attendance
            </button>
            <button class="tab-btn ${this.activeTab === 'add-student' ? 'active' : ''}" id="admin-tab-add-student">
              <i class="fa-solid fa-user-plus"></i> Add Student
            </button>
          </div>

          <!-- Tab Content -->
          <div id="admin-tab-content">
            ${this.renderActiveTabContent(courses, users, attendanceLogs)}
          </div>
        </div>
      `;

      this.bindEvents();
    } catch (err) {
      this.container.innerHTML = `<div class="card error">Failed to load admin panel: ${err.message}</div>`;
    }
  },

  renderActiveTabContent(courses, users, attendanceLogs) {
    switch (this.activeTab) {
      case 'manage':
        return this.renderManageTab(courses);
      case 'add':
        return this.renderAddTab();
      case 'attendance':
        return this.renderAttendanceTab(users, attendanceLogs);
      case 'add-student':
        return this.renderAddStudentTab();
      default:
        return this.renderManageTab(courses);
    }
  },

  renderManageTab(courses) {
    if (courses.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: var(--spacing-xxl);">
          <i class="fa-solid fa-folder-open" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
          <h3>No courses found in library</h3>
          <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">Add a course to get started.</p>
          <button class="btn btn-primary" id="admin-go-to-add">Add Course</button>
        </div>
      `;
    }

    const rows = courses.map(course => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: var(--spacing-md) var(--spacing-sm); font-weight: 700; color: var(--text-primary);">
          ${course.title}
        </td>
        <td style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-secondary);">
          ${course.category}
        </td>
        <td style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-secondary);">
          ${course.instructorName}
        </td>
        <td style="padding: var(--spacing-md) var(--spacing-sm); color: var(--primary); font-weight: 700;">
          ${Number(course.price) === 0 ? 'Free' : `₹${(Number(course.price) || 0).toFixed(2)}`}
        </td>
        <td style="padding: var(--spacing-md) var(--spacing-sm); text-align: right;">
          <button class="btn btn-secondary delete-course-btn" data-id="${course.id}" style="padding: 6px 12px; background-color: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead>
            <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
              <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Course Title</th>
              <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Category</th>
              <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Instructor</th>
              <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Price</th>
              <th style="padding: var(--spacing-md) var(--spacing-sm); text-align: right; color: var(--text-primary); font-weight: 800;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  renderAddTab() {
    return `
      <div class="card" style="padding: var(--spacing-xl);">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: var(--spacing-md); color: var(--text-primary);">Create a New AI Course</h2>
        <form id="admin-create-course-form" style="display: flex; flex-direction: column; gap: var(--spacing-md);">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            <!-- Title -->
            <div class="form-group">
              <label for="new-course-title">Course Title</label>
              <input type="text" id="new-course-title" placeholder="e.g. Advanced AI Agents" required style="width: 100%;">
            </div>
            <!-- Category -->
            <div class="form-group">
              <label for="new-course-category">Category</label>
              <select id="new-course-category" required style="width: 100%;">
                <option value="Prompt Engineering">Prompt Engineering</option>
                <option value="Generative Media">Generative Media</option>
                <option value="Deep Learning">Deep Learning</option>
                <option value="AI Safety">AI Safety</option>
                <option value="NLP">NLP</option>
                <option value="Computer Vision">Computer Vision</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            <!-- Instructor -->
            <div class="form-group">
              <label for="new-course-instructor">Instructor (Teacher)</label>
              <select id="new-course-instructor" required style="width: 100%;">
                <option value="u3|Dr. Sarah Chen">Dr. Sarah Chen</option>
                <option value="u4|Liam Carter">Liam Carter</option>
                <option value="u5|Dr. Alan Turing">Dr. Alan Turing</option>
                <option value="u6|Prof. Geoffrey Hinton">Prof. Geoffrey Hinton</option>
                <option value="u7|Dr. Fei-Fei Li">Dr. Fei-Fei Li</option>
              </select>
            </div>
            <!-- Price -->
            <div class="form-group">
              <label for="new-course-price">Price (INR / ₹)</label>
              <input type="number" id="new-course-price" step="0.01" min="0" placeholder="e.g. 499.00" required style="width: 100%;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            <!-- Difficulty -->
            <div class="form-group">
              <label for="new-course-difficulty">Difficulty</label>
              <select id="new-course-difficulty" required style="width: 100%;">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <!-- Duration -->
            <div class="form-group">
              <label for="new-course-duration">Duration</label>
              <input type="text" id="new-course-duration" placeholder="e.g. 3h 15m" required style="width: 100%;">
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="new-course-description">Short Description</label>
            <textarea id="new-course-description" placeholder="Provide a brief summary of what students will learn..." required style="width: 100%; min-height: 80px;"></textarea>
          </div>

          <!-- Image URL -->
          <div class="form-group">
            <label for="new-course-image">Image URL (Optional)</label>
            <input type="url" id="new-course-image" placeholder="https://images.unsplash.com/photo-..." style="width: 100%;">
          </div>

          <!-- Submit Button -->
          <button type="submit" class="btn btn-primary" style="align-self: flex-start; margin-top: var(--spacing-sm);">
            <i class="fa-solid fa-floppy-disk"></i> Publish Course
          </button>
        </form>
      </div>
    `;
  },

  renderAttendanceTab(users, attendanceLogs) {
    const today = new Date().toISOString().split('T')[0];
    const filteredUsers = users.filter(u => u.role === this.attendanceSubTab);

    // Today's attendance list logs userIds
    const todayPresentIds = new Set(
      attendanceLogs
        .filter(log => log.date === today)
        .map(log => log.userId)
    );

    const totalPresent = filteredUsers.filter(u => todayPresentIds.has(u.id)).length;
    const totalAbsent = filteredUsers.length - totalPresent;

    const rows = filteredUsers.map(u => {
      const isPresent = todayPresentIds.has(u.id);
      
      const badgeClass = isPresent ? 'badge-success' : 'badge-secondary';
      const statusText = isPresent ? '<i class="fa-solid fa-circle-check"></i> Present' : '<i class="fa-regular fa-circle-xmark"></i> Absent';
      const lastActive = u.lastActiveDate || 'Never';

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: var(--spacing-md) var(--spacing-sm); display: flex; align-items: center; gap: var(--spacing-sm);">
            <img src="${u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">
            <span style="font-weight: 700; color: var(--text-primary);">${escapeHTML(u.username)}</span>
          </td>
          <td style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-secondary);">
            ${escapeHTML(u.email)}
          </td>
          <td style="padding: var(--spacing-md) var(--spacing-sm);">
            <span class="badge ${badgeClass}">${statusText}</span>
          </td>
          <td style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-muted); font-size: 13px;">
            ${lastActive}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        
        <!-- Stats Summary cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
          <div class="card" style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Logged In Today</span>
            <span style="font-size: 24px; font-weight: 800; color: var(--success);">${totalPresent} Present</span>
          </div>
          <div class="card" style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Inactive Today</span>
            <span style="font-size: 24px; font-weight: 800; color: var(--text-muted);">${totalAbsent} Absent</span>
          </div>
        </div>

        <!-- Role Subtabs selector -->
        <div class="tab-group" style="border-bottom: 2px solid var(--border-color); padding-bottom: 0; background: none; justify-content: flex-start; gap: var(--spacing-sm);">
          <button class="filter-btn ${this.attendanceSubTab === 'student' ? 'active' : ''}" id="att-subtab-student" style="padding: 8px 16px;">
            Students
          </button>
          <button class="filter-btn ${this.attendanceSubTab === 'instructor' ? 'active' : ''}" id="att-subtab-instructor" style="padding: 8px 16px;">
            Instructors (Teachers)
          </button>
        </div>

        <!-- Attendance Table -->
        <div class="card" style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
              <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">User</th>
                <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Email ID</th>
                <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Daily Attendance</th>
                <th style="padding: var(--spacing-md) var(--spacing-sm); color: var(--text-primary); font-weight: 800;">Last Active</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="4" style="text-align: center; padding: var(--spacing-xl); color: var(--text-muted);">No records found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAddStudentTab() {
    return `
      <div class="card" style="max-width: 500px; margin: 0 auto; padding: var(--spacing-xl);">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: var(--spacing-md); color: var(--text-primary);"><i class="fa-solid fa-user-plus"></i> Create Student Account</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: var(--spacing-md);">Students added here can immediately log in to the learning portal with their email credentials.</p>
        
        <form id="admin-add-student-form" style="display: flex; flex-direction: column; gap: var(--spacing-md);">
          <div class="form-group">
            <label for="student-username">Student Name (Username)</label>
            <input type="text" id="student-username" placeholder="e.g. Rahul Sharma" required style="width: 100%;">
          </div>

          <div class="form-group">
            <label for="student-email">Email Address</label>
            <input type="email" id="student-email" placeholder="e.g. rahul@auraai.com" required style="width: 100%;">
          </div>

          <div class="form-group">
            <label for="student-password">Password</label>
            <input type="password" id="student-password" placeholder="Min. 6 characters" required style="width: 100%;">
          </div>

          <div id="student-add-message" style="display: none; padding: var(--spacing-sm); border-radius: var(--border-radius-sm); font-size: 13px;"></div>

          <button type="submit" class="btn btn-primary" style="justify-content: center; margin-top: var(--spacing-xs);">
            <i class="fa-solid fa-user-check"></i> Register Student
          </button>
        </form>
      </div>
    `;
  },

  bindEvents() {
    // Top Tabs navigation triggers
    const tabSelectors = {
      'manage': '#admin-tab-manage',
      'add': '#admin-tab-add',
      'attendance': '#admin-tab-attendance',
      'add-student': '#admin-tab-add-student'
    };

    Object.entries(tabSelectors).forEach(([tab, selector]) => {
      const btn = this.container.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', () => {
          this.activeTab = tab;
          this.renderTemplate();
        });
      }
    });

    const btnGoAdd = this.container.querySelector('#admin-go-to-add');
    if (btnGoAdd) {
      btnGoAdd.addEventListener('click', () => {
        this.activeTab = 'add';
        this.renderTemplate();
      });
    }

    // Attendance subtabs toggling triggers
    const subStudent = this.container.querySelector('#att-subtab-student');
    const subInstructor = this.container.querySelector('#att-subtab-instructor');

    if (subStudent) {
      subStudent.addEventListener('click', () => {
        this.attendanceSubTab = 'student';
        this.renderTemplate();
      });
    }

    if (subInstructor) {
      subInstructor.addEventListener('click', () => {
        this.attendanceSubTab = 'instructor';
        this.renderTemplate();
      });
    }

    // Delete Course handler
    this.container.querySelectorAll('.delete-course-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this course from the library? This cannot be undone.')) {
          try {
            btn.disabled = true;
            btn.textContent = 'Deleting...';
            await API.deleteCourse(id);
            this.renderTemplate(); // Refresh view
          } catch (err) {
            alert(`Failed to delete course: ${err.message}`);
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete`;
          }
        }
      });
    });

    // Create Course Form submission
    const courseForm = this.container.querySelector('#admin-create-course-form');
    if (courseForm) {
      courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const [instId, instName] = this.container.querySelector('#new-course-instructor').value.split('|');
        const defaultImages = [
          'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1547891654-e66ed7edd96c?w=500&auto=format&fit=crop&q=60',
          'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=500&auto=format&fit=crop&q=60'
        ];
        
        const courseData = {
          title: this.container.querySelector('#new-course-title').value.trim(),
          description: this.container.querySelector('#new-course-description').value.trim(),
          category: this.container.querySelector('#new-course-category').value,
          instructorId: instId,
          instructorName: instName,
          price: parseFloat(this.container.querySelector('#new-course-price').value),
          difficulty: this.container.querySelector('#new-course-difficulty').value,
          duration: this.container.querySelector('#new-course-duration').value.trim(),
          image: this.container.querySelector('#new-course-image').value.trim() || defaultImages[Math.floor(Math.random() * 3)],
          modules: [],
          quizzes: []
        };

        try {
          const submitBtn = courseForm.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Publishing...';
          
          await API.createCourse(courseData);
          
          alert('Course published successfully!');
          this.activeTab = 'manage';
          this.renderTemplate();
        } catch (err) {
          alert(`Failed to publish course: ${err.message}`);
          courseForm.querySelector('button[type="submit"]').disabled = false;
          courseForm.querySelector('button[type="submit"]').innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Publish Course`;
        }
      });
    }

    // Add Student Form submission
    const studentForm = this.container.querySelector('#admin-add-student-form');
    if (studentForm) {
      studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = this.container.querySelector('#student-username').value.trim();
        const email = this.container.querySelector('#student-email').value.trim();
        const password = this.container.querySelector('#student-password').value.trim();

        const messageEl = this.container.querySelector('#student-add-message');
        const submitBtn = studentForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner btn-sm"></span> Registering Student...`;

        try {
          await API.createStudent({ username, email, password });

          messageEl.style.display = 'block';
          messageEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
          messageEl.style.color = 'var(--success)';
          messageEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Student account <strong>${escapeHTML(username)}</strong> registered successfully!`;

          studentForm.reset();
        } catch (err) {
          messageEl.style.display = 'block';
          messageEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          messageEl.style.color = 'var(--danger)';
          messageEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Error registering student: ${err.message}`;
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> Register Student`;
        }
      });
    }
  }
};

Router.register('/admin', AdminView);
