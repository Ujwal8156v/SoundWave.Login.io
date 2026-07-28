/**
 * SoundWave.io — Interactive Engine & Multi-Auth Controller
 * Supports standalone mode and embeddable SDK Single Sign-On (SSO) mode.
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- SDK & MULTI-TENANT URL PARAMETER DETECTION ---
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get('embed') === 'true' || window.self !== window.top;
  const appId = urlParams.get('app_id') || 'default-app';
  const appName = urlParams.get('app_name') || null;

  if (isEmbedded) {
    document.body.classList.add('embedded-mode');
  }

  if (appName) {
    const badge = document.getElementById('client-website-badge');
    const badgeName = document.getElementById('client-website-name');
    if (badge && badgeName) {
      badgeName.textContent = appName;
      badge.classList.remove('hidden');
    }
  }

  // --- STATE MANAGEMENT ---
  const state = {
    theme: 'dark',
    soundEnabled: true,
    currentTab: 'password',
    currentMode: 'login', // 'login' | 'signup'
    lang: 'EN',
    user: null,
    otpTimer: null,
    isPlaying: true
  };

  // --- DICTIONARY FOR MULTILINGUAL SUPPORT ---
  const i18n = {
    EN: {
      welcome: appName ? `Sign in to ${appName}` : "Welcome Back",
      subWelcome: appName ? "Use your unified SoundWave ID to continue" : "Connect your rhythm to the SoundWave ecosystem",
      createAcc: "Join SoundWave",
      subCreateAcc: "Start your high-fidelity audio journey today",
      signInBtn: appName ? `Continue to ${appName}` : "Sign In to SoundWave",
      signUpBtn: "Create Free Account",
      switchSignUp: "Don't have an account? <button id='switch-mode-btn' class='switch-link'>Sign Up</button>",
      switchSignIn: "Already a member? <button id='switch-mode-btn' class='switch-link'>Sign In</button>",
      passPlaceholder: "••••••••••••",
      emailPlaceholder: "alex.rivera@soundwave.io"
    },
    ES: {
      welcome: appName ? `Iniciar sesión en ${appName}` : "Bienvenido de nuevo",
      subWelcome: "Conecta tu ritmo al ecosistema SoundWave",
      createAcc: "Únete a SoundWave",
      subCreateAcc: "Comienza tu viaje de audio de alta fidelidad hoy",
      signInBtn: appName ? `Continuar a ${appName}` : "Iniciar sesión en SoundWave",
      signUpBtn: "Crear cuenta gratis",
      switchSignUp: "¿No tienes una cuenta? <button id='switch-mode-btn' class='switch-link'>Regístrate</button>",
      switchSignIn: "¿Ya eres miembro? <button id='switch-mode-btn' class='switch-link'>Iniciar sesión</button>",
      passPlaceholder: "••••••••••••",
      emailPlaceholder: "alex.rivera@soundwave.es"
    },
    FR: {
      welcome: appName ? `Se connecter à ${appName}` : "Bon retour",
      subWelcome: "Connectez votre rythme à l'écosystème SoundWave",
      createAcc: "Rejoignez SoundWave",
      subCreateAcc: "Commencez votre voyage audio haute fidélité aujourd'hui",
      signInBtn: appName ? `Continuer vers ${appName}` : "Se connecter à SoundWave",
      signUpBtn: "Créer un compte gratuit",
      switchSignUp: "Pas encore de compte? <button id='switch-mode-btn' class='switch-link'>S'inscrire</button>",
      switchSignIn: "Déjà membre? <button id='switch-mode-btn' class='switch-link'>Se connecter</button>",
      passPlaceholder: "••••••••••••",
      emailPlaceholder: "alex.rivera@soundwave.fr"
    },
    DE: {
      welcome: appName ? `Bei ${appName} anmelden` : "Willkommen zurück",
      subWelcome: "Verbinde deinen Rhythmus mit dem SoundWave-Ökosystem",
      createAcc: "SoundWave beitreten",
      subCreateAcc: "Starte heute deine High-Fidelity-Audio-Reise",
      signInBtn: appName ? `Weiter zu ${appName}` : "Bei SoundWave anmelden",
      signUpBtn: "Kostenloses Konto erstellen",
      switchSignUp: "Noch kein Konto? <button id='switch-mode-btn' class='switch-link'>Registrieren</button>",
      switchSignIn: "Bereits Mitglied? <button id='switch-mode-btn' class='switch-link'>Anmelden</button>",
      passPlaceholder: "••••••••••••",
      emailPlaceholder: "alex.rivera@soundwave.de"
    },
    JA: {
      welcome: appName ? `${appName} にサインイン` : "おかえりなさい",
      subWelcome: "SoundWaveエコシステムにリズムを接続",
      createAcc: "SoundWaveに参加",
      subCreateAcc: "今すぐハイファイオーディオの旅を始めましょう",
      signInBtn: appName ? `${appName} に進む` : "SoundWaveにサインイン",
      signUpBtn: "無料アカウントを作成",
      switchSignUp: "アカウントをお持ちでないですか？ <button id='switch-mode-btn' class='switch-link'>新規登録</button>",
      switchSignIn: "すでにメンバーですか？ <button id='switch-mode-btn' class='switch-link'>サインイン</button>",
      passPlaceholder: "••••••••••••",
      emailPlaceholder: "alex.rivera@soundwave.jp"
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
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'key') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.04, now);
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
      // Audio context fallback silent fail
    }
  }

  // --- SOUNDWAVE CANVAS BACKGROUND SIMULATOR ---
  const canvas = document.getElementById('soundwave-canvas');
  const ctx = canvas.getContext('2d');

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
    ctx.clearRect(0, 0, width, height);

    const baseAmp = 35 + typingPulse;
    if (typingPulse > 0) typingPulse *= 0.94;

    step += 0.02;

    const themeColors = state.theme === 'dark' 
      ? ['rgba(0, 242, 254, 0.25)', 'rgba(79, 172, 254, 0.2)', 'rgba(121, 40, 202, 0.25)', 'rgba(255, 0, 128, 0.15)']
      : ['rgba(0, 150, 255, 0.2)', 'rgba(121, 40, 202, 0.15)', 'rgba(0, 223, 216, 0.2)'];

    for (let i = 0; i < themeColors.length; i++) {
      ctx.beginPath();
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.strokeStyle = themeColors[i];

      const waveY = height * (0.45 + i * 0.08);
      const freq = 0.003 + i * 0.001;

      for (let x = 0; x < width; x += 6) {
        const dist = Math.abs(x - mouseX);
        const mouseFactor = Math.max(0, 1 - dist / 300);
        const y = waveY + Math.sin(x * freq + step + i) * (baseAmp + mouseFactor * 40);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const barCount = Math.floor(width / 24);
    for (let i = 0; i < barCount; i++) {
      const barHeight = (Math.sin(step * 2 + i * 0.3) * 0.5 + 0.5) * (40 + typingPulse * 1.5);
      const x = i * 24;
      const y = height - barHeight;

      const grad = ctx.createLinearGradient(0, height, 0, y);
      grad.addColorStop(0, state.theme === 'dark' ? 'rgba(121, 40, 202, 0.05)' : 'rgba(79, 172, 254, 0.05)');
      grad.addColorStop(1, state.theme === 'dark' ? 'rgba(0, 242, 254, 0.3)' : 'rgba(121, 40, 202, 0.3)');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, 16, barHeight);
    }

    requestAnimationFrame(renderCanvas);
  }
  renderCanvas();

  // --- TOAST NOTIFICATION HELPER ---
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';

    toast.innerHTML = `<i class="fa-solid ${iconClass} toast-icon"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- ACCESSIBILITY ANNOUNCER ---
  const announcer = document.getElementById('aria-announcer');
  function announce(text) {
    if (announcer) announcer.textContent = text;
  }

  // --- THEME TOGGLE ---
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');

  themeBtn.addEventListener('click', () => {
    playSound('click');
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);

    if (state.theme === 'light') {
      themeIcon.className = 'fa-solid fa-sun';
      showToast('Switched to Neon Light mode', 'info');
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      showToast('Switched to Soundwave Dark mode', 'info');
    }
  });

  // --- SOUND TOGGLE ---
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');

  soundBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      soundIcon.className = 'fa-solid fa-volume-high';
      playSound('click');
      showToast('Audio feedback enabled', 'info');
    } else {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      showToast('Audio feedback muted', 'info');
    }
  });

  // --- LANGUAGE DROPDOWN ---
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = document.querySelector('.lang-dropdown');
  const currentLangText = document.getElementById('current-lang');
  const langOptions = document.querySelectorAll('.lang-option');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('click');
    const isExpanded = langBtn.getAttribute('aria-expanded') === 'true';
    langBtn.setAttribute('aria-expanded', !isExpanded);
    langDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
    langBtn.setAttribute('aria-expanded', 'false');
  });

  langOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      playSound('click');
      const lang = opt.getAttribute('data-lang');
      state.lang = lang;
      currentLangText.textContent = lang;

      langOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      updateLanguageText();
      showToast(`Language set to ${opt.textContent.trim()}`, 'info');
    });
  });

  function updateLanguageText() {
    const dict = i18n[state.lang] || i18n.EN;
    const titleEl = document.getElementById('form-title');
    const subTitleEl = document.getElementById('form-subtitle');
    const submitBtnText = document.querySelector('#submit-password-btn .btn-text');
    const footerPrompt = document.getElementById('footer-prompt');

    if (state.currentMode === 'login') {
      titleEl.textContent = dict.welcome;
      subTitleEl.textContent = dict.subWelcome;
      if (submitBtnText) submitBtnText.textContent = dict.signInBtn;
      if (footerPrompt) footerPrompt.innerHTML = dict.switchSignUp;
    } else {
      titleEl.textContent = dict.createAcc;
      subTitleEl.textContent = dict.subCreateAcc;
      if (footerPrompt) footerPrompt.innerHTML = dict.switchSignIn;
    }

    bindModeSwitchListener();
  }

  // --- INITIALIZE LANGUAGE ON STARTUP ---
  updateLanguageText();

  // --- TAB NAVIGATION ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click');
      const targetTab = btn.getAttribute('data-tab');
      state.currentTab = targetTab;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-form` || content.id === `${targetTab}-view`) {
          content.classList.add('active');
        }
      });

      announce(`Selected ${targetTab} authentication mode`);
    });
  });

  // --- PASSWORD VISIBILITY TOGGLE ---
  const passwordInput = document.getElementById('login-password');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const eyeIcon = document.getElementById('eye-icon');

  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', () => {
      playSound('click');
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      eyeIcon.className = isPass ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
      announce(isPass ? "Password revealed" : "Password hidden");
    });
  }

  // --- CAPS LOCK DETECTOR ---
  const capsWarning = document.getElementById('caps-warning');
  if (passwordInput) {
    passwordInput.addEventListener('keyup', (e) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        capsWarning.classList.remove('hidden');
      } else {
        capsWarning.classList.add('hidden');
      }
    });
  }

  // --- CLEAR INPUT BUTTON ---
  const emailInput = document.getElementById('login-email');
  const clearEmailBtn = document.querySelector('#password-form .input-clear-btn');

  if (emailInput && clearEmailBtn) {
    emailInput.addEventListener('input', () => {
      if (emailInput.value.length > 0) {
        clearEmailBtn.classList.remove('hidden');
      } else {
        clearEmailBtn.classList.add('hidden');
      }
    });

    clearEmailBtn.addEventListener('click', () => {
      playSound('click');
      emailInput.value = '';
      clearEmailBtn.classList.add('hidden');
      emailInput.focus();
    });
  }

  // --- DEMO AUTO FILL BUTTON ---
  const demoFillBtn = document.getElementById('demo-fill-btn');
  if (demoFillBtn) {
    demoFillBtn.addEventListener('click', () => {
      playSound('click');
      emailInput.value = "alex.rivera@soundwave.io";
      passwordInput.value = "SoundWave#2026";
      clearEmailBtn.classList.remove('hidden');
      showToast('Demo credentials populated!', 'info');
    });
  }

  // --- OTP INPUT AUTO-ADVANCE & PASTE HANDLER ---
  const otpBoxes = document.querySelectorAll('.otp-box');
  otpBoxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && idx < otpBoxes.length - 1) {
        otpBoxes[idx + 1].focus();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        otpBoxes[idx - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, i) => {
          if (otpBoxes[i]) otpBoxes[i].value = char;
        });
        otpBoxes[5].focus();
        showToast('OTP code pasted automatically', 'success');
      }
    });
  });

  // --- MAGIC LINK / OTP TIMER ---
  const magicForm = document.getElementById('magic-form');
  const otpSection = document.getElementById('otp-section');
  const magicEmail = document.getElementById('magic-email');
  const submitMagicBtn = document.getElementById('submit-magic-btn');
  const magicBtnText = submitMagicBtn.querySelector('.btn-text');
  const timerCount = document.getElementById('timer-count');
  const resendBtn = document.getElementById('resend-otp-btn');
  const resendText = document.getElementById('resend-timer-text');

  function startOtpTimer() {
    let seconds = 30;
    resendBtn.classList.add('hidden');
    resendText.classList.remove('hidden');
    timerCount.textContent = seconds;

    clearInterval(state.otpTimer);
    state.otpTimer = setInterval(() => {
      seconds--;
      timerCount.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(state.otpTimer);
        resendText.classList.add('hidden');
        resendBtn.classList.remove('hidden');
      }
    }, 1000);
  }

  magicForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!magicEmail.value || !magicEmail.value.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      playSound('error');
      return;
    }

    playSound('click');
    const spinner = submitMagicBtn.querySelector('.spinner');
    spinner.classList.remove('hidden');

    setTimeout(() => {
      spinner.classList.add('hidden');
      if (otpSection.classList.contains('hidden')) {
        otpSection.classList.remove('hidden');
        magicBtnText.textContent = "Verify & Access";
        startOtpTimer();
        showToast(`Verification code sent to ${magicEmail.value}`, 'success');
      } else {
        const otpCode = Array.from(otpBoxes).map(b => b.value).join('');
        if (otpCode.length === 6) {
          handleLoginSuccess("Magic Link User", "Verified Member");
        } else {
          showToast('Please enter all 6 digits of the PIN', 'error');
          playSound('error');
        }
      }
    }, 1200);
  });

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      playSound('click');
      startOtpTimer();
      showToast('New verification code sent!', 'info');
    });
  }

  // --- BIOMETRIC / PASSKEY SIMULATION ---
  const biometricBtn = document.getElementById('start-biometric-btn');
  const passkeyStatus = document.getElementById('passkey-status-text');

  if (biometricBtn) {
    biometricBtn.addEventListener('click', () => {
      playSound('click');
      biometricBtn.classList.add('scanning');
      passkeyStatus.textContent = "Scanning Touch ID / Face ID sensor...";

      setTimeout(() => {
        biometricBtn.classList.remove('scanning');
        passkeyStatus.textContent = "Biometric Passkey Verified!";
        handleLoginSuccess("Alex Rivera (Passkey)", "Biometric VIP");
      }, 1800);
    });
  }

  // --- PASSWORD FORM SUBMISSION ---
  const passwordForm = document.getElementById('password-form');
  const submitPasswordBtn = document.getElementById('submit-password-btn');

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailVal = emailInput.value.trim();
    const passVal = passwordInput.value.trim();
    let valid = true;

    const emailGroup = emailInput.closest('.input-group');
    const passGroup = passwordInput.closest('.input-group');

    if (!emailVal) {
      emailGroup.classList.add('invalid');
      valid = false;
    } else {
      emailGroup.classList.remove('invalid');
    }

    if (!passVal || passVal.length < 6) {
      passGroup.classList.add('invalid');
      valid = false;
    } else {
      passGroup.classList.remove('invalid');
    }

    if (!valid) {
      playSound('error');
      showToast('Please fix invalid fields', 'error');
      return;
    }

    playSound('click');
    const spinner = submitPasswordBtn.querySelector('.spinner');
    spinner.classList.remove('hidden');

    setTimeout(() => {
      spinner.classList.add('hidden');
      handleLoginSuccess(emailVal.split('@')[0] || "Alex Rivera", "Studio Pro Member");
    }, 1200);
  });

  // --- PASSWORD STRENGTH METER (SIGN UP) ---
  const signupPassInput = document.getElementById('signup-password');
  const meterBars = [
    document.getElementById('bar-1'),
    document.getElementById('bar-2'),
    document.getElementById('bar-3'),
    document.getElementById('bar-4')
  ];
  const strengthLabel = document.getElementById('strength-label');

  if (signupPassInput) {
    signupPassInput.addEventListener('input', () => {
      const val = signupPassInput.value;
      let score = 0;

      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      const colors = ['#FF4D4D', '#F59E0B', '#10B981', '#00DFD8'];
      const labels = ['Weak Password', 'Fair Password', 'Good Password', 'Strong Password'];

      meterBars.forEach((bar, idx) => {
        if (bar) {
          if (idx < score) {
            bar.style.backgroundColor = colors[score - 1] || colors[0];
          } else {
            bar.style.backgroundColor = 'var(--input-border)';
          }
        }
      });

      if (strengthLabel) {
        strengthLabel.textContent = val ? labels[score - 1] || labels[0] : 'Password strength';
        strengthLabel.style.color = val ? (colors[score - 1] || colors[0]) : 'var(--text-muted)';
      }
    });
  }

  // --- SIGN UP FORM SUBMISSION ---
  const signupForm = document.getElementById('signup-form');
  const submitSignupBtn = document.getElementById('submit-signup-btn');

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const role = document.getElementById('signup-role').value;
      const terms = document.getElementById('terms-agree').checked;

      if (!name || !email || !terms) {
        showToast('Please fill required fields and agree to Terms', 'error');
        playSound('error');
        return;
      }

      playSound('click');
      const spinner = submitSignupBtn.querySelector('.spinner');
      spinner.classList.remove('hidden');

      setTimeout(() => {
        spinner.classList.add('hidden');
        handleLoginSuccess(name, `${role.toUpperCase()} Member`);
      }, 1400);
    });
  }

  // --- MODE SWITCHER (LOGIN <-> SIGNUP) ---
  function bindModeSwitchListener() {
    const switchBtn = document.getElementById('switch-mode-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        playSound('click');
        toggleAuthMode();
      });
    }
  }

  function toggleAuthMode() {
    const authTabs = document.getElementById('auth-tabs');
    const passwordForm = document.getElementById('password-form');
    const magicForm = document.getElementById('magic-form');
    const passkeyView = document.getElementById('passkey-view');
    const signupForm = document.getElementById('signup-form');

    if (state.currentMode === 'login') {
      state.currentMode = 'signup';
      authTabs.classList.add('hidden');
      passwordForm.classList.remove('active');
      magicForm.classList.remove('active');
      passkeyView.classList.remove('active');
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
        handleLoginSuccess(`Alex (${provider})`, `Verified ${provider} User`);
      }, 1500);
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

  // --- LOGIN SUCCESS & DASHBOARD TRANSITION ---
  const authCard = document.getElementById('auth-card');
  const dashboardCard = document.getElementById('dashboard-card');
  const dashUsername = document.getElementById('dash-username');
  const dashRole = document.getElementById('dash-role');
  const logoutBtn = document.getElementById('logout-btn');

  function handleLoginSuccess(username, role) {
    playSound('success');
    showToast(`Welcome back, ${username}!`, 'success', 4000);

    const userData = {
      username: username,
      role: role,
      token: 'sw_token_' + Math.random().toString(36).substr(2, 9),
      authenticatedAt: new Date().toISOString()
    };

    state.user = userData;

    // If running inside SDK iframe on client website -> send postMessage to host site!
    if (isEmbedded && window.parent) {
      window.parent.postMessage({
        source: 'SOUNDWAVE_AUTH',
        type: 'LOGIN_SUCCESS',
        user: userData,
        appId: appId
      }, '*');
      return;
    }

    // Otherwise standalone mode -> flip card to player dashboard
    dashUsername.textContent = username;
    dashRole.textContent = role;

    authCard.style.transform = 'scale(0.9) rotateY(15deg)';
    authCard.style.opacity = '0';

    setTimeout(() => {
      authCard.classList.add('hidden');
      dashboardCard.classList.remove('hidden');
      dashboardCard.style.transform = 'scale(1) rotateY(0)';
      dashboardCard.style.opacity = '1';
      announce(`Logged in as ${username}. Welcome to SoundWave Player.`);
    }, 400);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      playSound('click');
      dashboardCard.style.opacity = '0';
      dashboardCard.style.transform = 'scale(0.95)';

      setTimeout(() => {
        dashboardCard.classList.add('hidden');
        authCard.classList.remove('hidden');
        authCard.style.transform = 'scale(1) rotateY(0)';
        authCard.style.opacity = '1';
        showToast('Signed out safely', 'info');
      }, 300);
    });
  }

  // Player Play/Pause Button
  const dashPlayBtn = document.getElementById('dash-play-btn');
  const vinylDisc = document.querySelector('.vinyl-spin');

  if (dashPlayBtn) {
    dashPlayBtn.addEventListener('click', () => {
      playSound('click');
      state.isPlaying = !state.isPlaying;
      const playIcon = dashPlayBtn.querySelector('i');

      if (state.isPlaying) {
        playIcon.className = 'fa-solid fa-pause';
        if (vinylDisc) vinylDisc.style.animationPlayState = 'running';
        showToast('Audio playback resumed', 'info');
      } else {
        playIcon.className = 'fa-solid fa-play';
        if (vinylDisc) vinylDisc.style.animationPlayState = 'paused';
        showToast('Audio playback paused', 'info');
      }
    });
  }

});
