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
    html5QrCode = new Html5QrCode("reader");

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
    // Just send QR code to backend without login
    fetch('/api/store-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode })
    })
        .then(response => response.json())
        .then(data => {
            const scanStatus = document.getElementById('scan-status');
            if (data && typeof data.success !== 'undefined') {
                scanStatus.textContent = data.success
                    ? 'Bottle QR code stored successfully.'
                    : ('Error: ' + (data.message || 'Failed to store QR'));
            } else {
                scanStatus.textContent = 'Error: Unexpected server response.';
            }
        })
        .catch(error => {
            document.getElementById('scan-status').textContent = 'Error: Failed to submit QR';
            console.error('Error:', error);
        });
}
