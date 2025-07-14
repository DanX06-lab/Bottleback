let html5QrCode;
let currentQRCode = null;
let scannedQRCode = null;

function startScanner() {
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        qrCodeMessage => {
            if (currentQRCode !== qrCodeMessage) {
                currentQRCode = qrCodeMessage;
                html5QrCode.stop();
                // Show result and send to backend
                var resultContainer = document.getElementById('result-container');
                var qrResult = document.getElementById('qr-result');
                var scanStatus = document.getElementById('scan-status');
                if (resultContainer) resultContainer.classList.remove('hidden');
                // Do not show the QR code value to the user
// if (qrResult) qrResult.textContent = `QR Code: ${qrCodeMessage}`;
                if (scanStatus) scanStatus.textContent = 'Bottle successfully scanned!';
                sendQRToBackend(qrCodeMessage);
            }
        },
        errorMessage => {
            // Optionally handle scan errors
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
    // Hide result and phone input containers
    var resultContainer = document.getElementById('result-container');
    var phoneInputContainer = document.getElementById('phone-input-container');
    if (resultContainer) resultContainer.classList.add('hidden');
    if (phoneInputContainer) phoneInputContainer.style.display = 'none';
    // Reset current QR code
    currentQRCode = null;
    scannedQRCode = null;
    // Restart the scanner after a short delay to allow camera to reinitialize
    setTimeout(() => {
        startScanner();
    }, 300);
}

// Send QR code to backend
function sendQRToBackend(qrCode) {
    // Get user ID from localStorage
    let userId = localStorage.getItem('currentUserId');
    if (!userId) {
        // If user is not logged in, show an error and do not proceed
        document.getElementById('scan-status').textContent = 'You must be logged in to scan.';
        return;
    }
    processQRCode(qrCode, userId);
}

// Process QR code with user ID
function processQRCode(qrCode, userId) {
    fetch('/api/scan-qr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            qrCode: qrCode,
            userId: userId
        })
    })
        .then(response => response.json())
        .then(data => {
            // Defensive: handle missing or malformed response
            if (data && typeof data.success !== 'undefined') {
                if (data.success) {
                    document.getElementById('scan-status').textContent = data.message || 'Sent for vendor verification. Money will be added to your account shortly.';
                } else {
                    document.getElementById('scan-status').textContent = 'Scan sent for vendor verification. Money will be added after approval.';
                }
            } else {
                document.getElementById('scan-status').textContent = 'Scan sent for vendor verification. Money will be added after approval.';
            }
        })
        .catch(error => {
            document.getElementById('scan-status').textContent = 'Scan sent for vendor verification. Money will be added after approval.';
            console.error('Error:', error);
        });
}

// Submit phone number function
function submitPhoneNumber() {
    const phoneInput = document.getElementById('phone-input');
    const phoneNumber = phoneInput.value.trim();

    if (!phoneNumber || phoneNumber.length < 10) {
        alert('Please enter a valid phone number');
        return;
    }

    // Store phone number in localStorage
    localStorage.setItem('currentUserId', phoneNumber);

    // Hide phone input container
    document.getElementById('phone-input-container').style.display = 'none';

    // Process the QR code with the phone number
    if (scannedQRCode) {
        processQRCode(scannedQRCode, phoneNumber);
        scannedQRCode = null;
    }
}

// Initialize scanner when page loads
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
