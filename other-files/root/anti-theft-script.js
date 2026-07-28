// ============================================
// ANTI-THEFT SOFTWARE - PURCHASE PAGE
// ============================================

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Anti-Theft Software Purchase Page Loaded');
    initializeMatrixEffect();
    initializeFAQ();
});

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
        // Fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set text color
        ctx.fillStyle = '#00ff41';
        ctx.font = fontSize + 'px monospace';

        // Draw each column
        for (let i = 0; i < drops.length; i++) {
            const text = letters.charAt(Math.floor(Math.random() * letters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            drops[i]++;
        }
    }

    // Run animation
    setInterval(draw, 33);

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
    });
}

// ============================================
// PURCHASE FUNCTIONALITY
// ============================================

/**
 * Handle purchase button click
 */
function purchaseNow() {
    const licenseCode = document.querySelector('.license-code-display').value;
    console.log('Purchase initiated with license:', licenseCode);
    
    // Show confirmation dialog
    const confirmation = confirm(
        `Proceed with purchase of SecureGuard Pro?\n\nLicense Code: ${licenseCode}\n\nYou will be redirected to payment.`
    );
    
    if (confirmation) {
        // Simulate payment processing
        const btn = event.target.closest('.btn-purchase');
        btn.innerHTML = '<span class="btn-icon">⏳</span> PROCESSING...';
        btn.disabled = true;

        setTimeout(() => {
            alert('Payment successful! Check your email for license activation details.');
            btn.innerHTML = '<span class="btn-icon">🛡️</span> PURCHASE NOW';
            btn.disabled = false;
        }, 2000);
    }
}

/**
 * Copy license code to clipboard
 */
function copyLicenseCode() {
    const licenseInput = document.querySelector('.license-code-display');
    licenseInput.select();
    
    // Copy to clipboard
    document.execCommand('copy');
    
    // Show feedback
    const btn = event.target.closest('.btn-copy');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>✓</span> COPIED!';
    btn.style.borderColor = 'var(--color-primary)';
    btn.style.color = 'var(--color-primary)';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.borderColor = 'var(--color-secondary)';
        btn.style.color = 'var(--color-secondary)';
    }, 2000);
    
    console.log('License code copied:', licenseInput.value);
}

/**
 * Apply promo code
 */
function applyPromoCode() {
    const promoCode = document.getElementById('promoCode').value.trim();
    
    if (!promoCode) {
        alert('Please enter a promo code');
        return;
    }

    console.log('Applying promo code:', promoCode);

    // Simulate promo validation
    const validCodes = ['SAVE20', 'FRAUD20', 'PROTECT30', 'SECURE25'];
    
    if (validCodes.includes(promoCode.toUpperCase())) {
        const discountMap = {
            'SAVE20': 0.20,
            'FRAUD20': 0.20,
            'PROTECT30': 0.30,
            'SECURE25': 0.25
        };
        
        const discount = discountMap[promoCode.toUpperCase()] * 100;
        alert(`✓ Promo code applied!\n${discount}% discount applied to your order.`);
        
        // Update price display
        updatePriceWithDiscount(discount);
    } else {
        alert('Invalid promo code. Please check and try again.');
    }
}

/**
 * Update price with discount
 */
function updatePriceWithDiscount(discountPercent) {
    const originalPrice = 49.99;
    const discountedPrice = (originalPrice * (1 - discountPercent / 100)).toFixed(2);
    
    const priceAmount = document.querySelector('.amount');
    if (priceAmount) {
        priceAmount.textContent = discountedPrice;
        console.log(`Price updated: $${originalPrice} -> $${discountedPrice} (${discountPercent}% off)`);
    }
}

// ============================================
// FAQ FUNCTIONALITY
// ============================================

/**
 * Initialize FAQ accordion
 */
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                toggleFAQ(question);
            });
        }
    });
}

/**
 * Toggle FAQ item open/closed
 */
function toggleFAQ(questionElement) {
    const faqItem = questionElement.closest('.faq-item');
    
    // Close other open items
    document.querySelectorAll('.faq-item.active').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
        }
    });
    
    // Toggle current item
    faqItem.classList.toggle('active');
    console.log('FAQ toggled:', faqItem.querySelector('.faq-title').textContent);
}

// ============================================
// SUPPORT FUNCTIONS
// ============================================

/**
 * Open live chat
 */
function openLiveChat() {
    console.log('Opening live chat...');
    alert('Live chat feature coming soon!\n\nFor now, please email support@secureguardpro.com');
}

/**
 * Send email to support
 */
function sendEmail() {
    console.log('Sending email to support...');
    window.location.href = 'mailto:support@secureguardpro.com?subject=SecureGuard Pro Support Request';
}

/**
 * Call support phone number
 */
function callSupport() {
    console.log('Calling support...');
    window.location.href = 'tel:+18005327351';
}

// ============================================
// ANALYTICS & TRACKING
// ============================================

/**
 * Track user interactions
 */
function trackEvent(eventName, eventData = {}) {
    const eventInfo = {
        timestamp: new Date().toISOString(),
        event: eventName,
        data: eventData,
        page: 'anti-theft-purchase'
    };
    
    console.log('Event tracked:', eventInfo);
    
    // Here you would send to analytics service
    // Example: sendToAnalytics(eventInfo);
}

// Track page view
trackEvent('page_view', {
    page: 'Anti-Theft Software Purchase Page',
    url: window.location.href
});

// Track button clicks
document.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
        const buttonText = button.textContent.trim();
        if (buttonText) {
            trackEvent('button_click', { button: buttonText });
        }
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Get device information
 */
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
    };
}

/**
 * Log device information on page load
 */
console.log('Device Information:', getDeviceInfo());

// ============================================
// PERFORMANCE MONITORING
// ============================================

/**
 * Monitor page performance
 */
if (window.performance) {
    window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log('Page Load Time:', pageLoadTime + 'ms');
    });
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    trackEvent('error', {
        message: event.error.message,
        stack: event.error.stack
    });
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
    trackEvent('unhandled_rejection', {
        reason: event.reason
    });
});

// ============================================
// HACKER TERMINAL FUNCTIONS
// ============================================

/**
 * Generate activation code
 */
function generateCode() {
    const deviceId = document.getElementById('deviceId').value.trim();
    const licenseType = document.getElementById('licenseType').value;

    if (!deviceId) {
        alert('Please enter a Device ID');
        return;
    }

    // Generate a mock activation code
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${deviceId.slice(0, 4).toUpperCase()}-${licenseType.slice(0, 3)}-${random}-${timestamp.slice(-4)}`;

    document.getElementById('generatedCode').textContent = code;
    
    // Animate the generated code
    const codeOutput = document.getElementById('codeOutput');
    codeOutput.style.animation = 'none';
    setTimeout(() => {
        codeOutput.style.animation = 'pulse 0.5s ease';
    }, 10);
}

/**
 * Copy generated code to clipboard
 */
function copyGeneratedCode() {
    const code = document.getElementById('generatedCode').textContent;
    
    if (code === 'XXXXXXXX-XXXX-XXXX') {
        alert('Please generate a code first');
        return;
    }

    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy code');
    });
}

/**
 * Activate system with provided code
 */
function activateSystem() {
    const code = document.getElementById('activationCode').value.trim();
    const email = document.getElementById('activationEmail').value.trim();
    const statusDiv = document.getElementById('activationStatus');

    // Validation
    if (!code || !email) {
        statusDiv.textContent = 'ERROR: Missing activation code or email';
        statusDiv.className = 'activation-status error';
        return;
    }

    if (!isValidEmail(email)) {
        statusDiv.textContent = 'ERROR: Invalid email address';
        statusDiv.className = 'activation-status error';
        return;
    }

    // Simulate activation process
    statusDiv.textContent = 'PROCESSING...';
    statusDiv.className = 'activation-status';

    setTimeout(() => {
        // Mock validation - in real scenario, this would call backend
        const isValid = code.length >= 8 && code.includes('-');
        
        if (isValid) {
            statusDiv.textContent = '✓ SYSTEM ACTIVATED SUCCESSFULLY';
            statusDiv.className = 'activation-status success';
            document.getElementById('systemStatus').textContent = 'ACTIVATED';
            document.getElementById('systemStatus').style.color = '#51cf66';
            
            // Store activation data and redirect to wire-transaction-log
            sessionStorage.setItem('activationEmail', email);
            sessionStorage.setItem('activationCode', code);
            sessionStorage.setItem('activationTime', new Date().toISOString());
            
            // Clear form
            setTimeout(() => {
                document.getElementById('activationCode').value = '';
                document.getElementById('activationEmail').value = '';
                // Redirect to wire-transaction-log after 2 seconds
                setTimeout(() => {
                    window.location.href = '/wire-transaction-log';
                }, 2000);
            }, 1000);
        } else {
            statusDiv.textContent = 'ERROR: Invalid activation code format';
            statusDiv.className = 'activation-status error';
        }
    }, 1500);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ============================================
// EXPORT FOR EXTERNAL USE
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateCode,
        copyGeneratedCode,
        activateSystem,
        callSupport,
        trackEvent,
        formatCurrency,
        getDeviceInfo
    };
}
