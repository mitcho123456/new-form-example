// ==============================
// Speech-to-Text Microphone Widget
// speech-widget.js - Manual Integration Version
// ==============================

(function() {
  'use strict';
  
  class SpeechWidget {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.currentTarget = null;
      this.finalTranscript = '';
      
      this.init();
    }
    
    init() {
      // Check for browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        this.hideWidget();
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
      this.setupWidgetEvents();
      this.setupInputTracking();
    }
    
    hideWidget() {
      const widget = document.getElementById('speechWidget');
      if (widget) {
        widget.style.display = 'none';
      }
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
              try {
                this.recognition.start();
              } catch (error) {
                console.log('Recognition restart failed:', error);
              }
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
    
    setupWidgetEvents() {
      const button = document.getElementById('speechBtn');
      if (button) {
        button.addEventListener('click', () => this.toggleListening());
      }
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
      const button = document.getElementById('speechBtn');
      const status = document.getElementById('speechStatus');
      
      if (button && status) {
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
    }
    
    insertText(text) {
      if (!this.currentTarget || !text.trim()) return;
      
      const target = this.currentTarget;
      
      if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
        // For textarea and input elements
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
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
        if (selection.rangeCount > 0) {
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
      }
      
      // Focus the target element
      target.focus();
    }
    
    // Public methods for external control
    destroy() {
      if (this.isListening) {
        this.stopListening();
      }
    }
    
    setLanguage(lang) {
      if (this.recognition) {
        this.recognition.lang = lang;
      }
    }
  }
  
  // Initialize the speech widget when DOM is ready
  function initSpeechWidget() {
    // Check if already initialized
    if (window.speechWidget) {
      return;
    }
    
    // Create and store global instance
    window.speechWidget = new SpeechWidget();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpeechWidget);
  } else {
    initSpeechWidget();
  }
  
})();
