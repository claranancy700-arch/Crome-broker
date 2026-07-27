/**
 * Loading Spinner Utility
 * Usage: 
 *   loading.show('Loading...') - show global spinner with message
 *   loading.hide() - hide global spinner
 *   loading.button(buttonElement, true/false) - toggle button loading state
 */

(function() {
  'use strict';

  let loadingOverlay = null;

  // Create loading overlay
  function createOverlay() {
    if (loadingOverlay) return loadingOverlay;
    
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-message">Loading...</div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
    return loadingOverlay;
  }

  // Show loading overlay
  function show(message = 'Loading...') {
    const overlay = createOverlay();
    const messageEl = overlay.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    overlay.classList.add('loading-show');
    document.body.style.overflow = 'hidden';
  }

  // Hide loading overlay
  function hide() {
    if (loadingOverlay) {
      loadingOverlay.classList.remove('loading-show');
      document.body.style.overflow = '';
    }
  }

  // Toggle button loading state
  function toggleButton(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `<span class="btn-spinner"></span> ${button.dataset.loadingText || 'Loading...'}`;
      button.classList.add('btn-loading');
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
      button.classList.remove('btn-loading');
    }
  }

  // Expose global loading API
  window.loading = {
    show,
    hide,
    button: toggleButton
  };

  // Add CSS if not already present
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
      }
      
      .loading-overlay.loading-show {
        opacity: 1;
        visibility: visible;
      }
      
      .loading-spinner {
        text-align: center;
        background: rgba(255, 255, 255, 0.95);
        padding: 30px 40px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }
      
      .spinner {
        width: 50px;
        height: 50px;
        margin: 0 auto 16px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #a21f35;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .loading-message {
        color: #333;
        font-size: 16px;
        font-weight: 500;
      }
      
      /* Button loading state */
      .btn-loading {
        position: relative;
        color: transparent !important;
      }
      
      .btn-spinner {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-left-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }
      
      button.btn-loading .btn-spinner {
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }
})();
