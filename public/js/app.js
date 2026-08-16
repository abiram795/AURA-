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
  },

  setupLanguage() {
    AppState.applyTranslations();
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
      const logout = () => {
        AppState.setUser(null);
        sessionStorage.removeItem('aura_needs_onboarding');
        window.location.hash = '#/login';
      };
      btn.addEventListener('click', logout);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          logout();
        }
      });
    }
  },

  setupProfileLink() {
    const footer = document.getElementById('sidebar-profile-link');
    if (footer) {
      const navigate = () => {
        window.location.hash = '#/profile';
      };
      footer.addEventListener('click', navigate);
      footer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate();
        }
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

// Dynamic Topic-Specific SVG Course Placeholder Generator
window.getCoursePlaceholderSVG = function(title, category) {
  let gradientColors = ['#0F172A', '#1E293B'];
  let iconPath = '';
  
  const cat = (category || '').toLowerCase();
  if (cat.includes('prompt')) {
    gradientColors = ['#2563EB', '#06B6D4']; // Cyan to blue
    iconPath = `<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="white" opacity="0.9"/>`;
  } else if (cat.includes('generative') || cat.includes('media') || cat.includes('creative') || cat.includes('art')) {
    gradientColors = ['#7C3AED', '#E81A6F']; // Purple to magenta
    iconPath = `<path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.07 19.58 10.48 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm1-9h-2v3H8v2h3v3h2v-3h3v-2h-3V9z" fill="white" opacity="0.9"/>`;
  } else if (cat.includes('deep') || cat.includes('neural') || cat.includes('learning') || cat.includes('net') || cat.includes('vision') || cat.includes('imagenet')) {
    gradientColors = ['#0F172A', '#7C3AED']; // Deep blue-dark to purple
    iconPath = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="white" opacity="0.9"/>`;
  } else if (cat.includes('safety') || cat.includes('alignment') || cat.includes('ethics')) {
    gradientColors = ['#EF4444', '#F97316']; // Red to orange
    iconPath = `<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="white" opacity="0.9"/>`;
  } else {
    gradientColors = ['#1E293B', '#0F172A']; // Tech slate dark
    iconPath = `<path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white" opacity="0.9"/>`;
  }

  const cleanTitle = (title || 'AuraAI Course').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cleanCategory = (category || 'Artificial Intelligence').toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'>
    <defs>
      <linearGradient id='grad-${encodeURIComponent(cleanTitle.slice(0, 5))}' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${gradientColors[0]}' />
        <stop offset='100%' stop-color='${gradientColors[1]}' />
      </linearGradient>
      <pattern id='grid-${encodeURIComponent(cleanTitle.slice(0, 5))}' width='20' height='20' patternUnits='userSpaceOnUse'>
        <path d='M 20 0 L 0 0 0 20' fill='none' stroke='white' stroke-width='0.5' opacity='0.05'/>
      </pattern>
    </defs>
    
    <rect width='100%' height='100%' fill='url(#grad-${encodeURIComponent(cleanTitle.slice(0, 5))})' />
    <rect width='100%' height='100%' fill='url(#grid-${encodeURIComponent(cleanTitle.slice(0, 5))})' />
    
    <circle cx='430' cy='60' r='120' fill='white' opacity='0.03' />
    <circle cx='60' cy='240' r='140' fill='white' opacity='0.03' />
    
    <!-- Decorative Icon Box -->
    <g transform='translate(40, 40) scale(1.2)'>
      ${iconPath}
    </g>
    
    <!-- Category Label -->
    <text x='40' y='130' fill='white' opacity='0.7' font-family='Outfit, sans-serif' font-weight='800' font-size='12' letter-spacing='2'>${cleanCategory}</text>
    
    <!-- Course Title -->
    <text x='40' y='180' fill='white' font-family='Outfit, sans-serif' font-weight='800' font-size='26'>${cleanTitle.length > 28 ? cleanTitle.slice(0, 26) + '...' : cleanTitle}</text>
    
    <!-- Platform brand label -->
    <text x='40' y='260' fill='white' opacity='0.4' font-family='Outfit, sans-serif' font-weight='600' font-size='11' letter-spacing='1'>AURA AI PLATFORM</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Instantiate
window.AppShell = AppShell;
AppShell.init();
