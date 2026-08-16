// Configure your live hosted backend URL below (e.g. on Render, Heroku, or Railway)
// If left empty, it will default to http://localhost:3000 during local development.
const PRODUCTION_API_URL = 'https://aura-xv1e.onrender.com'; // <-- PASTE YOUR LIVE BACKEND URL HERE (e.g., 'https://auraai-backend.onrender.com')

const API_BASE = PRODUCTION_API_URL
  ? PRODUCTION_API_URL
  : (window.location.port === '3000' ? '' : 'http://localhost:3000');

const API = {
  // Common request handler
  async request(endpoint, options = {}) {
    const isOffline = !navigator.onLine;
    const banner = document.getElementById('offline-banner');

    if (isOffline) {
      if (banner) {
        banner.style.display = 'block';
        banner.style.backgroundColor = 'var(--danger)';
        const textSpan = banner.querySelector('span');
        if (textSpan) textSpan.textContent = 'You are currently offline. Running in cached offline mode.';
      }
    } else {
      if (banner) {
        banner.style.display = 'none';
      }
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`API error on ${endpoint}: ${response.statusText}`);
      }

      // Hide banner since server is fully reachable and responding
      if (banner && !isOffline) {
        banner.style.display = 'none';
      }

      return await response.json();
    } catch (err) {
      console.warn(`Fetch error for ${endpoint}, using offline fallbacks:`, err);

      // Only show unreachable banner if it is a true connection failure (e.g., TypeError: Failed to fetch)
      // and NOT a normal server error response (such as 404 or 500)
      const isConnectionError = err instanceof TypeError || err.message?.includes('fetch') || err.message?.includes('NetworkError');
      if (navigator.onLine && banner && isConnectionError) {
        banner.style.display = 'block';
        banner.style.backgroundColor = 'var(--accent-streak)'; // Yellow-orange streak alert color
        const textSpan = banner.querySelector('span');
        if (textSpan) {
          textSpan.innerHTML = '<i class="fa-solid fa-server"></i> Local server unreachable. Running with client-side mock data. Start server with <code>npm run dev</code>.';
        }
      }
      return this.getOfflineFallback(endpoint, options);
    }
  },

  // Fallback mocks for robust visual verification even in network-disconnected states
  getOfflineFallback(endpoint, options) {
    console.log(`Offline fallback triggered for endpoint: ${endpoint}`);

    if (endpoint === '/api/auth/login') {
      const { email, password } = JSON.parse(options.body);
      if (email.toLowerCase().trim() === 'student@auraai.com' && password === 'student123') {
        return {
          id: 'u1',
          username: 'Abiram Sureshbabu',
          email: 'student@auraai.com',
          role: 'student',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Abiram',
          bio: 'Enthusiastic full-stack AI explorer. Learning neural networks and agents.',
          xp: 340,
          level: 2,
          streak: 5,
          interests: ['Prompt Engineering', 'NLP'],
          badges: ['b1', 'b2'],
          goals: { daily: 50, weekly: 250, completedToday: 30 }
        };
      } else if (email.toLowerCase().trim() === 'instructor@auraai.com' && password === 'instructor123') {
        return {
          id: 'u2',
          username: 'Dr. Sarah Chen',
          email: 'instructor@auraai.com',
          role: 'instructor',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sarah',
          bio: 'Professor of Computer Science & ML researcher. Specializes in LLMs and AI Agents.',
          xp: 1250,
          level: 6,
          streak: 15,
          interests: ['Deep Learning', 'NLP'],
          badges: [],
          goals: {}
        };
      } else {
        throw new Error('Invalid email or password');
      }
    }

    if (endpoint.startsWith('/api/users/')) {
      const parts = endpoint.split('/');
      const id = parts[3];
      if (endpoint.endsWith('/streak')) {
        return { id, streak: 5, lastActiveDate: new Date().toISOString().split('T')[0] };
      }
      return {
        id,
        username: id === 'u1' ? 'Abiram Sureshbabu' : 'Dr. Sarah Chen',
        role: id === 'u1' ? 'student' : 'instructor',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id === 'u1' ? 'Abiram' : 'Sarah'}`,
        bio: 'Bio details cached offline.',
        xp: id === 'u1' ? 340 : 1250,
        level: id === 'u1' ? 2 : 6,
        streak: id === 'u1' ? 5 : 15,
        interests: ['Prompt Engineering', 'NLP'],
        badges: id === 'u1' ? ['b1', 'b2'] : [],
        goals: id === 'u1' ? { daily: 50, weekly: 250, completedToday: 30 } : {}
      };
    }

    if (endpoint === '/api/users') {
      return [
        { id: 'u1', username: 'Abiram Sureshbabu', role: 'student', email: 'student@auraai.com' },
        { id: 'u2', username: 'Dr. Sarah Chen', role: 'instructor', email: 'instructor@auraai.com' }
      ];
    }

    if (endpoint.startsWith('/api/courses/')) {
      return {
        id: 'c1',
        title: 'Intro to Prompt Engineering (Offline)',
        description: 'Offline course copy cached in browser.',
        modules: []
      };
    }

    if (endpoint.startsWith('/api/courses')) {
      return [
        {
          id: 'c1',
          title: 'Intro to Prompt Engineering',
          description: 'Learn zero-shot, few-shot prompt principles.',
          instructorName: 'Dr. Sarah Chen',
          category: 'Prompt Engineering',
          difficulty: 'Beginner',
          duration: '3h 45m',
          xpReward: 200,
          modules: []
        }
      ];
    }

    if (endpoint.startsWith('/api/progress/bookmarks/')) {
      return [];
    }

    if (endpoint.startsWith('/api/progress/')) {
      return [];
    }

    if (endpoint.startsWith('/api/comments/')) {
      return [];
    }

    if (endpoint.startsWith('/api/notifications/')) {
      return [];
    }

    if (endpoint === '/api/instructor/analytics') {
      return { totalStudents: 2, activeCourses: 1, courseStats: [] };
    }

    if (endpoint === '/api/admin/attendance') {
      return [
        { id: 'att_1', userId: 'u1', username: 'Abiram Sureshbabu', role: 'student', date: new Date().toISOString().split('T')[0] },
        { id: 'att_2', userId: 'u3', username: 'Dr. Sarah Chen', role: 'instructor', date: new Date().toISOString().split('T')[0] }
      ];
    }

    if (endpoint === '/api/admin/students') {
      const data = JSON.parse(options.body);
      return { id: 'u_' + Date.now(), ...data, role: 'student' };
    }

    if (endpoint.startsWith('/api/instructors/') && endpoint.endsWith('/rate')) {
      return { rating: 4.5, ratingCount: 15 };
    }

    return { success: true };
  },

  // Users API
  async getUsers() {
    return this.request('/api/users');
  },

  async getUser(id) {
    return this.request(`/api/users/${id}`);
  },

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async updateUser(id, updateData) {
    return this.request(`/api/users/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
  },

  async checkStreak(id) {
    return this.request(`/api/users/${id}/streak`, { method: 'POST' });
  },

  // Courses API
  async getCourses(search = '', category = '') {
    let url = '/api/courses';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.request(url);
  },

  async getCourse(id) {
    return this.request(`/api/courses/${id}`);
  },

  async createCourse(courseData) {
    return this.request('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  },

  async deleteCourse(id) {
    return this.request(`/api/courses/${id}/delete`, {
      method: 'POST'
    });
  },

  async createQuiz(courseId, quizData) {
    return this.request(`/api/courses/${courseId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },

  // Progress API
  async getProgress(userId) {
    return this.request(`/api/progress/${userId}`);
  },

  async enroll(userId, courseId) {
    return this.request('/api/progress/enroll', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId })
    });
  },

  async purchase(userId, courseId) {
    return this.request('/api/progress/purchase', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId })
    });
  },

  async completeLesson(userId, courseId, lessonId) {
    return this.request('/api/progress/complete-lesson', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId, lessonId })
    });
  },

  async submitQuizScore(userId, courseId, quizId, score) {
    return this.request('/api/progress/quiz', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId, quizId, score })
    });
  },

  async toggleBookmark(userId, courseId, lessonId, notes, active) {
    return this.request('/api/progress/bookmark', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId, lessonId, notes, active })
    });
  },

  async getBookmarks(userId) {
    return this.request(`/api/progress/bookmarks/${userId}`);
  },

  // Comments API
  async getComments(lessonId) {
    return this.request(`/api/comments/${lessonId}`);
  },

  async postComment(lessonId, userId, commentText) {
    return this.request('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ lessonId, userId, commentText })
    });
  },

  // Notifications API
  async getNotifications(userId) {
    return this.request(`/api/notifications/${userId}`);
  },

  async markNotificationsRead(userId) {
    return this.request('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  // Instructor Analytics API
  async getInstructorAnalytics() {
    return this.request('/api/instructor/analytics');
  },

  // Attendance & Admin Operations
  async getAttendance() {
    return this.request('/api/admin/attendance');
  },

  async createStudent(studentData) {
    return this.request('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  async markAttendance(userId) {
    return this.request(`/api/users/${userId}/attendance`, {
      method: 'POST'
    });
  },

  async rateInstructor(instructorId, rating, raterId) {
    return this.request(`/api/instructors/${instructorId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, raterId })
    });
  }
};
