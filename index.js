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
      
      // Format based on control type
      if (ctrl.tagName.toLowerCase() === 'textarea' || ctrl.isContentEditable) {
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

function processSymptomToggles(card) {
  const results = [];
  const haveSymptoms = [];
  const dontHaveSymptoms = [];
  
  // Collect all symptom toggles
  card.querySelectorAll('.symptom-toggle').forEach(toggle => {
    if (toggle.classList.contains('have')) {
      haveSymptoms.push(toggle.textContent.trim());
    } else if (toggle.classList.contains('donthave')) {
      dontHaveSymptoms.push(toggle.textContent.trim());
    }
  });
  
  // Format "have" symptoms
  if (haveSymptoms.length > 0) {
    if (haveSymptoms.length === 1) {
      results.push(`Reports ${haveSymptoms[0].toLowerCase()}.`);
    } else {
      const last = haveSymptoms.pop();
      results.push(`Reports ${haveSymptoms.join(', ').toLowerCase()} and ${last.toLowerCase()}.`);
    }
  }
  
  // Format "don't have" symptoms
  if (dontHaveSymptoms.length > 0) {
    if (dontHaveSymptoms.length === 1) {
      results.push(`Reports no ${dontHaveSymptoms[0].toLowerCase()}.`);
    } else {
      const last = dontHaveSymptoms.pop();
      results.push(`Reports no ${dontHaveSymptoms.join(', ').toLowerCase()} or ${last.toLowerCase()}.`);
    }
  }
  
  return results;
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
      b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have</span><span class="donthave">Don\'t Have</span></div>';
    }
  });
});
