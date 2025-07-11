// Handles login logic for login.html

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('error');
  if (form) {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value.trim();
      errorDiv.textContent = '';
      try {
        const response = await fetch('https://botalsepaisa.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await response.json();
        if (response.ok && data.token) {
          localStorage.setItem('bottleback_token', data.token);
          window.location.href = 'user_dashboard.html';
        } else {
          errorDiv.textContent = data.error || 'Login failed.';
        }
      } catch (err) {
        errorDiv.textContent = 'Network error. Please try again.';
      }
    };
  }
});
