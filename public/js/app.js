const AppShell = {
  init() {
    this.setupTheme();
    this.setupLanguage();
    this.setupSidebarToggle();
    this.setupNotifications();
    this.setupGlobalSearch();
    this.setupLogout();
    this.setupProfileLink();
  },

  setupTheme() {
    AppState.applyTheme();
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const nextTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
        AppState.saveTheme(nextTheme);
      });
    }
  },

  setupLanguage() {
    AppState.applyTranslations();
    const btn = document.getElementById('language-toggle-btn');
    const indicator = document.getElementById('lang-indicator');
    const dropdown = document.getElementById('language-dropdown');
    
    if (btn && dropdown) {
      // Set initial state
      indicator.textContent = AppState.currentLanguage.toUpperCase();
      this.updateActiveLanguageClass();

      // Show/Hide dropdown toggle
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other open dropdowns
        const notifDropdown = document.getElementById('notif-dropdown');
        if (notifDropdown) notifDropdown.style.display = 'none';
        
        const isVisible = dropdown.style.display === 'flex';
        dropdown.style.display = isVisible ? 'none' : 'flex';
      });

      // Handle language selection options click
      dropdown.querySelectorAll('.lang-option-btn').forEach(opt => {
        opt.addEventListener('click', () => {
          const selectedLang = opt.getAttribute('data-lang');
          AppState.saveLanguage(selectedLang);
          indicator.textContent = selectedLang.toUpperCase();
          dropdown.style.display = 'none';
          this.updateActiveLanguageClass();
        });
      });

      // Close dropdown if clicked outside
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });
    }
  },

  updateActiveLanguageClass() {
    const dropdown = document.getElementById('language-dropdown');
    if (dropdown) {
      dropdown.querySelectorAll('.lang-option-btn').forEach(opt => {
        const lang = opt.getAttribute('data-lang');
        if (lang === AppState.currentLanguage) {
          opt.style.backgroundColor = 'var(--primary-glow)';
          opt.style.color = 'var(--primary)';
          opt.style.fontWeight = '700';
        } else {
          opt.style.backgroundColor = 'transparent';
          opt.style.color = 'var(--text-primary)';
          opt.style.fontWeight = '500';
        }
      });
    }
  },

  setupSidebarToggle() {
    const toggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });

      // Close sidebar if clicked outside
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  setupNotifications() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const dropdown = document.getElementById('notif-dropdown');
    const clearBtn = document.getElementById('mark-all-read-btn');

    if (bellBtn && dropdown) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'flex';
        dropdown.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible && AppState.currentUser) {
          this.loadNotifications();
        }
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== bellBtn) {
          dropdown.style.display = 'none';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!AppState.currentUser) return;
        await API.markNotificationsRead(AppState.currentUser.id);
        this.loadNotifications();
      });
    }
  },

  async loadNotifications() {
    if (!AppState.currentUser) return;
    const notifs = await API.getNotifications(AppState.currentUser.id);
    const countBadge = document.getElementById('notif-count');
    const listContainer = document.getElementById('notif-list-container');
    
    const unreadCount = notifs.filter(n => !n.read).length;

    if (unreadCount > 0) {
      countBadge.textContent = unreadCount;
      countBadge.style.display = 'flex';
    } else {
      countBadge.style.display = 'none';
    }

    if (!listContainer) return;

    if (notifs.length === 0) {
      listContainer.innerHTML = `
        <div class="notification-empty" data-i18n="notif-empty">No notifications yet</div>
      `;
      AppState.applyTranslations();
      return;
    }

    listContainer.innerHTML = notifs.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notification-title">${escapeHTML(n.title)}</div>
        <div class="notification-msg">${escapeHTML(n.message)}</div>
        <div class="notification-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `).join('');
  },

  setupGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const resultsBox = document.getElementById('search-results-box');

    if (input && resultsBox) {
      input.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          resultsBox.style.display = 'none';
          return;
        }

        const courses = await API.getCourses(query);
        this.renderSearchResults(courses, query);
      });

      document.addEventListener('click', (e) => {
        if (!resultsBox.contains(e.target) && e.target !== input) {
          resultsBox.style.display = 'none';
        }
      });
    }
  },

  renderSearchResults(courses, query) {
    const resultsBox = document.getElementById('search-results-box');
    if (!resultsBox) return;

    const matchedItems = [];

    courses.forEach(c => {
      // Check if title or desc match
      if (c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase())) {
        matchedItems.push({
          type: 'course',
          title: c.title,
          url: `#/course/${c.id}`
        });
      }

      // Check lessons
      c.modules.forEach(m => {
        m.lessons.forEach(l => {
          if (l.title.toLowerCase().includes(query.toLowerCase()) || l.content.toLowerCase().includes(query.toLowerCase())) {
            matchedItems.push({
              type: 'lesson',
              title: `${c.title} > ${l.title}`,
              url: `#/course/${c.id}` // Routing to course detail
            });
          }
        });
      });
    });

    if (matchedItems.length === 0) {
      resultsBox.innerHTML = `
        <div style="padding: var(--spacing-sm) var(--spacing-md); font-size: 13px; color: var(--text-muted);">
          No results found for "${escapeHTML(query)}"
        </div>
      `;
    } else {
      resultsBox.innerHTML = matchedItems.map(item => `
        <div class="search-result-item" onclick="window.location.hash='${item.url}'; document.getElementById('global-search-input').value=''; document.getElementById('search-results-box').style.display='none';">
          <div class="search-result-title">${escapeHTML(item.title)}</div>
          <div class="search-result-type">${item.type}</div>
        </div>
      `).join('');
    }

    resultsBox.style.display = 'block';
  },

  setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        AppState.setUser(null);
        window.location.hash = '#/login';
      });
    }
  },

  setupProfileLink() {
    const footer = document.getElementById('sidebar-profile-link');
    if (footer) {
      footer.addEventListener('click', () => {
        window.location.hash = '#/profile';
      });
    }
  }
};

// Global helper to escape strings
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Instantiate
window.AppShell = AppShell;
AppShell.init();
