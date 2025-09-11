// ==============================
// Fixed Speech-to-Text Microphone Widget
// speech-widget.js - Corrected Version
// ==============================

(function() {
  'use strict';
  
  class SpeechWidget {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.currentTarget = null;
      this.finalTranscript = '';
      this.interimTranscript = '';
      
      this.init();
    }
    
    init() {
      // Check for browser support - more comprehensive check
      if (!this.checkBrowserSupport()) {
        console.warn('Speech recognition not supported in this browser');
        this.hideWidget();
        return;
      }
      
      // Initialize speech recognition
      this.setupSpeechRecognition();
      this.setupWidgetEvents();
      this.setupInputTracking();
      
      console.log('Speech widget initialized successfully');
    }
    
    checkBrowserSupport() {
      // Check for HTTPS requirement (except localhost)
      if (location.protocol !== 'https:' && !location.hostname.includes('localhost') && location.hostname !== '127.0.0.1') {
        console.warn('Speech recognition requires HTTPS');
        return false;
      }
      
      // Check for API availability
      return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    }
    
    setupSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition settings
      this.recognition.continuous = false; // Changed to false for better control
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      this.setupRecognitionEvents();
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
        this.isListening = true;
        this.updateWidgetState(true);
        this.finalTranscript = '';
        this.interimTranscript = '';
      };
      
      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.isListening = false;
        this.updateWidgetState(false);
        
        // Insert any remaining transcript
        if (this.finalTranscript.trim()) {
          this.insertText(this.finalTranscript.trim());
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateWidgetState(false);
        
        // Provide user-friendly error messages
        let errorMessage = 'Speech recognition error: ';
        switch (event.error) {
          case 'not-allowed':
            errorMessage += 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage += 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage += 'No microphone found. Please check your microphone connection.';
            break;
          case 'network':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += event.error;
        }
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert(errorMessage);
        } else {
          console.warn(errorMessage);
          this.updateStatusText('Error: ' + event.error);
        }
      };
      
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update stored transcripts
        if (finalTranscript) {
          this.finalTranscript += finalTranscript + ' ';
        }
        this.interimTranscript = interimTranscript;
        
        // Show live preview
        const fullText = this.finalTranscript + this.interimTranscript;
        if (fullText.trim()) {
          this.updateStatusText('Heard: "' + fullText.trim() + '"');
          this.insertText(fullText, true); // true for live preview
        }
      };
    }
    
    setupWidgetEvents() {
      const button = document.getElementById('speechBtn');
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleListening();
        });
        
        // Add keyboard support
        button.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.toggleListening();
          }
        });
      } else {
        console.error('Speech button not found');
      }
    }
    
    setupInputTracking() {
      // Track focus on input elements
      document.addEventListener('focusin', (e) => {
        if (this.isInputElement(e.target)) {
          this.currentTarget = e.target;
          this.finalTranscript = '';
          console.log('Focused on input:', e.target.tagName, e.target.id || e.target.className);
        }
      });
      
      document.addEventListener('focusout', (e) => {
        // Small delay to handle quick focus changes
        setTimeout(() => {
          if (!document.activeElement || !this.isInputElement(document.activeElement)) {
            // Don't clear target immediately - user might click speech button
            // this.currentTarget = null;
          }
        }, 100);
      });
      
      // Handle clicks on input elements
      document.addEventListener('click', (e) => {
        if (this.isInputElement(e.target)) {
          this.currentTarget = e.target;
          this.finalTranscript = '';
          console.log('Clicked on input:', e.target.tagName, e.target.id || e.target.className);
        }
      });
    }
    
    isInputElement(element) {
      if (!element) return false;
      
      const tagName = element.tagName.toLowerCase();
      const type = element.type ? element.type.toLowerCase() : '';
      
      return (
        tagName === 'textarea' ||
        (tagName === 'input' && ['text', 'search', 'tel', 'url', 'email', 'number'].includes(type)) ||
        element.contentEditable === 'true'
      );
    }
    
    toggleListening() {
      console.log('Toggle listening clicked, current state:', this.isListening);
      
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
      
      // Auto-focus on first available input if none selected
      if (!this.currentTarget) {
        const firstInput = document.querySelector('textarea, input[type="text"]');
        if (firstInput) {
          firstInput.focus();
          this.currentTarget = firstInput;
        } else {
          alert('Please click on a text field first, then start dictation');
          return;
        }
      }
      
      console.log('Starting speech recognition...');
      this.updateStatusText('Starting...');
      
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        this.isListening = false;
        this.updateWidgetState(false);
        alert('Failed to start speech recognition: ' + error.message);
      }
    }
    
    stopListening() {
      console.log('Stopping speech recognition...');
      this.isListening = false;
      
      if (this.recognition) {
        this.recognition.stop();
      }
      
      this.updateWidgetState(false);
    }
    
    updateWidgetState(listening) {
      const button = document.getElementById('speechBtn');
      const status = document.getElementById('speechStatus');
      
      if (button) {
        if (listening) {
          button.classList.add('listening');
          button.setAttribute('aria-label', 'Stop dictation');
        } else {
          button.classList.remove('listening');
          button.setAttribute('aria-label', 'Start dictation');
        }
      }
      
      if (status) {
        if (listening) {
          status.textContent = 'Listening... Click to stop';
          status.classList.add('active');
        } else {
          status.textContent = 'Click to start dictation';
          status.classList.remove('active');
        }
      }
    }
    
    updateStatusText(text) {
      const status = document.getElementById('speechStatus');
      if (status) {
        status.textContent = text;
      }
    }
    
    insertText(text, isPreview = false) {
      if (!this.currentTarget || !text.trim()) return;
      
      const target = this.currentTarget;
      const cleanText = text.trim();
      
      try {
        if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
          // For textarea and input elements
          if (!isPreview) {
            // Final insertion - replace any existing content from this session
            const existingValue = target.value;
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || start;
            
            // Insert text at cursor position
            const before = existingValue.substring(0, start);
            const after = existingValue.substring(end);
            const newValue = before + cleanText + after;
            
            target.value = newValue;
            
            // Set cursor position after inserted text
            const newPosition = start + cleanText.length;
            target.setSelectionRange(newPosition, newPosition);
            
            // Trigger input event for any listeners
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
        } else if (target.contentEditable === 'true') {
          // For contenteditable elements
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            if (!isPreview) {
              range.deleteContents();
              const textNode = document.createTextNode(cleanText);
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
        }
        
        // Focus the target element
        target.focus();
        
      } catch (error) {
        console.error('Error inserting text:', error);
      }
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
    
    // Debug method
    getStatus() {
      return {
        isListening: this.isListening,
        hasRecognition: !!this.recognition,
        currentTarget: this.currentTarget ? this.currentTarget.tagName + '#' + this.currentTarget.id : null,
        browserSupport: this.checkBrowserSupport()
      };
    }
  }
  
  // Initialize the speech widget when DOM is ready
  function initSpeechWidget() {
    // Check if already initialized
    if (window.speechWidget) {
      console.log('Speech widget already initialized');
      return;
    }
    
    console.log('Initializing speech widget...');
    
    // Create and store global instance
    try {
      window.speechWidget = new SpeechWidget();
      console.log('Speech widget created successfully');
      
      // Add debug access
      window.debugSpeech = () => {
        console.log('Speech widget status:', window.speechWidget.getStatus());
      };
      
    } catch (error) {
      console.error('Failed to create speech widget:', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpeechWidget);
  } else {
    initSpeechWidget();
  }
  
})();
