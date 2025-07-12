// return_history_credentials.js
// Fetches and displays return history from the bottles_returned database for the logged-in user

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('bottleback_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
    const tbody = document.getElementById('return-history-table-body');

    function renderHistory(data) {
        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">No return history found</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(activity => `
            <tr class="border-b">
                <td class="p-3">${activity.bottleId !== undefined ? '#' + activity.bottleId : (activity.bottle_id !== undefined ? '#' + activity.bottle_id : '')}</td>
                <td class="p-3">${activity.returnedAt ? new Date(activity.returnedAt).toLocaleDateString() : (activity.date ? new Date(activity.date).toLocaleDateString() : '')}</td>
                <td class="p-3">${activity.location || activity.city || '—'}</td>
                <td class="p-3 ${activity.status === 'Recycled' ? 'text-emerald-600' : 'text-gray-600'}">♻ ${activity.status || ''}</td>
                <td class="p-3">${activity.points !== undefined ? activity.points : (activity.upi_earned !== undefined && activity.upi_earned !== null ? '₹' + activity.upi_earned : '—')}</td>
            </tr>
        `).join('');
    }

    if (isStaticHost) {
        // Mock data for static hosting (GitHub Pages, file://, etc.)
        const mockData = [
            { bottleId: 'BOTTLE1234', returnedAt: '2025-07-12', points: 10, status: 'Rewarded', location: 'Delhi' },
            { bottleId: 'BOTTLE5678', returnedAt: '2025-07-10', points: 8, status: 'Rewarded', location: 'Mumbai' }
        ];
        renderHistory(mockData);
    } else {
        fetch('/api/user/activity', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => renderHistory(data))
            .catch(() => {
                tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">Could not fetch return history</td></tr>';
            });
    }
});
