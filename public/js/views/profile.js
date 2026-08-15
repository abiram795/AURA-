const ProfileView = {
  async render(container) {
    if (!AppState.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    const userId = AppState.currentUser.id;
    const user = await API.getUser(userId);

    const interestsList = [
      { id: 'Prompt Engineering', label: 'Prompt Engineering' },
      { id: 'Generative Media', label: 'Generative Media & Art' },
      { id: 'Deep Learning', label: 'Deep Learning & Math' },
      { id: 'NLP', label: 'Natural Language Processing' },
      { id: 'AI Safety', label: 'AI Safety & Ethics' }
    ];

    const selectedInterests = new Set(user.interests || []);
    const dailyGoal = user.goals ? user.goals.daily : 50;

    container.innerHTML = `
      <div style="margin-bottom: var(--spacing-lg);">
        <h1 style="font-size: 26px; font-weight: 800;" data-i18n="nav-profile">User Profile</h1>
        <p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">Update your learning goals, interests, and profile bio.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-lg);">
        <!-- LEFT panel: Info summary card -->
        <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
          <div class="card" style="text-align: center; align-items: center;">
            <img src="${user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}" alt="${escapeHTML(user.username)}" style="width: 100px; height: 100px; border-radius: var(--border-radius-full); border: 4px solid var(--primary); background-color: var(--bg-tertiary);" id="profile-avatar-preview">
            <h2 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: var(--spacing-sm);">${escapeHTML(user.username)}</h2>
            <span class="badge badge-primary">${user.role}</span>
            
            <div style="width: 100%; border-top: 1px solid var(--border-color); margin-top: var(--spacing-md); padding-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-sm); font-size: 13px; text-align: left;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Current XP:</span>
                <strong style="color: var(--primary);">${user.xp} XP</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Current Level:</span>
                <strong>Level ${user.level}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Streak Counter:</span>
                <strong style="color: var(--accent-streak);"><i class="fa-solid fa-fire"></i> ${user.streak} Days</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT panel: Edit profile Form card -->
        <div class="card">
          <h3 style="font-size: 16px; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-sm);"><i class="fa-solid fa-user-pen"></i> Edit Workspace Settings</h3>
          
          <form id="profile-edit-form" style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-top: var(--spacing-sm);">
            <!-- Avatar URL -->
            <div class="form-group">
              <label for="profile-avatar-input">Avatar Image URL (or Dicebear seed name)</label>
              <input type="text" id="profile-avatar-input" value="${escapeHTML(user.avatar || '')}" placeholder="e.g. https://api.dicebear.com/7.x/bottts/svg?seed=MyName">
            </div>

            <!-- Bio Textarea -->
            <div class="form-group">
              <label for="profile-bio-input">Short Bio</label>
              <textarea id="profile-bio-input" style="height: 80px; resize: vertical;">${escapeHTML(user.bio || '')}</textarea>
            </div>

            <!-- Daily XP Goal Selector -->
            <div class="form-group">
              <label for="profile-goal-select">Daily Learning Target (XP)</label>
              <select id="profile-goal-select">
                <option value="30" ${dailyGoal === 30 ? 'selected' : ''}>30 XP (Beginner - 2 completed lessons)</option>
                <option value="50" ${dailyGoal === 50 ? 'selected' : ''}>50 XP (Consistent - 3 lessons + Quiz)</option>
                <option value="100" ${dailyGoal === 100 ? 'selected' : ''}>100 XP (High Intensity - 6 lessons)</option>
                <option value="200" ${dailyGoal === 200 ? 'selected' : ''}>200 XP (Extreme Marathon)</option>
              </select>
            </div>

            <!-- Interests Checkbox list -->
            <div class="form-group">
              <label>My Learning Interests</label>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-sm); margin-top: var(--spacing-xs);">
                ${interestsList.map(item => `
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm); font-size: 13px; color: var(--text-secondary); cursor: pointer;">
                    <input type="checkbox" class="profile-interest-checkbox" data-id="${item.id}" ${selectedInterests.has(item.id) ? 'checked' : ''} style="accent-color: var(--primary); cursor: pointer; width: 16px; height: 16px;">
                    <span>${item.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Submit buttons -->
            <div style="display: flex; justify-content: flex-end; gap: var(--spacing-md); border-top: 1px solid var(--border-color); padding-top: var(--spacing-md); margin-top: var(--spacing-sm);">
              <button type="submit" class="btn btn-primary" id="profile-save-btn">
                <i class="fa-solid fa-floppy-disk"></i> Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Dynamic avatar preview updating
    const avatarInput = container.querySelector('#profile-avatar-input');
    const avatarPreview = container.querySelector('#profile-avatar-preview');
    avatarInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val) {
        avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
        return;
      }
      // If it's a seed instead of a full URL
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        avatarPreview.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(val)}`;
      } else {
        avatarPreview.src = val;
      }
    });

    // Form submit listener
    const form = container.querySelector('#profile-edit-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const saveBtn = container.querySelector('#profile-save-btn');
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="spinner btn-sm"></span> Saving...`;

      let avatarVal = avatarInput.value.trim();
      if (avatarVal && !avatarVal.startsWith('http://') && !avatarVal.startsWith('https://')) {
        avatarVal = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarVal)}`;
      }

      const bioVal = container.querySelector('#profile-bio-input').value.trim();
      const goalVal = parseInt(container.querySelector('#profile-goal-select').value);

      // Collect checked interests
      const interestsArray = [];
      container.querySelectorAll('.profile-interest-checkbox').forEach(cb => {
        if (cb.checked) {
          interestsArray.push(cb.getAttribute('data-id'));
        }
      });

      try {
        const updateData = {
          bio: bioVal,
          interests: interestsArray,
          goals: { daily: goalVal }
        };

        // If avatar field changed, send it too
        const usersDB = await API.getUsers();
        const originalUser = usersDB.find(u => u.id === userId);
        
        // Since updateUser endpoint takes bio, interests, goals, let's make sure it handles avatar!
        // We can check if avatar changed, and update user.
        // Wait, on the server we can support updating avatar too, or we can just send it inside the update.
        // Let's modify server.js update API to support general user fields.
        // Actually, let's write it in.
        // Wait, let's send it in updateData.
        updateData.avatar = avatarVal || originalUser.avatar;

        const updatedUser = await API.updateUser(userId, updateData);
        AppState.setUser(updatedUser);

        // Update UI shell details in header/sidebar immediately
        document.getElementById('sidebar-avatar').src = updatedUser.avatar;
        document.getElementById('sidebar-username').textContent = updatedUser.username;
        
        alert('Profile details updated successfully!');
        
        // Reload dashboard/profile view
        window.location.hash = '#/profile';
      } catch (err) {
        console.error('Failed to update profile settings:', err);
        alert('Failed to update profile settings.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Profile Changes`;
      }
    });

    AppState.applyTranslations();
  }
};

Router.register('/profile', ProfileView);
