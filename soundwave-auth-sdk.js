/**
 * SoundWave Universal Auth SDK — Single Sign-On (SSO) & Reusable Authentication Library
 * 
 * Works effortlessly across ALL websites, web applications, SPAs, and platforms!
 * 
 * =========================================================================================
 * QUICK START:
 * 
 * <!-- 1. Include the SDK script -->
 * <script src="path/to/soundwave-auth-sdk.js"></script>
 * 
 * <!-- 2. Initialize and trigger login -->
 * <script>
 *   SoundWaveAuth.init({
 *     appId: 'my-project-id',
 *     appName: 'My Project Name',
 *     onSuccess: (user) => {
 *       console.log('User logged in:', user.username, user.token);
 *     },
 *     onLogout: () => {
 *       console.log('User signed out');
 *     }
 *   });
 * 
 *   // Open login modal overlay
 *   SoundWaveAuth.openModal();
 * 
 *   // Or redirect to login page
 *   // SoundWaveAuth.loginRedirect();
 * </script>
 * =========================================================================================
 */

(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'soundwave_auth_session';
  const GLOBAL_STORAGE_KEY = 'soundwave_global_user';

  class SoundWaveAuthSDK {
    constructor() {
      this.config = {
        appId: 'default-app',
        appName: 'Connected Application',
        authUrl: this._detectDefaultAuthUrl(),
        onSuccess: null,
        onLogout: null,
        theme: 'dark'
      };
      this.initialized = false;
      this.modalElement = null;
      this.iframeElement = null;
      this.authChannel = null;
      this.sessionListeners = [];
    }

    /**
     * Smart Auto-Detection for SoundWave SSO Portal URL
     */
    _detectDefaultAuthUrl() {
      if (typeof window !== 'undefined') {
        if (window.SOUNDWAVE_AUTH_URL) return window.SOUNDWAVE_AUTH_URL;
        
        // If loaded on localhost / 127.0.0.1 on port 8088
        if (window.location.port === '8088' || window.location.host.includes('8088')) {
          return `${window.location.origin}/index.html`;
        }

        // Check if running in a sibling project directory
        const path = window.location.pathname || '';
        if (path.includes('SW_Music.App.io') || path.includes('SoundWave_App.com') || path.includes('stitch_creative_motion_editor') || path.includes('PolyCode_Eval')) {
          return '../SoundWave.Login.io/index.html';
        }
      }
      return './index.html';
    }

    /**
     * Initialize SDK on client website
     * @param {Object} options Configuration parameters
     */
    init(options = {}) {
      this.config = { ...this.config, ...options };
      if (!options.authUrl && !this.config.authUrl) {
        this.config.authUrl = this._detectDefaultAuthUrl();
      }
      this.initialized = true;

      // Listen for postMessage from login iframe / modal
      window.addEventListener('message', this._handleMessage.bind(this));

      // Setup BroadcastChannel for cross-tab session syncing
      if ('BroadcastChannel' in window) {
        this.authChannel = new BroadcastChannel('soundwave_auth_channel');
        this.authChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SESSION_LOGIN') {
            this._saveLocalSession(event.data.user);
            if (this.config.onSuccess) this.config.onSuccess(event.data.user);
            this._notifyListeners(event.data.user);
          } else if (event.data && event.data.type === 'SESSION_LOGOUT') {
            this._removeLocalSession();
            if (this.config.onLogout) this.config.onLogout();
            this._notifyListeners(null);
          }
        };
      }

      // Check for redirect callback parameters in current URL
      this.handleRedirectCallback();

      // Check existing session
      const existingUser = this.getUser();
      if (existingUser && this.config.onSuccess) {
        this.config.onSuccess(existingUser);
      }

      console.log(`[SoundWaveAuth] SDK initialized for "${this.config.appName}" (App ID: ${this.config.appId}) -> Auth URL: ${this.config.authUrl}`);
    }

    /**
     * Get active logged-in user from localStorage
     */
    getUser() {
      try {
        const appData = localStorage.getItem(`${STORAGE_KEY}_${this.config.appId}`);
        if (appData) return JSON.parse(appData);

        const globalData = localStorage.getItem(GLOBAL_STORAGE_KEY);
        if (globalData) return JSON.parse(globalData);

        return null;
      } catch (e) {
        return null;
      }
    }

    /**
     * Get active session token
     */
    getToken() {
      const user = this.getUser();
      return user ? user.token : null;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
      return !!this.getUser();
    }

    /**
     * Handle incoming OAuth / SSO redirect callback in the URL
     * Automatically extracts tokens and cleans browser address bar
     */
    handleRedirectCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const authToken = params.get('auth_token');
        const userParam = params.get('user');

        if (authToken && userParam) {
          const userObj = JSON.parse(decodeURIComponent(userParam));
          userObj.token = authToken;
          this._saveLocalSession(userObj);

          // Clean URL without reloading
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          if (this.config.onSuccess) {
            this.config.onSuccess(userObj);
          }
          this._notifyListeners(userObj);
          console.log('[SoundWaveAuth] SSO redirect callback processed successfully:', userObj.username);
        }
      } catch (e) {
        console.warn('[SoundWaveAuth] Redirect callback parsing warning:', e);
      }
    }

    /**
     * Open Modal Login Overlay on Client Website
     */
    openModal() {
      if (!this.initialized) {
        this.init();
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
        background: rgba(5, 8, 15, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        box-sizing: border-box;
        animation: swFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      // Close modal if user clicks outside the iframe
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });

      // Inject iFrame for SoundWave Login
      const iframe = document.createElement('iframe');
      iframe.id = 'soundwave-auth-iframe';
      const authUrlWithParams = `${this.config.authUrl}?embed=true&app_id=${encodeURIComponent(this.config.appId)}&app_name=${encodeURIComponent(this.config.appName)}&theme=${encodeURIComponent(this.config.theme)}`;
      iframe.src = authUrlWithParams;
      iframe.style.cssText = `
        width: 100%;
        max-width: 500px;
        height: 720px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 24px;
        box-shadow: 0 30px 70px rgba(0,0,0,0.7), 0 0 50px rgba(0, 242, 254, 0.2);
        background: transparent;
      `;

      // Close Button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.setAttribute('aria-label', 'Close login window');
      closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 25px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #fff;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        font-size: 1.2rem;
        font-weight: 700;
        cursor: pointer;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, background 0.2s;
      `;
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.transform = 'scale(1.1)';
        closeBtn.style.background = 'rgba(255, 77, 77, 0.4)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.transform = 'scale(1)';
        closeBtn.style.background = 'rgba(255, 255, 255, 0.12)';
      });
      closeBtn.addEventListener('click', () => this.closeModal());

      // Close on ESC key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalElement && this.modalElement.style.display !== 'none') {
          this.closeModal();
        }
      });

      overlay.appendChild(closeBtn);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);

      this.modalElement = overlay;
      this.iframeElement = iframe;

      // Inject Animation Keyframes if not already present
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
     * Redirect flow: Redirect full browser to SoundWave login portal
     * @param {Object} options Optional override parameters
     */
    loginRedirect(options = {}) {
      const targetAppId = options.appId || this.config.appId;
      const targetAppName = options.appName || this.config.appName;
      const returnUrl = options.redirectUri || window.location.href;

      const redirectParams = new URLSearchParams({
        app_id: targetAppId,
        app_name: targetAppName,
        redirect_uri: returnUrl,
        theme: this.config.theme
      });

      window.location.href = `${this.config.authUrl}?${redirectParams.toString()}`;
    }

    /**
     * Render a branded "Sign In with SoundWave" button
     * @param {string|HTMLElement} target Target container element or ID
     * @param {Object} btnOptions Styling & label options
     */
    renderButton(target, btnOptions = {}) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      if (!container) return;

      const label = btnOptions.label || 'Sign in with SoundWave';
      const btn = document.createElement('button');
      btn.className = 'soundwave-auth-btn';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.75rem 1.4rem;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #00F2FE 0%, #4FACFE 40%, #7928CA 100%);
        color: #FFFFFF;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>
        </svg>
        <span>${label}</span>
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 8px 25px rgba(0, 242, 254, 0.45)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 4px 15px rgba(0, 242, 254, 0.3)';
      });

      btn.addEventListener('click', () => {
        if (btnOptions.mode === 'redirect') {
          this.loginRedirect();
        } else {
          this.openModal();
        }
      });

      container.appendChild(btn);
    }

    /**
     * Subscribe to session changes across all browser tabs
     */
    onSessionChange(callback) {
      if (typeof callback === 'function') {
        this.sessionListeners.push(callback);
      }
    }

    /**
     * Handle incoming postMessage from login iframe
     */
    _handleMessage(event) {
      if (!event.data || event.data.source !== 'SOUNDWAVE_AUTH') return;

      const { type, user } = event.data;

      if (type === 'LOGIN_SUCCESS') {
        this._saveLocalSession(user);
        this.closeModal();

        if (this.config.onSuccess) {
          this.config.onSuccess(user);
        }
        this._notifyListeners(user);
      } else if (type === 'CLOSE_MODAL') {
        this.closeModal();
      }
    }

    _saveLocalSession(user) {
      try {
        localStorage.setItem(`${STORAGE_KEY}_${this.config.appId}`, JSON.stringify(user));
        localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {}
    }

    _removeLocalSession() {
      try {
        localStorage.removeItem(`${STORAGE_KEY}_${this.config.appId}`);
        localStorage.removeItem(GLOBAL_STORAGE_KEY);
      } catch (e) {}
    }

    _notifyListeners(user) {
      this.sessionListeners.forEach(cb => {
        try { cb(user); } catch (e) {}
      });
    }

    /**
     * Logout active session across this project and all open tabs
     */
    logout() {
      this._removeLocalSession();

      if (this.authChannel) {
        this.authChannel.postMessage({ type: 'SESSION_LOGOUT' });
      }

      if (this.config.onLogout) {
        this.config.onLogout();
      }
      this._notifyListeners(null);
      console.log(`[SoundWaveAuth] User signed out from "${this.config.appName}"`);
    }
  }

  // Attach global instance to window
  window.SoundWaveAuth = new SoundWaveAuthSDK();

})(window, document);
