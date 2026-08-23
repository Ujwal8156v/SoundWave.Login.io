# 🎵 SoundWave.Login.io — Universal Single Sign-On (SSO) & Common Login Portal

> A unified, modern, high-fidelity authentication and Single Sign-On (SSO) system designed to power all of your web applications and digital projects.

---

## 🌟 Key Highlights & Capabilities

- **Single Sign-On (SSO) Across All Projects**: Log in once, access all platforms (`SoundWave_App.com`, `SW_Music.App.io`, `SoundWave Store`, `Studio Pro`, and any custom project).
- **Multi-Tenant Automatic Adaptation**: Portal dynamically adjusts its title, branding badge, and redirect callback based on incoming `?app_id=...&app_name=...&redirect_uri=...` parameters.
- **4 Authentication Modes**:
  1. 🔑 **Standard Password & Registration** (with live strength meter, caps lock indicator, password peek toggle, and role selection).
  2. ⚡ **Magic Link & 6-Digit Email OTP** (with auto-tabbing, clipboard paste, resend timer, and 1-click demo autofill).
  3. 🆔 **Biometric WebAuthn Passkeys** (Touch ID, Face ID, Windows Hello).
  4. 📱 **QR Code Mobile Scan** (Scan with mobile app or camera for instant cross-device approval).
- **Social OAuth Integrations**: Google, Spotify, Apple, and GitHub.
- **Drop-in Universal SDK (`soundwave-auth-sdk.js`)**: 1-line script for any website to trigger sleek modal popups, redirect SSO flows, or generate pre-styled login buttons.
- **Cross-Tab & Real-Time Sync**: Synchronizes login/logout states instantly across all open browser tabs via `BroadcastChannel` and `localStorage`.
- **Interactive Audio Visualizer & Synthesizer**: Web Audio API generated sound effects and real-time interactive canvas background.
- **Multilingual Support**: English, Spanish, French, German, and Japanese.

---

## 🚀 Quick Integration Guide for Any Project

### Method 1: Modal Popup Overlay (Recommended for SPAs & Web Apps)

Add the SDK script to your HTML and initialize:

```html
<!-- 1. Include SoundWave Auth SDK -->
<script src="c:/SoundWave/SoundWave.Login.io/soundwave-auth-sdk.js"></script>

<!-- 2. Add Login Button -->
<button id="login-btn">Sign In with SoundWave</button>

<!-- 3. Initialize & Listen -->
<script>
  SoundWaveAuth.init({
    appId: 'my-project-id',
    appName: 'My Awesome Web App',
    authUrl: 'c:/SoundWave/SoundWave.Login.io/index.html',
    onSuccess: (user) => {
      console.log('✅ Logged in:', user.username, user.token);
      alert('Welcome back, ' + user.username + '!');
    },
    onLogout: () => {
      console.log('Signed out');
    }
  });

  document.getElementById('login-btn').addEventListener('click', () => {
    SoundWaveAuth.openModal();
  });
</script>
```

---

### Method 2: SSO Redirect Flow

Redirect user to the central portal and receive callback with token:

```javascript
SoundWaveAuth.loginRedirect({
  appId: 'my-project-id',
  appName: 'My Awesome Web App',
  redirectUri: window.location.href
});
```

When user logs in, SoundWave redirects back to `redirectUri` with:
`?auth_token=sw_token_...&user={...}&app_id=my-project-id`

The SDK automatically extracts this on load:
```javascript
SoundWaveAuth.handleRedirectCallback();
```

---

### Method 3: Pre-Styled Button Renderer

Generate a branded "Sign in with SoundWave" button in any container:

```html
<div id="soundwave-login-btn-wrap"></div>

<script>
  SoundWaveAuth.renderButton('soundwave-login-btn-wrap', {
    label: 'Continue with SoundWave SSO',
    mode: 'modal' // or 'redirect'
  });
</script>
```

---

## 💻 Framework Integrations

### React / Next.js
```jsx
import React, { useEffect, useState } from 'react';

export function SoundWaveAuthHeader() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (window.SoundWaveAuth) {
      window.SoundWaveAuth.init({
        appId: 'react-portal',
        appName: 'React Sound App',
        onSuccess: (userData) => setUser(userData),
        onLogout: () => setUser(null)
      });
      setUser(window.SoundWaveAuth.getUser());
    }
  }, []);

  return (
    <div>
      {user ? (
        <div>
          <span>Logged in as: {user.username}</span>
          <button onClick={() => window.SoundWaveAuth.logout()}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => window.SoundWaveAuth.openModal()}>Sign in with SoundWave</button>
      )}
    </div>
  );
}
```

### Node.js / Express Middleware Verification
```javascript
function verifySoundWaveAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer sw_token_')) {
    return res.status(401).json({ error: 'Unauthorized: Invalid SoundWave token' });
  }
  req.soundwaveToken = authHeader.split(' ')[1];
  next();
}
```

---

## 📁 Repository Structure

```
SoundWave.Login.io/
├── index.html               # Central Universal Login Portal & SSO Engine
├── style.css                # Glassmorphic Design System & Responsive Styles
├── app.js                   # Authentication Controller, Multi-Tenant Engine & Audio Synthesizer
├── soundwave-auth-sdk.js    # Universal Embeddable Client SDK
├── demo-integration.html    # Multi-Project Developer Hub & Live Testing Playground
├── assets/
│   └── logo.jpg             # SoundWave High-Res Brand Logo
└── README.md                # Documentation & Integration Manual
```

---

## 🧪 Testing Your Setup

1. **Standalone Portal**: Open `index.html` in your browser.
2. **Project Switcher**: Use the dropdown in the top header to simulate different tenant projects.
3. **Multi-Project Playground**: Open `demo-integration.html` to test live modal and redirect logins across `SoundWave_App.com`, `SW_Music.App.io`, `Gear Store`, `Studio Pro`, and Custom Projects simultaneously!