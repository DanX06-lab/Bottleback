// vendor_pending_returns.js
// Handles fetching and rendering the pending returns table for the vendor dashboard

function fetchPendingReturns() {
  fetch('/api/vendor/pending-returns')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#pending-table tbody');
      tbody.innerHTML = data.map(row => `
        <tr>
          <td>${row.qr_code_value}</td>
          <td>${row.full_name}</td>
          <td>${row.phone}</td>
          <td>${new Date(row.returned_at).toLocaleString()}</td>
          <td>
            <button onclick="approveReturn(${row.return_id})">Approve</button>
          </td>
        </tr>
      `).join('');
    });
}

function approveReturn(returnId) {
  fetch('/api/vendor/approve-return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnId, rewardAmount: 1.00 })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message || 'Return processed');
    fetchPendingReturns();
  });
}

// Fetch pending returns on page load
window.addEventListener('DOMContentLoaded', fetchPendingReturns);
