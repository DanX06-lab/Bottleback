// leaderboard.js
// Fetches leaderboard data from backend and renders it in the table

document.addEventListener('DOMContentLoaded', async () => {
  feather.replace();
  const tbody = document.getElementById('leaderboardBody');
  const emptyMsg = document.getElementById('leaderboardEmpty');

  // Manual API environment switch
  const API_ENV = 'prod'; // Change to 'prod' for deployed backend
  const API_BASE = API_ENV === 'prod'
    ? 'https://botalsepaisa.onrender.com/api'
    : 'http://localhost:3000/api';
  try {
    const token = localStorage.getItem('bottleback_token');
    console.log('Token being sent:', token);
    const response = await fetch(`${API_BASE}/user/leaderboard`, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    console.log('API response status:', response.status);
    const leaderboard = await response.json();
    console.log('Leaderboard API data:', leaderboard);
    tbody.innerHTML = '';
    if (Array.isArray(leaderboard) && leaderboard.length > 0) {
      leaderboard.forEach((user, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-6 py-4 text-center font-bold text-amber-600">${i + 1}</td>
          <td class="px-6 py-4 text-center">${user.name}</td>
          <td class="px-6 py-4 text-center">${user.upi_earned}</td>
        `;
        tbody.appendChild(row);
      });
      emptyMsg.classList.add('hidden');
    } else {
      emptyMsg.classList.remove('hidden');
    }
  } catch (err) {
    emptyMsg.textContent = 'Failed to load leaderboard.';
    emptyMsg.classList.remove('hidden');
    console.error('Leaderboard fetch error:', err);
  }
});
