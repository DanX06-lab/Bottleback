let html5QrCode;
let currentQRCode = null;

// Initialize scanner on load
window.addEventListener('load', function () {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            startScanner();
        } catch (e) {
            alert('Error initializing scanner: ' + e.message);
        }
    } else {
        alert('Camera access is not supported in this browser');
    }
});

function startScanner() {
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
            if (currentQRCode !== qrCodeMessage) {
                currentQRCode = qrCodeMessage;
                html5QrCode.stop();
                showScanResult(qrCodeMessage);
            }
        },
        errorMessage => {
            // Optionally log scanning errors
        }
    ).catch(err => {
        alert('Error initializing scanner: ' + err);
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().catch(() => { });
    }
}

function restartScanner() {
    document.getElementById('result-container').classList.add('hidden');
    currentQRCode = null;
    setTimeout(() => {
        startScanner();
    }, 300);
}

function showScanResult(qrCode) {
    const resultContainer = document.getElementById('result-container');
    const qrResult = document.getElementById('qr-result');
    const scanStatus = document.getElementById('scan-status');

    if (resultContainer) resultContainer.classList.remove('hidden');
    if (qrResult) qrResult.textContent = `QR Code: ${qrCode}`;
    if (scanStatus) scanStatus.textContent = 'Bottle successfully scanned!';

    sendQRToBackend(qrCode);
}

function sendQRToBackend(qrCode) {
    const userId = localStorage.getItem('currentUserId');

    if (!userId) {
        alert("You're not logged in. Please login first.");
        window.location.href = 'login.html';
        return;
    }

    processQRCode(qrCode, userId);
}

function processQRCode(qrCode, userId) {
    fetch('/api/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, userId })
    })
        .then(response => response.json())
        .then(data => {
            const scanStatus = document.getElementById('scan-status');
            if (data && typeof data.success !== 'undefined') {
                scanStatus.textContent = data.success
                    ? 'Bottle successfully scanned and sent for verification.'
                    : ('Error: ' + (data.message || 'Failed to process QR'));
            } else {
                scanStatus.textContent = 'Error: Unexpected server response.';
            }
        })
        .catch(error => {
            document.getElementById('scan-status').textContent = 'Error: Failed to process bottle';
            console.error('Error:', error);
        });
}
