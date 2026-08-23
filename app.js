/**
 * SoundWave.io — Universal Single Sign-On (SSO) & Common Authentication Engine
 * Supports standalone login portal, embeddable SDK iframe modal, and multi-tenant redirect flows.
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- SDK & MULTI-TENANT URL PARAMETER DETECTION ---
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get('embed') === 'true' || window.self !== window.top;
  let appId = urlParams.get('app_id') || 'all-projects';
  let appName = urlParams.get('app_name') || null;
  const redirectUri = urlParams.get('redirect_uri') || null;
  const initialMode = urlParams.get('mode') || 'login';
  const initialTheme = urlParams.get('theme') || 'dark';

  if (isEmbedded) {
    document.body.classList.add('embedded-mode');
  }

  // --- STATE MANAGEMENT ---
  const state = {
    theme: initialTheme,
    soundEnabled: true,
    currentTab: 'password',
    currentMode: initialMode, // 'login' | 'signup'
    lang: 'EN',
    user: null,
    otpTimer: null,
    isPlaying: true,
    activeAppId: appId,
    activeAppName: appName || 'All Projects Hub',
    redirectUri: redirectUri,
    currentOtp: '749210',
    qrSessionId: 'SW-' + Math.floor(10000 + Math.random() * 90000) + '-SSO'
  };

  // Set theme from URL or default
  document.documentElement.setAttribute('data-theme', state.theme);

  // Cross-Tab Session Sync via BroadcastChannel
  let authChannel = null;
  if ('BroadcastChannel' in window) {
    authChannel = new BroadcastChannel('soundwave_auth_channel');
    authChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'SESSION_LOGIN') {
        console.log('[SoundWave SSO] Received cross-tab login for:', event.data.user.username);
        if (!state.user && !isEmbedded) {
          handleLoginSuccess(event.data.user.username, event.data.user.role, false);
        }
      } else if (event.data && event.data.type === 'SESSION_LOGOUT') {
        if (state.user && !isEmbedded) {
          handleLogoutLocal();
        }
      }
    };
  }

  // --- PROJECT SWITCHER (Allows testing SSO for any of user's projects) ---
  const projectSwitchBtn = document.getElementById('project-switch-btn');
  const projectDropdown = document.querySelector('.project-dropdown');
  const activeProjectLabel = document.getElementById('active-project-label');
  const projectOptions = document.querySelectorAll('.project-option');
  const clientBadge = document.getElementById('client-website-badge');
  const clientWebsiteName = document.getElementById('client-website-name');

  function updateTenantDisplay(id, name) {
    state.activeAppId = id;
    state.activeAppName = name;

    if (activeProjectLabel) {
      activeProjectLabel.textContent = name;
    }

    if (clientBadge && clientWebsiteName) {
      if (id !== 'all-projects') {
        clientWebsiteName.textContent = name;
        clientBadge.classList.remove('hidden');
      } else {
        clientBadge.classList.add('hidden');
      }
    }

    // Update active class in project menu
    projectOptions.forEach(opt => {
      if (opt.dataset.appId === id) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    updateLanguageText();
  }

  if (appName) {
    updateTenantDisplay(appId, appName);
  }

  if (projectSwitchBtn && projectDropdown) {
    projectSwitchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('click');
      projectDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!projectDropdown.contains(e.target)) {
        projectDropdown.classList.remove('open');
      }
    });

    projectOptions.forEach(option => {
      option.addEventListener('click', () => {
        playSound('click');
        const selectedId = option.dataset.appId;
        const selectedName = option.dataset.appName;
        updateTenantDisplay(selectedId, selectedName);
        projectDropdown.classList.remove('open');
        showToast(`Tenant switched to: ${selectedName}`, 'info');
      });
    });
  }

  // --- DICTIONARY FOR MULTILINGUAL SUPPORT ---
  const i18n = {
    EN: {
      welcome: () => state.activeAppId !== 'all-projects' ? `Sign in to ${state.activeAppName}` : "Universal Login",
      subWelcome: () => state.activeAppId !== 'all-projects' ? "Use your single SoundWave ID to continue" : "One SoundWave ID to access all your connected projects",
      createAcc: "Join SoundWave",
      subCreateAcc: "Create a single account that unlocks all SoundWave projects",
      signInBtn: () => state.activeAppId !== 'all-projects' ? `Continue to ${state.activeAppName}` : "Sign In to SoundWave",
      signUpBtn: "Create Free Account",
      switchSignUp: "Don't have an account? <button id='switch-mode-btn' class='switch-link'>Sign Up</button>",
      switchSignIn: "Already a member? <button id='switch-mode-btn' class='switch-link'>Sign In</button>"
    },
    ES: {
      welcome: () => state.activeAppId !== 'all-projects' ? `Iniciar sesión en ${state.activeAppName}` : "Inicio de Sesión Universal",
      subWelcome: () => "Usa tu ID de SoundWave para todos tus proyectos",
      createAcc: "Únete a SoundWave",
      subCreateAcc: "Crea una cuenta única para desbloquear todo",
      signInBtn: () => "Iniciar sesión en SoundWave",
      signUpBtn: "Crear cuenta gratis",
      switchSignUp: "¿No tienes una cuenta? <button id='switch-mode-btn' class='switch-link'>Regístrate</button>",
      switchSignIn: "¿Ya eres miembro? <button id='switch-mode-btn' class='switch-link'>Iniciar sesión</button>"
    },
    FR: {
      welcome: () => state.activeAppId !== 'all-projects' ? `Connexion à ${state.activeAppName}` : "Connexion Universelle",
      subWelcome: () => "Un seul identifiant SoundWave pour tous vos projets",
      createAcc: "Rejoindre SoundWave",
      subCreateAcc: "Créez un compte unique pour tout déverrouiller",
      signInBtn: () => "Se connecter à SoundWave",
      signUpBtn: "Créer un compte gratuit",
      switchSignUp: "Pas encore de compte? <button id='switch-mode-btn' class='switch-link'>S'inscrire</button>",
      switchSignIn: "Déjà membre? <button id='switch-mode-btn' class='switch-link'>Se connecter</button>"
    },
    DE: {
      welcome: () => state.activeAppId !== 'all-projects' ? `Anmelden bei ${state.activeAppName}` : "Universeller Login",
      subWelcome: () => "Eine SoundWave-ID für alle deine Projekte",
      createAcc: "SoundWave beitreten",
      subCreateAcc: "Erstelle ein Konto für alle Plattformen",
      signInBtn: () => "Bei SoundWave anmelden",
      signUpBtn: "Kostenloses Konto erstellen",
      switchSignUp: "Noch kein Konto? <button id='switch-mode-btn' class='switch-link'>Registrieren</button>",
      switchSignIn: "Bereits Mitglied? <button id='switch-mode-btn' class='switch-link'>Anmelden</button>"
    },
    JA: {
      welcome: () => state.activeAppId !== 'all-projects' ? `${state.activeAppName} にサインイン` : "ユニバーサルログイン",
      subWelcome: () => "1つのSoundWave IDですべてのプロジェクトにアクセス",
      createAcc: "SoundWaveに参加",
      subCreateAcc: "1つのアカウントですべてのサービスを利用可能",
      signInBtn: () => "SoundWaveにサインイン",
      signUpBtn: "無料アカウントを作成",
      switchSignUp: "アカウントをお持ちでないですか？ <button id='switch-mode-btn' class='switch-link'>新規登録</button>",
      switchSignIn: "すでにメンバーですか？ <button id='switch-mode-btn' class='switch-link'>サインイン</button>"
    }
  };

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'key') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0, now + idx * 0.08);
          g.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.6);
        });
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(140, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Silent fallback
    }
  }

  // --- SOUNDWAVE CANVAS BACKGROUND SIMULATOR ---
  const canvas = document.getElementById('soundwave-canvas');
  const canvasCtx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  let mouseX = width / 2;
  let mouseY = height / 2;
  let typingPulse = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('keydown', () => {
    typingPulse = Math.min(typingPulse + 4, 30);
    playSound('key');
  });

  let step = 0;
  function renderCanvas() {
    canvasCtx.clearRect(0, 0, width, height);

    const baseAmp = 35 + typingPulse;
    if (typingPulse > 0) typingPulse *= 0.94;

    step += 0.02;

    const themeColors = state.theme === 'dark' 
      ? ['rgba(0, 242, 254, 0.25)', 'rgba(79, 172, 254, 0.2)', 'rgba(121, 40, 202, 0.25)', 'rgba(255, 0, 128, 0.15)']
      : ['rgba(0, 150, 255, 0.2)', 'rgba(121, 40, 202, 0.15)', 'rgba(0, 223, 216, 0.2)'];

    for (let i = 0; i < themeColors.length; i++) {
      canvasCtx.beginPath();
      canvasCtx.lineWidth = i === 0 ? 3 : 2;
      canvasCtx.strokeStyle = themeColors[i];

      const waveY = height * (0.45 + i * 0.08);
      const freq = 0.003 + i * 0.001;

      for (let x = 0; x < width; x += 6) {
        const dist = Math.abs(x - mouseX);
        const mouseFactor = Math.max(0, 1 - dist / 300);
        const y = waveY + Math.sin(x * freq + step + i) * (baseAmp + mouseFactor * 40);

        if (x === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
      }
      canvasCtx.stroke();
    }

    const barCount = Math.floor(width / 24);
    for (let i = 0; i < barCount; i++) {
      const barHeight = (Math.sin(step * 2 + i * 0.3) * 0.5 + 0.5) * (40 + typingPulse * 1.5);
      const x = i * 24;
      const y = height - barHeight;

      const grad = canvasCtx.createLinearGradient(0, height, 0, y);
      grad.addColorStop(0, state.theme === 'dark' ? 'rgba(121, 40, 202, 0.05)' : 'rgba(79, 172, 254, 0.05)');
      grad.addColorStop(1, state.theme === 'dark' ? 'rgba(0, 242, 254, 0.3)' : 'rgba(121, 40, 202, 0.3)');

      canvasCtx.fillStyle = grad;
      canvasCtx.fillRect(x, y, 16, barHeight);
    }

    requestAnimationFrame(renderCanvas);
  }
  renderCanvas();

  // --- TOAST NOTIFICATION HELPER ---
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-solid fa-circle-info';
    if (type === 'success') icon = 'fa-solid fa-circle-check';
    if (type === 'error') icon = 'fa-solid fa-circle-exclamation';

    toast.innerHTML = `
      <i class="${icon} toast-icon"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- ACCESSIBILITY ANNOUNCER ---
  const announcer = document.getElementById('aria-announcer');
  function announce(msg) {
    if (announcer) {
      announcer.textContent = msg;
    }
  }

  // --- HEADER CONTROLS ---
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  const langDropdown = document.querySelector('.lang-dropdown');
  const currentLangLabel = document.getElementById('current-lang');
  const langOptions = document.querySelectorAll('.lang-option');

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      soundIcon.className = state.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      playSound('click');
      showToast(state.soundEnabled ? 'Audio FX Enabled' : 'Audio FX Muted', 'info');
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      playSound('click');
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      themeIcon.className = state.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      showToast(`Switched to ${state.theme.toUpperCase()} mode`, 'info');
    });
  }

  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('click');
      langDropdown.classList.toggle('open');
      langBtn.setAttribute('aria-expanded', langDropdown.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
      if (!langDropdown.contains(e.target)) {
        langDropdown.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    langOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        playSound('click');
        langOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        state.lang = opt.getAttribute('data-lang');
        currentLangLabel.textContent = state.lang;
        langDropdown.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
        updateLanguageText();
        showToast(`Language updated to ${opt.textContent.trim()}`, 'info');
      });
    });
  }

  function updateLanguageText() {
    const dict = i18n[state.lang] || i18n.EN;
    const title = document.getElementById('form-title');
    const sub = document.getElementById('form-subtitle');
    const submitPass = document.getElementById('submit-password-btn')?.querySelector('.btn-text');
    const footerPrompt = document.getElementById('footer-prompt');

    if (state.currentMode === 'login') {
      if (title) title.textContent = typeof dict.welcome === 'function' ? dict.welcome() : dict.welcome;
      if (sub) sub.textContent = typeof dict.subWelcome === 'function' ? dict.subWelcome() : dict.subWelcome;
      if (submitPass) submitPass.textContent = typeof dict.signInBtn === 'function' ? dict.signInBtn() : dict.signInBtn;
      if (footerPrompt) footerPrompt.innerHTML = dict.switchSignUp;
    } else {
      if (title) title.textContent = dict.createAcc;
      if (sub) sub.textContent = dict.subCreateAcc;
      if (footerPrompt) footerPrompt.innerHTML = dict.switchSignIn;
    }
    bindModeSwitchListener();
  }

  // --- AUTH TABS NAVIGATION (4 TABS) ---
  const authTabs = document.getElementById('auth-tabs');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click');
      const tabId = btn.getAttribute('data-tab');
      state.currentTab = tabId;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');

      const targetContent = document.getElementById(`${tabId}-form`) || document.getElementById(`${tabId}-view`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // --- TAB 1: PASSWORD FORM LOGIC ---
  const passwordForm = document.getElementById('password-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const clearEmailBtn = document.querySelector('.input-clear-btn');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const eyeIcon = document.getElementById('eye-icon');
  const capsWarning = document.getElementById('caps-warning');
  const demoFillBtn = document.getElementById('demo-fill-btn');
  const submitPassBtn = document.getElementById('submit-password-btn');

  // Input Clear Email
  if (loginEmail && clearEmailBtn) {
    loginEmail.addEventListener('input', () => {
      clearEmailBtn.classList.toggle('hidden', !loginEmail.value);
    });
    clearEmailBtn.addEventListener('click', () => {
      loginEmail.value = '';
      clearEmailBtn.classList.add('hidden');
      loginEmail.focus();
      playSound('click');
    });
  }

  // Password Visibility Toggle
  if (togglePassBtn && loginPassword && eyeIcon) {
    togglePassBtn.addEventListener('click', () => {
      playSound('click');
      const isPass = loginPassword.type === 'password';
      loginPassword.type = isPass ? 'text' : 'password';
      eyeIcon.className = isPass ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  }

  // Caps Lock Warning
  if (loginPassword && capsWarning) {
    loginPassword.addEventListener('keyup', (e) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        capsWarning.classList.remove('hidden');
      } else {
        capsWarning.classList.add('hidden');
      }
    });
  }

  // Auto Fill Demo Credentials
  if (demoFillBtn) {
    demoFillBtn.addEventListener('click', () => {
      playSound('click');
      if (loginEmail) loginEmail.value = 'alex.rivera@soundwave.io';
      if (loginPassword) loginPassword.value = 'SoundWave2026!';
      if (clearEmailBtn) clearEmailBtn.classList.remove('hidden');
      showToast('Demo credentials filled! Ready to sign in.', 'info');
    });
  }

  // Password Form Submit Handler
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid = true;

      // Validate Email
      const emailGroup = loginEmail.closest('.input-group');
      if (!loginEmail.value || !loginEmail.value.includes('@')) {
        emailGroup.classList.add('invalid');
        isValid = false;
      } else {
        emailGroup.classList.remove('invalid');
      }

      // Validate Password
      const passGroup = loginPassword.closest('.input-group');
      if (!loginPassword.value || loginPassword.value.length < 6) {
        passGroup.classList.add('invalid');
        isValid = false;
      } else {
        passGroup.classList.remove('invalid');
      }

      if (!isValid) {
        playSound('error');
        showToast('Please check the highlighted fields', 'error');
        return;
      }

      // Trigger Spinner & Simulate Auth
      playSound('click');
      setLoadingState(submitPassBtn, true);

      setTimeout(() => {
        setLoadingState(submitPassBtn, false);
        const namePart = loginEmail.value.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        handleLoginSuccess(formattedName || 'Alex Rivera', 'Universal Pro Member');
      }, 1200);
    });
  }

  // --- TAB 2: MAGIC LINK & OTP LOGIC ---
  const magicForm = document.getElementById('magic-form');
  const magicEmail = document.getElementById('magic-email');
  const otpSection = document.getElementById('otp-section');
  const otpInputs = document.querySelectorAll('.otp-box');
  const submitMagicBtn = document.getElementById('submit-magic-btn');
  const demoFillOtpBtn = document.getElementById('demo-fill-otp-btn');
  const resendOtpBtn = document.getElementById('resend-otp-btn');
  const timerCount = document.getElementById('timer-count');
  let isOtpStep = false;

  // Auto-focus progression for OTP inputs
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      playSound('key');
      const val = e.target.value;
      if (val && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }

      // Auto-submit when all 6 digits entered
      const allFilled = Array.from(otpInputs).every(i => i.value.length === 1);
      if (allFilled) {
        triggerOtpVerification();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });

    // Handle paste event (e.g. pasted 6-digit code)
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, i) => {
          if (otpInputs[i]) otpInputs[i].value = char;
        });
        otpInputs[5]?.focus();
        showToast('Access code pasted!', 'info');
        triggerOtpVerification();
      }
    });
  });

  if (demoFillOtpBtn) {
    demoFillOtpBtn.addEventListener('click', () => {
      playSound('click');
      const demoCode = state.currentOtp;
      demoCode.split('').forEach((char, i) => {
        if (otpInputs[i]) otpInputs[i].value = char;
      });
      showToast(`Auto-filled 6-digit OTP code: ${demoCode}`, 'info');
      triggerOtpVerification();
    });
  }

  function startOtpTimer() {
    let timeLeft = 30;
    if (resendOtpBtn) resendOtpBtn.classList.add('hidden');
    if (timerCount) timerCount.textContent = timeLeft;

    clearInterval(state.otpTimer);
    state.otpTimer = setInterval(() => {
      timeLeft--;
      if (timerCount) timerCount.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(state.otpTimer);
        if (resendOtpBtn) resendOtpBtn.classList.remove('hidden');
        const timerText = document.getElementById('resend-timer-text');
        if (timerText) timerText.classList.add('hidden');
      }
    }, 1000);
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => {
      playSound('click');
      state.currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
      showToast(`New code dispatched to ${magicEmail.value}! (Demo OTP: ${state.currentOtp})`, 'info');
      const timerText = document.getElementById('resend-timer-text');
      if (timerText) timerText.classList.remove('hidden');
      startOtpTimer();
    });
  }

  if (magicForm) {
    magicForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isOtpStep) {
        if (!magicEmail.value || !magicEmail.value.includes('@')) {
          magicEmail.closest('.input-group').classList.add('invalid');
          playSound('error');
          return;
        }
        magicEmail.closest('.input-group').classList.remove('invalid');
        playSound('click');
        setLoadingState(submitMagicBtn, true);

        setTimeout(() => {
          setLoadingState(submitMagicBtn, false);
          isOtpStep = true;
          otpSection.classList.remove('hidden');
          submitMagicBtn.querySelector('.btn-text').textContent = 'Verify & Authenticate';
          showToast(`Access code sent to ${magicEmail.value}! (Demo OTP: ${state.currentOtp})`, 'info', 6000);
          startOtpTimer();
          otpInputs[0]?.focus();
        }, 1000);
      } else {
        triggerOtpVerification();
      }
    });
  }

  function triggerOtpVerification() {
    const enteredOtp = Array.from(otpInputs).map(i => i.value).join('');
    if (enteredOtp.length < 6) {
      playSound('error');
      showToast('Please enter the full 6-digit access code', 'error');
      return;
    }

    setLoadingState(submitMagicBtn, true);
    setTimeout(() => {
      setLoadingState(submitMagicBtn, false);
      const userPrefix = magicEmail.value.split('@')[0] || 'Member';
      handleLoginSuccess(userPrefix, 'OTP Verified User');
    }, 1200);
  }

  // --- TAB 3: PASSKEY & BIOMETRIC AUTH ---
  const startBiometricBtn = document.getElementById('start-biometric-btn');
  const passkeyStatusText = document.getElementById('passkey-status-text');

  if (startBiometricBtn) {
    startBiometricBtn.addEventListener('click', () => {
      playSound('click');
      startBiometricBtn.classList.add('scanning');
      if (passkeyStatusText) {
        passkeyStatusText.textContent = 'Verifying Touch ID / Face ID...';
        passkeyStatusText.style.color = 'var(--accent-purple)';
      }

      // Check if browser supports WebAuthn credentials
      if (window.PublicKeyCredential) {
        console.log('[SoundWave Auth] WebAuthn API available on client device');
      }

      setTimeout(() => {
        startBiometricBtn.classList.remove('scanning');
        if (passkeyStatusText) {
          passkeyStatusText.textContent = 'Biometric Authenticated! ✨';
          passkeyStatusText.style.color = '#10B981';
        }
        handleLoginSuccess('Alex (TouchID)', 'Biometric Secure Keyholder');
      }, 1600);
    });
  }

  // --- TAB 4: QR CODE SCANNING FAST LOGIN ---
  const simulateQrScanBtn = document.getElementById('simulate-qr-scan-btn');
  const qrSessionLabel = document.getElementById('qr-session-id');

  if (qrSessionLabel) {
    qrSessionLabel.textContent = state.qrSessionId;
  }

  if (simulateQrScanBtn) {
    simulateQrScanBtn.addEventListener('click', () => {
      playSound('click');
      showToast('📱 QR Code scanned by SoundWave Mobile App! Verifying...', 'info');
      simulateQrScanBtn.disabled = true;
      simulateQrScanBtn.innerHTML = '<div class="spinner"></div> <span>Approving Session...</span>';

      setTimeout(() => {
        simulateQrScanBtn.disabled = false;
        simulateQrScanBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Session Approved!</span>';
        handleLoginSuccess('Alex (Mobile Scan)', 'Mobile Authenticated User');
      }, 1500);
    });
  }

  // --- SIGN UP FORM & PASSWORD STRENGTH METER ---
  const signupForm = document.getElementById('signup-form');
  const signupName = document.getElementById('signup-name');
  const signupEmail = document.getElementById('signup-email');
  const signupRole = document.getElementById('signup-role');
  const signupPass = document.getElementById('signup-password');
  const termsAgree = document.getElementById('terms-agree');
  const submitSignupBtn = document.getElementById('submit-signup-btn');
  const strengthBars = [
    document.getElementById('bar-1'),
    document.getElementById('bar-2'),
    document.getElementById('bar-3'),
    document.getElementById('bar-4')
  ];
  const strengthLabel = document.getElementById('strength-label');

  if (signupPass) {
    signupPass.addEventListener('input', () => {
      const val = signupPass.value;
      let score = 0;

      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      strengthBars.forEach((bar, idx) => {
        if (bar) {
          if (idx < score) {
            bar.style.background = score <= 1 ? '#FF4D4D' : score <= 2 ? '#F59E0B' : score === 3 ? '#00F2FE' : '#10B981';
          } else {
            bar.style.background = 'var(--input-border)';
          }
        }
      });

      if (strengthLabel) {
        const labels = ['Too weak', 'Weak', 'Good password', 'Strong password', 'Very secure'];
        strengthLabel.textContent = val ? labels[score] : 'Password strength';
        strengthLabel.style.color = score <= 1 ? '#FF4D4D' : score === 2 ? '#F59E0B' : '#10B981';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      if (!signupName.value.trim()) {
        signupName.closest('.input-group').classList.add('invalid');
        valid = false;
      } else {
        signupName.closest('.input-group').classList.remove('invalid');
      }

      if (!signupEmail.value || !signupEmail.value.includes('@')) {
        signupEmail.closest('.input-group').classList.add('invalid');
        valid = false;
      } else {
        signupEmail.closest('.input-group').classList.remove('invalid');
      }

      if (!signupPass.value || signupPass.value.length < 6) {
        signupPass.closest('.input-group').classList.add('invalid');
        valid = false;
      } else {
        signupPass.closest('.input-group').classList.remove('invalid');
      }

      if (!termsAgree.checked) {
        showToast('Please agree to the Terms & Privacy', 'error');
        valid = false;
      }

      if (!valid) {
        playSound('error');
        return;
      }

      playSound('click');
      setLoadingState(submitSignupBtn, true);

      setTimeout(() => {
        setLoadingState(submitSignupBtn, false);
        const roleLabel = signupRole.options[signupRole.selectedIndex].text.replace(/^[^\w]+/, '').trim();
        handleLoginSuccess(signupName.value.trim(), roleLabel);
      }, 1300);
    });
  }

  // --- TOGGLE LOGIN / SIGNUP MODE ---
  function bindModeSwitchListener() {
    const switchBtn = document.getElementById('switch-mode-btn');
    if (switchBtn) {
      switchBtn.onclick = (e) => {
        e.preventDefault();
        playSound('click');
        toggleMode();
      };
    }
  }

  function toggleMode() {
    const socialWrapper = document.getElementById('social-sso-wrapper');
    const passwordFormElem = document.getElementById('password-form');
    const magicFormElem = document.getElementById('magic-form');
    const passkeyViewElem = document.getElementById('passkey-view');
    const qrViewElem = document.getElementById('qr-view');

    if (state.currentMode === 'login') {
      state.currentMode = 'signup';
      authTabs.classList.add('hidden');
      passwordFormElem?.classList.remove('active');
      magicFormElem?.classList.remove('active');
      passkeyViewElem?.classList.remove('active');
      qrViewElem?.classList.remove('active');
      signupForm.classList.remove('hidden');
      signupForm.classList.add('active');
    } else {
      state.currentMode = 'login';
      authTabs.classList.remove('hidden');
      signupForm.classList.add('hidden');
      signupForm.classList.remove('active');
      document.getElementById(`${state.currentTab}-form`)?.classList.add('active');
      document.getElementById(`${state.currentTab}-view`)?.classList.add('active');
    }

    updateLanguageText();
  }

  bindModeSwitchListener();

  // If initial mode from URL was signup
  if (initialMode === 'signup') {
    toggleMode();
  }

  // --- SOCIAL SSO BUTTONS ---
  const ssoButtons = document.querySelectorAll('.sso-btn');
  ssoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click');
      const provider = btn.innerText.trim();
      showToast(`Connecting to ${provider} OAuth...`, 'info');

      btn.style.opacity = '0.6';
      setTimeout(() => {
        btn.style.opacity = '1';
        handleLoginSuccess(`Alex (${provider})`, `Verified ${provider} Member`);
      }, 1200);
    });
  });

  // --- FORGOT PASSWORD MODAL ---
  const forgotLink = document.getElementById('forgot-password-link');
  const forgotModal = document.getElementById('forgot-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const sendResetBtn = document.getElementById('send-reset-btn');
  const resetEmail = document.getElementById('reset-email');
  const forgotStep1 = document.getElementById('forgot-step-1');
  const forgotStep2 = document.getElementById('forgot-step-2');
  const closeForgotSuccessBtn = document.getElementById('close-forgot-success-btn');

  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('click');
      forgotModal.classList.remove('hidden');
    });
  }

  function closeForgotModal() {
    playSound('click');
    forgotModal.classList.add('hidden');
    setTimeout(() => {
      forgotStep1.classList.remove('hidden');
      forgotStep2.classList.add('hidden');
    }, 300);
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeForgotModal);
  if (closeForgotSuccessBtn) closeForgotSuccessBtn.addEventListener('click', closeForgotModal);

  if (sendResetBtn) {
    sendResetBtn.addEventListener('click', () => {
      if (!resetEmail.value || !resetEmail.value.includes('@')) {
        showToast('Please enter a valid email', 'error');
        playSound('error');
        return;
      }
      playSound('click');
      document.getElementById('reset-sent-email').textContent = resetEmail.value;
      forgotStep1.classList.add('hidden');
      forgotStep2.classList.remove('hidden');
    });
  }

  // --- LOGIN SUCCESS & DISPATCH ENGINE ---
  const authCard = document.getElementById('auth-card');
  const dashboardCard = document.getElementById('dashboard-card');
  const dashUsername = document.getElementById('dash-username');
  const dashRole = document.getElementById('dash-role');
  const logoutBtn = document.getElementById('logout-btn');

  function handleLoginSuccess(username, role, broadcast = true) {
    playSound('success');
    showToast(`Welcome, ${username}! Authenticated across all projects.`, 'success', 4000);

    const userData = {
      username: username,
      role: role,
      token: 'sw_token_' + Math.random().toString(36).substr(2, 10),
      appId: state.activeAppId,
      authenticatedAt: new Date().toISOString()
    };

    state.user = userData;

    // Save global SSO session locally
    try {
      localStorage.setItem('soundwave_global_user', JSON.stringify(userData));
      localStorage.setItem(`soundwave_auth_session_${state.activeAppId}`, JSON.stringify(userData));
    } catch (e) {
      console.warn('Storage sync warning:', e);
    }

    // Broadcast across all other open browser tabs
    if (broadcast && authChannel) {
      authChannel.postMessage({
        type: 'SESSION_LOGIN',
        user: userData,
        appId: state.activeAppId
      });
    }

    // 1. If running inside SDK iframe on client website -> send postMessage to host site!
    if (isEmbedded && window.parent) {
      window.parent.postMessage({
        source: 'SOUNDWAVE_AUTH',
        type: 'LOGIN_SUCCESS',
        user: userData,
        token: userData.token,
        appId: state.activeAppId
      }, '*');
      return;
    }

    // 2. If a redirect_uri was provided via URL parameter -> redirect safely back to client app!
    if (state.redirectUri) {
      showToast(`Redirecting back to ${state.activeAppName}...`, 'info');
      setTimeout(() => {
        const delimiter = state.redirectUri.includes('?') ? '&' : '?';
        window.location.href = `${state.redirectUri}${delimiter}auth_token=${encodeURIComponent(userData.token)}&user=${encodeURIComponent(JSON.stringify(userData))}&app_id=${encodeURIComponent(state.activeAppId)}`;
      }, 1000);
      return;
    }

    // 3. Otherwise standalone mode -> flip card to player dashboard & SSO launchpad
    if (dashUsername) dashUsername.textContent = username;
    if (dashRole) dashRole.textContent = role;

    if (authCard && dashboardCard) {
      authCard.style.transform = 'scale(0.9) rotateY(15deg)';
      authCard.style.opacity = '0';

      setTimeout(() => {
        authCard.classList.add('hidden');
        dashboardCard.classList.remove('hidden');
        dashboardCard.style.transform = 'scale(1) rotateY(0)';
        dashboardCard.style.opacity = '1';
        announce(`Logged in as ${username}. Welcome to SoundWave Universal Portal.`);
      }, 350);
    }
  }

  function handleLogoutLocal() {
    state.user = null;
    try {
      localStorage.removeItem('soundwave_global_user');
      localStorage.removeItem(`soundwave_auth_session_${state.activeAppId}`);
    } catch (e) {}

    if (dashboardCard && authCard) {
      dashboardCard.style.opacity = '0';
      dashboardCard.style.transform = 'scale(0.95)';

      setTimeout(() => {
        dashboardCard.classList.add('hidden');
        authCard.classList.remove('hidden');
        authCard.style.transform = 'scale(1) rotateY(0)';
        authCard.style.opacity = '1';
        showToast('Signed out safely', 'info');
      }, 300);
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      playSound('click');
      if (authChannel) {
        authChannel.postMessage({ type: 'SESSION_LOGOUT' });
      }
      handleLogoutLocal();
    });
  }

  // Helper function for button spinner state
  function setLoadingState(btn, isLoading) {
    if (!btn) return;
    const textSpan = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    const arrow = btn.querySelector('.btn-arrow');

    btn.disabled = isLoading;
    if (isLoading) {
      if (textSpan) textSpan.style.opacity = '0.5';
      if (spinner) spinner.classList.remove('hidden');
      if (arrow) arrow.classList.add('hidden');
    } else {
      if (textSpan) textSpan.style.opacity = '1';
      if (spinner) spinner.classList.add('hidden');
      if (arrow) arrow.classList.remove('hidden');
    }
  }

  // Player Play/Pause Button in Dashboard
  const dashPlayBtn = document.getElementById('dash-play-btn');
  if (dashPlayBtn) {
    dashPlayBtn.addEventListener('click', () => {
      playSound('click');
      state.isPlaying = !state.isPlaying;
      const playIcon = dashPlayBtn.querySelector('i');
      const albumImg = document.querySelector('.album-logo-img');

      if (state.isPlaying) {
        playIcon.className = 'fa-solid fa-pause';
        if (albumImg) albumImg.style.animationPlayState = 'running';
        showToast('Audio playback resumed', 'info');
      } else {
        playIcon.className = 'fa-solid fa-play';
        if (albumImg) albumImg.style.animationPlayState = 'paused';
        showToast('Audio playback paused', 'info');
      }
    });
  }

  // Check if active session already exists in localStorage on startup
  try {
    const existingSession = localStorage.getItem('soundwave_global_user');
    if (existingSession && !isEmbedded && !redirectUri) {
      const parsed = JSON.parse(existingSession);
      console.log('[SoundWave SSO] Restoring session for:', parsed.username);
      // Populate dashboard but leave card interactive
    }
  } catch (e) {}

});
