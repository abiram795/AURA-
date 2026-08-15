const Router = {
  routes: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('DOMContentLoaded', () => this.handleRouting());
  },

  register(path, viewObject) {
    this.routes[path] = viewObject;
  },

  async handleRouting() {
    const hash = window.location.hash || '#/dashboard';
    AppState.activeRoute = hash;

    // Check if user is logged in
    const userId = localStorage.getItem('aura_userId');
    if (!userId && hash !== '#/login') {
      window.location.hash = '#/login';
      return;
    }

    if (userId && !AppState.currentUser) {
      // Re-fetch current user from API
      try {
        const user = await API.getUser(userId);
        AppState.setUser(user);
        // Verify streak
        await API.checkStreak(userId);
      } catch (err) {
        console.error('Failed to load user state:', err);
        localStorage.removeItem('aura_userId');
        window.location.hash = '#/login';
        return;
      }
    }

    if (AppState.currentUser && AppState.currentUser.role === 'admin' && hash !== '#/admin') {
      window.location.hash = '#/admin';
      return;
    }

    // Always synchronize sidebar/shell UI with active user if logged in
    if (AppState.currentUser) {
      const user = AppState.currentUser;
      const sidebarAvatar = document.getElementById('sidebar-avatar');
      const sidebarUsername = document.getElementById('sidebar-username');
      const sidebarRole = document.getElementById('sidebar-role');
      const streakCount = document.getElementById('header-streak-count');
      const navInstructor = document.getElementById('nav-instructor');

      if (sidebarAvatar) sidebarAvatar.src = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
      if (sidebarUsername) sidebarUsername.textContent = user.username;
      if (sidebarRole) sidebarRole.textContent = user.role;
      if (streakCount) streakCount.textContent = user.streak || 0;
      
      // Show/hide navigation options dynamically based on user role
      const navDashboard = document.getElementById('nav-dashboard');
      const navCourses = document.getElementById('nav-courses');
      const navLeaderboard = document.getElementById('nav-leaderboard');
      const navBookmarks = document.getElementById('nav-bookmarks');
      const navProfile = document.getElementById('nav-profile');
      const navAdmin = document.getElementById('nav-admin');

      if (user.role === 'admin') {
        if (navDashboard) navDashboard.style.display = 'none';
        if (navCourses) navCourses.style.display = 'none';
        if (navLeaderboard) navLeaderboard.style.display = 'none';
        if (navBookmarks) navBookmarks.style.display = 'none';
        if (navProfile) navProfile.style.display = 'none';
        if (navInstructor) navInstructor.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'flex';
      } else {
        if (navDashboard) navDashboard.style.display = 'flex';
        if (navCourses) navCourses.style.display = 'flex';
        if (navLeaderboard) navLeaderboard.style.display = 'flex';
        if (navBookmarks) navBookmarks.style.display = 'flex';
        if (navProfile) navProfile.style.display = 'flex';
        if (navInstructor) {
          navInstructor.style.display = (user.role === 'instructor') ? 'flex' : 'none';
        }
        if (navAdmin) navAdmin.style.display = 'none';
      }

      // Setup notification loading
      if (window.AppShell) {
        window.AppShell.loadNotifications();
      }
    }

    // Force onboarding if logged in but interests are empty
    if (AppState.currentUser && (!AppState.currentUser.interests || AppState.currentUser.interests.length === 0) && hash !== '#/onboarding' && hash !== '#/login') {
      window.location.hash = '#/onboarding';
      return;
    }

    // Parse route and params
    const matched = this.matchRoute(hash);
    if (!matched) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Check Role Restrictions
    if (matched.route === '/instructor' && AppState.currentUser.role !== 'instructor') {
      window.location.hash = '#/dashboard';
      return;
    }
    if (matched.route === '/admin' && AppState.currentUser.role !== 'admin') {
      window.location.hash = '#/dashboard';
      return;
    }

    // Update active nav links
    this.updateActiveNav(matched.route);

    // Toggle shell visibility based on route
    if (matched.route === '/login') {
      document.getElementById('app-shell').style.display = 'none';
      document.getElementById('login-view-container').style.display = 'block';
    } else {
      document.getElementById('login-view-container').style.display = 'none';
      document.getElementById('app-shell').style.display = 'grid';
    }

    // Render the view
    const view = this.routes[matched.route];
    if (view && typeof view.render === 'function') {
      const container = matched.route === '/login' 
        ? document.getElementById('login-view-container')
        : document.getElementById('app-router-view');
      
      // Inject loader
      container.innerHTML = `
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span style="font-size: 13px; color: var(--text-muted);">Loading AuraAI...</span>
        </div>
      `;

      try {
        await view.render(container, matched.params);
      } catch (err) {
        console.error(`Error rendering view for ${matched.route}:`, err);
        container.innerHTML = `
          <div style="padding: var(--spacing-xl); text-align: center;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--danger); margin-bottom: var(--spacing-md);"></i>
            <h2>Could not load page</h2>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">${err.message}</p>
            <a href="#/dashboard" class="btn btn-primary">Go to Dashboard</a>
          </div>
        `;
      }
    }
  },

  matchRoute(hash) {
    const cleanHash = hash.replace(/^#/, ''); // Remove #
    const hashParts = cleanHash.split('?')[0].split('/').filter(Boolean); // Ignore queries
    
    // exact match fallback
    if (cleanHash === '/login') return { route: '/login', params: {} };
    if (cleanHash === '/onboarding') return { route: '/onboarding', params: {} };
    if (cleanHash === '/dashboard') return { route: '/dashboard', params: {} };
    if (cleanHash === '/courses') return { route: '/courses', params: {} };
    if (cleanHash === '/leaderboard') return { route: '/leaderboard', params: {} };
    if (cleanHash === '/bookmarks') return { route: '/bookmarks', params: {} };
    if (cleanHash === '/profile') return { route: '/profile', params: {} };
    if (cleanHash === '/instructor') return { route: '/instructor', params: {} };
    if (cleanHash === '/admin') return { route: '/admin', params: {} };

    // Dynamic routing
    // e.g. /course/c1
    if (hashParts[0] === 'course' && hashParts[1]) {
      return { route: '/course/:id', params: { id: hashParts[1] } };
    }
    // e.g. /quiz/q1
    if (hashParts[0] === 'quiz' && hashParts[1]) {
      return { route: '/quiz/:id', params: { id: hashParts[1] } };
    }

    return null;
  },

  updateActiveNav(route) {
    // Remove active class from all
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    let activeId = '';
    if (route === '/dashboard') activeId = 'nav-dashboard';
    else if (route === '/courses' || route.startsWith('/course/')) activeId = 'nav-courses';
    else if (route === '/leaderboard') activeId = 'nav-leaderboard';
    else if (route === '/bookmarks') activeId = 'nav-bookmarks';
    else if (route === '/profile') activeId = 'nav-profile';
    else if (route === '/instructor') activeId = 'nav-instructor';
    else if (route === '/admin') activeId = 'nav-admin';

    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');

    // Close mobile menu when nav changes
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
};

Router.init();
