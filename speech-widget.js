// ==============================
// Speech Widget with Comprehensive Diagnostics
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
      this.debugMode = true; // Enable detailed logging
      
      this.init();
    }
    
    log(message, data = null) {
      if (this.debugMode) {
        console.log('[SpeechWidget]', message, data || '');
      }
    }
    
    init() {
      this.log('Initializing speech widget...');
      
      // Comprehensive browser support check
      const supportCheck = this.comprehensiveSupportCheck();
      this.log('Browser support check:', supportCheck);
      
      if (!supportCheck.supported) {
        this.log('Browser not supported, hiding widget');
        this.hideWidget();
        alert('Speech recognition not supported: ' + supportCheck.reason);
        return;
      }
      
      this.setupSpeechRecognition();
      this.setupWidgetEvents();
      this.setupInputTracking();
      
      this.log('Speech widget initialization complete');
      
      // Test microphone permissions on load
      this.testMicrophonePermissions();
    }
    
    async testMicrophonePermissions() {
      this.log('Testing microphone permissions...');
      
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' });
          this.log('Microphone permission status:', permission.state);
          
          if (permission.state === 'denied') {
            alert('Microphone access is blocked. Please enable microphone permissions in your browser settings.');
          } else if (permission.state === 'prompt') {
            this.log('Microphone permission will be requested when speech starts');
          }
        } else {
          this.log('Permissions API not available');
        }
      } catch (error) {
        this.log('Error checking permissions:', error);
      }
    }
    
    comprehensiveSupportCheck() {
      // Check HTTPS requirement
      const isSecure = location.protocol === 'https:' || 
                      location.hostname === 'localhost' || 
                      location.hostname === '127.0.0.1' || 
                      location.hostname.endsWith('.localhost');
      
      if (!isSecure) {
        return { supported: false, reason: 'Requires HTTPS (current: ' + location.protocol + ')' };
      }
      
      // Check API availability
      const hasAPI = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
      if (!hasAPI) {
        return { supported: false, reason: 'Speech Recognition API not available' };
      }
      
      // Check if running in iframe (some restrictions apply)
      const inIframe = window !== window.top;
      if (inIframe) {
        this.log('Warning: Running in iframe, may have restrictions');
      }
      
      return { 
        supported: true, 
        isSecure, 
        hasAPI, 
        inIframe,
        userAgent: navigator.userAgent.substring(0, 100)
      };
    }
    
    setupSpeechRecognition() {
      this.log('Setting up speech recognition...');
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition settings
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      this.log('Recognition object created:', {
        continuous: this.recognition.continuous,
        interimResults: this.recognition.interimResults,
        lang: this.recognition.lang
      });
      
      this.setupRecognitionEvents();
    }
    
    hideWidget() {
      const widget = document.getElementById('speechWidget');
      if (widget) {
        widget.style.display = 'none';
        this.log('Widget hidden due to lack of support');
      }
    }
    
    setupRecognitionEvents() {
      this.log('Setting up recognition events...');
      
      this.recognition.onstart = () => {
        this.log('🎤 Recognition started successfully');
        this.isListening = true;
        this.updateWidgetState(true);
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.updateStatusText('Listening... speak now');
      };
      
      this.recognition.onend = () => {
        this.log('🛑 Recognition ended');
        this.isListening = false;
        this.updateWidgetState(false);
        
        // Insert any remaining transcript
        if (this.finalTranscript.trim()) {
          this.log('Inserting final transcript:', this.finalTranscript.trim());
          this.insertText(this.finalTranscript.trim());
        }
      };
      
      this.recognition.onerror = (event) => {
        this.log('❌ Recognition error:', {
          error: event.error,
          message: event.message,
          timeStamp: event.timeStamp
        });
        
        this.isListening = false;
        this.updateWidgetState(false);
        
        // Detailed error handling with user feedback
        let errorMessage = 'Speech recognition error: ';
        let showAlert = false;
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage += 'Microphone access denied. Please click "Allow" when prompted, or check browser settings.';
            showAlert = true;
            break;
          case 'no-speech':
            errorMessage += 'No speech detected. Please try speaking closer to your microphone.';
            this.updateStatusText('No speech detected - try again');
            break;
          case 'audio-capture':
            errorMessage += 'No microphone found. Please check your microphone connection.';
            showAlert = true;
            break;
          case 'network':
            errorMessage += 'Network error. Please check your internet connection.';
            showAlert = true;
            break;
          case 'aborted':
            errorMessage += 'Speech recognition was aborted.';
            this.updateStatusText('Recognition stopped');
            break;
          default:
            errorMessage += event.error;
            showAlert = true;
        }
        
        this.log('Error message:', errorMessage);
        
        if (showAlert) {
          alert(errorMessage);
        }
      };
      
      this.recognition.onresult = (event) => {
        this.log('📝 Recognition result received:', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length
        });
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          this.log(`Result ${i}:`, {
            transcript,
            confidence,
            isFinal: event.results[i].isFinal
          });
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update stored transcripts
        if (finalTranscript) {
          this.finalTranscript += finalTranscript + ' ';
          this.log('Updated final transcript:', this.finalTranscript);
        }
        this.interimTranscript = interimTranscript;
        
        // Show live preview
        const fullText = this.finalTranscript + this.interimTranscript;
        if (fullText.trim()) {
          this.updateStatusText('Heard: "' + fullText.trim() + '"');
          this.insertText(fullText, true); // true for live preview
        }
      };
      
      this.log('Recognition events setup complete');
    }
    
    setupWidgetEvents() {
      this.log('Setting up widget events...');
      
      const button = document.getElementById('speechBtn');
      if (button) {
        this.log('Speech button found, attaching events');
        
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.log('🖱️ Speech button clicked');
          this.toggleListening();
        });
        
        button.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.log('⌨️ Speech button activated via keyboard');
            this.toggleListening();
          }
        });
        
        // Add aria attributes
        button.setAttribute('aria-label', 'Start voice dictation');
        button.setAttribute('role', 'button');
        
      } else {
        this.log('❌ Speech button NOT found - check HTML');
        console.error('Speech button with id="speechBtn" not found in DOM');
      }
    }
    
    setupInputTracking() {
      this.log('Setting up input tracking...');
      
      document.addEventListener('focusin', (e) => {
        if (this.isInputElement(e.target)) {
          this.currentTarget = e.target;
          this.finalTranscript = '';
          this.log('📍 Focused on input:', {
            tag: e.target.tagName,
            id: e.target.id,
            class: e.target.className
          });
        }
      });
      
      document.addEventListener('click', (e) => {
        if (this.isInputElement(e.target)) {
          this.currentTarget = e.target;
          this.finalTranscript = '';
          this.log('👆 Clicked on input:', {
            tag: e.target.tagName,
            id: e.target.id,
            class: e.target.className
          });
        }
      });
    }
    
    isInputElement(element) {
      if (!element) return false;
      
      const tagName = element.tagName.toLowerCase();
      const type = element.type ? element.type.toLowerCase() : '';
      
      const isValid = (
        tagName === 'textarea' ||
        (tagName === 'input' && ['text', 'search', 'tel', 'url', 'email', 'number'].includes(type)) ||
        element.contentEditable === 'true'
      );
      
      return isValid;
    }
    
    toggleListening() {
      this.log('🔄 Toggle listening called, current state:', this.isListening);
      
      if (this.isListening) {
        this.log('Stopping listening...');
        this.stopListening();
      } else {
        this.log('Starting listening...');
        this.startListening();
      }
    }
    
    startListening() {
      this.log('▶️ Starting speech recognition...');
      
      if (!this.recognition) {
        this.log('❌ No recognition object available');
        alert('Speech recognition is not available');
        return;
      }
      
      // Auto-focus on first available input if none selected
      if (!this.currentTarget) {
        this.log('No target selected, looking for first input...');
        const firstInput = document.querySelector('textarea, input[type="text"]');
        if (firstInput) {
          firstInput.focus();
          this.currentTarget = firstInput;
          this.log('Auto-focused on:', firstInput.tagName + '#' + firstInput.id);
        } else {
          this.log('❌ No suitable input found');
          alert('Please click on a text field first, then start dictation');
          return;
        }
      }
      
      this.log('Target element:', {
        tag: this.currentTarget.tagName,
        id: this.currentTarget.id,
        focused: document.activeElement === this.currentTarget
      });
      
      this.updateStatusText('Requesting microphone access...');
      
      try {
        this.log('🎯 Calling recognition.start()...');
        this.recognition.start();
        this.log('✅ recognition.start() called successfully');
      } catch (error) {
        this.log('❌ Failed to start recognition:', error);
        this.isListening = false;
        this.updateWidgetState(false);
        alert('Failed to start speech recognition: ' + error.message);
      }
    }
    
    stopListening() {
      this.log('⏹️ Stopping speech recognition...');
      this.isListening = false;
      
      if (this.recognition) {
        try {
          this.recognition.stop();
          this.log('✅ recognition.stop() called');
        } catch (error) {
          this.log('Error stopping recognition:', error);
        }
      }
      
      this.updateWidgetState(false);
    }
    
    updateWidgetState(listening) {
      this.log('🎨 Updating widget state, listening:', listening);
      
      const button = document.getElementById('speechBtn');
      const status = document.getElementById('speechStatus');
      
      if (button) {
        if (listening) {
          button.classList.add('listening');
          button.setAttribute('aria-label', 'Stop dictation');
          this.log('✅ Button set to listening state (should be red)');
        } else {
          button.classList.remove('listening');
          button.setAttribute('aria-label', 'Start dictation');
          this.log('✅ Button set to idle state (should be blue)');
        }
      } else {
        this.log('❌ Button element not found for state update');
      }
      
      if (status) {
        if (listening) {
          status.textContent = 'Listening... Click to stop';
          status.classList.add('active');
        } else {
          status.textContent = 'Click to start dictation';
          status.classList.remove('active');
        }
        this.log('✅ Status updated:', status.textContent);
      } else {
        this.log('❌ Status element not found');
      }
    }
    
    updateStatusText(text) {
      const status = document.getElementById('speechStatus');
      if (status) {
        status.textContent = text;
        this.log('📱 Status text updated:', text);
      }
    }
    
    insertText(text, isPreview = false) {
      if (!this.currentTarget || !text.trim()) return;
      
      const target = this.currentTarget;
      const cleanText = text.trim();
      
      this.log('📝 Inserting text:', { text: cleanText, isPreview, targetId: target.id });
      
      try {
        if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
          if (!isPreview) {
            const existingValue = target.value;
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || start;
            
            const before = existingValue.substring(0, start);
            const after = existingValue.substring(end);
            const newValue = before + cleanText + after;
            
            target.value = newValue;
            
            const newPosition = start + cleanText.length;
            target.setSelectionRange(newPosition, newPosition);
            
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            
            this.log('✅ Text inserted successfully');
          }
        }
        
        target.focus();
        
      } catch (error) {
        this.log('❌ Error inserting text:', error);
      }
    }
    
    // Debug methods
    getStatus() {
      const status = {
        isListening: this.isListening,
        hasRecognition: !!this.recognition,
        currentTarget: this.currentTarget ? {
          tag: this.currentTarget.tagName,
          id: this.currentTarget.id,
          focused: document.activeElement === this.currentTarget
        } : null,
        browserSupport: this.comprehensiveSupportCheck(),
        elements: {
          button: !!document.getElementById('speechBtn'),
          status: !!document.getElementById('speechStatus'),
          widget: !!document.getElementById('speechWidget')
        }
      };
      
      this.log('Current status:', status);
      return status;
    }
    
    destroy() {
      if (this.isListening) {
        this.stopListening();
      }
    }
  }
  
  // Initialize the speech widget when DOM is ready
  function initSpeechWidget() {
    if (window.speechWidget) {
      console.log('[SpeechWidget] Already initialized');
      return;
    }
    
    console.log('[SpeechWidget] Initializing...');
    
    try {
      window.speechWidget = new SpeechWidget();
      console.log('[SpeechWidget] ✅ Initialization complete');
      
      // Add global debug functions
      window.debugSpeech = () => {
        console.log('=== SPEECH WIDGET DEBUG ===');
        return window.speechWidget.getStatus();
      };
      
      window.testSpeech = () => {
        console.log('=== TESTING SPEECH WIDGET ===');
        const status = window.speechWidget.getStatus();
        console.log('Status:', status);
        
        if (!status.elements.button) {
          console.error('❌ Speech button not found in DOM');
        }
        if (!status.currentTarget) {
          console.warn('⚠️ No input target selected - click on a text field first');
        }
        if (!status.browserSupport.supported) {
          console.error('❌ Browser not supported:', status.browserSupport.reason);
        }
        
        return status;
      };
      
    } catch (error) {
      console.error('[SpeechWidget] ❌ Failed to initialize:', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpeechWidget);
  } else {
    initSpeechWidget();
  }
  
})();
