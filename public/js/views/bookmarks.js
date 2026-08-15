const BookmarksView = {
  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const userId = AppState.currentUser.id;
    const bookmarks = await API.getBookmarks(userId);

    const renderList = () => {
      if (bookmarks.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: var(--spacing-xl); max-width: 600px; margin: 0 auto;">
            <i class="fa-solid fa-bookmark" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md); opacity: 0.5;"></i>
            <h2 data-i18n="nav-bookmarks">My Bookmarks</h2>
            <p style="color: var(--text-secondary); margin-top: var(--spacing-sm); margin-bottom: var(--spacing-lg);">You haven't bookmarked any lessons yet. During a lesson lecture, click the "Bookmark" button to save it here with personal study notes.</p>
            <a href="#/courses" class="btn btn-primary btn-sm">Explore Courses</a>
          </div>
        `;
        AppState.applyTranslations();
        return;
      }

      container.innerHTML = `
        <div style="margin-bottom: var(--spacing-lg);">
          <h1 style="font-size: 26px; font-weight: 800;" data-i18n="nav-bookmarks">My Bookmarks</h1>
          <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">Access all your saved lectures, highlights, and personal summaries in one dashboard.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
          ${bookmarks.map(b => `
            <div class="card" id="bookmark-card-${b.lessonId}" style="border-left: 4px solid var(--primary);">
              <div class="card-header" style="padding-bottom: 0;">
                <div>
                  <span class="badge badge-primary">${escapeHTML(b.courseTitle)}</span>
                  <span class="badge badge-secondary" style="margin-left: var(--spacing-xs);">${escapeHTML(b.moduleTitle)}</span>
                </div>
                <span style="font-size: 11px; color: var(--text-muted);">${new Date(b.bookmarkedAt).toLocaleDateString()}</span>
              </div>
              
              <div class="card-body" style="padding-top: var(--spacing-sm);">
                <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${escapeHTML(b.lessonTitle)}</h3>
                
                <!-- Display Notes -->
                <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: var(--spacing-md); margin-top: var(--spacing-md);">
                  <div style="font-size: 11px; font-weight: 700; color: var(--secondary); margin-bottom: var(--spacing-xs);"><i class="fa-solid fa-pen-to-square"></i> Study Notes:</div>
                  <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; font-style: italic;" id="notes-text-${b.lessonId}">${escapeHTML(b.notes || 'No study notes saved. Click Edit Notes to add summaries.')}</p>
                  <textarea id="notes-edit-input-${b.lessonId}" style="display: none; width: 100%; height: 60px; padding: var(--spacing-sm); font-size: 13px; font-family: var(--font-family); background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-glass); border-radius: var(--border-radius-sm); resize: none; margin-top: 4px;">${escapeHTML(b.notes)}</textarea>
                </div>
              </div>

              <div class="card-footer" style="border: none; padding-top: 0;">
                <button class="btn btn-secondary btn-sm remove-bookmark-btn" data-course-id="${b.courseId}" data-lesson-id="${b.lessonId}">
                  <i class="fa-solid fa-trash-can"></i> Delete
                </button>
                
                <div style="display: flex; gap: var(--spacing-sm);">
                  <button class="btn btn-secondary btn-sm edit-notes-btn" data-lesson-id="${b.lessonId}" id="edit-btn-${b.lessonId}">
                    <i class="fa-solid fa-pen"></i> Edit Notes
                  </button>
                  <button class="btn btn-primary btn-sm save-notes-btn" data-course-id="${b.courseId}" data-lesson-id="${b.lessonId}" id="save-btn-${b.lessonId}" style="display: none;">
                    Save
                  </button>
                  <a href="#/course/${b.courseId}" class="btn btn-primary btn-sm">
                    <i class="fa-solid fa-book-open"></i> Study Lesson
                  </a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Bind actions
      container.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cId = btn.getAttribute('data-course-id');
          const lId = btn.getAttribute('data-lesson-id');
          if (confirm('Are you sure you want to remove this bookmark?')) {
            await API.toggleBookmark(userId, cId, lId, '', false);
            
            // Remove from local list and redrawing
            const idx = bookmarks.findIndex(x => x.lessonId === lId);
            if (idx !== -1) bookmarks.splice(idx, 1);
            renderList();
          }
        });
      });

      container.querySelectorAll('.edit-notes-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const lId = btn.getAttribute('data-lesson-id');
          const textEl = container.querySelector(`#notes-text-${lId}`);
          const inputEl = container.querySelector(`#notes-edit-input-${lId}`);
          const saveBtn = container.querySelector(`#save-btn-${lId}`);

          textEl.style.display = 'none';
          inputEl.style.display = 'block';
          btn.style.display = 'none';
          saveBtn.style.display = 'inline-flex';
          inputEl.focus();
        });
      });

      container.querySelectorAll('.save-notes-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cId = btn.getAttribute('data-course-id');
          const lId = btn.getAttribute('data-lesson-id');
          const textEl = container.querySelector(`#notes-text-${lId}`);
          const inputEl = container.querySelector(`#notes-edit-input-${lId}`);
          const editBtn = container.querySelector(`#edit-btn-${lId}`);
          
          const notes = inputEl.value.trim();
          btn.disabled = true;
          
          await API.toggleBookmark(userId, cId, lId, notes, true);
          
          textEl.textContent = notes || 'No study notes saved. Click Edit Notes to add summaries.';
          textEl.style.display = 'block';
          inputEl.style.display = 'none';
          btn.style.display = 'none';
          editBtn.style.display = 'inline-flex';
          btn.disabled = false;

          // Update local copy
          const item = bookmarks.find(x => x.lessonId === lId);
          if (item) item.notes = notes;
        });
      });
    };

    renderList();
    AppState.applyTranslations();
  }
};

Router.register('/bookmarks', BookmarksView);
