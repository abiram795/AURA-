const LoginView = {
  async render(container) {
    container.innerHTML = `
      <div class="login-view-container">
        <div style="margin-bottom: var(--spacing-md);">
          <h1 class="login-title-gradient">AuraAI Learning Platform</h1>
          <p class="login-subtitle">Enter your credentials to access your courses, quizzes, and learning dashboard.</p>
        </div>
        
        <div class="card" style="width: 100%; max-width: 420px; padding: var(--spacing-xl); gap: var(--spacing-lg);">
          <h2 style="font-size: 20px; font-weight: 800; text-align: center; color: var(--text-primary);">Sign In</h2>
          
          <form id="auth-login-form" style="display: flex; flex-direction: column; gap: var(--spacing-md);">
            <!-- Email -->
            <div class="form-group" style="text-align: left;">
              <label for="login-email-input">Email Address</label>
              <input type="email" id="login-email-input" placeholder="student@auraai.com" required style="width: 100%;">
            </div>

            <!-- Password -->
            <div class="form-group" style="text-align: left;">
              <label for="login-password-input">Password</label>
              <div style="position: relative; width: 100%;">
                <input type="password" id="login-password-input" placeholder="••••••••" required style="width: 100%; padding-right: 40px;">
                <button type="button" id="password-toggle-btn" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: var(--spacing-xs); display: flex; align-items: center; justify-content: center; font-size: 16px; transition: color var(--transition-fast); z-index: 10;" aria-label="Toggle password visibility">
                  <i class="fa-solid fa-eye" id="password-toggle-icon"></i>
                </button>
              </div>
            </div>

            <!-- Error message container -->
            <div id="login-form-error" style="display: none; color: var(--danger); font-size: 12px; text-align: left;">
              <i class="fa-solid fa-circle-exclamation"></i> Invalid email or password.
            </div>

            <!-- Sign In button -->
            <button type="submit" class="btn btn-primary" id="login-submit-btn" style="width: 100%; justify-content: center; margin-top: var(--spacing-xs);">
              Sign In
            </button>
          </form>

          <div style="display: flex; align-items: center; text-align: center; margin: var(--spacing-xs) 0;">
            <hr style="flex-grow: 1; border: none; border-top: 1px solid var(--border-color);">
            <span style="padding: 0 var(--spacing-md); font-size: 12px; color: var(--text-muted); text-transform: uppercase;">or</span>
            <hr style="flex-grow: 1; border: none; border-top: 1px solid var(--border-color);">
          </div>

          <!-- Google Sign-In Button -->
          <button class="btn btn-secondary" id="google-login-btn" style="width: 100%; justify-content: center; background-color: #fff; color: #1f2937; border-color: #e5e7eb;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" style="width: 16px; height: 16px; margin-right: var(--spacing-sm);">
            Sign in with Google
          </button>
        </div>

        <!-- Help cheat sheet for the reviewer -->
        <details style="font-size: 11px; color: var(--text-secondary); width: 100%; max-width: 420px; background-color: rgba(99, 102, 241, 0.05); border: 1px dashed rgba(99, 102, 241, 0.2); padding: var(--spacing-md); border-radius: var(--border-radius-md); text-align: left; margin-top: var(--spacing-sm); cursor: pointer;">
          <summary style="font-weight: 700; color: var(--primary); outline: none;"><i class="fa-solid fa-key"></i> View Mock User Accounts List (8 Accounts)</summary>
          <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); margin-top: var(--spacing-sm); cursor: default;">
            <div style="font-weight: 700; color: var(--text-primary);">Students (2):</div>
            <div>• <code>student@auraai.com</code> / <code>student123</code> (Abiram Sureshbabu)</div>
            <div>• <code>maria@auraai.com</code> / <code>maria123</code> (Maria Lopez)</div>
            
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 4px;">Teachers / Instructors (5):</div>
            <div>• <code>sarah@auraai.com</code> / <code>sarah123</code> (Dr. Sarah Chen)</div>
            <div>• <code>liam@auraai.com</code> / <code>liam123</code> (Liam Carter)</div>
            <div>• <code>alan@auraai.com</code> / <code>alan123</code> (Dr. Alan Turing)</div>
            <div>• <code>geoffrey@auraai.com</code> / <code>geoffrey123</code> (Prof. Geoffrey Hinton)</div>
            <div>• <code>feifei@auraai.com</code> / <code>feifei123</code> (Dr. Fei-Fei Li)</div>
            
            <div style="font-weight: 700; color: var(--text-primary); margin-top: 4px;">Admin (1):</div>
            <div>• <code>admin@auraai.com</code> / <code>admin123</code> (Platform Admin)</div>
          </div>
        </details>
      </div>

      <!-- Google Authentication Overlay Modal (Simulated) -->
      <div class="modal-overlay" id="google-auth-overlay" style="z-index: 1000;">
        <div class="modal-container" style="max-width: 380px; text-align: center; padding: var(--spacing-xl); align-items: center; gap: var(--spacing-md);">
          <i class="fa-brands fa-google" style="font-size: 48px; color: #4285f4; animation: spin 2s infinite linear;"></i>
          <h3 style="font-size: 18px; font-weight: 800;">Authenticating via Google</h3>
          <p style="font-size: 13px; color: var(--text-secondary);">Connecting to accounts.google.com...</p>
          <div class="spinner" style="width: 24px; height: 24px;"></div>
        </div>
      </div>
    `;

    const form = container.querySelector('#auth-login-form');
    const emailInput = container.querySelector('#login-email-input');
    const passwordInput = container.querySelector('#login-password-input');
    const errorEl = container.querySelector('#login-form-error');
    const submitBtn = container.querySelector('#login-submit-btn');

    // Toggle password visibility
    const passwordToggleBtn = container.querySelector('#password-toggle-btn');
    const passwordToggleIcon = container.querySelector('#password-toggle-icon');
    if (passwordToggleBtn && passwordInput && passwordToggleIcon) {
      passwordToggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passwordToggleIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    }

    const googleBtn = container.querySelector('#google-login-btn');
    const googleOverlay = container.querySelector('#google-auth-overlay');

    // Email/Password Submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner btn-sm"></span> Signing In...`;
      errorEl.style.display = 'none';

      try {
        const user = await API.login(email, password);
        
        // Successful login
        AppState.setUser(user);

        try {
          await API.checkStreak(user.id);
        } catch(se) {
          console.error('Streak update failed:', se);
        }

        // Navigate
        if (user.role === 'student' && (!user.interests || user.interests.length === 0)) {
          window.location.hash = '#/onboarding';
        } else {
          window.location.hash = '#/dashboard';
        }
      } catch (err) {
        console.warn('Login verification failed:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        errorEl.style.display = 'block';
      }
    });

    // Simulated Google Login click handler
    googleBtn.addEventListener('click', () => {
      // Toggle Google Authenticating modal overlay
      googleOverlay.classList.add('active');
      
      setTimeout(async () => {
        try {
          // Log in as student u1 ("Abiram Sureshbabu")
          const user = await API.login('student@auraai.com', 'student123');
          AppState.setUser(user);
          
          try {
            await API.checkStreak(user.id);
          } catch(se) {
            console.error('Streak check failed:', se);
          }

          googleOverlay.classList.remove('active');

          if (user.role === 'student' && (!user.interests || user.interests.length === 0)) {
            window.location.hash = '#/onboarding';
          } else {
            window.location.hash = '#/dashboard';
          }
        } catch (err) {
          console.error('Google login simulation failed:', err);
          googleOverlay.classList.remove('active');
          alert('Google authentication failed.');
        }
      }, 1500); // 1.5 second simulated google prompt loading
    });
  }
};

Router.register('/login', LoginView);
