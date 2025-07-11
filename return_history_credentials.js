// return_history_credentials.js
// Fetches and displays return history from the bottles_returned database for the logged-in user

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('bottleback_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    fetch('/api/user/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('return-history-table-body');
            if (!Array.isArray(data) || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">No return history found</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(activity => `
                <tr class="border-b">
                    <td class="p-3">${activity.bottle_id !== undefined ? '#' + activity.bottle_id : ''}</td>
                    <td class="p-3">${activity.date ? new Date(activity.date).toLocaleDateString() : ''}</td>
                    <td class="p-3">${activity.city ? activity.city : '—'}</td>
                    <td class="p-3 ${activity.status === 'Recycled' ? 'text-emerald-600' : 'text-gray-600'}">♻ ${activity.status || ''}</td>
                    <td class="p-3">${activity.upi_earned !== undefined && activity.upi_earned !== null ? '₹' + activity.upi_earned : '—'}</td>
                </tr>
            `).join('');
        })
        .catch(() => {
            document.getElementById('return-history-table-body').innerHTML = '<tr><td colspan="5" class="p-3 text-center text-red-400">Failed to load return history</td></tr>';
        });
});
