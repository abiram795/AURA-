const VerifyCertificateView = {
  async render(container, params) {
    const certId = params.id;
    
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg); background-color: var(--bg-primary);">
        <div class="card" id="verification-card" style="width: 100%; max-width: 600px; padding: var(--spacing-xl); text-align: center; border: 1px solid var(--border-glass); background: var(--bg-secondary); position: relative;">
          <div class="loading-overlay" id="verification-loader" style="position: absolute; inset: 0; background: var(--bg-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--border-radius-md); z-index: 10;">
            <div class="spinner"></div>
            <span style="font-size: 13px; color: var(--text-muted); margin-top: var(--spacing-sm);">Checking credential integrity...</span>
          </div>
          <div id="verification-result"></div>
        </div>
      </div>
    `;

    const resultBox = container.querySelector('#verification-result');
    const loader = container.querySelector('#verification-loader');

    try {
      // API call to verify
      const res = await API.verifyCertificate(certId);
      
      loader.style.display = 'none';
      resultBox.innerHTML = `
        <div style="color: var(--success); font-size: 56px; margin-bottom: var(--spacing-md);">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">Credential Verified</h2>
        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: var(--spacing-xl);">AuraAI Official Blockchain-Backed Certificate of Completion</p>
        
        <div class="card" style="background: var(--bg-tertiary); border: 1px solid var(--border-glass); padding: var(--spacing-lg); text-align: left; display: flex; flex-direction: column; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
          <div>
            <span style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;">Recipient Student</span>
            <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${escapeHTML(res.studentName)}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${escapeHTML(res.studentEmail)}</div>
          </div>
          <div style="border-top: 1px solid var(--border-glass); padding-top: var(--spacing-sm);">
            <span style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;">Completed Course</span>
            <div style="font-size: 16px; font-weight: 800; color: var(--primary); margin-top: 2px;">${escapeHTML(res.certificate.courseTitle)}</div>
          </div>
          <div style="border-top: 1px solid var(--border-glass); padding-top: var(--spacing-sm); display: flex; justify-content: space-between;">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;">Completion Date</span>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${new Date(res.certificate.completedAt).toLocaleDateString()}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;">Credential ID</span>
              <div style="font-size: 13px; font-family: monospace; font-weight: 600; color: var(--secondary); margin-top: 2px;">${escapeHTML(res.certificate.id)}</div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: var(--spacing-sm); justify-content: center; margin-top: var(--spacing-xl);">
          <a href="#/login" class="btn btn-secondary btn-sm"><i class="fa-solid fa-house"></i> Portal Home</a>
          <button class="btn btn-primary btn-sm" id="view-cert-full-btn"><i class="fa-solid fa-award"></i> View Certificate</button>
        </div>
      `;

      // Redirect button to view certificate inside the portal if they click it
      container.querySelector('#view-cert-full-btn').addEventListener('click', () => {
        window.location.hash = '#/dashboard';
      });

    } catch (err) {
      loader.style.display = 'none';
      resultBox.innerHTML = `
        <div style="color: var(--danger); font-size: 56px; margin-bottom: var(--spacing-md);">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-bottom: var(--spacing-xs);">Verification Failed</h2>
        <p style="color: var(--text-secondary); font-size: 13px; max-width: 400px; margin: 0 auto var(--spacing-lg) auto;">
          The certificate ID <strong>${escapeHTML(certId)}</strong> is invalid, has been modified, or has been revoked. Please check the ID and try again.
        </p>
        
        <div style="margin-top: var(--spacing-xl);">
          <a href="#/login" class="btn btn-primary btn-sm">Go to Login</a>
        </div>
      `;
    }
  }
};

Router.register('/verify/:id', VerifyCertificateView);
