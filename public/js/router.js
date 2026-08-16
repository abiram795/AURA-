const Router = {
  routes: {},
  _routing: false, // Mutex to prevent concurrent routing calls

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('DOMContentLoaded', () => this.handleRouting());
  },

  register(path, viewObject) {
    this.routes[path] = viewObject;
  },

  // Safe navigation — never triggers re-entrant routing
  _navigate(hash) {
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  },

  async handleRouting() {
    // Mutex: if already routing, skip this call
    if (this._routing) return;
    this._routing = true;

    try {
      await this._doRouting();
    } catch (err) {
      console.error('[Router] Unhandled routing error:', err);
    } finally {
      this._routing = false;
    }
  },

  async _doRouting() {
    const hash = window.location.hash || '#/dashboard';
    AppState.activeRoute = hash;

    // ---- 1. PUBLIC ROUTE CHECK ----
    const isPublicRoute = hash.startsWith('#/verify/') || hash === '#/login' || hash === '#/onboarding';
    const userId = localStorage.getItem('aura_userId');

    if (!userId && !isPublicRoute) {
      this._navigate('#/login');
      return;
    }

    // ---- 2. USER STATE RESTORATION (only when not already loaded) ----
    if (userId && !AppState.currentUser) {
      try {
        const user = await API.getUser(userId);

        // Validate user object — must have id and role to be usable
        if (!user || !user.id || !user.role) {
          console.warn('[Router] Invalid user data for stored userId. Clearing session.');
          localStorage.removeItem('aura_userId');
          this._navigate('#/login');
          return;
        }

        AppState.setUser(user);

        // Non-blocking streak check
        API.checkStreak(userId).catch(e => console.warn('[Router] Streak non-fatal:', e.message));

      } catch (err) {
        console.error('[Router] Failed to restore user state:', err);
        localStorage.removeItem('aura_userId');
        this._navigate('#/login');
        return;
      }
    }

    // ---- 3. ROLE-BASED REDIRECTS (only for authenticated users) ----
    if (AppState.currentUser) {
      const role = AppState.currentUser.role;

      if (role === 'admin' && hash !== '#/admin') {
        this._navigate('#/admin');
        return;
      }

      if (role === 'instructor' &&
          hash !== '#/instructor' &&
          hash !== '#/profile' &&
          hash !== '#/leaderboard') {
        this._navigate('#/instructor');
        return;
      }

      // ---- 4. ONBOARDING GUARD ----
      // Only redirect to onboarding if:
      // - User is a student
      // - Interests are genuinely empty (not just an offline fallback)
      // - We are NOT already on onboarding or login
      // - Session flag says onboarding is needed (set by login view)
      const needsOnboarding = role === 'student' &&
        hash !== '#/onboarding' &&
        hash !== '#/login' &&
        sessionStorage.getItem('aura_needs_onboarding') === 'true';

      if (needsOnboarding) {
        this._navigate('#/onboarding');
        return;
      }
    }

    // ---- 5. SIDEBAR UI SYNC ----
    if (AppState.currentUser) {
      const user = AppState.currentUser;
      const sidebarAvatar   = document.getElementById('sidebar-avatar');
      const sidebarUsername = document.getElementById('sidebar-username');
      const sidebarRole     = document.getElementById('sidebar-role');
      const streakCount     = document.getElementById('header-streak-count');
      const navInstructor   = document.getElementById('nav-instructor');
      const navDashboard    = document.getElementById('nav-dashboard');
      const navCourses      = document.getElementById('nav-courses');
      const navLeaderboard  = document.getElementById('nav-leaderboard');
      const navBookmarks    = document.getElementById('nav-bookmarks');
      const navProfile      = document.getElementById('nav-profile');
      const navAdmin        = document.getElementById('nav-admin');

      if (sidebarAvatar)   sidebarAvatar.src = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
      if (sidebarUsername) sidebarUsername.textContent = user.username;
      if (sidebarRole)     sidebarRole.textContent = user.role;
      if (streakCount)     streakCount.textContent = user.streak || 0;

      if (user.role === 'admin') {
        if (navDashboard)   navDashboard.style.display   = 'none';
        if (navCourses)     navCourses.style.display     = 'none';
        if (navLeaderboard) navLeaderboard.style.display = 'none';
        if (navBookmarks)   navBookmarks.style.display   = 'none';
        if (navProfile)     navProfile.style.display     = 'none';
        if (navInstructor)  navInstructor.style.display  = 'none';
        if (navAdmin)       navAdmin.style.display       = 'flex';
      } else if (user.role === 'instructor') {
        if (navDashboard)   navDashboard.style.display   = 'none';
        if (navCourses)     navCourses.style.display     = 'none';
        if (navLeaderboard) navLeaderboard.style.display = 'flex';
        if (navBookmarks)   navBookmarks.style.display   = 'none';
        if (navProfile)     navProfile.style.display     = 'flex';
        if (navInstructor)  navInstructor.style.display  = 'flex';
        if (navAdmin)       navAdmin.style.display       = 'none';
      } else {
        if (navDashboard)   navDashboard.style.display   = 'flex';
        if (navCourses)     navCourses.style.display     = 'flex';
        if (navLeaderboard) navLeaderboard.style.display = 'flex';
        if (navBookmarks)   navBookmarks.style.display   = 'flex';
        if (navProfile)     navProfile.style.display     = 'flex';
        if (navInstructor)  navInstructor.style.display  = 'none';
        if (navAdmin)       navAdmin.style.display       = 'none';
      }

      if (window.AppShell) window.AppShell.loadNotifications();
    }

    // ---- 6. ROUTE MATCHING ----
    const matched = this.matchRoute(hash);
    if (!matched) {
      // Unknown route — go to dashboard (or login if not authenticated)
      this._navigate(AppState.currentUser ? '#/dashboard' : '#/login');
      return;
    }

    // Role-restricted pages
    if (AppState.currentUser) {
      if (matched.route === '/instructor' && AppState.currentUser.role !== 'instructor') {
        this._navigate('#/dashboard');
        return;
      }
      if (matched.route === '/admin' && AppState.currentUser.role !== 'admin') {
        this._navigate('#/dashboard');
        return;
      }
    }

    // ---- 7. SHELL VISIBILITY ----
    const isFullscreen = matched.route === '/login' ||
                         matched.route === '/onboarding' ||
                         matched.route === '/verify/:id';

    const appShell           = document.getElementById('app-shell');
    const loginViewContainer = document.getElementById('login-view-container');

    if (isFullscreen) {
      if (appShell)           appShell.style.display           = 'none';
      if (loginViewContainer) loginViewContainer.style.display = 'flex';
    } else {
      if (loginViewContainer) loginViewContainer.style.display = 'none';
      if (appShell)           appShell.style.display           = 'grid';
    }

    // ---- 8. ACTIVE NAV ----
    this.updateActiveNav(matched.route);

    // ---- 9. RENDER VIEW ----
    const view = this.routes[matched.route];
    if (!view || typeof view.render !== 'function') return;

    const container = isFullscreen
      ? loginViewContainer
      : document.getElementById('app-router-view');

    if (!container) return;

    container.innerHTML = `
      <div class="loading-overlay">
        <div class="spinner"></div>
        <span style="font-size: 13px; color: var(--text-muted);">Loading AuraAI...</span>
      </div>
    `;

    try {
      await view.render(container, matched.params);
    } catch (err) {
      console.error(`[Router] Error rendering view for ${matched.route}:`, err);
      container.innerHTML = `
        <div style="padding: var(--spacing-xl); text-align: center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--danger); margin-bottom: var(--spacing-md);"></i>
          <h2>Could not load page</h2>
          <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">${err.message}</p>
          <a href="#/dashboard" class="btn btn-primary">Go to Dashboard</a>
        </div>
      `;
    }
  },

  matchRoute(hash) {
    const cleanHash = hash.replace(/^#/, '');
    const hashParts = cleanHash.split('?')[0].split('/').filter(Boolean);

    // Exact routes
    if (cleanHash === '/login')       return { route: '/login',       params: {} };
    if (cleanHash === '/onboarding')  return { route: '/onboarding',  params: {} };
    if (cleanHash === '/dashboard')   return { route: '/dashboard',   params: {} };
    if (cleanHash === '/courses')     return { route: '/courses',     params: {} };
    if (cleanHash === '/leaderboard') return { route: '/leaderboard', params: {} };
    if (cleanHash === '/bookmarks')   return { route: '/bookmarks',   params: {} };
    if (cleanHash === '/profile')     return { route: '/profile',     params: {} };
    if (cleanHash === '/instructor')  return { route: '/instructor',  params: {} };
    if (cleanHash === '/admin')       return { route: '/admin',       params: {} };

    // Dynamic routes
    if (hashParts[0] === 'course' && hashParts[1])
      return { route: '/course/:id', params: { id: hashParts[1] } };
    if (hashParts[0] === 'quiz' && hashParts[1])
      return { route: '/quiz/:id', params: { id: hashParts[1] } };
    if (hashParts[0] === 'verify' && hashParts[1])
      return { route: '/verify/:id', params: { id: hashParts[1] } };

    return null;
  },

  updateActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    let activeId = '';
    if (route === '/dashboard')  activeId = 'nav-dashboard';
    else if (route === '/courses' || route === '/course/:id') activeId = 'nav-courses';
    else if (route === '/leaderboard') activeId = 'nav-leaderboard';
    else if (route === '/bookmarks')   activeId = 'nav-bookmarks';
    else if (route === '/profile')     activeId = 'nav-profile';
    else if (route === '/instructor')  activeId = 'nav-instructor';
    else if (route === '/admin')       activeId = 'nav-admin';

    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
};

Router.init();
