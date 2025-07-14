// vendor_scan_qr.js
// Simple QR scanner logic for vendor panel (verification.html)
// Uses html5-qrcode library (https://mebjas.github.io/html5-qrcode/)

function onScanSuccess(decodedText, decodedResult) {
    // Send scanned QR code to backend for verification
    fetch('/api/vendor/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: decodedText })
    })
    .then(res => res.json())
    .then(data => {
        const statusDiv = document.getElementById('vendor-scan-status');
        if (data.success) {
            statusDiv.textContent = 'Success: ' + (data.message || 'QR verified and reward credited!');
            statusDiv.style.color = 'green';
        } else {
            statusDiv.textContent = 'Error: ' + (data.message || 'Failed to verify QR.');
            statusDiv.style.color = 'red';
        }
    })
    .catch(() => {
        const statusDiv = document.getElementById('vendor-scan-status');
        statusDiv.textContent = 'Error: Network or server issue.';
        statusDiv.style.color = 'red';
    });
}

function onScanFailure(error) {
    // Optionally handle scan errors
}

// Initialize scanner when called
function startVendorScanner() {
    const html5QrCode = new Html5Qrcode("vendor-qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        document.getElementById('vendor-scan-status').textContent = 'Camera error: ' + err;
    });
}
