/**
 * SoundWave Auth SDK — Single Sign-On (SSO) & Reusable Authentication Library
 * 
 * Works for ANY website!
 * Usage in any website:
 * 
 * <script src="https://your-domain.com/soundwave-auth-sdk.js"></script>
 * <script>
 *   SoundWaveAuth.init({
 *     appId: 'my-awesome-site',
 *     appName: 'My Awesome Store',
 *     onSuccess: (user) => console.log('Logged in:', user),
 *     onLogout: () => console.log('Logged out')
 *   });
 * </script>
 */

(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'soundwave_auth_session';

  class SoundWaveAuthSDK {
    constructor() {
      this.config = {
        appId: 'default-app',
        appName: 'Connected Website',
        authUrl: './index.html',
        onSuccess: null,
        onLogout: null,
        theme: 'dark'
      };
      this.initialized = false;
      this.modalElement = null;
      this.iframeElement = null;
    }

    /**
     * Initialize SDK on client website
     * @param {Object} options Configuration parameters
     */
    init(options = {}) {
      this.config = { ...this.config, ...options };
      this.initialized = true;

      // Listen for postMessage from auth iframe / popup
      window.addEventListener('message', this._handleMessage.bind(this));

      // Check existing session
      const existingUser = this.getUser();
      if (existingUser && this.config.onSuccess) {
        this.config.onSuccess(existingUser);
      }

      console.log(`[SoundWaveAuth] SDK initialized for "${this.config.appName}" (App ID: ${this.config.appId})`);
    }

    /**
     * Get active logged in user from localStorage
     */
    getUser() {
      try {
        const data = localStorage.getItem(`${STORAGE_KEY}_${this.config.appId}`);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
      return !!this.getUser();
    }

    /**
     * Open Modal Login Overlay on Client Website
     */
    openModal() {
      if (!this.initialized) {
        console.error('[SoundWaveAuth] Call SoundWaveAuth.init() before opening modal.');
        return;
      }

      if (this.modalElement) {
        this.modalElement.style.display = 'flex';
        return;
      }

      // Inject Modal Overlay Container
      const overlay = document.createElement('div');
      overlay.id = 'soundwave-auth-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        box-sizing: border-box;
        animation: swFadeIn 0.3s ease-out;
      `;

      // Inject iFrame for SoundWave Login
      const iframe = document.createElement('iframe');
      iframe.id = 'soundwave-auth-iframe';
      const authUrlWithParams = `${this.config.authUrl}?embed=true&app_id=${encodeURIComponent(this.config.appId)}&app_name=${encodeURIComponent(this.config.appName)}`;
      iframe.src = authUrlWithParams;
      iframe.style.cssText = `
        width: 100%;
        max-width: 520px;
        height: 720px;
        border: none;
        border-radius: 24px;
        box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 50px rgba(0, 242, 254, 0.2);
        background: transparent;
      `;

      // Close Button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 25px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 1.2rem;
        cursor: pointer;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      `;
      closeBtn.addEventListener('click', () => this.closeModal());

      overlay.appendChild(closeBtn);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);

      this.modalElement = overlay;
      this.iframeElement = iframe;

      // Inject Keyframes
      if (!document.getElementById('sw-sdk-styles')) {
        const style = document.createElement('style');
        style.id = 'sw-sdk-styles';
        style.innerHTML = `@keyframes swFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`;
        document.head.appendChild(style);
      }
    }

    /**
     * Close Login Modal
     */
    closeModal() {
      if (this.modalElement) {
        this.modalElement.style.display = 'none';
      }
    }

    /**
     * Handle incoming postMessage from login iframe
     */
    _handleMessage(event) {
      if (!event.data || event.data.source !== 'SOUNDWAVE_AUTH') return;

      const { type, user } = event.data;

      if (type === 'LOGIN_SUCCESS') {
        // Save session locally for client website
        localStorage.setItem(`${STORAGE_KEY}_${this.config.appId}`, JSON.stringify(user));
        this.closeModal();

        if (this.config.onSuccess) {
          this.config.onSuccess(user);
        }
      } else if (type === 'CLOSE_MODAL') {
        this.closeModal();
      }
    }

    /**
     * Logout active session
     */
    logout() {
      localStorage.removeItem(`${STORAGE_KEY}_${this.config.appId}`);
      if (this.config.onLogout) {
        this.config.onLogout();
      }
      console.log(`[SoundWaveAuth] User logged out from "${this.config.appName}"`);
    }
  }

  // Attach to window object
  window.SoundWaveAuth = new SoundWaveAuthSDK();

})(window, document);
