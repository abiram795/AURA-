const OnboardingView = {
  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const interestsList = [
      { id: 'Prompt Engineering', label: 'Prompt Engineering', icon: 'fa-terminal' },
      { id: 'Generative Media', label: 'Generative Media & Art', icon: 'fa-palette' },
      { id: 'Deep Learning', label: 'Deep Learning & Math', icon: 'fa-circle-nodes' },
      { id: 'NLP', label: 'Natural Language Processing', icon: 'fa-language' },
      { id: 'AI Safety', label: 'AI Safety & Ethics', icon: 'fa-shield-halved' }
    ];

    const selectedInterests = new Set();

    container.innerHTML = `
      <div class="onboarding-container card">
        <h1 style="font-size: 24px; font-weight: 800; margin-bottom: var(--spacing-sm);">Welcome, ${escapeHTML(AppState.currentUser.username)}!</h1>
        <p style="color: var(--text-secondary); font-size: 14px;">Select your AI learning path interests below. We will customize your dashboard and recommend target courses based on your choices.</p>
        
        <div class="interests-grid">
          ${interestsList.map(item => `
            <div class="interest-tag-card" data-id="${item.id}">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.label}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: var(--spacing-lg);">
          <button class="btn btn-primary" id="save-interests-btn" disabled>
            <i class="fa-solid fa-arrow-right"></i> Choose Interests
          </button>
        </div>
      </div>
    `;

    const saveBtn = container.querySelector('#save-interests-btn');
    
    container.querySelectorAll('.interest-tag-card').forEach(card => {
      card.addEventListener('click', () => {
        const interestId = card.getAttribute('data-id');
        if (selectedInterests.has(interestId)) {
          selectedInterests.delete(interestId);
          card.classList.remove('selected');
        } else {
          selectedInterests.add(interestId);
          card.classList.add('selected');
        }

        if (selectedInterests.size > 0) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Continue with ${selectedInterests.size} Interest(s)`;
        } else {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<i class="fa-solid fa-arrow-right"></i> Choose Interests`;
        }
      });
    });

    saveBtn.addEventListener('click', async () => {
      const interestsArray = Array.from(selectedInterests);
      
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<div class="spinner btn-sm"></div> Saving...`;

      try {
        // Post interests to server
        const updatedUser = await API.updateUser(AppState.currentUser.id, { interests: interestsArray });
        AppState.setUser(updatedUser);
        // Clear the onboarding session flag
        sessionStorage.removeItem('aura_needs_onboarding');

        // Get matching courses to auto-enroll or recommend
        const courses = await API.getCourses();
        const matchingCourses = courses.filter(c => 
          interestsArray.includes(c.category) || 
          (c.category === 'Prompt Engineering' && interestsArray.includes('NLP')) ||
          (c.category === 'Deep Learning' && interestsArray.includes('NLP'))
        );

        // Auto enroll in the recommended courses
        for (const course of matchingCourses) {
          await API.enroll(AppState.currentUser.id, course.id);
        }

        // Render Onboarding Completion Screen
        container.innerHTML = `
          <div class="onboarding-container card" style="text-align: center; max-width: 550px;">
            <i class="fa-solid fa-circle-check" style="font-size: 56px; color: var(--success); margin-bottom: var(--spacing-md); filter: drop-shadow(0 0 10px var(--success-glow));"></i>
            <h1 style="font-size: 22px; font-weight: 800; margin-bottom: var(--spacing-sm);">Onboarding Completed!</h1>
            <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-lg);">
              We found <strong>${matchingCourses.length} course(s)</strong> matching your profile and automatically enrolled you.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: var(--spacing-md); text-align: left; margin-bottom: var(--spacing-xl);">
              ${matchingCourses.map(c => `
                <div style="display: flex; gap: var(--spacing-md); background-color: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--border-radius-md); border: 1px solid var(--border-glass);">
                  <div class="course-card-img-wrapper skeleton" style="width: 60px; height: 60px; border-radius: var(--border-radius-sm); flex-shrink: 0; overflow: hidden; background-color: var(--bg-tertiary);">
                    <img src="${c.image}" 
                         loading="lazy"
                         onload="this.parentElement.classList.remove('skeleton');"
                         onerror="this.onerror=null; this.src=window.getCoursePlaceholderSVG('${escapeHTML(c.title)}', '${escapeHTML(c.category)}'); this.parentElement.classList.remove('skeleton');" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         alt="${escapeHTML(c.title)}">
                  </div>
                  <div>
                    <h4 style="font-size: 14px; font-weight: 700;">${escapeHTML(c.title)}</h4>
                    <p style="font-size: 12px; color: var(--color-text-muted);">${escapeHTML(c.description)}</p>
                  </div>
                </div>
              `).join('')}
            </div>

            <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'">
              <i class="fa-solid fa-gauge"></i> Enter Dashboard
            </button>
          </div>
        `;
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
        saveBtn.disabled = false;
        saveBtn.innerHTML = `Error saving. Retry.`;
      }
    });
  }
};

Router.register('/onboarding', OnboardingView);
