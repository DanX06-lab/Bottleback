// Handles dashboard data fetching and display for user dashboard
// Now matches the current user table fields

// Manual API environment switch
const API_ENV = 'prod'; // Change to 'prod' for deployed backend
const API_BASE = API_ENV === 'prod'
    ? 'https://botalsepaisa.onrender.com/api'
    : 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const token = localStorage.getItem('bottleback_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch and display the top user in the leaderboard section
    fetch(`${API_BASE}/user/leaderboard`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                const topUser = data[0];
                if (document.getElementById('leaderboard-rank'))
                    document.getElementById('leaderboard-rank').textContent = `#${topUser.rank}`;
                if (document.getElementById('leaderboard-city'))
                    document.getElementById('leaderboard-city').textContent = topUser.city || 'Top Recycler';
                if (document.getElementById('leaderboard-milestone'))
                    document.getElementById('leaderboard-milestone').textContent = `${topUser.name} — ₹${topUser.upi_earned}`;
            } else if (document.getElementById('leaderboard-milestone')) {
                document.getElementById('leaderboard-milestone').textContent = 'No top user found';
                if (document.getElementById('leaderboard-rank'))
                    document.getElementById('leaderboard-rank').textContent = '#0';
                if (document.getElementById('leaderboard-city'))
                    document.getElementById('leaderboard-city').textContent = 'City Region';
            }
        })
        .catch(() => {
            if (document.getElementById('leaderboard-milestone'))
                document.getElementById('leaderboard-milestone').textContent = 'Unable to load leaderboard';
        });

    // Fetch and display bottles returned and UPI earned for the logged-in user
    if (token) {
        fetch(`${API_BASE}/user/profile`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.bottles_returned !== undefined && document.getElementById('bottles-returned'))
                    document.getElementById('bottles-returned').textContent = data.bottles_returned;
                if (data.upi_earned !== undefined && document.getElementById('upi-earned'))
                    document.getElementById('upi-earned').textContent = `₹${data.upi_earned}`;
                // Update wallet balance if updateWallet is available
                if (typeof updateWallet === 'function' && data.upi_earned !== undefined) {
                    updateWallet(Number(data.upi_earned));
                }
            });
    }

});
