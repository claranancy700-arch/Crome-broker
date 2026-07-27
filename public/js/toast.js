/**
 * Toast Notification System
 * Usage: toast.show('Message', 'success|error|info|warning', duration)
 */

(function() {
  'use strict';

  // Create toast container if it doesn't exist
  function getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // Show a toast notification
  function showToast(message, type = 'info', duration = 4000) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('toast-show'), 10);
    
    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
  }

  // Remove toast with animation
  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Expose global toast API
  window.toast = {
    show: showToast,
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration)
  };

  // Add CSS dynamically if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto;
        border-left: 4px solid #666;
      }
      
      .toast-show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast-hide {
        opacity: 0;
        transform: translateX(400px);
      }
      
      .toast-icon {
        font-size: 20px;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .toast-message {
        flex: 1;
        color: #333;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .toast-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      
      .toast-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      
      .toast-success {
        border-left-color: #28a745;
      }
      
      .toast-success .toast-icon {
        color: #28a745;
      }
      
      .toast-error {
        border-left-color: #dc3545;
      }
      
      .toast-error .toast-icon {
        color: #dc3545;
      }
      
      .toast-warning {
        border-left-color: #ffc107;
      }
      
      .toast-warning .toast-icon {
        color: #ffc107;
      }
      
      .toast-info {
        border-left-color: #17a2b8;
      }
      
      .toast-info .toast-icon {
        color: #17a2b8;
      }
      
      @media (max-width: 640px) {
        .toast-container {
          right: 10px;
          left: 10px;
          top: 10px;
        }
        
        .toast {
          min-width: auto;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
