// ==============================
// Complete Advanced Speech Widget with Hybrid AI Recognition
// Includes ALL features + Web Speech API + Whisper integration
// ==============================

class AdvancedSpeechWidget {
  constructor() {
    // Core recognition engines
    this.recognition = null;
    this.whisperModel = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isWhisperLoaded = false;
    
    // State management
    this.isListening = false;
    this.isPushToTalk = false;
    this.currentTarget = null;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // Hybrid recognition settings
    this.useHybridMode = true;
    this.confidenceThreshold = 0.6; // Lower threshold to trigger Whisper backup
    this.whisperBackupEnabled = true;
    
    // Settings with defaults (including hybrid mode)
    this.settings = {
      language: 'en-US',
      timeout: 30,
      autoPunctuation: true,
      autoCapitalization: true,
      pushToTalk: false,
      confidenceThreshold: 0.7,
      continuousMode: true,
      hybridMode: true // New setting for AI enhancement
    };
    
    // Advanced state management
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoLevels = 20;
    this.transcriptHistory = [];
    this.capsMode = 'normal'; // normal, caps, allcaps, nocaps
    this.lastActivity = Date.now();
    this.isTabVisible = true;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 5;
    this.restartDelay = 100;
    this.activityTimeout = 30000; // 30 seconds of silence before auto-pause
    
    // Voice command patterns
    this.punctuationCommands = {
      'comma': ',',
      'period': '.',
      'question mark': '?',
      'exclamation point': '!',
      'exclamation mark': '!',
      'semicolon': ';',
      'colon': ':',
      'quotation mark': '"',
      'quote': '"',
      'apostrophe': "'",
      'dash': '-',
      'hyphen': '-',
      'parentheses open': '(',
      'parentheses close': ')',
      'open parentheses': '(',
      'close parentheses': ')',
      'bracket open': '[',
      'bracket close': ']'
    };
    
    this.navigationCommands = {
      'new line': '\n',
      'new paragraph': '\n\n',
      'tab': '\t',
      'space': ' '
    };
    
    this.textReplacements = {
      'btw': 'by the way',
      'fyi': 'for your information',
      'asap': 'as soon as possible',
      'etc': 'et cetera',
      'vs': 'versus',
      'eg': 'for example',
      'ie': 'that is'
    };
    
    // Supported languages
    this.languages = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-PT': 'Portuguese',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Mandarin)'
    };
    
    this.init();
  }

  async init() {
    this.loadSettings();
    
    if (!this.checkBrowserSupport()) {
      this.hideWidget();
      return;
    }

    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupVisibilityTracking();
    this.setupActivityMonitoring();
    this.createSettingsPanel();
    
    // Load Whisper model for hybrid mode
    if (this.settings.hybridMode) {
      this.loadWhisperModel();
    }
    
    console.log('Advanced speech widget with hybrid AI recognition initialized');
  }

  // ==============================
  // HYBRID AI RECOGNITION SYSTEM
  // ==============================

  async loadWhisperModel() {
    try {
      this.showMessage('Loading AI model for enhanced accuracy...', 'info');
      
      // Wait for transformers to be available
      const { pipeline } = await window.transformersPromise;
      
      // Load Whisper model (using tiny for speed, you can use base for better accuracy)
      this.whisperModel = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      
      this.isWhisperLoaded = true;
      this.showMessage('AI enhancement ready!', 'info');
      console.log('Whisper model loaded successfully');
      
    } catch (error) {
      console.warn('Failed to load Whisper model:', error);
      this.showMessage('AI enhancement unavailable, using standard recognition', 'warning');
      this.isWhisperLoaded = false;
    }
  }

  async startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Record in 2-second chunks for real-time processing
      this.mediaRecorder.start(2000);
      
    } catch (error) {
      console.warn('Failed to start audio recording:', error);
    }
  }

  async enhanceWithWhisper(webSpeechText, alternatives) {
    if (!this.isWhisperLoaded || this.audioChunks.length === 0) {
      this.processFinalTranscript(webSpeechText);
      return;
    }

    try {
      // Get recent audio chunks (last 5 seconds)
      const recentChunks = this.audioChunks.slice(-3);
      const audioBlob = new Blob(recentChunks, { type: 'audio/webm' });
      
      // Convert to format Whisper can process
      const audioBuffer = await this.audioToBuffer(audioBlob);
      
      // Process with Whisper
      const whisperResult = await this.whisperModel(audioBuffer);
      
      if (whisperResult && whisperResult.text) {
        // Compare results and choose the best one
        const enhancedText = this.chooseBestTranscript(webSpeechText, whisperResult.text, alternatives);
        this.processFinalTranscript(enhancedText);
        this.addToHistory(enhancedText, 'hybrid', 0.9);
        
        if (enhancedText !== webSpeechText) {
          this.showMessage('Enhanced with AI', 'info');
        }
      } else {
        // Fallback to original
        this.processFinalTranscript(webSpeechText);
        this.addToHistory(webSpeechText, 'webspeech', 0.6);
      }
      
    } catch (error) {
      console.warn('Whisper enhancement failed:', error);
      this.processFinalTranscript(webSpeechText);
      this.addToHistory(webSpeechText, 'webspeech', 0.6);
    }
  }

  async processAudioWithWhisper() {
    if (!this.isWhisperLoaded || this.audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const audioBuffer = await this.audioToBuffer(audioBlob);
      
      const result = await this.whisperModel(audioBuffer);
      
      if (result && result.text && result.text.trim()) {
        this.processFinalTranscript(result.text);
        this.addToHistory(result.text, 'whisper', 1.0);
        this.showMessage('Processed with AI backup', 'info');
      }
      
    } catch (error) {
      console.warn('Whisper processing failed:', error);
    }
  }

  async audioToBuffer(audioBlob) {
    // Convert audio blob to AudioBuffer for Whisper
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to Float32Array (Whisper expects this format)
      const float32Array = audioBuffer.getChannelData(0);
      
      return float32Array;
    } catch (error) {
      // If decoding fails, return the raw array buffer
      return new Float32Array(arrayBuffer);
    }
  }

  chooseBestTranscript(webSpeechText, whisperText, alternatives = []) {
    // Clean both texts for comparison
    const cleanWebSpeech = webSpeechText.trim().toLowerCase();
    const cleanWhisper = whisperText.trim().toLowerCase();
    
    // If they're very similar, prefer Web Speech (faster)
    const similarity = this.calculateSimilarity(cleanWebSpeech, cleanWhisper);
    if (similarity > 0.8) {
      return webSpeechText;
    }
    
    // Check word count - prefer more complete transcripts
    const webSpeechWords = cleanWebSpeech.split(/\s+/).length;
    const whisperWords = cleanWhisper.split(/\s+/).length;
    
    if (whisperWords > webSpeechWords * 1.3) {
      return whisperText;
    }
    
    // Check for medical terms (customize for your domain)
    const medicalTerms = [
      'pain', 'symptom', 'diagnosis', 'treatment', 'medication', 'patient',
      'fever', 'nausea', 'headache', 'abdomen', 'chest', 'breathing', 'throat',
      'stomach', 'back', 'joint', 'muscle', 'fatigue', 'dizziness', 'rash'
    ];
    
    const whisperMedicalCount = this.countMedicalTerms(cleanWhisper, medicalTerms);
    const webSpeechMedicalCount = this.countMedicalTerms(cleanWebSpeech, medicalTerms);
    
    if (whisperMedicalCount > webSpeechMedicalCount) {
      return whisperText;
    }
    
    // Check alternatives from Web Speech API
    const bestAlternative = alternatives.find(alt => 
      alt.confidence > 0.8 && alt.transcript.trim().length > webSpeechText.length
    );
    
    if (bestAlternative) {
      return bestAlternative.transcript;
    }
    
    return webSpeechText; // Default to original
  }

  calculateSimilarity(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  countMedicalTerms(text, terms) {
    return terms.filter(term => text.includes(term)).length;
  }

  addToHistory(text, source, confidence) {
    this.transcriptHistory.push({
      text: text,
      source: source,
      confidence: confidence,
      timestamp: new Date().toISOString()
    });
  }

  // ==============================
  // CORE FUNCTIONALITY (EXISTING)
  // ==============================

  loadSettings() {
    try {
      const saved = localStorage.getItem('speechWidgetSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('speechWidgetSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  checkBrowserSupport() {
    const hasAPI = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    const isSecure = location.protocol === 'https:' || 
                    location.hostname === 'localhost' || 
                    location.hostname === '127.0.0.1';

    if (!hasAPI) {
      this.showMessage('Speech Recognition API not supported in this browser', 'error');
      return false;
    }

    if (!isSecure) {
      this.showMessage('Speech recognition requires HTTPS', 'error');
      return false;
    }

    return true;
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Optimized settings for continuous professional use
    this.recognition.continuous = this.settings.continuousMode;
    this.recognition.interimResults = true;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = 3; // Get alternatives for confidence comparison

    this.setupRecognitionEvents();
  }

  setupRecognitionEvents() {
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening = true;
      this.restartAttempts = 0;
      this.updateLastActivity();
      this.updateUI();
      
      // Start audio recording for Whisper backup
      if (this.isWhisperLoaded && this.settings.hybridMode) {
        this.startAudioRecording();
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Stop audio recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      
      if (this.isListening && this.settings.continuousMode && this.isTabVisible) {
        // Auto-restart for continuous mode with exponential backoff
        const delay = Math.min(this.restartDelay * Math.pow(2, this.restartAttempts), 5000);
        
        setTimeout(() => {
          if (this.isListening && this.restartAttempts < this.maxRestartAttempts) {
            this.restartAttempts++;
            this.startRecognition();
          } else if (this.restartAttempts >= this.maxRestartAttempts) {
            console.warn('Max restart attempts reached, stopping');
            this.stopListening();
            this.showMessage('Speech recognition stopped due to repeated interruptions', 'warning');
          }
        }, delay);
      } else {
        this.isListening = false;
        this.updateUI();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
      
      // Try Whisper backup on network errors
      if (event.error === 'network' && this.isWhisperLoaded && this.audioChunks.length > 0) {
        this.showMessage('Network issue - using AI backup...', 'warning');
        this.processAudioWithWhisper();
      }
    };

    this.recognition.onresult = (event) => {
      this.updateLastActivity();
      this.processWebSpeechResults(event);
    };
  }

  processWebSpeechResults(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    let maxConfidence = 0;
    let alternatives = [];
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 1;
      
      // Collect alternatives for comparison
      for (let j = 0; j < result.length; j++) {
        alternatives.push({
          transcript: result[j].transcript,
          confidence: result[j].confidence || 1
        });
      }
      
      maxConfidence = Math.max(maxConfidence, confidence);
      
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Handle final results
    if (finalTranscript) {
      // If confidence is low and Whisper is available, enhance with AI
      if (maxConfidence < this.confidenceThreshold && this.isWhisperLoaded && this.settings.hybridMode) {
        this.enhanceWithWhisper(finalTranscript, alternatives);
      } else {
        this.processFinalTranscript(finalTranscript);
        this.addToHistory(finalTranscript, 'webspeech', maxConfidence);
      }
    }
    
    // Update interim display
    this.interimTranscript = interimTranscript;
    this.updateStatusDisplay();
  }

  handleRecognitionError(error) {
    switch (error) {
      case 'not-allowed':
        this.isListening = false;
        this.showMessage('Microphone access denied', 'error');
        break;
      case 'no-speech':
        // Don't treat no-speech as a fatal error in continuous mode
        console.log('No speech detected, continuing...');
        break;
      case 'audio-capture':
        this.isListening = false;
        this.showMessage('No microphone found', 'error');
        break;
      case 'network':
        if (!this.isWhisperLoaded) {
          this.showMessage('Network error - check connection', 'warning');
        }
        break;
      case 'aborted':
        // Recognition was manually stopped, don't restart
        this.isListening = false;
        break;
      default:
        console.warn('Recognition error:', error);
    }
    
    if (['not-allowed', 'audio-capture'].includes(error)) {
      this.stopListening();
    }
  }

  processFinalTranscript(text) {
    // Save state for undo
    this.saveUndoState();
    
    // Process voice commands first
    const processedText = this.processVoiceCommands(text);
    
    if (processedText !== null) {
      // Apply text processing
      const finalText = this.processText(processedText);
      
      if (finalText) {
        this.insertText(finalText);
      }
    }
  }

  processVoiceCommands(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Editing commands
    if (lowerText === 'delete' || lowerText === 'backspace') {
      this.deleteLastCharacter();
      return null;
    }
    
    if (lowerText === 'delete last word' || lowerText === 'delete word') {
      this.deleteLastWord();
      return null;
    }
    
    if (lowerText === 'delete sentence') {
      this.deleteLastSentence();
      return null;
    }
    
    if (lowerText === 'undo') {
      this.undo();
      return null;
    }
    
    if (lowerText === 'redo') {
      this.redo();
      return null;
    }
    
    if (lowerText === 'select all') {
      this.selectAll();
      return null;
    }
    
    // Capitalization commands
    if (lowerText === 'caps on') {
      this.capsMode = 'caps';
      this.showMessage('Capitalization ON', 'info');
      return null;
    }
    
    if (lowerText === 'caps off' || lowerText === 'no caps') {
      this.capsMode = 'nocaps';
      this.showMessage('Capitalization OFF', 'info');
      return null;
    }
    
    if (lowerText === 'all caps') {
      this.capsMode = 'allcaps';
      this.showMessage('ALL CAPS MODE', 'info');
      return null;
    }
    
    if (lowerText === 'normal caps') {
      this.capsMode = 'normal';
      this.showMessage('Normal capitalization', 'info');
      return null;
    }
    
    // Process punctuation and navigation commands
    let processedText = text;
    
    // Replace punctuation commands
    for (const [command, punctuation] of Object.entries(this.punctuationCommands)) {
      const regex = new RegExp(`\\b${command}\\b`, 'gi');
      processedText = processedText.replace(regex, punctuation);
    }
    
    // Replace navigation commands
    for (const [command, nav] of Object.entries(this.navigationCommands)) {
      const regex = new RegExp(`\\b${command}\\b`, 'gi');
      processedText = processedText.replace(regex, nav);
    }
    
    return processedText;
  }

  processText(text) {
    let processed = text;
    
    // Apply text replacements
    for (const [abbrev, full] of Object.entries(this.textReplacements)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      processed = processed.replace(regex, full);
    }
    
    // Format emails
    processed = processed.replace(/(\w+)\s+at\s+(\w+)\s+dot\s+(\w+)/gi, '$1@$2.$3');
    
    // Format URLs
    processed = processed.replace(/w{3}\s+dot\s+(\w+)\s+dot\s+(\w+)/gi, 'www.$1.$2');
    processed = processed.replace(/(\w+)\s+dot\s+(\w+)/gi, '$1.$2');
    
    // Format phone numbers (basic pattern)
    processed = processed.replace(/(\d{3})\s+(\d{3})\s+(\d{4})/g, '$1-$2-$3');
    
    // Apply capitalization mode
    processed = this.applyCapitalization(processed);
    
    // Auto-punctuation
    if (this.settings.autoPunctuation) {
      processed = this.addAutoPunctuation(processed);
    }
    
    return processed;
  }

  applyCapitalization(text) {
    switch (this.capsMode) {
      case 'caps':
        return this.capitalizeFirst(text);
      case 'allcaps':
        return text.toUpperCase();
      case 'nocaps':
        return text.toLowerCase();
      default:
        return this.settings.autoCapitalization ? this.smartCapitalize(text) : text;
    }
  }

  capitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  smartCapitalize(text) {
    // Capitalize first word and after sentence endings
    return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, punct, letter) => {
      return punct + letter.toUpperCase();
    });
  }

  addAutoPunctuation(text) {
    // Simple sentence detection - look for subject + verb patterns
    const hasSubjectVerb = /\b(I|you|he|she|it|we|they|this|that)\s+\w+/i.test(text);
    
    if (hasSubjectVerb && !text.match(/[.!?]$/)) {
      return text + '.';
    }
    
    return text;
  }

  // ==============================
  // EDITING FUNCTIONS
  // ==============================

  deleteLastCharacter() {
    if (!this.currentTarget) return;
    
    const target = this.currentTarget;
    if (target.value && target.value.length > 0) {
      const start = target.selectionStart || target.value.length;
      const end = target.selectionEnd || start;
      
      if (start === end && start > 0) {
        target.value = target.value.slice(0, start - 1) + target.value.slice(start);
        target.setSelectionRange(start - 1, start - 1);
      } else {
        target.value = target.value.slice(0, start) + target.value.slice(end);
        target.setSelectionRange(start, start);
      }
      
      this.triggerInputEvents(target);
    }
  }

  deleteLastWord() {
    if (!this.currentTarget) return;
    
    const target = this.currentTarget;
    const start = target.selectionStart || 0;
    const beforeCursor = target.value.slice(0, start);
    const afterCursor = target.value.slice(start);
    
    // Find last word boundary
    const wordMatch = beforeCursor.match(/\s*\S+\s*$/);
    if (wordMatch) {
      const newStart = start - wordMatch[0].length;
      target.value = target.value.slice(0, newStart) + afterCursor;
      target.setSelectionRange(newStart, newStart);
      this.triggerInputEvents(target);
    }
  }

  deleteLastSentence() {
    if (!this.currentTarget) return;
    
    const target = this.currentTarget;
    const start = target.selectionStart || 0;
    const beforeCursor = target.value.slice(0, start);
    const afterCursor = target.value.slice(start);
    
    // Find last sentence boundary
    const sentenceMatch = beforeCursor.match(/[.!?]\s*[^.!?]*$/);
    if (sentenceMatch) {
      const newStart = start - sentenceMatch[0].length + 1; // Keep the punctuation
      target.value = target.value.slice(0, newStart) + afterCursor;
      target.setSelectionRange(newStart, newStart);
      this.triggerInputEvents(target);
    }
  }

  selectAll() {
    if (this.currentTarget) {
      this.currentTarget.select();
    }
  }

  // ==============================
  // UNDO/REDO SYSTEM
  // ==============================

  saveUndoState() {
    if (!this.currentTarget) return;
    
    const state = {
      target: this.currentTarget,
      value: this.currentTarget.value,
      selectionStart: this.currentTarget.selectionStart,
      selectionEnd: this.currentTarget.selectionEnd,
      timestamp: Date.now()
    };
    
    this.undoStack.push(state);
    
    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoLevels) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    
    // Save current state to redo stack
    if (this.currentTarget) {
      this.redoStack.push({
        target: this.currentTarget,
        value: this.currentTarget.value,
        selectionStart: this.currentTarget.selectionStart,
        selectionEnd: this.currentTarget.selectionEnd,
        timestamp: Date.now()
      });
    }
    
    const state = this.undoStack.pop();
    if (state && state.target) {
      state.target.value = state.value;
      state.target.setSelectionRange(state.selectionStart, state.selectionEnd);
      this.triggerInputEvents(state.target);
      this.showMessage('Undone', 'info');
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    const state = this.redoStack.pop();
    if (state && state.target) {
      state.target.value = state.value;
      state.target.setSelectionRange(state.selectionStart, state.selectionEnd);
      this.triggerInputEvents(state.target);
      this.showMessage('Redone', 'info');
    }
  }

  // ==============================
  // EVENT HANDLING AND UI
  // ==============================

  setupEventListeners() {
    const button = document.getElementById('speechBtn');
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.settings.pushToTalk) {
          this.showMessage('Push-to-talk enabled. Hold Ctrl+Space to dictate.', 'info');
        } else {
          this.toggleListening();
        }
      });

      // Long press for settings
      let longPressTimer;
      button.addEventListener('mousedown', () => {
        longPressTimer = setTimeout(() => {
          this.showSettings();
        }, 1000);
      });
      
      button.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
      });
      
      button.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
      });
    }

    // Enhanced input tracking
    document.addEventListener('focusin', (e) => {
      if (this.isInputElement(e.target)) {
        this.setCurrentTarget(e.target);
      }
    });

    document.addEventListener('click', (e) => {
      if (this.isInputElement(e.target)) {
        this.setCurrentTarget(e.target);
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+V to toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        this.toggleListening();
      }
      
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        if (this.currentTarget && this.isInputElement(this.currentTarget)) {
          e.preventDefault();
          this.undo();
        }
      }
      
      // Ctrl+Y for redo
      if (e.ctrlKey && e.key === 'y') {
        if (this.currentTarget && this.isInputElement(this.currentTarget)) {
          e.preventDefault();
          this.redo();
        }
      }
      
      // Escape to stop
      if (e.key === 'Escape' && this.isListening) {
        this.stopListening();
      }
      
      // Push-to-talk with Ctrl+Space
      if (this.settings.pushToTalk && e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (!this.isPushToTalk) {
          this.isPushToTalk = true;
          this.startListening();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      // Release push-to-talk
      if (this.settings.pushToTalk && this.isPushToTalk && (!e.ctrlKey || e.code === 'Space')) {
        this.isPushToTalk = false;
        this.stopListening();
      }
    });
  }

  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
      
      if (!this.isTabVisible && this.isListening) {
        this.pauseForInactivity();
      }
    });
  }

  setupActivityMonitoring() {
    // Monitor for periods of inactivity
    setInterval(() => {
      if (this.isListening && (Date.now() - this.lastActivity) > this.activityTimeout) {
        console.log('Auto-pausing due to inactivity');
        this.pauseForInactivity();
      }
    }, 5000);
  }

  createSettingsPanel() {
    // Create settings panel HTML and inject it
    const settingsHTML = `
      <div id="speechSettings" class="speech-settings-panel" style="display: none;">
        <div class="settings-header">
          <h3>Speech Settings</h3>
          <button class="close-settings" onclick="window.advancedSpeechWidget.hideSettings()">&times;</button>
        </div>
        <div class="settings-content">
          <div class="setting-group">
            <label for="speechLanguage">Language:</label>
            <select id="speechLanguage">
              ${Object.entries(this.languages).map(([code, name]) => 
                `<option value="${code}" ${code === this.settings.language ? 'selected' : ''}>${name}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="setting-group">
            <label for="speechTimeout">Timeout (seconds):</label>
            <input type="range" id="speechTimeout" min="5" max="60" value="${this.settings.timeout}">
            <span id="timeoutValue">${this.settings.timeout}s</span>
          </div>
          
          <div class="setting-group">
            <label for="confidenceThreshold">Confidence Threshold:</label>
            <input type="range" id="confidenceThreshold" min="0.3" max="1" step="0.1" value="${this.settings.confidenceThreshold}">
            <span id="confidenceValue">${Math.round(this.settings.confidenceThreshold * 100)}%</span>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="autoPunctuation" ${this.settings.autoPunctuation ? 'checked' : ''}>
              Auto-punctuation
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="autoCapitalization" ${this.settings.autoCapitalization ? 'checked' : ''}>
              Auto-capitalization
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="pushToTalk" ${this.settings.pushToTalk ? 'checked' : ''}>
              Push-to-talk mode (Ctrl+Space)
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" id="hybridMode" ${this.settings.hybridMode ? 'checked' : ''}>
              AI Enhancement (Whisper)
            </label>
          </div>
          
          <div class="setting-actions">
            <button onclick="window.advancedSpeechWidget.saveTranscript()">Save Transcript</button>
            <button onclick="window.advancedSpeechWidget.clearHistory()">Clear History</button>
            <div class="transcript-count">Transcripts: ${this.transcriptHistory.length}</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', settingsHTML);
    this.setupSettingsEvents();
  }

  setupSettingsEvents() {
    const elements = {
      language: document.getElementById('speechLanguage'),
      timeout: document.getElementById('speechTimeout'),
      confidence: document.getElementById('confidenceThreshold'),
      autoPunctuation: document.getElementById('autoPunctuation'),
      autoCapitalization: document.getElementById('autoCapitalization'),
      pushToTalk: document.getElementById('pushToTalk'),
      hybridMode: document.getElementById('hybridMode')
    };

    if (elements.language) {
      elements.language.addEventListener('change', (e) => {
        this.settings.language = e.target.value;
        if (this.recognition) {
          this.recognition.lang = this.settings.language;
        }
        this.saveSettings();
      });
    }

    if (elements.timeout) {
      elements.timeout.addEventListener('input', (e) => {
        this.settings.timeout = parseInt(e.target.value);
        document.getElementById('timeoutValue').textContent = `${this.settings.timeout}s`;
        this.saveSettings();
      });
    }

    if (elements.confidence) {
      elements.confidence.addEventListener('input', (e) => {
        this.settings.confidenceThreshold = parseFloat(e.target.value);
        document.getElementById('confidenceValue').textContent = `${Math.round(this.settings.confidenceThreshold * 100)}%`;
        this.saveSettings();
      });
    }

    if (elements.hybridMode) {
      elements.hybridMode.addEventListener('change', (e) => {
        this.settings.hybridMode = e.target.checked;
        if (this.settings.hybridMode && !this.isWhisperLoaded) {
          this.loadWhisperModel();
        }
        this.saveSettings();
      });
    }

    Object.entries(elements).forEach(([key, element]) => {
      if (element && element.type === 'checkbox') {
        element.addEventListener('change', (e) => {
          this.settings[key] = e.target.checked;
          this.saveSettings();
        });
      }
    });
  }

  // ==============================
  // CORE FUNCTIONALITY
  // ==============================

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

  setCurrentTarget(element) {
    this.currentTarget = element;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // Visual feedback for target selection
    this.highlightTarget(element);
    
    console.log('Target set:', element.tagName, element.id || element.className);
  }

  highlightTarget(element) {
    // Remove previous highlights
    document.querySelectorAll('.speech-target').forEach(el => {
      el.classList.remove('speech-target');
    });
    
    // Add highlight to current target
    element.classList.add('speech-target');
    
    // Remove highlight after a short delay
    setTimeout(() => {
      element.classList.remove('speech-target');
    }, 2000);
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
      this.showMessage('Speech recognition not available', 'error');
      return;
    }

    // Auto-select target if none selected
    if (!this.currentTarget) {
      const target = this.findBestTarget();
      if (target) {
        this.setCurrentTarget(target);
      } else {
        this.showMessage('Please click on a text field first', 'warning');
        return;
      }
    }

    this.isListening = true;
    this.restartAttempts = 0;
    this.startRecognition();
  }

  startRecognition() {
    try {
      this.recognition.start();
      this.updateUI();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.isListening = false;
      this.showMessage('Failed to start speech recognition', 'error');
    }
  }

  stopListening() {
    this.isListening = false;
    this.isPushToTalk = false;
    this.restartAttempts = this.maxRestartAttempts; // Prevent auto-restart
    
    if (this.recognition) {
      this.recognition.stop();
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.updateUI();
    console.log('Speech recognition stopped manually');
  }

  pauseForInactivity() {
    if (this.recognition) {
      this.recognition.stop();
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.isListening = false;
    this.updateUI();
    this.showMessage('Paused due to inactivity. Click to resume.', 'info');
  }

  findBestTarget() {
    // Prioritize focused element
    const focused = document.activeElement;
    if (this.isInputElement(focused)) {
      return focused;
    }

    // Find first visible text input
    const inputs = document.querySelectorAll('textarea, input[type="text"]');
    for (const input of inputs) {
      const rect = input.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return input;
      }
    }

    return null;
  }

  insertText(text) {
    if (!this.currentTarget || !text.trim()) return;
    
    const target = this.currentTarget;
    const cleanText = this.cleanText(text);
    
    try {
      if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input') {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || start;
        const before = target.value.substring(0, start);
        const after = target.value.substring(end);
        
        // Smart spacing - add space if needed
        const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !cleanText.startsWith(' ') && !cleanText.match(/^[,.!?;:]/);
        const textToInsert = (needsSpaceBefore ? ' ' : '') + cleanText;
        
        target.value = before + textToInsert + after;
        
        const newPosition = start + textToInsert.length;
        target.setSelectionRange(newPosition, newPosition);
        
        // Trigger events for form validation
        this.triggerInputEvents(target);
        
        // Visual feedback
        this.flashTarget(target);
      }
      
      target.focus();
      
    } catch (error) {
      console.error('Error inserting text:', error);
    }
  }

  cleanText(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(um|uh|er)\s+/i, '') // Remove filler words at start
      .replace(/\s+(um|uh|er)(\s+|$)/gi, ' '); // Remove filler words elsewhere
  }

  flashTarget(element) {
    element.classList.add('speech-insert');
    setTimeout(() => {
      element.classList.remove('speech-insert');
    }, 300);
  }

  triggerInputEvents(target) {
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  updateLastActivity() {
    this.lastActivity = Date.now();
  }

  updateUI() {
    const button = document.getElementById('speechBtn');
    const status = document.getElementById('speechStatus');
    
    if (button) {
      if (this.isListening) {
        button.classList.add('listening');
        button.setAttribute('aria-label', 'Stop dictation (Ctrl+Shift+V)');
        button.title = 'Stop dictation (Ctrl+Shift+V or Escape)';
      } else {
        button.classList.remove('listening');
        button.setAttribute('aria-label', 'Start dictation (Ctrl+Shift+V)');
        button.title = 'Start continuous dictation (Ctrl+Shift+V)';
      }
    }
    
    this.updateStatusDisplay();
  }

  updateStatusDisplay() {
    const status = document.getElementById('speechStatus');
    if (!status) return;
    
    if (this.isListening) {
      if (this.interimTranscript) {
        const sourceInfo = this.isWhisperLoaded && this.settings.hybridMode ? ' (AI Enhanced)' : '';
        status.textContent = `"${this.interimTranscript}"${sourceInfo}`;
      } else {
        const modeInfo = this.isWhisperLoaded && this.settings.hybridMode ? 'AI-Enhanced ' : '';
        status.textContent = `${modeInfo}Listening...`;
      }
      status.classList.add('active');
    } else {
      if (this.settings.pushToTalk) {
        status.textContent = 'Hold Ctrl+Space to talk';
      } else {
        const enhancementInfo = this.isWhisperLoaded ? ' (AI Enhanced)' : '';
        status.textContent = `Click to start dictation${enhancementInfo}`;
      }
      status.classList.remove('active');
    }
  }

  showMessage(message, type = 'info') {
    const status = document.getElementById('speechStatus');
    if (status) {
      status.textContent = message;
      status.className = `speech-status ${type}`;
      
      setTimeout(() => {
        status.className = 'speech-status';
        this.updateStatusDisplay();
      }, 3000);
    }
    
    console.log(`Speech Widget ${type}:`, message);
  }

  showSettings() {
    const panel = document.getElementById('speechSettings');
    if (panel) {
      panel.style.display = 'block';
      
      // Update transcript count
      const countElement = panel.querySelector('.transcript-count');
      if (countElement) {
        countElement.textContent = `Transcripts: ${this.transcriptHistory.length}`;
      }
    }
  }

  hideSettings() {
    const panel = document.getElementById('speechSettings');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  saveTranscript() {
    if (this.transcriptHistory.length === 0) {
      this.showMessage('No transcripts to save', 'warning');
      return;
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `speech-transcript-${timestamp}.txt`;
    
    const content = this.transcriptHistory.map(entry => {
      const sourceLabel = entry.source === 'hybrid' ? '[AI Enhanced]' : 
                         entry.source === 'whisper' ? '[AI Only]' : '[Standard]';
      return `[${new Date(entry.timestamp).toLocaleString()}] ${sourceLabel} ${entry.text}`;
    }).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showMessage(`Transcript saved as ${filename}`, 'info');
  }

  clearHistory() {
    if (confirm('Clear all transcript history? This cannot be undone.')) {
      this.transcriptHistory = [];
      this.undoStack = [];
      this.redoStack = [];
      
      // Update transcript count in settings
      const countElement = document.querySelector('.transcript-count');
      if (countElement) {
        countElement.textContent = 'Transcripts: 0';
      }
      
      this.showMessage('History cleared', 'info');
    }
  }

  hideWidget() {
    const widget = document.getElementById('speechWidget');
    if (widget) {
      widget.style.display = 'none';
    }
  }

  // ==============================
  // PUBLIC API METHODS
  // ==============================

  setLanguage(lang) {
    if (this.languages[lang]) {
      this.settings.language = lang;
      if (this.recognition) {
        this.recognition.lang = lang;
      }
      this.saveSettings();
      this.showMessage(`Language set to ${this.languages[lang]}`, 'info');
    }
  }

  setTimeout(seconds) {
    if (seconds >= 5 && seconds <= 60) {
      this.settings.timeout = seconds;
      this.saveSettings();
      this.showMessage(`Timeout set to ${seconds} seconds`, 'info');
    }
  }

  setConfidenceThreshold(threshold) {
    if (threshold >= 0.3 && threshold <= 1) {
      this.settings.confidenceThreshold = threshold;
      this.saveSettings();
      this.showMessage(`Confidence threshold set to ${Math.round(threshold * 100)}%`, 'info');
    }
  }

  getStatus() {
    return {
      isListening: this.isListening,
      language: this.settings.language,
      hybridMode: this.settings.hybridMode,
      whisperLoaded: this.isWhisperLoaded,
      currentTarget: this.currentTarget ? {
        tag: this.currentTarget.tagName,
        id: this.currentTarget.id,
        value: this.currentTarget.value.substring(0, 50) + '...'
      } : null,
      settings: this.settings,
      transcriptCount: this.transcriptHistory.length,
      undoLevels: this.undoStack.length,
      capsMode: this.capsMode
    };
  }

  destroy() {
    this.stopListening();
    
    // Remove settings panel
    const panel = document.getElementById('speechSettings');
    if (panel) {
      panel.remove();
    }
  }
}

// ==============================
// INITIALIZATION
// ==============================

// Initialize the complete hybrid speech widget
document.addEventListener('DOMContentLoaded', function() {
  if (window.advancedSpeechWidget) {
    console.log('Advanced speech widget already initialized');
    return;
  }

  try {
    window.advancedSpeechWidget = new AdvancedSpeechWidget();
    
    // Add global controls for easy access
    window.speechControl = {
      start: () => window.advancedSpeechWidget.startListening(),
      stop: () => window.advancedSpeechWidget.stopListening(),
      toggle: () => window.advancedSpeechWidget.toggleListening(),
      status: () => window.advancedSpeechWidget.getStatus(),
      setLanguage: (lang) => window.advancedSpeechWidget.setLanguage(lang),
      setTimeout: (sec) => window.advancedSpeechWidget.setTimeout(sec),
      setConfidence: (threshold) => window.advancedSpeechWidget.setConfidenceThreshold(threshold),
      undo: () => window.advancedSpeechWidget.undo(),
      redo: () => window.advancedSpeechWidget.redo(),
      saveTranscript: () => window.advancedSpeechWidget.saveTranscript(),
      clearHistory: () => window.advancedSpeechWidget.clearHistory(),
      showSettings: () => window.advancedSpeechWidget.showSettings()
    };
    
    console.log('🎤 Complete Hybrid Speech Widget initialized successfully!');
    console.log('🤖 AI enhancement will load automatically');
    console.log('💡 Voice Commands Available:');
    console.log('   • Punctuation: "comma", "period", "question mark", etc.');
    console.log('   • Navigation: "new line", "new paragraph", "tab"');
    console.log('   • Editing: "delete", "delete last word", "undo", "select all"');
    console.log('   • Caps: "caps on", "caps off", "all caps", "normal caps"');
    console.log('⌨️ Keyboard Shortcuts:');
    console.log('   • Ctrl+Shift+V: Toggle dictation');
    console.log('   • Ctrl+Space (hold): Push-to-talk mode');
    console.log('   • Ctrl+Z: Undo');
    console.log('   • Escape: Stop listening');
    console.log('🔧 Use speechControl object for programmatic control');
    
  } catch (error) {
    console.error('Failed to initialize hybrid speech widget:', error);
  }
});
