window.showCheckoutModal = (course, callback) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'checkout-modal';
  modal.style.zIndex = '1000';
  
  modal.innerHTML = `
    <div class="modal-container" style="max-width: 440px; padding: var(--spacing-xl); gap: var(--spacing-md); text-align: left;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-sm);">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary);"><i class="fa-solid fa-shield-halved"></i> AuraAI Secure Checkout</h3>
        <button id="close-checkout" style="background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div style="display: flex; gap: var(--spacing-md); background-color: var(--bg-secondary); padding: var(--spacing-md); border-radius: var(--border-radius-md); border: 1px solid var(--border-color);">
        <img src="${course.image}" style="width: 60px; height: 60px; border-radius: var(--border-radius-sm); object-fit: cover;">
        <div style="display: flex; flex-direction: column; justify-content: center; overflow: hidden;">
          <span style="font-size: 10px; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${course.category}</span>
          <h4 style="font-size: 13px; font-weight: 800; margin: 2px 0; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${course.title}</h4>
          <span style="font-size: 11px; color: var(--text-secondary);">Instructor: ${course.instructorName}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: var(--spacing-xs); padding: 0 var(--spacing-xs);">
        <span style="color: var(--text-secondary);">Course Price:</span>
        <span style="color: var(--primary); font-size: 16px;">₹${(Number(course.price) || 0).toFixed(2)}</span>
      </div>

      <form id="checkout-payment-form" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
        <div class="form-group" style="text-align: left;">
          <label>Cardholder Name</label>
          <input type="text" placeholder="e.g. Abiram Sureshbabu" required style="width: 100%;">
        </div>
        
        <div class="form-group" style="text-align: left;">
          <label>Card Number</label>
          <input type="text" pattern="\\d{16}" placeholder="4111222233334444" required style="width: 100%;" title="Please enter 16-digit credit card number">
        </div>

        <div class="form-grid-2col">
          <div class="form-group" style="text-align: left;">
            <label>Expiry Date (MM/YY)</label>
            <input type="text" pattern="(0[1-9]|1[0-2])\\/\\d{2}" placeholder="12/28" required style="width: 100%;" title="Please enter expiry in MM/YY format">
          </div>
          <div class="form-group" style="text-align: left;">
            <label>CVV</label>
            <input type="password" pattern="\\d{3}" placeholder="•••" required style="width: 100%;" title="Please enter 3-digit security code">
          </div>
        </div>

        <div id="checkout-error" style="display: none; color: var(--danger); font-size: 12px; margin-top: 4px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Transaction failed. Please check card info.
        </div>

        <button type="submit" class="btn btn-primary" id="checkout-submit-btn" style="width: 100%; justify-content: center; margin-top: var(--spacing-sm); padding: 12px;">
          Pay ₹${(Number(course.price) || 0).toFixed(2)}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Close bindings
  modal.querySelector('#close-checkout').addEventListener('click', () => {
    modal.remove();
  });

  const form = modal.querySelector('#checkout-payment-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#checkout-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner btn-sm"></span> Processing payment...`;

    setTimeout(async () => {
      try {
        await callback();
        modal.remove();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Authorize Payment';
        modal.querySelector('#checkout-error').style.display = 'block';
      }
    }, 1500); // 1.5s simulated payment processing
  });
};

const CoursesView = {
  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const currentUserId = AppState.currentUser.id;
    const isAdmin = AppState.currentUser.role === 'admin';

    // Load both courses list and student progress list
    const [courses, progressList] = await Promise.all([
      API.getCourses(),
      API.getProgress(currentUserId)
    ]);

    const enrolledCourseIds = new Set(progressList.map(p => p.courseId));
    const purchasedCourseIds = new Set(progressList.filter(p => p.purchased).map(p => p.courseId));

    // Categories
    const categories = ['All', 'Prompt Engineering', 'Generative Media', 'Deep Learning', 'AI Safety'];
    let activeCategory = 'All';

    const renderCatalog = (filteredCourses) => {
      const grid = container.querySelector('#courses-catalog-grid');
      if (!grid) return;

      if (filteredCourses.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: var(--spacing-xl); color: var(--text-secondary);">
            <i class="fa-solid fa-graduation-cap" style="font-size: 48px; color: var(--text-muted); margin-bottom: var(--spacing-md);"></i>
            <h3>No courses found</h3>
            <p>Try searching for a different keyword or category.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filteredCourses.map(c => {
        const isEnrolled = enrolledCourseIds.has(c.id);
        const isPurchased = c.price === 0 || isAdmin || purchasedCourseIds.has(c.id);
        const lessonCount = c.modules ? c.modules.flatMap(m => m.lessons).length : 0;
        
        let actionBtnText = 'Enroll Now';
        let badgeHtml = `<span class="badge badge-secondary"><i class="fa-solid fa-plus"></i> Available</span>`;

        if (isAdmin) {
          actionBtnText = 'Inspect Course';
          badgeHtml = `<span class="badge badge-primary"><i class="fa-solid fa-screwdriver-wrench"></i> Admin Access</span>`;
        } else if (isEnrolled && isPurchased) {
          actionBtnText = 'Continue';
          badgeHtml = `<span class="badge badge-primary"><i class="fa-solid fa-circle-play"></i> Enrolled</span>`;
        } else if (!isPurchased) {
          actionBtnText = `Buy ₹${(Number(c.price) || 0).toFixed(2)}`;
          badgeHtml = `<span class="badge badge-warning"><i class="fa-solid fa-lock"></i> Paid</span>`;
        } else if (c.price === 0) {
          actionBtnText = 'Enroll Free';
          badgeHtml = `<span class="badge badge-success"><i class="fa-solid fa-gift"></i> Free</span>`;
        }

        return `
          <div class="card course-card" data-id="${c.id}">
            <img src="${c.image}" alt="${escapeHTML(c.title)}" class="course-card-img">
            <div class="course-card-content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs);">
                <span class="badge badge-secondary">${escapeHTML(c.category)}</span>
                <span class="badge ${c.difficulty === 'Advanced' ? 'badge-warning' : 'badge-success'}">${c.difficulty}</span>
              </div>
              <h3 class="course-card-title">${escapeHTML(c.title)}</h3>
              <p class="course-card-desc">${escapeHTML(c.description)}</p>
              
              <div class="course-card-instructor">
                <i class="fa-solid fa-user-tie"></i>
                <span>${escapeHTML(c.instructorName)}</span>
              </div>

              <div style="display: flex; gap: var(--spacing-md); font-size: 11px; color: var(--text-muted); margin-top: var(--spacing-sm);">
                <span><i class="fa-regular fa-clock"></i> ${c.duration}</span>
                <span><i class="fa-regular fa-file-lines"></i> ${lessonCount} lessons</span>
                <span><i class="fa-solid fa-award"></i> ${c.xpReward} XP</span>
              </div>
            </div>
            <div class="card-footer">
              ${badgeHtml}
              <button class="btn btn-primary btn-sm course-action-btn">
                ${actionBtnText}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Add Card click handlers
      grid.querySelectorAll('.course-card').forEach(card => {
        card.addEventListener('click', async (e) => {
          const courseId = card.getAttribute('data-id');
          const course = courses.find(c => c.id === courseId);
          if (!course) return;

          const isEnrolled = enrolledCourseIds.has(courseId);
          const isPurchased = course.price === 0 || isAdmin || purchasedCourseIds.has(courseId);

          if (e.target.classList.contains('course-action-btn') || e.target.closest('.course-action-btn')) {
            e.stopPropagation();

            if (isAdmin) {
              window.location.hash = `#/course/${courseId}`;
            } else if (isEnrolled && isPurchased) {
              window.location.hash = `#/course/${courseId}`;
            } else if (!isPurchased) {
              // Trigger secure checkout
              window.showCheckoutModal(course, async () => {
                await API.purchase(currentUserId, courseId);
                purchasedCourseIds.add(courseId);
                enrolledCourseIds.add(courseId);
                // Redirect immediately to course details
                window.location.hash = `#/course/${courseId}`;
              });
            } else {
              // Free course enrollment
              const btn = card.querySelector('.course-action-btn');
              btn.disabled = true;
              btn.innerHTML = `<span class="spinner btn-sm"></span>`;
              await API.enroll(currentUserId, courseId);
              enrolledCourseIds.add(courseId);
              window.location.hash = `#/course/${courseId}`;
            }
          } else {
            // Card click goes to course page (it will display lock screen if unpaid)
            window.location.hash = `#/course/${courseId}`;
          }
        });
      });
    };

    container.innerHTML = `
      <div class="catalog-header">
        <div class="catalog-title">
          <h1 data-i18n="nav-courses">Course Catalog</h1>
          <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">Learn cutting edge AI techniques designed by top industry research leaders.</p>
        </div>
        <div class="catalog-filters" id="catalog-category-filters">
          ${categories.map(cat => `
            <button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="courses-grid" id="courses-catalog-grid"></div>
    `;

    // Filter bindings
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat');
        
        const filtered = activeCategory === 'All' 
          ? courses 
          : courses.filter(c => c.category === activeCategory);
        renderCatalog(filtered);
      });
    });

    // Initial render
    renderCatalog(courses);
    AppState.applyTranslations();
  }
};

Router.register('/courses', CoursesView);
