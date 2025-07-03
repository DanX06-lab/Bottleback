// leaderboard.js
// Fetches leaderboard data from backend and renders it in the table

document.addEventListener('DOMContentLoaded', async () => {
  feather.replace();
  const tbody = document.getElementById('leaderboardBody');
  const emptyMsg = document.getElementById('leaderboardEmpty');

  try {
    const response = await fetch('https://botalsepaisa.onrender.com/api/leaderboard');
    const leaderboard = await response.json();
    tbody.innerHTML = '';
    if (Array.isArray(leaderboard) && leaderboard.length > 0) {
      leaderboard.forEach((user, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-4 py-2 font-bold text-amber-600">${i + 1}</td>
          <td class="px-4 py-2">${user.name}</td>
          <td class="px-4 py-2">${user.phone}</td>
          <td class="px-4 py-2">${user.returns}</td>
          <td class="px-4 py-2">${user.rewards}</td>
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
