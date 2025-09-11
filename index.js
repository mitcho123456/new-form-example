// ==============================
// Enhanced index.js with Natural Language Support
// ==============================

// Collapse/expand cards
window.toggleCard = function(header) {
  header.parentElement.classList.toggle('collapsed');
}

// ---------- Utility functions ----------
function capitalizeAndAddFullStop(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');
}

function hasText(s) { 
  return !!(s && String(s).trim().length); 
}

// ENHANCED: Now handles data-natural attributes
function getSmartLabel(el) {
  // Special handling for Expectations field
  if (el.id === 'Expectations') {
    return 'Expectations from consultation';
  }
  
  // NEW: Check for data-natural attribute first for natural language output
  if (el.dataset && el.dataset.natural && hasText(el.dataset.natural)) {
    return el.dataset.natural.trim();
  }
  
  if (el.dataset && el.dataset.label && hasText(el.dataset.label)) return el.dataset.label.trim();
  
  // label[for]
  if (el.id) {
    const lab = document.querySelector(`label[for="${el.id}"]`);
    if (lab && hasText(lab.textContent)) return lab.textContent.trim();
  }
  
  // nearest form-group > label
  const fg = el.closest('.form-group');
  if (fg) {
    const lab = fg.querySelector('label');
    if (lab && hasText(lab.textContent)) return lab.textContent.trim();
  }
  
  // aria-label / placeholder
  if (el.getAttribute && hasText(el.getAttribute('aria-label'))) return el.getAttribute('aria-label').trim();
  if (el.placeholder && hasText(el.placeholder)) return el.placeholder.trim();
  
  // fallbacks
  if (el.id) return el.id;
  if (el.name) return el.name;
  return 'Field';
}

function getSmartValue(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return el.value || '';
  if (tag === 'input') {
    const type = (el.type || '').toLowerCase();
    if (['text','number','date','time','email','tel','url'].includes(type)) return el.value || '';
    return '';
  }
  if (tag === 'select') {
    if (el.multiple) {
      const vals = Array.from(el.selectedOptions).map(o => o.textContent.trim()).filter(Boolean);
      return vals.join(', ');
    }
    const opt = el.selectedOptions && el.selectedOptions[0];
    return opt ? opt.textContent.trim() : (el.value || '');
  }
  if (el.isContentEditable) {
    return el.textContent || '';
  }
  return '';
}

// ================
// OUTPUT GENERATION (Enhanced with Natural Language)
// ================
async function generateOutput() {
  const modal = document.getElementById('outputModal');
  const modalText = document.getElementById('outputText');
  
  let lines = []; // Single array for all output lines
  
  // Process cards in order they appear in the form
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    // Get all form controls in this card
    const controls = card.querySelectorAll(`
      textarea,
      input[type="text"],
      input[type="number"],
      input[type="date"],
      input[type="time"],
      input[type="email"],
      input[type="tel"],
      input[type="url"],
      select,
      [contenteditable][data-field]
    `);
    
    // Process controls in the order they appear
    controls.forEach(ctrl => {
      if (ctrl.dataset && ctrl.dataset.skip === 'true') return;
      
      const val = getSmartValue(ctrl);
      if (!hasText(val)) return;
      
      const fieldLabel = getSmartLabel(ctrl);
      
      // NEW: Natural language formatting for data-natural elements
      if (ctrl.dataset && ctrl.dataset.natural) {
        lines.push(`${fieldLabel} - ${val.trim()}`);
      }
      // Special handling for Expectations field - always use label format
      else if (ctrl.id === 'Expectations') {
        lines.push(`${fieldLabel} - ${val.trim()}`);
      }
      // Format based on control type for other fields
      else if (ctrl.tagName.toLowerCase() === 'textarea' || ctrl.isContentEditable) {
        lines.push(capitalizeAndAddFullStop(val.trim()));
      } else {
        lines.push(`${fieldLabel} - ${val.trim()}`);
      }
    });
    
    // Process symptom toggles in this card
    const symptoms = processSymptomToggles(card);
    if (symptoms.length > 0) {
      lines.push(...symptoms);
    }
  });
  
  // Compose final text
  const outputText = lines.join('\n').trim();
  
  // Update modal content
  if (modalText) {
    modalText.value = outputText || 'No data to display.';
    // Make sure textarea is properly sized
    modalText.style.height = 'auto';
    modalText.style.height = modalText.scrollHeight + 'px';
  }
  
  // Show modal
  if (modal) {
    modal.style.display = 'flex';
  }
}

// ENHANCED: Process symptom toggles with natural language support for conditions and medications
function processSymptomToggles(card) {
  const results = [];
  const haveSymptoms = [];
  const dontHaveSymptoms = [];
  
  // Check if this is the Medical History card
  const isMedicalHistory = card.getAttribute('data-grid') === 'historyGrid';
  
  // Check if this card contains medication toggles
  const hasMedicationToggles = card.querySelector('.symptom-toggle.medications') !== null;
  
  // Collect all symptom toggles
  card.querySelectorAll('.symptom-toggle').forEach(toggle => {
    const symptomText = toggle.textContent.trim();
    if (toggle.classList.contains('have')) {
      haveSymptoms.push(symptomText);
    } else if (toggle.classList.contains('donthave')) {
      dontHaveSymptoms.push(symptomText);
    }
  });
  
  // Format "have" symptoms
  if (haveSymptoms.length > 0) {
    const formatted = formatSymptomList(haveSymptoms, 'positive', isMedicalHistory, hasMedicationToggles);
    results.push(formatted);
  }
  
  // Format "don't have" symptoms  
  if (dontHaveSymptoms.length > 0) {
    const formatted = formatSymptomList(dontHaveSymptoms, 'negative', isMedicalHistory, hasMedicationToggles);
    results.push(formatted);
  }
  
  return results;
}

// ENHANCED: Better formatting for conditions and medications
function formatSymptomList(symptoms, type, isMedicalHistory = false, isMedications = false) {
  // Enhanced medical terminology for more natural output
  const positiveStarters = [
    'Reports', 'Presents with', 'Experiencing', 'Complains of', 
    'Admits to', 'Describes', 'Notes', 'States has', 'Has', 
    'Positive for', 'Affirms', 'Acknowledges', 'Mentions'
  ];
  
  const positiveMedicationStarters = [
    'Has a history of using', 'Has used', 'Previously used', 'Has taken',
    'Reports using', 'Currently uses', 'Has been taking', 'Takes'
  ];
  
  const positiveHistoryStarters = [
    'Has a history of', 'Previous history of', 'Past medical history includes',
    'History significant for', 'Prior diagnosis of'
  ];
  
  const negativeStarters = [
    'Denies', 'Negative for', 'No', 'Does not have', 'Reports no',
    'Free of', 'Clear of', 'Does not complain of', 'Does not report',
    'No history of', 'Unremarkable for', 'Does not admit to', 'No symptoms of'
  ];
  
  const negativeMedicationStarters = [
    'Has not used', 'Denies using', 'No history of using', 'Has never taken',
    'Does not use', 'Free of', 'Has not taken', 'Never used'
  ];
  
  const negativeHistoryStarters = [
    'No history of', 'No prior history of', 'Denies history of',
    'No previous diagnosis of', 'Never had'
  ];
  
  // Intelligently select starter based on context
  let starter = '';
  if (isMedications) {
    // Special handling for medication-related symptoms
    if (type === 'positive') {
      starter = selectFromArray(positiveMedicationStarters);
    } else {
      starter = selectFromArray(negativeMedicationStarters);
    }
  } else if (isMedicalHistory) {
    // Special handling for medical history
    if (type === 'positive') {
      starter = selectFromArray(positiveHistoryStarters);
    } else {
      starter = selectFromArray(negativeHistoryStarters);
    }
  } else if (type === 'positive') {
    // Use different starters based on symptom type and count
    if (symptoms.some(s => s.toLowerCase().includes('pain') || s.toLowerCase().includes('ache'))) {
      starter = selectFromArray(['Complains of', 'Reports', 'Describes', 'Experiencing']);
    } else if (symptoms.length > 3) {
      starter = selectFromArray(['Presents with', 'Experiencing', 'Reports']);
    } else {
      starter = selectFromArray(positiveStarters);
    }
  } else {
    // Select negative starter based on context
    if (symptoms.length === 1) {
      starter = selectFromArray(['Denies', 'Negative for', 'No', 'Reports no']);
    } else {
      starter = selectFromArray(negativeStarters);
    }
  }
  
  // Clean up symptom names for better grammar
  const cleanedSymptoms = symptoms.map(s => {
    let cleaned = s.toLowerCase();
    
    // Handle special cases for negative phrasing
    if (type === 'negative' && !isMedicalHistory && !isMedications) {
      // Remove "Can't" or "Cannot" at the beginning for negative context
      cleaned = cleaned.replace(/^can't\s+/i, '').replace(/^cannot\s+/i, '');
      
      // Convert negative symptoms to positive form for "no" prefix
      if (cleaned.includes('can\'t pass')) {
        cleaned = cleaned.replace('can\'t pass', 'inability to pass');
      }
      if (cleaned === 'pass stool/gas') {
        cleaned = 'ability to pass stool or gas';
      }
      if (cleaned === 'pass stool') {
        cleaned = 'ability to pass stool';
      }
      if (cleaned === 'pass gas') {
        cleaned = 'ability to pass gas';
      }
    }
    
    return cleaned;
  });
  
  // Format the sentence based on the starter phrase
  const starterLower = starter.toLowerCase();
  
  // Handle different starter patterns
  if (starterLower === 'no' || starterLower === 'negative for' || starterLower === 'free of' || 
      starterLower === 'clear of' || starterLower === 'unremarkable for') {
    // These starters work directly with symptom list
    if (cleanedSymptoms.length === 1) {
      return `${starter} ${cleanedSymptoms[0]}.`;
    } else {
      const last = cleanedSymptoms.pop();
      if (type === 'negative') {
        return `${starter} ${cleanedSymptoms.join(', ')} or ${last}.`;
      } else {
        return `${starter} ${cleanedSymptoms.join(', ')} and ${last}.`;
      }
    }
  } else if (starterLower.includes('does not') || starterLower.includes('reports no') || 
             starterLower.includes('no history') || starterLower.includes('no prior') ||
             starterLower.includes('denies history') || starterLower.includes('never had') ||
             starterLower.includes('no previous') || starterLower.includes('no symptoms') ||
             starterLower.includes('has not used') || starterLower.includes('denies using') ||
             starterLower.includes('has never taken') || starterLower.includes('never used')) {
    // These need special handling
    if (cleanedSymptoms.length === 1) {
      return `${starter} ${cleanedSymptoms[0]}.`;
    } else {
      const last = cleanedSymptoms.pop();
      return `${starter} ${cleanedSymptoms.join(', ')} or ${last}.`;
    }
  } else if (starterLower.includes('history') || starterLower.includes('diagnosis') || 
             starterLower.includes('has used') || starterLower.includes('has taken') ||
             starterLower.includes('previously used') || starterLower.includes('currently uses')) {
    // History-specific starters and medication starters
    if (cleanedSymptoms.length === 1) {
      return `${starter} ${cleanedSymptoms[0]}.`;
    } else {
      const last = cleanedSymptoms.pop();
      return `${starter} ${cleanedSymptoms.join(', ')} and ${last}.`;
    }
  } else {
    // Standard format for most starters
    if (cleanedSymptoms.length === 1) {
      return `${starter} ${cleanedSymptoms[0]}.`;
    } else {
      const last = cleanedSymptoms.pop();
      const conjunction = (type === 'negative' && !starterLower.includes('denies')) ? 'or' : 
                          (type === 'negative' ? 'or' : 'and');
      return `${starter} ${cleanedSymptoms.join(', ')} ${conjunction} ${last}.`;
    }
  }
}

// Helper function to randomly select from array for variety
function selectFromArray(arr) {
  // Use a semi-random selection that considers position in output for variety
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

// Copy output function
async function copyOutput() {
  const modalText = document.getElementById('outputText');
  const text = modalText ? modalText.value.trim() : '';
  
  if (!text) {
    alert('Nothing to copy yet — please generate the report first.');
    return;
  }
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    alert('Report copied to clipboard.');
  } catch {
    alert('Copy failed. You can select the text and copy manually.');
  }
}

// Email output function
function emailOutput() {
  const modalText = document.getElementById('outputText');
  const text = modalText ? modalText.value.trim() : '';
  
  if (!text) {
    alert('Please generate the report before sending an email.');
    return;
  }
  
  const subject = encodeURIComponent('Medical symptom report');
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Close modal function
function closeOutput() {
  const modal = document.getElementById('outputModal');
  if (modal) modal.style.display = 'none';
}

// ===== Symptom toggle behavior =====
document.addEventListener('DOMContentLoaded', () => {
  // Tri-state pills behavior
  document.querySelectorAll('.symptom-toggle').forEach(pill => {
    pill.addEventListener('click', () => {
      cycleTriState(pill);
      updateCounters(pill.closest('.card'));
    });
    
    pill.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        pill.click();
      }
    });
    
    setAria(pill);
  });
  
  // Initialize counters
  document.querySelectorAll('.card').forEach(updateCounters);
  
  // Auto-resize textarea in modal
  const modalText = document.getElementById('outputText');
  if (modalText) {
    modalText.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }
});

function cycleTriState(el) {
  if (el.classList.contains('donthave')) {
    el.classList.remove('donthave');
    el.classList.add('have');
  } else if (el.classList.contains('have')) {
    el.classList.remove('have');
  } else {
    el.classList.add('donthave');
  }
  setAria(el);
}

function setAria(el) {
  const has = el.classList.contains('have');
  const not = el.classList.contains('donthave');
  let state = 'neutral';
  if (has) state = 'have';
  else if (not) state = 'dont-have';
  
  el.setAttribute('aria-pressed', has || not ? 'true' : 'false');
  el.setAttribute('data-state', state);
  el.setAttribute('role', 'button');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `${el.textContent.trim()} – ${state.replace('-', ' ')}`);
}

function updateCounters(card) {
  if (!card) return;
  const haveN = card.querySelectorAll('.symptom-toggle.have').length;
  const dontN = card.querySelectorAll('.symptom-toggle.donthave').length;
  const haveChip = card.querySelector('.state-chip.have');
  const dontChip = card.querySelector('.state-chip.donthave');
  
  if (haveChip) {
    haveChip.dataset.countHave = String(haveN);
    haveChip.textContent = `${haveN} have`;
  }
  if (dontChip) {
    dontChip.dataset.countNo = String(dontN);
    dontChip.textContent = `${dontN} don't`;
  }
}

// Instruction banners
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ux-instruction').forEach(b => {
    const isTopNote = b.getAttribute('role') === 'note';
    if (isTopNote) {
      b.innerHTML = '<strong>It\'s very helpful for your medical practitioner to have as much information as possible for an accurate diagnosis and treatment plan.</strong>';
    } else {
      // Check if this instruction banner is in a medication area
      const isMedicationArea = b.closest('.card').querySelector('.medications') !== null;
      // Check if this instruction banner is in a conditions/history area
      const isConditionsArea = b.closest('.card').getAttribute('data-grid') === 'historyGrid';
      
      if (isMedicationArea) {
        b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have Used</span><span class="donthave">Have Not Used</span></div>';
      } else if (isConditionsArea) {
        b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have Had</span><span class="donthave">Have Not Had</span></div>';
      } else {
        b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have</span><span class="donthave">Don\'t Have</span></div>';
      }
    }
  });
});

















// ==============================
// Advanced Professional Speech Widget
// Complete implementation with voice commands, multi-language, and advanced features
// ==============================

class AdvancedSpeechWidget {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isPushToTalk = false;
    this.currentTarget = null;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // Settings with defaults
    this.settings = {
      language: 'en-US',
      timeout: 30,
      autoPunctuation: true,
      autoCapitalization: true,
      pushToTalk: false,
      confidenceThreshold: 0.7,
      continuousMode: true
    };
    
    // State management
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoLevels = 20;
    this.transcriptHistory = [];
    this.capsMode = 'normal'; // normal, caps, allcaps, nocaps
    this.lastActivity = Date.now();
    this.isTabVisible = true;
    
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

  init() {
    this.loadSettings();
    
    if (!this.checkBrowserSupport()) {
      this.hideWidget();
      return;
    }

    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupVisibilityTracking();
    this.createSettingsPanel();
    
    console.log('Advanced speech widget initialized with all features');
  }

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
    
    this.recognition.continuous = this.settings.continuousMode;
    this.recognition.interimResults = true;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = 3; // For better accuracy

    this.setupRecognitionEvents();
  }

  setupRecognitionEvents() {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateLastActivity();
      this.updateUI();
      this.showMessage('Listening...', 'info');
    };

    this.recognition.onend = () => {
      if (this.isListening && this.settings.continuousMode && this.isTabVisible) {
        // Auto-restart for continuous mode
        setTimeout(() => {
          if (this.isListening) {
            try {
              this.recognition.start();
            } catch (error) {
              console.warn('Failed to restart recognition:', error);
            }
          }
        }, 100);
      } else {
        this.isListening = false;
        this.updateUI();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
    };

    this.recognition.onresult = (event) => {
      this.updateLastActivity();
      this.processResults(event);
    };
  }

  handleRecognitionError(error) {
    switch (error) {
      case 'not-allowed':
        this.isListening = false;
        this.showMessage('Microphone access denied', 'error');
        break;
      case 'no-speech':
        this.showMessage('No speech detected', 'warning');
        break;
      case 'audio-capture':
        this.isListening = false;
        this.showMessage('No microphone found', 'error');
        break;
      case 'network':
        this.showMessage('Network error - check connection', 'warning');
        break;
      case 'aborted':
        this.isListening = false;
        break;
      default:
        this.showMessage(`Recognition error: ${error}`, 'warning');
    }
    
    if (['not-allowed', 'audio-capture'].includes(error)) {
      this.stopListening();
    }
  }

  processResults(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    let confidence = 0;
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      confidence = result[0].confidence || 1;
      
      if (result.isFinal) {
        if (confidence >= this.settings.confidenceThreshold) {
          finalTranscript += transcript;
        } else {
          console.log(`Low confidence result ignored: ${transcript} (${confidence})`);
        }
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (finalTranscript) {
      this.processFinalTranscript(finalTranscript.trim());
    }
    
    this.interimTranscript = interimTranscript;
    this.updateStatusDisplay();
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
        this.transcriptHistory.push({
          text: finalText,
          timestamp: new Date().toISOString(),
          confidence: this.lastConfidence || 1
        });
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

  // Editing functions
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

  // Undo/Redo system
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

  // Event handling and UI
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

    // Input tracking
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
      pushToTalk: document.getElementById('pushToTalk')
    };

    if (elements.language) {
      elements.language.addEventListener('change', (e) => {
        this.settings.language = e.target.value;
        this.recognition.lang = this.settings.language;
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

    Object.entries(elements).forEach(([key, element]) => {
      if (element && element.type === 'checkbox') {
        element.addEventListener('change', (e) => {
          this.settings[key] = e.target.checked;
          this.saveSettings();
        });
      }
    });
  }

  // Core functionality
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
    this.highlightTarget(element);
  }

  highlightTarget(element) {
    document.querySelectorAll('.speech-target').forEach(el => {
      el.classList.remove('speech-target');
    });
    
    element.classList.add('speech-target');
    
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

    if (!this.currentTarget) {
      const target = this.findBestTarget();
      if (target) {
        this.setCurrentTarget(target);
      } else {
        this.showMessage('Please click on a text field first', 'warning');
        return;
      }
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.showMessage('Failed to start speech recognition', 'error');
    }
  }

  stopListening() {
    this.isListening = false;
    this.isPushToTalk = false;
    
    if (this.recognition) {
      this.recognition.stop();
    }
    
    this.updateUI();
  }

  pauseForInactivity() {
    this.stopListening();
    this.showMessage('Paused due to inactivity. Click to resume.', 'info');
  }

  findBestTarget() {
    const focused = document.activeElement;
    if (this.isInputElement(focused)) {
      return focused;
    }

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
    const cleanText = text.trim();
    
    try {
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || start;
      const before = target.value.substring(0, start);
      const after = target.value.substring(end);
      
      // Smart spacing
      const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !cleanText.startsWith(' ') && !cleanText.match(/^[,.!?;:]/);
      const textToInsert = (needsSpaceBefore ? ' ' : '') + cleanText;
      
      target.value = before + textToInsert + after;
      
      const newPosition = start + textToInsert.length;
      target.setSelectionRange(newPosition, newPosition);
      
      this.triggerInputEvents(target);
      this.flashTarget(target);
      
      target.focus();
      
    } catch (error) {
      console.error('Error inserting text:', error);
    }
  }

  triggerInputEvents(target) {
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  flashTarget(element) {
    element.classList.add('speech-insert');
    setTimeout(() => {
      element.classList.remove('speech-insert');
    }, 300);
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
        button.setAttribute('aria-label', 'Stop dictation');
      } else {
        button.classList.remove('listening');
        button.setAttribute('aria-label', 'Start dictation');
      }
    }
    
    this.updateStatusDisplay();
  }

  updateStatusDisplay() {
    const status = document.getElementById('speechStatus');
    if (!status) return;
    
    if (this.isListening) {
      if (this.interimTranscript) {
        status.textContent = `"${this.interimTranscript}"`;
      } else {
        status.textContent = 'Listening...';
      }
      status.classList.add('active');
    } else {
      if (this.settings.pushToTalk) {
        status.textContent = 'Hold Ctrl+Space to talk';
      } else {
        status.textContent = 'Click to start dictation';
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
      return `[${new Date(entry.timestamp).toLocaleString()}] ${entry.text}`;
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

  // Public API methods
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
    
    // Remove event listeners
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    
    // Remove settings panel
    const panel = document.getElementById('speechSettings');
    if (panel) {
      panel.remove();
    }
  }
}

// Initialize the advanced speech widget
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
    
    console.log('🎤 Advanced Speech Widget initialized successfully!');
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
    console.error('Failed to initialize advanced speech widget:', error);
  }
});
