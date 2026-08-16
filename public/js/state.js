const AppState = {
  currentUser: null,
  currentLanguage: localStorage.getItem('aura_lang') || 'en',
  currentTheme: 'dark',
  activeRoute: '',

  // Translation catalogs
  translations: {
    en: {
      'nav-dashboard': 'Dashboard',
      'nav-courses': 'Courses',
      'nav-leaderboard': 'Leaderboard',
      'nav-bookmarks': 'My Bookmarks',
      'nav-profile': 'Profile',
      'nav-instructor': 'Instructor Portal',
      'nav-logout': 'Exit',
      'notif-title': 'Notifications',
      'notif-clear': 'Clear all',
      'offline-msg': 'You are currently offline. Running in cached offline mode.',
      'streak-count': 'Streak count',
      'search-placeholder': 'Search courses or lessons...',
      'level-lbl': 'Level',
      'xp-lbl': 'XP',
      'streak-lbl': 'Streak',
      'quiz-avg-lbl': 'Avg Quiz',
      'courses-finished': 'Courses Completed',
      'calendar-deadlines': 'Upcoming Events & Deadlines',
      'next-lesson-recom': 'Recommended Next Lesson',
      'start-btn': 'Start Lesson',
      'continue-btn': 'Continue Lesson',
      'active-goals': 'Daily Learning Progress',
      'streak-tracker-title': 'Streak Flame Tracker',
      'xp-goal-msg': 'Earn {current}/{goal} XP today to keep your streak!',
      'activities-title': 'Recent Actions',
      'empty-enrolled': 'You are not enrolled in any courses yet. Visit the catalog to find your interests!',
      'browse-catalog-btn': 'Browse Course Catalog'
    },
    es: {
      'nav-dashboard': 'Tablero',
      'nav-courses': 'Cursos',
      'nav-leaderboard': 'Clasificación',
      'nav-bookmarks': 'Mis Marcadores',
      'nav-profile': 'Perfil',
      'nav-instructor': 'Portal Instructor',
      'nav-logout': 'Salir',
      'notif-title': 'Notificaciones',
      'notif-clear': 'Borrar todo',
      'offline-msg': 'Actualmente estás desconectado. Ejecutando en modo sin conexión.',
      'streak-count': 'Días seguidos',
      'search-placeholder': 'Buscar cursos o lecciones...',
      'level-lbl': 'Nivel',
      'xp-lbl': 'Puntos XP',
      'streak-lbl': 'Racha',
      'quiz-avg-lbl': 'Promedio Quiz',
      'courses-finished': 'Cursos Completados',
      'calendar-deadlines': 'Próximos Eventos y Plazos',
      'next-lesson-recom': 'Siguiente Lección Recomendada',
      'start-btn': 'Iniciar Lección',
      'continue-btn': 'Continuar Lección',
      'active-goals': 'Progreso Diario de Aprendizaje',
      'streak-tracker-title': 'Seguimiento de Racha',
      'xp-goal-msg': '¡Gana {current}/{goal} XP hoy para mantener tu racha!',
      'activities-title': 'Acciones Recientes',
      'empty-enrolled': 'Aún no estás inscrito en ningún curso. ¡Visita el catálogo para encontrar tus intereses!',
      'browse-catalog-btn': 'Explorar Catálogo de Cursos'
    }
  },

  // Save changes to localStorage
  saveLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('aura_lang', lang);
    this.applyTranslations();
  },

  saveTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('aura_theme', theme);
    this.applyTheme();
  },

  // Walk DOM and replace text with translations
  applyTranslations() {
    const lang = this.currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[lang] && this.translations[lang][key]) {
        el.textContent = this.translations[lang][key];
      }
    });

    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.placeholder = this.translations[lang]['search-placeholder'] || 'Search...';
    }
  },

  applyTheme() {
    // Keep dark mode active permanently by removing any light mode class
    document.body.classList.remove('light-mode');
  },

  setUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('aura_userId', user.id);
    } else {
      localStorage.removeItem('aura_userId');
    }
  }
};
