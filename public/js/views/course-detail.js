const CourseDetailView = {
  async render(container, params) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const courseId = params.id;
    const userId = AppState.currentUser.id;

    // Load course, progress, and comments
    const [course, progressList] = await Promise.all([
      API.getCourse(courseId),
      API.getProgress(userId)
    ]);

    const userProgressRecord = progressList.find(p => p.courseId === courseId);
    const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    const isPurchased = course.price === 0 || isAdmin || (userProgressRecord && userProgressRecord.purchased);

    if (!isPurchased) {
      container.innerHTML = `
        <div style="max-width: 800px; margin: var(--spacing-xl) auto; display: flex; flex-direction: column; gap: var(--spacing-lg);">
          
          <div class="card" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--spacing-xxl); gap: var(--spacing-md);">
            <div style="position: relative; margin-bottom: var(--spacing-sm);">
              <i class="fa-solid fa-lock" style="font-size: 64px; color: var(--secondary); filter: drop-shadow(0 0 10px var(--secondary-glow));"></i>
            </div>
            
            <span class="badge badge-secondary" style="text-transform: uppercase;">${escapeHTML(course.category)}</span>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary);">${escapeHTML(course.title)}</h1>
            <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6;">
              ${escapeHTML(course.description)}
            </p>

            <div style="display: flex; gap: var(--spacing-xl); margin: var(--spacing-sm) 0; font-size: 13px; color: var(--text-muted);">
              <span><i class="fa-regular fa-clock"></i> ${course.duration}</span>
              <span><i class="fa-regular fa-face-smile"></i> ${course.difficulty}</span>
              <span><i class="fa-solid fa-award"></i> ${course.xpReward} XP</span>
            </div>

            <div style="border-top: 1px solid var(--border-color); width: 100%; max-width: 400px; margin: var(--spacing-xs) 0;"></div>

            <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);">
              <span style="font-size: 13px; color: var(--text-secondary);">Unlock full lifetime access to lessons, captions, notes, and quiz rewards.</span>
              <span style="font-size: 24px; font-weight: 800; color: var(--primary); margin: var(--spacing-xs) 0;">₹${(Number(course.price) || 0).toFixed(2)}</span>
            </div>

            <button class="btn btn-primary btn-lg" id="unlock-course-btn" style="padding: 12px 32px; font-size: 15px; font-weight: 800;">
              <i class="fa-solid fa-wallet"></i> Purchase Course
            </button>
          </div>

          <!-- Grayed Out Syllabus Preview -->
          <div class="card" style="opacity: 0.5; pointer-events: none;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: var(--spacing-md);"><i class="fa-solid fa-book-open"></i> Syllabus Preview (${course.modules ? course.modules.length : 0} Modules)</h3>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
              ${course.modules ? course.modules.map(mod => `
                <div>
                  <h4 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--spacing-xs);">${escapeHTML(mod.title)}</h4>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${mod.lessons.map(les => `
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted);">
                        <i class="fa-solid fa-lock" style="font-size: 10px;"></i>
                        <span>${escapeHTML(les.title)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('') : ''}
            </div>
          </div>

        </div>
      `;

      // Event listener for checkout
      const unlockBtn = container.querySelector('#unlock-course-btn');
      unlockBtn.addEventListener('click', () => {
        window.showCheckoutModal(course, async () => {
          await API.purchase(userId, course.id);
          // Reload view to show content
          await this.render(container, params);
        });
      });

      return;
    }

    const progress = userProgressRecord || {
      completedLessons: [],
      quizScores: {},
      bookmarks: []
    };

    // Selected lesson (defaults to first lesson of first module, or resumes where user left off)
    let selectedLesson = null;
    let selectedModuleIndex = 0;
    let selectedLessonIndex = 0;
    let initialSeekTimestamp = 0;

    if (userProgressRecord && userProgressRecord.lastActiveLesson) {
      const active = userProgressRecord.lastActiveLesson;
      const modIdx = active.moduleId;
      const lessonId = active.lessonId;
      
      const foundMod = course.modules && course.modules[modIdx];
      if (foundMod) {
        const lesIdx = foundMod.lessons.findIndex(l => l.id === lessonId);
        if (lesIdx !== -1) {
          selectedLesson = foundMod.lessons[lesIdx];
          selectedModuleIndex = modIdx;
          selectedLessonIndex = lesIdx;
          initialSeekTimestamp = Number(active.timestamp || 0);
        }
      }
    }

    if (!selectedLesson) {
      selectedLesson = course.modules && course.modules[0]?.lessons[0] || null;
    }

    // Redraw lesson content in main pane
    const renderLessonPane = async (lesson) => {
      selectedLesson = lesson;
      
      const pane = container.querySelector('#lesson-pane');
      if (!pane) return;

      // Find if bookmarked
      const bookmark = progress.bookmarks?.find(b => b.lessonId === lesson.id);
      const isBookmarked = !!bookmark;
      const bookmarkNotes = bookmark?.notes || '';

      // Load comments
      const comments = await API.getComments(lesson.id);

      pane.innerHTML = `
        <div class="lesson-header">
          <div class="lesson-title-area">
            <span class="badge badge-secondary" style="margin-bottom: var(--spacing-xs);">${escapeHTML(course.title)}</span>
            <h1>${escapeHTML(lesson.title)}</h1>
          </div>
          
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'} btn-sm" id="lesson-bookmark-btn">
              <i class="fa-solid fa-bookmark"></i> ${isBookmarked ? 'Saved' : 'Bookmark'}
            </button>
            <button class="btn btn-success btn-sm" id="lesson-complete-btn" ${progress.completedLessons.includes(lesson.id) ? 'disabled' : ''}>
              <i class="fa-solid fa-check"></i> ${progress.completedLessons.includes(lesson.id) ? 'Completed' : 'Mark Complete'}
            </button>
          </div>
        </div>

        <!-- Custom HTML5 Video Player -->
        <div class="custom-video-container" id="video-wrapper">
          <video id="html5-video" src="${lesson.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}"></video>
          
          <!-- Mock Captions Overlay -->
          <div id="video-captions-overlay" style="display: none; position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: var(--text-inverse); padding: 6px 12px; border-radius: var(--border-radius-sm); font-size: 13px; text-align: center; pointer-events: none; z-index: 5; font-weight: 500; border: 1px solid var(--border-glass);">
            Welcome to AuraAI training lecture.
          </div>

          <!-- Custom Controls -->
          <div class="video-controls">
            <div class="video-progress-container" id="video-progress-track">
              <div class="video-progress-bar" id="video-progress-fill"></div>
            </div>
            <div class="video-control-row">
              <div class="video-left-controls">
                <button class="video-btn" id="video-play-btn"><i class="fa-solid fa-play"></i></button>
                <button class="video-btn" id="video-mute-btn"><i class="fa-solid fa-volume-high"></i></button>
                <span class="video-time" id="video-time-display">0:00 / 0:00</span>
              </div>
              <div class="video-right-controls">
                <button class="video-btn" id="video-cc-btn" title="Toggle Captions"><i class="fa-solid fa-closed-captioning" style="opacity: 0.5;"></i></button>
                <select class="video-speed-select" id="video-speed-control">
                  <option value="0.5">0.5x</option>
                  <option value="1" selected>1.0x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
                <button class="video-btn" id="video-fs-btn"><i class="fa-solid fa-expand"></i></button>
              </div>
            </div>
          </div>
        </div>

        <!-- Lesson Downloads -->
        ${lesson.downloads && lesson.downloads.length > 0 ? `
          <div class="card" style="padding: var(--spacing-md); background: var(--accent-glow);">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--secondary);"><i class="fa-solid fa-circle-down"></i> Resources & Downloads</h4>
            <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-sm);">
              ${lesson.downloads.map(dl => `
                <a href="#" class="btn btn-secondary btn-sm" onclick="alert('Downloading placeholder: ${dl.name}'); return false;">
                  <i class="fa-regular fa-file-pdf"></i> ${dl.name}
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Lesson Text Body -->
        <div class="lesson-text-body">
          ${lesson.content}
        </div>

        <!-- Bookmarks Notes Editor Modal-Overlay (Inline Popup) -->
        <div id="bookmark-notes-popup" style="display: none; background: var(--bg-tertiary); border: 1px solid var(--border-glass); border-radius: var(--border-radius-md); padding: var(--spacing-md); margin-top: var(--spacing-md);">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: var(--spacing-xs);"><i class="fa-solid fa-pen-to-square"></i> Personal Lesson Notes</h4>
          <textarea id="bookmark-notes-textarea" style="width: 100%; height: 80px; padding: var(--spacing-sm); border: 1px solid var(--border-glass); border-radius: var(--border-radius-sm); background-color: var(--bg-secondary); color: var(--text-primary); font-family: var(--font-family); resize: none; font-size: 13px;" placeholder="Add key points, quotes, or summaries here...">${escapeHTML(bookmarkNotes)}</textarea>
          <div style="display: flex; justify-content: flex-end; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
            <button class="btn btn-secondary btn-sm" id="bookmark-remove-btn" style="color: var(--danger);">Delete Bookmark</button>
            <button class="btn btn-primary btn-sm" id="bookmark-save-notes-btn">Save Notes</button>
          </div>
        </div>

        <!-- Quiz Navigation Block -->
        <div id="quiz-navigation-block" style="margin-top: var(--spacing-lg);">
          <!-- Populated dynamically if lesson has associated quiz or next lesson -->
        </div>

        <!-- Comments & Discussion Area -->
        <div class="discussion-section">
          <h3 class="discussion-header"><i class="fa-regular fa-comments"></i> Lesson Discussion</h3>
          
          <div class="comment-input-area">
            <textarea id="comment-text-input" placeholder="Join the discussion..."></textarea>
            <button class="btn btn-primary" id="post-comment-btn">Post</button>
          </div>

          <div class="comments-list" id="comments-feed">
            ${comments.length === 0 
              ? `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: var(--spacing-md) 0;">Be the first to share your thoughts on this lesson!</div>`
              : comments.map(c => `
                <div class="comment-card">
                  <img src="${c.userAvatar}" alt="${escapeHTML(c.userName)}" class="comment-avatar">
                  <div class="comment-content">
                    <div class="comment-author-row">
                      <span class="comment-author">${escapeHTML(c.userName)}</span>
                      <span class="comment-time">${new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="comment-text">${escapeHTML(c.commentText)}</div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      `;

      // Setup Video Player Handlers
      setupVideoControls();

      // Show Bookmark Editor if already active
      const notesPopup = pane.querySelector('#bookmark-notes-popup');
      const bookmarkBtn = pane.querySelector('#lesson-bookmark-btn');
      
      bookmarkBtn.addEventListener('click', () => {
        notesPopup.style.display = notesPopup.style.display === 'none' ? 'block' : 'none';
      });

      pane.querySelector('#bookmark-save-notes-btn').addEventListener('click', async () => {
        const notes = pane.querySelector('#bookmark-notes-textarea').value;
        await API.toggleBookmark(userId, course.id, lesson.id, notes, true);
        alert('Bookmark and personal notes saved successfully!');
        // Refresh state values
        const updateProg = await API.getProgress(userId);
        const pIndex = progressList.findIndex(p => p.courseId === course.id);
        if (pIndex !== -1) progressList[pIndex] = updateProg.find(p => p.courseId === course.id);
        // Toggle btn styles
        bookmarkBtn.className = 'btn btn-primary btn-sm';
        bookmarkBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
        notesPopup.style.display = 'none';
      });

      pane.querySelector('#bookmark-remove-btn').addEventListener('click', async () => {
        await API.toggleBookmark(userId, course.id, lesson.id, '', false);
        alert('Bookmark deleted.');
        const updateProg = await API.getProgress(userId);
        const pIndex = progressList.findIndex(p => p.courseId === course.id);
        if (pIndex !== -1) progressList[pIndex] = updateProg.find(p => p.courseId === course.id);
        bookmarkBtn.className = 'btn btn-secondary btn-sm';
        bookmarkBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Bookmark`;
        pane.querySelector('#bookmark-notes-textarea').value = '';
        notesPopup.style.display = 'none';
      });

      // Mark Lesson Complete Handler
      const completeBtn = pane.querySelector('#lesson-complete-btn');
      completeBtn.addEventListener('click', async () => {
        completeBtn.disabled = true;
        completeBtn.innerHTML = `<span class="spinner btn-sm"></span> Saving...`;

        const res = await API.completeLesson(userId, course.id, lesson.id);
        
        // Update local memory
        progress.completedLessons.push(lesson.id);

        if (res.courseCompleted) {
          alert(`Congratulations! You have completed the course ${course.title}! Check your profile or achievements tab for your certificate.`);
        } else if (res.leveledUp) {
          alert(`Level Up! You reached level ${res.user.level}!`);
        } else {
          alert('+15 XP Earned!');
        }

        completeBtn.className = 'btn btn-success btn-sm';
        completeBtn.textContent = 'Completed';
        completeBtn.disabled = true;

        // Redraw sidebar checkmark
        const checkIcon = container.querySelector(`#check-${lesson.id}`);
        if (checkIcon) {
          checkIcon.className = 'fa-solid fa-circle-check check';
        }

        // Reload quiz navigation options
        renderQuizNav();
      });

      // Post comment handler
      const postBtn = pane.querySelector('#post-comment-btn');
      const inputArea = pane.querySelector('#comment-text-input');
      const feed = pane.querySelector('#comments-feed');

      postBtn.addEventListener('click', async () => {
        const text = inputArea.value.trim();
        if (!text) return;
        
        postBtn.disabled = true;
        const newCom = await API.postComment(lesson.id, userId, text);
        
        // Remove empty state
        if (feed.textContent.includes('Be the first to share')) {
          feed.innerHTML = '';
        }

        const card = document.createElement('div');
        card.className = 'comment-card';
        card.innerHTML = `
          <img src="${newCom.userAvatar}" alt="${escapeHTML(newCom.userName)}" class="comment-avatar">
          <div class="comment-content">
            <div class="comment-author-row">
              <span class="comment-author">${escapeHTML(newCom.userName)}</span>
              <span class="comment-time">${new Date(newCom.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="comment-text">${escapeHTML(newCom.commentText)}</div>
          </div>
        `;
        feed.appendChild(card);
        
        inputArea.value = '';
        postBtn.disabled = false;
      });

      // Render Quiz Nav helper
      const renderQuizNav = () => {
        const navBlock = pane.querySelector('#quiz-navigation-block');
        if (!navBlock) return;

        // Check if there is a quiz associated with this lesson
        const quiz = course.quizzes?.find(q => q.lessonId === lesson.id);
        
        if (quiz) {
          const completedQuizScore = progress.quizScores?.[quiz.id];
          navBlock.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, var(--accent-streak-glow), var(--primary-glow)); border: 1px solid var(--accent-streak-glow); padding: var(--spacing-md); text-align: center;">
              <h4 style="font-size: 14px; font-weight: 700; color: var(--accent-streak);"><i class="fa-solid fa-award"></i> Lesson Mastery Quiz Available</h4>
              <p style="font-size: 12px; margin-top: 2px;">
                ${completedQuizScore !== undefined 
                  ? `You already completed this quiz. High Score: <strong>${completedQuizScore}%</strong>` 
                  : 'Test your understanding of zero-shot vs few-shot learning to unlock Level XP!'
                }
              </p>
              <a href="#/quiz/${quiz.id}" class="btn btn-primary btn-sm" style="margin-top: var(--spacing-md); background-color: var(--accent-streak); color: var(--text-on-accent); border: none; box-shadow: 0 4px 10px var(--accent-streak-glow);">
                <i class="fa-solid fa-circle-question"></i> ${completedQuizScore !== undefined ? 'Retry Quiz' : 'Take Quiz now'}
              </a>
            </div>
          `;
        } else {
          // Check for next lesson
          let nextLesson = null;
          let currentModule = course.modules[selectedModuleIndex];
          
          if (currentModule.lessons[selectedLessonIndex + 1]) {
            nextLesson = currentModule.lessons[selectedLessonIndex + 1];
          } else if (course.modules[selectedModuleIndex + 1]) {
            nextLesson = course.modules[selectedModuleIndex + 1].lessons[0];
          }

          if (nextLesson) {
            navBlock.innerHTML = `
              <div style="display: flex; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" id="next-lesson-btn">
                  Next Lesson: ${escapeHTML(nextLesson.title)} <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            `;

            navBlock.querySelector('#next-lesson-btn').addEventListener('click', () => {
              // Find coordinates of next lesson
              let foundNext = false;
              for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
                const mod = course.modules[mIdx];
                for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                  if (mod.lessons[lIdx].id === nextLesson.id) {
                    selectedModuleIndex = mIdx;
                    selectedLessonIndex = lIdx;
                    foundNext = true;
                    break;
                  }
                }
                if (foundNext) break;
              }

              // Highlight active link in sidebar
              container.querySelectorAll('.syllabus-lesson-item').forEach(el => el.classList.remove('active'));
              const link = container.querySelector(`#item-${nextLesson.id}`);
              if (link) link.classList.add('active');

              renderLessonPane(nextLesson);
            });
          } else {
            navBlock.innerHTML = '';
          }
        }
      };

      renderQuizNav();
    };

    // Custom Video controls binder
    const setupVideoControls = () => {
      const wrapper = container.querySelector('#video-wrapper');
      const video = container.querySelector('#html5-video');
      const playBtn = container.querySelector('#video-play-btn');
      const muteBtn = container.querySelector('#video-mute-btn');
      const progressTrack = container.querySelector('#video-progress-track');
      const progressFill = container.querySelector('#video-progress-fill');
      const timeDisplay = container.querySelector('#video-time-display');
      const ccBtn = container.querySelector('#video-cc-btn');
      const ccOverlay = container.querySelector('#video-captions-overlay');
      const speedSelect = container.querySelector('#video-speed-control');
      const fsBtn = container.querySelector('#video-fs-btn');

      if (!video) return;

      // Restore playhead position on load
      if (initialSeekTimestamp > 0 && selectedLesson && userProgressRecord?.lastActiveLesson?.lessonId === selectedLesson.id) {
        video.addEventListener('loadedmetadata', () => {
          video.currentTime = Math.min(initialSeekTimestamp, video.duration || 9999);
        }, { once: true });
      }

      let lastSyncedTime = 0;
      const syncPlayhead = async () => {
        const cur = Math.floor(video.currentTime);
        if (cur !== lastSyncedTime && cur > 0) {
          lastSyncedTime = cur;
          await API.saveTimestamp(userId, course.id, selectedModuleIndex, selectedLesson.id, cur);
        }
      };

      // Play/Pause
      const togglePlay = () => {
        if (video.paused) {
          video.play();
          playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        } else {
          video.pause();
          playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
        }
      };

      playBtn.addEventListener('click', togglePlay);
      video.addEventListener('click', togglePlay);

      // Volume
      muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        muteBtn.innerHTML = video.muted 
          ? `<i class="fa-solid fa-volume-xmark"></i>` 
          : `<i class="fa-solid fa-volume-high"></i>`;
      });

      // Update progress bar & time
      video.addEventListener('timeupdate', () => {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${percent}%`;

        // Format time
        const formatTime = (time) => {
          if (isNaN(time)) return '0:00';
          const mins = Math.floor(time / 60);
          const secs = Math.floor(time % 60);
          return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };

        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

        // Captions logic
        updateCaptions();

        // Sync to server every 5 seconds of playback
        if (Math.floor(video.currentTime) > 0 && Math.floor(video.currentTime) % 5 === 0) {
          syncPlayhead();
        }
      });

      video.addEventListener('pause', syncPlayhead);

      // Seek progress
      progressTrack.addEventListener('click', (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
      });

      // Captions array
      const captions = [
        { time: 0, text: "Welcome to AuraAI interactive lectures." },
        { time: 4, text: "Today we will analyze how Large Language Models parse instructions." },
        { time: 9, text: "Structuring prompt components is essential to get reliable responses." },
        { time: 15, text: "Zero-shot learning expects results without giving example behaviors." },
        { time: 20, text: "Let's review standard templates for few-shot prompting techniques." }
      ];

      let ccActive = false;
      ccBtn.addEventListener('click', () => {
        ccActive = !ccActive;
        ccOverlay.style.display = ccActive ? 'block' : 'none';
        ccBtn.style.opacity = ccActive ? '1' : '0.5';
      });

      const updateCaptions = () => {
        if (!ccActive) return;
        const curTime = video.currentTime;
        const matching = captions.filter(c => curTime >= c.time).pop();
        if (matching) {
          ccOverlay.textContent = matching.text;
        }
      };

      // Speed selection
      speedSelect.addEventListener('change', (e) => {
        video.playbackRate = parseFloat(e.target.value);
      });

      // Fullscreen toggle
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          wrapper.requestFullscreen().catch(err => {
            console.error('Fullscreen failed:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
    };

    // Draw full outer grid layout
    container.innerHTML = `
      <div class="course-detail-layout">
        <!-- Sidebar Syllabus Navigation -->
        <aside class="syllabus-sidebar">
          <div>
            <h2 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">Syllabus Outline</h2>
            <p style="font-size: 11px; color: var(--text-muted);">Navigate and complete lessons.</p>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); margin-top: var(--spacing-sm);">
            ${course.modules.map((mod, mIdx) => `
              <div>
                <h4 class="syllabus-module-title">${escapeHTML(mod.title)}</h4>
                <div class="syllabus-lessons-list">
                  ${mod.lessons.map((les, lIdx) => {
                    const isCompleted = progress.completedLessons.includes(les.id);
                    const isActive = les.id === selectedLesson.id;
                    
                    return `
                      <a class="syllabus-lesson-item ${isActive ? 'active' : ''}" id="item-${les.id}" data-midx="${mIdx}" data-lidx="${lIdx}">
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          <i id="check-${les.id}" class="${isCompleted ? 'fa-solid fa-circle-check check' : 'fa-regular fa-circle circle'}"></i>
                          <span>${escapeHTML(les.title)}</span>
                        </div>
                      </a>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </aside>

        <!-- Main Lesson viewer pane -->
        <div class="lesson-content-pane" id="lesson-pane">
          <!-- Injected by renderLessonPane() -->
        </div>
      </div>
    `;

    // Click handler for sidebar lesson selection
    container.querySelectorAll('.syllabus-lesson-item').forEach(item => {
      item.addEventListener('click', async () => {
        container.querySelectorAll('.syllabus-lesson-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        const mIdx = parseInt(item.getAttribute('data-midx'));
        const lIdx = parseInt(item.getAttribute('data-lidx'));
        
        selectedModuleIndex = mIdx;
        selectedLessonIndex = lIdx;
        
        const les = course.modules[mIdx].lessons[lIdx];
        renderLessonPane(les);

        // Sync active lesson position immediately to backend
        await API.saveTimestamp(userId, course.id, mIdx, les.id, 0);
      });
    });

    // Render initial selected lesson
    if (selectedLesson) {
      renderLessonPane(selectedLesson);
    }
  }
};

Router.register('/course/:id', CourseDetailView);
