// ==============================
// index.js (future-proof version)
// ==============================

// Collapse/expand cards
function toggleCard(header) {
  header.parentElement.classList.toggle('collapsed');
}

// ---------- small utils ----------
function capitalizeAndAddFullStop(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');
}
function hasText(s) { return !!(s && String(s).trim().length); }
function cssEscape(id) { return (window.CSS && CSS.escape) ? CSS.escape(id) : String(id).replace(/([ #.;,()%&!+])/g, '\\$1'); }
function normalizeKey(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function getSmartLabel(el) {
  if (el?.dataset?.label && hasText(el.dataset.label)) return el.dataset.label.trim();
  if (el.id) {
    const lab = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (lab && hasText(lab.textContent)) return lab.textContent.trim();
  }
  const fg = el.closest?.('.form-group');
  if (fg) {
    const lab = fg.querySelector('label');
    if (lab && hasText(lab.textContent)) return lab.textContent.trim();
  }
  if (el.getAttribute && hasText(el.getAttribute('aria-label'))) return el.getAttribute('aria-label').trim();
  if (el.placeholder && hasText(el.placeholder)) return el.placeholder.trim();
  if (el.id) return el.id;
  if (el.name) return el.name;
  return 'Field';
}

function getSmartValue(el) {
  const tag = el.tagName?.toLowerCase?.();
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
  if (el.isContentEditable) return el.textContent || '';
  return '';
}

function formatCheckboxText(column, checked) {
  // Existing formatter for column sentences (kept for non-history negatives and positives)
  let text = '';
  for (let i = 0; i < checked.length; i++) {
    text += checked[i];
    if (i === checked.length - 1) {
      text += '.';
    } else if ((column === 1 && i === 0) || (column === 2 && i === 0)) {
      text += ' ';
    } else if (i === checked.length - 2) {
      if (column === 2) {
        let firstWord = 'or';
        if (i > 0) {
          const lastInput = checked[i - 1] || '';
          firstWord = lastInput.trim().split(' ')[0].toLowerCase();
        }
        text += firstWord === 'no' ? ' and ' : ' or ';
      } else {
        text += ' and ';
      }
    } else if (checked.length > 1 && i < checked.length - 1) {
      text += ', ';
    }
  }
  if (column === 2) text = text.trim() + '\n';
  return text;
}

// ---- helpers for clean negatives / sections ----
function joinNatural(items, conj = 'and') {
  const arr = items.filter(Boolean);
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} ${conj} ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, ${conj} ${arr[arr.length - 1]}`;
}

function sectionKey(id) {
  switch (String(id)) {
    case '1': return 's1';
    case '2': return 's2';
    case '3': return 'red';
    case '4': return 'com';
    case '5': return 'add';
    case '6': return 'rep';
    case '7': return 'his';
    case 'mixed': return 'mixed';
    default: return 'other';
  }
}

function sectionHeaders(key) {
  // Must match GROUP_HEADERS used to build the mirror
  switch (key) {
    case 'red': return { col1: 'Reports',               col2: 'Reports' };
    case 'com': return { col1: 'Complaining of',        col2: 'Has' };
    case 'add': return { col1: 'Reports',               col2: 'Reports' };
    case 'rep': return { col1: 'Reports',               col2: 'Reports' };
    case 'his': return { col1: 'Has a history of',      col2: 'Has no history of' };
    default:    return null;
  }
}

// ================
// OUTPUT PIPELINE
// ================
async function generateOutput() {
  const outputContainer = document.getElementById('output-container');
  const outputArea = document.getElementById('output-text');
  const outputActions = document.getElementById('output-actions');
  const modal = document.getElementById('outputModal');
  const modalText = document.getElementById('outputText');

  let chunks = []; // [sectionTitle, lines[]]

  // Group by card title (or data-group)
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const sectionTitle = card.getAttribute('data-group')
      || (card.querySelector('.card-header h3')?.textContent?.trim())
      || 'Section';
    const lines = [];

    // Harvest free-text-like controls
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

    // Radio groups inside this card
    const radios = card.querySelectorAll('input[type="radio"]:not([data-skip="true"])');
    const radioNames = new Set(Array.from(radios).map(r => r.name).filter(Boolean));
    radioNames.forEach(name => {
      const checked = card.querySelector(`input[type="radio"][name="${cssEscape(name)}"]:checked`);
      if (checked) {
        const labelEl = card.querySelector(`label[for="${cssEscape(checked.id)}"]`);
        const valueLabel = (labelEl && labelEl.textContent.trim()) || (checked.value || 'Yes');
        const representative = card.querySelector(`input[type="radio"][name="${cssEscape(name)}"]`);
        const fieldLabel = getSmartLabel(representative);
        if (hasText(valueLabel)) lines.push(`${fieldLabel} - ${valueLabel}`);
      }
    });

    // Other controls
    const seen = new Set();
    controls.forEach(ctrl => {
      if (ctrl.closest('#legacy-mirror')) return;
      if (ctrl.dataset?.skip === 'true') return;
      if (ctrl.type && ctrl.type.toLowerCase() === 'checkbox') return; // handled via legacy mirror
      if (ctrl.matches && ctrl.matches('input[type="radio"]')) return; // handled above

      const key = ctrl.id || ctrl.name || ctrl;
      if (seen.has(key)) return;
      seen.add(key);

      const val = getSmartValue(ctrl);
      if (!hasText(val)) return;

      const fieldLabel = getSmartLabel(ctrl);
      if (ctrl.tagName?.toLowerCase?.() === 'textarea' || ctrl.isContentEditable) {
        lines.push(capitalizeAndAddFullStop(val.trim()));
      } else {
        lines.push(`${fieldLabel} - ${val.trim()}`);
      }
    });

    if (lines.length) chunks.push([sectionTitle, lines]);
  });

  // ---------- Legacy checkbox columns (with clean negatives for History) ----------
  const sectionOrder = new Map([['1',1],['2',2],['3',3],['4',4],['5',5],['6',6],['7',7],['mixed',8]]);
  const legacySections = Array.from(document.getElementsByClassName('form-section')).sort((a,b)=>{
    const oa = sectionOrder.get(a.id) ?? 999;
    const ob = sectionOrder.get(b.id) ?? 999;
    return oa - ob;
  });

  let legacyLines = [];

  legacySections.forEach(section => {
    const secKey = sectionKey(section.id);
    const headers = sectionHeaders(secKey); // {col1, col2} or null

    // Collect checked items, but skip the header checkboxes themselves
    const col1All = Array.from(section.querySelectorAll('input.column-1-symptom-checkbox'));
    const col2All = Array.from(section.querySelectorAll('input.column-2-symptom-checkbox'));

    const column1Checked = [];
    const column2Checked = [];

    col1All.forEach(checkbox => {
      if (headers && checkbox.id === headers.col1) return; // skip header tickbox
      if (checkbox.checked) {
        const textareaId = checkbox.getAttribute('data-textarea');
        const textarea = textareaId ? document.getElementById(textareaId) : null;
        const associatedText = textarea && textarea.value && textarea.value.trim() ? ' ' + textarea.value.trim() : '';
        column1Checked.push(checkbox.id + associatedText);
      }
    });

    col2All.forEach(checkbox => {
      if (headers && checkbox.id === headers.col2) return; // skip header tickbox
      if (checkbox.checked) {
        const textareaId = checkbox.getAttribute('data-textarea');
        const textarea = textareaId ? document.getElementById(textareaId) : null;
        const associatedText = textarea && textarea.value && textarea.value.trim() ? ' ' + textarea.value.trim() : '';
        column2Checked.push(checkbox.id + associatedText);
      }
    });

    // Column 1 (positive) stays as-is
    if (column1Checked.length > 0) {
      legacyLines.push(formatCheckboxText(1, column1Checked));
    }

    // Column 2 (negative) — special handling for History to avoid "no no ..."
    if (column2Checked.length > 0) {
      if (secKey === 'his') {
        // Strip "no " prefixes from each item, then write a single clean sentence
        const baseItems = column2Checked.map(s => s.replace(/^no\s+/i, '').trim());
        const sentence = `Has no history of ${joinNatural(baseItems, 'or')}.`;
        legacyLines.push(sentence);
      } else {
        // Other sections keep existing behaviour (e.g., "no fever, no vomiting.")
        legacyLines.push(formatCheckboxText(2, column2Checked));
      }
    }
  });

  // ---------- Compose final text ----------
  let outputText = '';
  chunks.forEach(([title, lines]) => {
    outputText += `\n${title}\n${'-'.repeat(title.length)}\n`;
    outputText += lines.join('\n') + '\n';
  });
  if (legacyLines.length) {
    outputText += `\nSymptoms Summary\n----------------\n` + legacyLines.join('\n').trim() + '\n';
  }
  outputText = outputText.trim();

  // Show
  if (outputArea) outputArea.value = outputText;
  if (outputContainer && outputContainer.style.display === 'none') outputContainer.style.display = 'block';
  if (modalText) modalText.textContent = outputText || 'No output generated.';
  if (modal) modal.style.display = 'flex';

  // Action icons once
  if (outputActions && !outputActions.dataset.initialized) {
    const anchorEmail = document.createElement('a');
    anchorEmail.href = '#';
    anchorEmail.title = 'Email Report';
    const imgEmail = document.createElement('img');
    imgEmail.src = 'https://checksymptoms.co.uk/wp-content/uploads/2024/04/email.gif';
    imgEmail.alt = 'Click to Email';
    imgEmail.style.width = '180px';
    imgEmail.style.height = 'auto';
    imgEmail.addEventListener('click', emailOutput);

    const anchorCopyInfo = document.createElement('a');
    anchorCopyInfo.href = '#';
    anchorCopyInfo.title = 'Copy Report';
    const imgCopyInfo = document.createElement('img');
    imgCopyInfo.src = 'https://checksymptoms.co.uk/wp-content/uploads/2024/07/copy-icon.png';
    imgCopyInfo.alt = 'Click to copy information';
    imgCopyInfo.style.width = '100px';
    imgCopyInfo.style.height = 'auto';
    imgCopyInfo.addEventListener('click', copyOutput);

    outputActions.appendChild(anchorEmail);
    anchorEmail.appendChild(imgEmail);
    outputActions.appendChild(anchorCopyInfo);
    anchorCopyInfo.appendChild(imgCopyInfo);
    outputActions.dataset.initialized = 'true';
  }
}

async function copyOutput() {
  const outputArea = document.getElementById('output-text');
  const modalText = document.getElementById('outputText');
  const text = (outputArea && outputArea.value && outputArea.value.trim())
    ? outputArea.value.trim()
    : (modalText && modalText.textContent ? modalText.textContent.trim() : '');
  if (!text) return alert('Nothing to copy yet — please generate the report first.');
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

function emailOutput() {
  const outputArea = document.getElementById('output-text');
  const modalText = document.getElementById('outputText');
  const text = (outputArea && outputArea.value && outputArea.value.trim())
    ? outputArea.value.trim()
    : (modalText && modalText.textContent ? modalText.textContent.trim() : '');
  if (!text) return alert('Please generate the report before sending an email.');
  const subject = encodeURIComponent('Abdominal pain symptom form for ');
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function closeOutput() {
  const modal = document.getElementById('outputModal');
  if (modal) modal.style.display = 'none';
}

// ===== Dashboard → Legacy adapter (tri-state pills → legacy checkboxes, auto-headers) =====
(function () {
  // Map data-symptom → exact legacy IDs
  const LEGACY_ID = {
    // red flags
    'rigid abdomen': 'rigid abdomen',
    'bloody stool': 'bloody stool',
    'dark vomitus': 'dark vomitus',
    'blood in vomitus': 'blood in vomitus',
    'unexplained weight loss': 'unexplained weight loss',
    'jaundice': 'jaundice',
    'abdominal swelling': 'abdominal swelling',
    'inability to pass stool': 'inability to pass stool',
    'inability to pass stool and gas': 'inability to pass stool and gas',
    'chest pain': 'chest pain',
    'shortness of breath': 'shortness of breath',
    'pain following an injury': 'pain following an injury',
    'cold, clammy skin': 'cold, clammy skin',
    'shallow breathing': 'shallow breathing',
    'rapid heartbeat': 'rapid heartbeat',
    // common
    'fever': 'fever',
    'loss of appetite': 'loss of appetite',
    'nausea': 'nausea',
    'vomiting': 'vomiting',
    'bloating': 'bloating',
    'back pain': 'back pain',
    'diarrhea': 'diarrhea',
    'constipation': 'constipation',
    // additional
    'pale stool': 'Pale stool',
    'not passing gas': 'not passing gas',
    'abdominal distension': 'abdominal distension',
    'hematuria': 'hematuria',
    'dysuria': 'dysuria',
    'frequency': 'frequency',
    'foul smelling urine': 'foul smelling urine',
    'melena': 'melena',
    // reproductive
    'testicular pain': 'testicular pain',
    'urethral discharge': 'urethral discharge',
    'vaginal discharge': 'vaginal discharge',
    'dyspareunia': 'dyspareunia',
    'being sexually active': 'being sexually active',
    'using contraception': 'using contraception',
    'doing a home pregnancy test': 'doing a home pregnancy test',
    'positive pregnancy test': 'positive pregnancy test',
    'abdominal pain every time periods begin': 'abdominal pain every time periods begin',
    'vaginal bleeding with clots': 'vaginal bleeding with clots',
    'vaginal bleeding with fetal tissue': 'vaginal bleeding with fetal tissue',
    // history
    'irritable bowel disease': 'irritable bowel disease',
    'inflammatory bowel disease': 'inflammatory bowel disease',
    'diverticulosis': 'diverticulosis',
    'pancreatitis': 'pancreatitis',
    'gallstones': 'gallstones',
    'appendicitis': 'appendicitis',
    'abdominal surgery': 'abdominal surgery',
    'pelvic surgery': 'pelvic surgery',
    'aaa (abdominal aortic aneurysm)': 'AAA (Abdominal Aortic Aneurysm)',
    'endometritis': 'endometritis',
    'ectopic pregnancy': 'ectopic pregnancy',
    'peptic ulcers': 'peptic ulcers',
    'diabetes': 'diabetes',
    'sickle cell disease': 'sickle cell disease',
    'kidney stones': 'kidney stones',
    'ischemic bowel disease': 'ischemic bowel disease',
    'food allergy': 'food allergy'
  };

  const GROUP_HEADERS = {
    redFlagGrid: { col1: 'Reports', col2: 'Reports' },
    commonGrid: { col1: 'Complaining of', col2: 'Has' },
    additionalGrid: { col1: 'Reports', col2: 'Reports' },
    reproductiveGrid: { col1: 'Reports', col2: 'Reports' },
    historyGrid: { col1: 'Has a history of', col2: 'Has no history of' },
  };

  // Hidden legacy mirror
  const legacy = document.createElement('div');
  legacy.id = 'legacy-mirror';
  legacy.style.display = 'none';

  // Build legacy sections
  const sections = {
    s1: mkSection('1'),
    s2: mkSection('2'),
    red: mkSection('3'),
    com: mkSection('4'),
    add: mkSection('5'),
    rep: mkSection('6'),
    his: mkSection('7'),
    mixed: mkSection('mixed')
  };

  // s1 free text & LMP
  sections.s1.append(mkTextarea('description'), mkText('Last menstrual period-'));
  // s2 pain block
  sections.s2.append(
    mkText('Pain located in'),
    mkText('Radiates to'),
    mkText('Character of pain is'),
    mkText('Pain is associated with'),
    mkText('Alleviated by'),
    mkText('Pain is exacerbated by'),
    mkText('Pain severity -')
  );
  // mixed (meds & lifestyle etc.)
  sections.mixed.append(
    mkText('Currently taking -'),
    mkText('Drug Allergies -'),
    mkText('Past Medical History -'),
    mkText('Past Surgical History -'),
    mkText(' Response to previous treatments or interventions -'),
    mkText('Smoking History -'),
    mkText('Alcohol History -'),
    mkText('Recreational drug use -')
  );
  // further details textarea (legacy id)
  sections.add.append(mkTextarea('further-details'));

  document.addEventListener('DOMContentLoaded', () => {
    // Attach legacy sections
    const form = document.getElementById('symptomForm') || document.body;
    Object.values(sections).forEach(sec => legacy.appendChild(sec));
    form.appendChild(legacy);

    // Build mirrored groups for each grid
    ['redFlagGrid', 'commonGrid', 'additionalGrid', 'reproductiveGrid', 'historyGrid'].forEach(gridId => {
      const items = collectItems(gridId);
      addGroup(sectionForGrid(gridId), gridId, items);
    });

    // Tri-state pills behavior
    document.querySelectorAll('.symptom-toggle').forEach(pill => {
      pill.addEventListener('click', () => {
        cycleTriState(pill);
        syncPillToLegacy(pill);
        updateHeadersForGrid(closestGridId(pill));
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

    // Auto-wire ALL free-text-like controls initially + on future DOM changes
    autoWireAllFreeText();
    observeDynamicControls();

    // Seed counters
    document.querySelectorAll('.card').forEach(updateCounters);
  });

  function mkSection(id) {
    const s = document.createElement('div');
    s.className = 'form-section';
    s.id = id;
    return s;
  }
  function mkCheckbox(id, cls) { const i = document.createElement('input'); i.type='checkbox'; i.id=id; i.className=cls; return i; }
  function mkText(id) { const i = document.createElement('input'); i.type='text'; i.id=id; return i; }
  function mkTextarea(id) { const t = document.createElement('textarea'); t.id=id; return t; }

  function collectItems(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return [];
    const items = [];
    grid.querySelectorAll('.symptom-toggle').forEach(t => {
      const key = normalizeKey(t.dataset.symptom);
      const legacyId = LEGACY_ID[key];
      if (!legacyId) return;
      items.push(legacyId);
    });
    return items;
  }

  function addGroup(sec, gridId, legacyIds) {
    if (!sec) return;
    const headers = GROUP_HEADERS[gridId];
    sec.append(mkCheckbox(headers.col1, 'column-1-symptom-checkbox'), mkCheckbox(headers.col2, 'column-2-symptom-checkbox'));
    legacyIds.forEach(legacyId => {
      sec.append(mkCheckbox(legacyId, 'column-1-symptom-checkbox'));
      sec.append(mkCheckbox(makeNegativeId(legacyId), 'column-2-symptom-checkbox'));
    });
  }

  function cycleTriState(el) {
    if (el.classList.contains('donthave')) {
      el.classList.remove('donthave'); el.classList.add('have');
    } else if (el.classList.contains('have')) {
      el.classList.remove('have');
    } else {
      el.classList.add('donthave');
    }
    setAria(el);
  }

  function syncPillToLegacy(pill) {
    const key = normalizeKey(pill.dataset.symptom);
    const base = LEGACY_ID[key];
    if (!base) return;
    const posId = base;
    const negId = makeNegativeId(base);
    if (!pill.classList.contains('have') && !pill.classList.contains('donthave')) {
      setLegacyChecked(posId, false); setLegacyChecked(negId, false);
    } else if (pill.classList.contains('have')) {
      setLegacyChecked(posId, true); setLegacyChecked(negId, false);
    } else {
      setLegacyChecked(posId, false); setLegacyChecked(negId, true);
    }
  }

  function autoWireAllFreeText(root=document) {
    const legacyRoot = document.getElementById('legacy-mirror');

    // decide bucket by id (specials) or default to mixed
    const painIds = new Set([
      'Pain located in','Radiates to','Character of pain is','Pain is associated with',
      'Alleviated by','Pain is exacerbated by','Pain severity -'
    ]);
    function pickBucketFor(id) {
      if (id === 'description' || id === 'Last menstrual period-') return sections.s1;
      if (painIds.has(id)) return sections.s2;
      if (id === 'further-details') return sections.add;
      return sections.mixed;
    }

    const candidates = root.querySelectorAll(`
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

    candidates.forEach(src => {
      if (src.closest('#legacy-mirror')) return;
      if (src.dataset?.skip === 'true') return;

      if (!src.id) src.id = 'fld-' + Math.random().toString(36).slice(2,9);
      const legacyId = (src.dataset && src.dataset.legacyId) ? src.dataset.legacyId : src.id;

      let target = legacyRoot.querySelector('#' + cssEscape(legacyId));
      if (!target) {
        const makeTextarea = src.tagName?.toLowerCase?.() === 'textarea' || src.isContentEditable;
        target = document.createElement(makeTextarea ? 'textarea' : 'input');
        if (!makeTextarea) target.type = 'text';
        target.id = legacyId;
        pickBucketFor(legacyId).appendChild(target);
      }

      const doSync = () => { target.value = getSmartValue(src); };
      doSync();
      ['input','change','blur'].forEach(evt => src.addEventListener(evt, doSync));
      if (src.isContentEditable) src.addEventListener('input', doSync);
    });
  }

  function observeDynamicControls() {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('textarea, input, select, [contenteditable][data-field]')) {
            autoWireAllFreeText(node.parentElement || node);
          } else if (node.querySelector) {
            const any = node.querySelector('textarea, input, select, [contenteditable][data-field]');
            if (any) autoWireAllFreeText(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function makeNegativeId(legacyId) {
    if (/^no\s+/i.test(legacyId)) return legacyId;
    if (legacyId === 'not passing gas') return 'passing gas';
    return 'no ' + legacyId;
  }
  function setLegacyChecked(id, val) {
    const el = document.querySelector('#legacy-mirror #' + cssEscape(id));
    if (el) el.checked = !!val;
  }
  function closestGridId(pill) {
    const card = pill.closest('.card'); return card ? card.getAttribute('data-grid') : null;
  }
  function sectionForGrid(gridId) {
    switch (gridId) {
      case 'redFlagGrid': return sections.red;
      case 'commonGrid': return sections.com;
      case 'additionalGrid': return sections.add;
      case 'reproductiveGrid': return sections.rep;
      case 'historyGrid': return sections.his;
      default: return null;
    }
  }
  function updateHeadersForGrid(gridId) {
    if (!gridId) return;
    const headers = {
      redFlagGrid: { col1: 'Reports', col2: 'Reports' },
      commonGrid: { col1: 'Complaining of', col2: 'Has' },
      additionalGrid: { col1: 'Reports', col2: 'Reports' },
      reproductiveGrid: { col1: 'Reports', col2: 'Reports' },
      historyGrid: { col1: 'Has a history of', col2: 'Has no history of' },
    }[gridId];
    if (!headers) return;
    const sec = sectionForGrid(gridId); if (!sec) return;
    const h1 = sec.querySelector('input.column-1-symptom-checkbox#' + cssEscape(headers.col1));
    const h2 = sec.querySelector('input.column-2-symptom-checkbox#' + cssEscape(headers.col2));
    const posAny = sec.querySelectorAll('input.column-1-symptom-checkbox:not(#' + cssEscape(headers.col1) + '):checked').length > 0;
    const negAny = sec.querySelectorAll('input.column-2-symptom-checkbox:not(#' + cssEscape(headers.col2) + '):checked').length > 0;
    if (h1) h1.checked = posAny;
    if (h2) h2.checked = negAny;
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
    if (haveChip) { haveChip.dataset.countHave = String(haveN); haveChip.textContent = `${haveN} have`; }
    if (dontChip) { dontChip.dataset.countNo = String(dontN); dontChip.textContent = `${dontN} don't`; }
  }
})();

// Instruction banners
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ux-instruction').forEach(b => {
    const isTopNote = b.getAttribute('role') === 'note';
    if (isTopNote) {
      b.innerHTML = '<strong>It\'s very helpful for your medical practitioner reviewing you to have as much information as possible, so they can reach the most accurate diagnosis and provide the best treatment plan.</strong>';
    } else {
      b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have</span><span class="donthave">Don\'t Have</span></div>';
    }
  });
});
