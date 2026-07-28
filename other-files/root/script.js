// ============================================
// SECURITY ALERT PAGE - JAVASCRIPT
// ============================================

// Configuration
const CONFIG = {
    threats: [
        'Unauthorized Access Attempt',
        'Fraudulent Transaction Detected',
        'Suspicious Login Pattern',
        'Data Exfiltration Activity',
        'Malware Signature Match',
    ],
    scanDuration: 300, // milliseconds between progress updates
    threatDisplayDelay: 0.1, // seconds between threat animations
};

// ============================================
// MATRIX CANVAS EFFECT
// ============================================

/**
 * Initialize and run the matrix rain effect
 */
function initializeMatrixEffect() {
    const canvas = document.getElementById('matrix');
    
    if (!canvas) {
        console.warn('Matrix canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    
    // Set canvas size to window size
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    const letters = '01';
    const fontSize = 18;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    /**
     * Draw the matrix rain effect
     */
    function draw() {
        // Fade effect - semi-transparent black overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set text color to neon green
        ctx.fillStyle = '#00ff41';
        ctx.font = fontSize + 'px monospace';

        // Draw each column
        for (let i = 0; i < drops.length; i++) {
            // Get random character (0 or 1)
            const text = letters.charAt(Math.floor(Math.random() * letters.length));

            // Draw the character
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            // Reset column to top if it goes off screen with random chance
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            // Move character down
            drops[i]++;
        }
    }

    // Run the animation loop
    const matrixInterval = setInterval(draw, 33);

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
    });

    return matrixInterval;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the page when DOM is loaded
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('Security Alert Page Initialized');
    initializeMatrixEffect();
    initializePage();
    startSecurityScan();
});

// ============================================
// PAGE INITIALIZATION
// ============================================

/**
 * Initialize page with current time and date
 */
function initializePage() {
    const now = new Date();
    
    const lastSeenElement = document.getElementById('lastSeen');
    const timestampElement = document.getElementById('timestamp');
    
    if (lastSeenElement) {
        lastSeenElement.textContent = now.toLocaleString();
    }
    
    if (timestampElement) {
        timestampElement.textContent = now.toLocaleTimeString();
    }
    
    console.log('Page initialized at:', now.toLocaleString());
}

// ============================================
// SECURITY SCAN ANIMATION
// ============================================

/**
 * Start the security scan animation with progress bar
 */
function startSecurityScan() {
    console.log('Starting security scan...');
    
    let progress = 0;
    const scanInterval = setInterval(() => {
        // Simulate random progress increments
        progress += Math.random() * 1;
        
        // Cap at 100%
        if (progress > 100) {
            progress = 100;
        }

        // Update progress bar and percentage
        updateProgressBar(progress);

        // When scan is complete, display threats
        if (progress >= 100) {
            clearInterval(scanInterval);
            console.log('Scan complete. Displaying threats...');
            displayThreats(CONFIG.threats);
        }
    }, CONFIG.scanDuration);
}

/**
 * Update the progress bar and percentage display
 * @param {number} progress - Progress percentage (0-100)
 */
function updateProgressBar(progress) {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    if (progressPercent) {
        progressPercent.textContent = Math.floor(progress);
    }
}

// ============================================
// THREAT DISPLAY
// ============================================

/**
 * Display detected threats with staggered animations
 * @param {Array<string>} threats - Array of threat strings
 */
function displayThreats(threats) {
    const threatsSection = document.getElementById('threatsSection');
    const threatsList = document.getElementById('threatsList');
    
    if (!threatsList || !threatsSection) {
        console.error('Threats section or list not found in DOM');
        return;
    }
    
    // Clear existing threats
    threatsList.innerHTML = '';

    // Add each threat with staggered animation
    threats.forEach((threat, index) => {
        const li = document.createElement('li');
        li.className = 'threat-item animate-slide-in';
        li.style.animationDelay = (index * CONFIG.threatDisplayDelay) + 's';
        li.innerHTML = `
            <span class="threat-indicator">●</span>
            <span class="threat-text">${escapeHtml(threat)}</span>
        `;
        threatsList.appendChild(li);
        console.log('Added threat:', threat);
    });

    // Show the threats section
    threatsSection.style.display = 'block';
}

// ============================================
// BUTTON HANDLERS
// ============================================

/**
 * Handle primary action button click
 */
function handlePrimaryAction() {
    console.log('User clicked: GET ANTI-THEFT SOFTWARE NOW');
    // Redirect to anti-theft page
    window.location.href = '/anti-theft';
}

/**
 * Handle secondary action button click
 */
function handleSecondaryAction() {
    const message = 'Redirecting to password change and account security page...';
    console.log('User clicked: CHANGE PASSWORD & SECURE ACCOUNT');
    showAlert(message);
    // TODO: Replace with actual redirect
    // window.location.href = 'https://your-account-security-link.com';
}

/**
 * Handle tertiary action button click
 */
function handleTertiaryAction() {
    const message = 'Opening detailed security report...';
    console.log('User clicked: View Detailed Report');
    showAlert(message);
    // TODO: Replace with actual report display
    // displayDetailedReport();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show an alert message
 * @param {string} message - Message to display
 */
function showAlert(message) {
    alert(message);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get current timestamp in readable format
 * @returns {string} Current timestamp
 */
function getCurrentTimestamp() {
    return new Date().toLocaleTimeString();
}

/**
 * Update timestamp display
 */
function updateTimestamp() {
    const timestampElement = document.getElementById('timestamp');
    if (timestampElement) {
        timestampElement.textContent = getCurrentTimestamp();
    }
}

// ============================================
// DEVICE INFORMATION
// ============================================

/**
 * Get device information (can be expanded with more browser/device APIs)
 * @returns {Object} Device information
 */
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

/**
 * Update device information in the UI
 * @param {Object} deviceInfo - Device information object
 */
function updateDeviceInfo(deviceInfo) {
    console.log('Device Information:', deviceInfo);
    // TODO: Update device info elements if needed
}

// ============================================
// ADVANCED FEATURES
// ============================================

/**
 * Add custom threat to the list
 * @param {string} threat - Threat message
 */
function addCustomThreat(threat) {
    const threatsList = document.getElementById('threatsList');
    if (!threatsList) {
        console.error('Threats list not found');
        return;
    }

    const li = document.createElement('li');
    li.className = 'threat-item animate-slide-in';
    li.innerHTML = `
        <span class="threat-indicator">●</span>
        <span class="threat-text">${escapeHtml(threat)}</span>
    `;
    threatsList.appendChild(li);
    console.log('Added custom threat:', threat);
}

/**
 * Reset the page and restart scan
 */
function resetPage() {
    console.log('Resetting page...');
    
    // Reset progress bar
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0';
    
    // Hide threats section
    const threatsSection = document.getElementById('threatsSection');
    if (threatsSection) threatsSection.style.display = 'none';
    
    // Clear threats list
    const threatsList = document.getElementById('threatsList');
    if (threatsList) threatsList.innerHTML = '';
    
    // Restart scan
    startSecurityScan();
}

/**
 * Display a detailed security report (can be expanded)
 */
function displayDetailedReport() {
    const report = {
        timestamp: new Date().toLocaleString(),
        scanDuration: '2.5 seconds',
        threatsFound: CONFIG.threats.length,
        threats: CONFIG.threats,
        recommendations: [
            'Update all passwords immediately',
            'Enable two-factor authentication',
            'Install antivirus software',
            'Review account activity logs',
        ],
    };

    console.table(report);
    // TODO: Display report in a modal or separate page
}

// ============================================
// EXPORT FOR EXTERNAL USE (if needed)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startSecurityScan,
        displayThreats,
        handlePrimaryAction,
        handleSecondaryAction,
        handleTertiaryAction,
        getDeviceInfo,
        resetPage,
        displayDetailedReport,
    };
}
