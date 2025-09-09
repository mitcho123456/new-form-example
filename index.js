// ==============================
// Streamlined index.js
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

function getSmartLabel(el) {
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
// OUTPUT GENERATION (Streamlined)
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
      
      // Format based on control type and specific field handling
      if (ctrl.tagName.toLowerCase() === 'textarea' || ctrl.isContentEditable) {
        // Special handling for expectations field
        if (ctrl.id && ctrl.id.toLowerCase().includes('expectation')) {
          lines.push(`Expectations of consultation - ${val.trim()}.`);
        } else {
          lines.push(capitalizeAndAddFullStop(val.trim()));
        }
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

function processSymptomToggles(card) {
  const results = [];
  const haveSymptoms = [];
  const dontHaveSymptoms = [];
  
  // Check if this is the Medical History card
  const isMedicalHistory = card.getAttribute('data-grid') === 'historyGrid';
  const isMedications = card.getAttribute('data-grid') === 'medicationsGrid';
  
  // Collect all symptom toggles
  card.querySelectorAll('.symptom-toggle').forEach(toggle => {
    const symptomText = toggle.textContent.trim();
    const isMedication = toggle.classList.contains('medications');
    const isCondition = toggle.classList.contains('conditions');
    
    if (toggle.classList.contains('have')) {
      haveSymptoms.push({
        text: symptomText,
        isMedication: isMedication,
        isCondition: isCondition
      });
    } else if (toggle.classList.contains('donthave')) {
      dontHaveSymptoms.push({
        text: symptomText,
        isMedication: isMedication,
        isCondition: isCondition
      });
    }
  });
  
  // Format "have" symptoms
  if (haveSymptoms.length > 0) {
    const formatted = formatSymptomList(haveSymptoms, 'positive', isMedicalHistory, isMedications);
    results.push(formatted);
  }
  
  // Format "don't have" symptoms  
  if (dontHaveSymptoms.length > 0) {
    const formatted = formatSymptomList(dontHaveSymptoms, 'negative', isMedicalHistory, isMedications);
    results.push(formatted);
  }
  
  return results;
}

function formatSymptomList(symptoms, type, isMedicalHistory = false, isMedications = false) {
  // Check if we have medications or conditions
  const hasMedications = symptoms.some(s => s.isMedication);
  const hasConditions = symptoms.some(s => s.isCondition);
  
  // Handle medications specifically
  if (hasMedications) {
    const medicationSymptoms = symptoms.filter(s => s.isMedication);
    const prefix = type === 'positive' ? 'Has history of using' : 'Has no history of using';
    
    if (medicationSymptoms.length === 1) {
      return `${prefix} ${medicationSymptoms[0].text.toLowerCase()}.`;
    } else {
      const last = medicationSymptoms.pop();
      const conjunction = type === 'negative' ? 'or' : 'and';
      return `${prefix} ${medicationSymptoms.map(s => s.text.toLowerCase()).join(', ')} ${conjunction} ${last.text.toLowerCase()}.`;
    }
  }
  
  // Handle conditions specifically
  if (hasConditions) {
    const conditionSymptoms = symptoms.filter(s => s.isCondition);
    const prefix = type === 'positive' ? 'Has history of' : 'Has no history of';
    
    if (conditionSymptoms.length === 1) {
      return `${prefix} ${conditionSymptoms[0].text.toLowerCase()}.`;
    } else {
      const last = conditionSymptoms.pop();
      const conjunction = type === 'negative' ? 'or' : 'and';
      return `${prefix} ${conditionSymptoms.map(s => s.text.toLowerCase()).join(', ')} ${conjunction} ${last.text.toLowerCase()}.`;
    }
  }
  
  // Original symptom formatting for regular symptoms
  const positiveStarters = [
    'Reports', 'Presents with', 'Experiencing', 'Complains of', 
    'Admits to', 'Describes', 'Notes', 'States has', 'Has', 
    'Positive for', 'Affirms', 'Acknowledges', 'Mentions'
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
  
  const negativeHistoryStarters = [
    'No history of', 'No prior history of', 'Denies history of',
    'No previous diagnosis of', 'Never had'
  ];
  
  // Extract text for formatting
  const symptomTexts = symptoms.map(s => s.text);
  
  // Intelligently select starter based on context
  let starter = '';
  if (isMedicalHistory) {
    // Special handling for medical history
    if (type === 'positive') {
      starter = selectFromArray(positiveHistoryStarters);
    } else {
      starter = selectFromArray(negativeHistoryStarters);
    }
  } else if (type === 'positive') {
    // Use different starters based on symptom type and count
    if (symptomTexts.some(s => s.toLowerCase().includes('pain') || s.toLowerCase().includes('ache'))) {
      starter = selectFromArray(['Complains of', 'Reports', 'Describes', 'Experiencing']);
    } else if (symptomTexts.length > 3) {
      starter = selectFromArray(['Presents with', 'Experiencing', 'Reports']);
    } else {
      starter = selectFromArray(positiveStarters);
    }
  } else {
    // Select negative starter based on context
    if (symptomTexts.length === 1) {
      starter = selectFromArray(['Denies', 'Negative for', 'No', 'Reports no']);
    } else {
      starter = selectFromArray(negativeStarters);
    }
  }
  
  // Clean up symptom names for better grammar
  const cleanedSymptoms = symptomTexts.map(s => {
    let cleaned = s.toLowerCase();
    
    // Handle special cases for negative phrasing
    if (type === 'negative' && !isMedicalHistory) {
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
             starterLower.includes('no previous') || starterLower.includes('no symptoms')) {
    // These need special handling
    if (cleanedSymptoms.length === 1) {
      return `${starter} ${cleanedSymptoms[0]}.`;
    } else {
      const last = cleanedSymptoms.pop();
      return `${starter} ${cleanedSymptoms.join(', ')} or ${last}.`;
    }
  } else if (starterLower.includes('history') || starterLower.includes('diagnosis')) {
    // History-specific starters
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
  
  const subject = encodeURIComponent('Abdominal pain symptom form');
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
  el.setAttribute('aria-label', `${el.textContent.trim()} — ${state.replace('-', ' ')}`);
}

function updateCounters(card) {
  if (!card) return;
  const haveN = card.querySelectorAll('.symptom-toggle.have').length;
  const dontN = card.queryS
