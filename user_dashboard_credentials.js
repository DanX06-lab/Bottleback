// Handles dashboard data fetching and display for user dashboard
// Now matches the current user table fields

const API_BASE = 'https://botalsepaisa.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const token = localStorage.getItem('bottleback_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch user profile (single endpoint for all user info)
    fetch(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch profile');
            return res.json();
        })
        .then(user => {
            // Defensive checks for fields
            const bottlesReturned = typeof user.bottles_returned === 'number' ? user.bottles_returned : 0;
            const upiEarned = typeof user.wallet_balance === 'number' ? user.wallet_balance : 0;
            // Update overview cards
            if (document.getElementById('bottles-returned'))
                document.getElementById('bottles-returned').textContent = bottlesReturned;
            if (document.getElementById('upi-earned'))
                document.getElementById('upi-earned').textContent = `₹${upiEarned}`;
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
            alert('Failed to load user dashboard. Please try again.');
        });

    // Fetch activity history (if you have a separate endpoint/table)
    fetch(`${API_BASE}/user/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch activity');
            return res.json();
        })
        .then(data => {
            const activities = Array.isArray(data.history) ? data.history : [];
            const tbody = document.getElementById('activity-table-body');
            if (tbody) {
                if (activities.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">No activity found</td></tr>';
                } else {
                    tbody.innerHTML = activities.map(activity => `
                    <tr class="border-b">
                        <td class="p-3">#${activity.bottleId}</td>
                        <td class="p-3">${new Date(activity.date).toLocaleDateString()}</td>
                        <td class="p-3">${activity.location}</td>
                        <td class="p-3 ${activity.status === 'Recycled' ? 'text-emerald-600' : 'text-gray-600'}">♻ ${activity.status}</td>
                        <td class="p-3">₹${activity.reward}</td>
                    </tr>
                `).join('');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching activity:', error);
        });

    // Optionally, fetch leaderboard if you have those fields
    fetch(`${API_BASE}/user/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch leaderboard');
            return res.json();
        })
        .then(data => {
            if (data && typeof data.rank === 'number' && document.getElementById('leaderboard-rank')) {
                document.getElementById('leaderboard-rank').textContent = `#${data.rank}`;
            }
            if (data && data.city && document.getElementById('leaderboard-city')) {
                document.getElementById('leaderboard-city').textContent = `${data.city} Region`;
            }
            if (
                data &&
                data.nextMilestone &&
                typeof data.nextMilestone.bottles === 'number' &&
                typeof data.nextMilestone.reward === 'number' &&
                document.getElementById('leaderboard-milestone')
            ) {
                document.getElementById('leaderboard-milestone').textContent =
                    `Next Milestone: ${data.nextMilestone.bottles} bottles → ₹${data.nextMilestone.reward} Bonus`;
            } else if (document.getElementById('leaderboard-milestone')) {
                document.getElementById('leaderboard-milestone').textContent = `No upcoming milestone`;
            }
        })
        .catch(error => {
            console.error('Error fetching leaderboard:', error);
            if (document.getElementById('leaderboard-milestone')) {
                document.getElementById('leaderboard-milestone').textContent = `No upcoming milestone`;
            }
        });
});
