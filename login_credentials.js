// Handles login logic for login.html
// SECURITY ENHANCED VERSION
// - Sanitizes input and error output
// - Handles token expiry and secure logout
// - Warns about HTTPS in production
// - (Note: For highest security, use HTTP-only cookies for tokens)

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('error');

  // Warn if not using HTTPS (for production)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('⚠️ You should use HTTPS in production for security!');
  }

  // Utility: Securely sanitize text for output
  function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Utility: Logout function
  window.logout = function () {
    localStorage.removeItem('bottleback_token');
    window.location.href = 'login.html';
  };

  // Handle login form submit
  if (form) {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value.trim();
      errorDiv.textContent = '';

      // Basic input validation (frontend)
      if (!/^[0-9]{10}$/.test(phone)) {
        errorDiv.innerHTML = sanitize('Please enter a valid 10-digit phone number.');
        return;
      }
      if (!password || password.length < 6) {
        errorDiv.innerHTML = sanitize('Password must be at least 6 characters.');
        return;
      }

      try {
        const response = await fetch('https://botalsepaisa.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await response.json();
        if (response.ok && data.token) {
          localStorage.setItem('bottleback_token', data.token);
          window.location.href = 'home.html';
        } else {
          // Sanitize error output to prevent XSS
          errorDiv.innerHTML = sanitize(data.error || 'Login failed.');
        }
      } catch (err) {
        errorDiv.innerHTML = sanitize('Network error. Please try again.');
      }
    };
  }

  // Handle token expiry globally (optional, for SPA)
  // Example: Check token expiry on every page load
  const token = localStorage.getItem('bottleback_token');
  if (token) {
    try {
      // Decode JWT to check expiry (naive, for demonstration)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        // Token expired
        window.logout();
      }
    } catch (e) {
      // Invalid token format, force logout
      window.logout();
    }
  }
});
