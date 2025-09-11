// ==============================
// Speech-to-Text Microphone Widget
// speech-widget.js - Standalone file
// ==============================

class SpeechWidget {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.currentTarget = null;
    this.widget = null;
    this.finalTranscript = '';
    
    this.init();
  }
  
  init() {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition settings
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    // Set up event listeners
    this.setupRecognitionEvents();
    
    // Create and inject the widget
    this.createWidget();
    
    // Set up input field tracking
    this.setupInputTracking();
  }
  
  setupRecognitionEvents() {
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.updateWidgetState(true);
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      if (this.isListening) {
        // Restart if we're supposed to be listening
        setTimeout(() => {
          if (this.isListening) {
            this.recognition.start();
          }
        }, 100);
      } else {
        this.updateWidgetState(false);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.');
        this.stopListening();
      }
    };
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      this.insertText(this.finalTranscript + interimTranscript);
    };
  }
  
  createWidget() {
    // Create widget container
    this.widget = document.createElement('div');
    this.widget.className = 'speech-widget';
    this.widget.innerHTML = `
      <button class="speech-btn" type="button" title="Click to start/stop voice dictation">
        <svg class="mic-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <div class="pulse-ring"></div>
      </button>
      <div class="speech-status">Click to start dictation</div>
    `;
    
    // Add CSS styles
    this.addStyles();
    
    // Position widget
    this.widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;
    
    // Add click event
    const button = this.widget.querySelector('.speech-btn');
    button.addEventListener('click', () => this.toggleListening());
    
    // Add to page
    document.body.appendChild(this.widget);
  }
  
  addStyles() {
    if (document.getElementById('speech-widget-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'speech-widget-styles';
    styles.textContent = `
      .speech-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .speech-btn {
        position: relative;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: #4285f4;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      .speech-btn:hover {
        background: #3367d6;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(66, 133, 244, 0.4);
      }
      
      .speech-btn.listening {
        background: #ea4335;
        animation: pulse 2s infinite;
      }
      
      .speech-btn.listening:hover {
        background: #d33b2c;
      }
      
      .speech-btn.listening .pulse-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid #ea4335;
        border-radius: 50%;
        animation: pulse-ring 2s infinite;
      }
      
      .mic-icon {
        position: relative;
        z-index: 1;
      }
      
      .speech-status {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        white-space: nowrap;
        max-width: 200px;
        text-align: center;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
      }
      
      .speech-widget:hover .speech-status {
        opacity: 1;
        transform: translateY(0);
      }
      
      .speech-status.active {
        opacity: 1;
        transform: translateY(0);
        background: rgba(234, 67, 53, 0.9);
      }
      
      @keyframes pulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }
      
      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.3);
          opacity: 0;
        }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .speech-widget {
          bottom: 15px;
          right: 15px;
        }
        
        .speech-btn {
          width: 48px;
          height: 48px;
        }
        
        .mic-icon {
          width: 18px;
          height: 18px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  setupInputTracking() {
    // Track focus on input elements
    document.addEventListener('focusin', (e) => {
      if (this.isInputElement(e.target)) {
        this.currentTarget = e.target;
        this.finalTranscript = '';
      }
    });
    
    document.addEventListener('focusout', (e) => {
      // Small delay to handle quick focus changes
      setTimeout(() => {
        if (!document.activeElement || !this.isInputElement(document.activeElement)) {
          this.currentTarget = null;
        }
      }, 100);
    });
    
    // Handle clicks on input elements
    document.addEventListener('click', (e) => {
      if (this.isInputElement(e.target)) {
        this.currentTarget = e.target;
        this.finalTranscript = '';
      }
    });
  }
  
  isInputElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';
    
    return (
      tagName === 'textarea' ||
      tagName === 'input' && ['text', 'search', 'tel', 'url', 'email', 'number'].includes(type) ||
      element.contentEditable === 'true'
    );
  }
  
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }
  
  startListening() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser');
      return;
    }
    
    if (!this.currentTarget) {
      alert('Please click on a text field first, then start dictation');
      return;
    }
    
    this.isListening = true;
    this.finalTranscript = '';
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
    }
  }
  
  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
    this.updateWidgetState(false);
  }
  
  updateWidgetState(listening) {
    const button = this.widget.querySelector('.speech-btn');
    const status = this.widget.querySelector('.speech-status');
    
    if (listening) {
      button.classList.add('listening');
      status.textContent = 'Listening... Click to stop';
      status.classList.add('active');
    } else {
      button.classList.remove('listening');
      status.textContent = 'Click to start dictation';
      status.classList.remove('active');
    }
  }
  
  insertText(text) {
    if (!this.currentTarget || !text.trim()) return;
    
    const target = this.currentTarget;
    
    if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
      // For textarea and input elements
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const before = target.value.substring(0, start);
      const after = target.value.substring(end);
      
      target.value = before + text + after;
      
      // Set cursor position after inserted text
      const newPosition = start + text.length;
      target.setSelectionRange(newPosition, newPosition);
      
      // Trigger input event for any listeners
      target.dispatchEvent(new Event('input', { bubbles: true }));
      
    } else if (target.contentEditable === 'true') {
      // For contenteditable elements
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Move cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger input event
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Focus the target element
    target.focus();
  }
  
  // Public methods for external control
  destroy() {
    if (this.isListening) {
      this.stopListening();
    }
    
    if (this.widget && this.widget.parentNode) {
      this.widget.parentNode.removeChild(this.widget);
    }
    
    const styles = document.getElementById('speech-widget-styles');
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
  }
  
  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
}

// Initialize the speech widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if already initialized
  if (window.speechWidget) {
    return;
  }
  
  // Create and store global instance
  window.speechWidget = new SpeechWidget();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpeechWidget;
}
