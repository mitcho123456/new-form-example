/* ======================================================================
   index.js — Full version
   - Keeps legacy mirror + section builders (compatibility preserved)
   - Order-of-entry reporting (no hard-coded sections in output)
   - Control-type agnostic: textarea, inputs, select (single/multi),
     radio groups (by name), contenteditable[data-field]
   - Tri-state pills: neutral → donthave → have → neutral
       * donthave => "No <label>"
       * have     => "<Label>"
   - MutationObserver auto-wires dynamic nodes
   - Output appears in Generate Report modal in the order of entry
   ====================================================================== */

/* ===================
   UX: Collapse/expand
   =================== */
function toggleCard(header) {
  header.parentElement.classList.toggle('collapsed');
}

/* ==============
   Small helpers
   ============== */
function hasText(s) { return !!(s && String(s).trim().length); }

function cssEscape(id) {
  return (window.CSS && CSS.escape) ? CSS.escape(id)
    : String(id).replace(/([ #.;,()%&!+])/g, '\\$1');
}

function normalizeKey(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* Label resolver priority:
   1) data-label
   2) <label for="id">
   3) nearest .form-group > label
   4) aria-label
   5) placeholder
   6) id / name
*/
function getSmartLabel(el) {
  if (!el) return 'Field';
  if (el.dataset?.label && hasText(el.dataset.label)) return el.dataset.label.trim();

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

/* Value resolver:
   - textarea → value
   - input[text/number/date/time/email/tel/url] → value
   - select (single) → selected option text (fallback value)
   - select (multiple) → comma-joined selected option texts
   - contenteditable[data-field] → textContent
*/
function getSmartValue(el) {
  const tag = el.tagName?.toLowerCase?.();
  if (tag === 'textarea') return el.value || '';
  if (tag === 'input') {
    const type = (el.type || '').toLowerCase();
    if (['text','number','date','time','email','tel','url'].includes(type)) return el.value || '';
    // radios/checkboxes handled elsewhere
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

/* ===================================
   ORDER CAPTURE (sequence assignment)
   =================================== */

let __SEQ = 1; // monotonic counter

// Assigns the first-seen sequence number to an element (or logical key)
function stampSeq(elOrKey) {
  if (!elOrKey) return;
  if (typeof elOrKey === 'string') {
    const key = elOrKey;
    const store = window.__SEQ_KEYS || (window.__SEQ_KEYS = new Map());
    if (!store.has(key)) store.set(key, __SEQ++);
    return store.get(key);
  } else {
    const el = elOrKey;
    if (!el.dataset) el.dataset = {};
    if (!el.dataset.seq) el.dataset.seq = String(__SEQ++);
    return Number(el.dataset.seq);
  }
}

// Reads the sequence number
function readSeq(elOrKey) {
  if (!elOrKey) return Number.MAX_SAFE_INTEGER;
  if (typeof elOrKey === 'string') {
    const store = window.__SEQ_KEYS || (window.__SEQ_KEYS = new Map());
    return store.get(elOrKey) ?? Number.MAX_SAFE_INTEGER;
  } else {
    const el = elOrKey;
    return el?.dataset?.seq ? Number(el.dataset.seq) : Number.MAX_SAFE_INTEGER;
  }
}

/* ============================================================
   TRI-STATE PILLS (visual chips) + legacy mirror synchronization
   ============================================================ */

// Cycle visual state: neutral → donthave → have → neutral
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

/* =====================================================
   LEGACY MIRROR + SECTION BUILDERS (kept for compatibility)
   ===================================================== */

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

// Group headers used when building legacy mirror sections
const GROUP_HEADERS = {
  redFlagGrid: { col1: 'Reports', col2: 'Reports' },
  commonGrid: { col1: 'Complaining of', col2: 'Has' },
  additionalGrid: { col1: 'Reports', col2: 'Reports' },
  reproductiveGrid: { col1: 'Reports', col2: 'Reports' },
  historyGrid: { col1: 'Has a history of', col2: 'Has no history of' },
};

// Hidden legacy mirror root
const legacy = document.createElement('div');
legacy.id = 'legacy-mirror';
legacy.style.display = 'none';

// Make section node
function mkSection(id) {
  const s = document.createElement('div');
  s.className = 'form-section';
  s.id = id;
  return s;
}

// Basic input/textarea/checkbox
function mkCheckbox(id, cls) {
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.id = id;
  i.className = cls;
  return i;
}

function mkText(id) {
  const i = document.createElement('input');
  i.type = 'text';
  i.id = id;
  return i;
}

function mkTextarea(id) {
  const t = document.createElement('textarea');
  t.id = id;
  return t;
}

// Legacy sections (matching earlier structure)
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

// Pre-append known legacy text fields
sections.s1.append(mkTextarea('description'), mkText('Last menstrual period-'));
sections.s2.append(
  mkText('Pain located in'),
  mkText('Radiates to'),
  mkText('Character of pain is'),
  mkText('Pain is associated with'),
  mkText('Alleviated by'),
  mkText('Pain is exacerbated by'),
  mkText('Pain severity -')
);
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
sections.add.append(mkTextarea('further-details'));

// Utility to escape legacy ids and create "no X"
function makeNegativeId(legacyId) {
  if (/^no\s+/i.test(legacyId)) return legacyId;
  if (legacyId === 'not passing gas') return 'passing gas';
  return 'no ' + legacyId;
}

// Build legacy groups for a symptom grid (from visible pills)
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

function addGroup(sec, gridId, legacyIds) {
  if (!sec) return;
  const headers = GROUP_HEADERS[gridId];
  // Add header checkboxes (auto-checked later)
  sec.append(
    mkCheckbox(headers.col1, 'column-1-symptom-checkbox'),
    mkCheckbox(headers.col2, 'column-2-symptom-checkbox')
  );
  // Items: positive (col1) + negative (col2)
  legacyIds.forEach(legacyId => {
    sec.append(mkCheckbox(legacyId, 'column-1-symptom-checkbox'));
    sec.append(mkCheckbox(makeNegativeId(legacyId), 'column-2-symptom-checkbox'));
  });
}

/* ============================================================
   AUTO-WIRING controls (including dynamic) + radio + pills
   ============================================================ */

// Stamp order and mirror text/select/contenteditable into legacy if desired
function wireControl(el) {
  if (!el || el.closest?.('#legacy-mirror')) return;
  if (el.dataset?.skip === 'true') return;

  const tag = el.tagName?.toLowerCase?.();

  // ensure id for mapping/labels
  if (!el.id) el.id = 'fld-' + Math.random().toString(36).slice(2, 9);

  const meaningfulNow = () => {
    if (tag === 'textarea') return hasText(el.value);
    if (tag === 'input') {
      const type = (el.type || '').toLowerCase();
      if (['text','number','date','time','email','tel','url'].includes(type)) return hasText(el.value);
      if (type === 'checkbox') return el.checked;
      // radios handled separately
      return false;
    }
    if (tag === 'select') {
      if (el.multiple) return el.selectedOptions && el.selectedOptions.length > 0;
      return hasText(el.value);
    }
    if (el.isContentEditable) return hasText(el.textContent);
    return false;
  };

  // If already meaningful (prefill), stamp immediately
  if (meaningfulNow()) stampSeq(el);

  // First-time meaningful change should stamp
  const maybeStamp = () => { if (meaningfulNow()) stampSeq(el); };
  ['input','change','blur'].forEach(evt => el.addEventListener(evt, maybeStamp));
  if (el.isContentEditable) el.addEventListener('input', maybeStamp);

  // Mirror into legacy text fields (keep compatibility)
  autoWireIntoLegacy(el);
}

// Auto-mirror text/select/contenteditable into legacy mirror
function autoWireIntoLegacy(src) {
  const legacyRoot = document.getElementById('legacy-mirror');
  if (!legacyRoot) return;

  // Decide bucket by id (known fields) or default to mixed
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
}

// Radios: treated as group by name; sequence stamped the first time any option selected
function wireRadioGroup(name, scope=document) {
  if (!name) return;
  const key = `radio:${name}`;
  const anyChecked = scope.querySelector(`input[type="radio"][name="${cssEscape(name)}"]:checked`);
  if (anyChecked) stampSeq(key);

  scope.querySelectorAll(`input[type="radio"][name="${cssEscape(name)}"]`).forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) stampSeq(key);
    });
  });
}

// Tri-state pills: wire behavior + legacy checkbox mirroring
function wirePill(pill) {
  // stamp if preloaded non-neutral
  if (pill.classList.contains('have') || pill.classList.contains('donthave')) stampSeq(pill);

  pill.addEventListener('click', () => {
    cycleTriState(pill);
    const nonNeutral = pill.classList.contains('have') || pill.classList.contains('donthave');
    if (nonNeutral && !pill.dataset.seq) stampSeq(pill);
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
}

// Map tri-state pill state to legacy mirror checkboxes
function syncPillToLegacy(pill) {
  const key = normalizeKey(pill.dataset.symptom);
  const base = LEGACY_ID[key];
  if (!base) return;
  const posId = base;
  const negId = makeNegativeId(base);

  const setLegacyChecked = (id, val) => {
    const el = document.querySelector('#legacy-mirror #' + cssEscape(id));
    if (el) el.checked = !!val;
  };

  if (!pill.classList.contains('have') && !pill.classList.contains('donthave')) {
    setLegacyChecked(posId, false);
    setLegacyChecked(negId, false);
  } else if (pill.classList.contains('have')) {
    setLegacyChecked(posId, true);
    setLegacyChecked(negId, false);
  } else {
    setLegacyChecked(posId, false);
    setLegacyChecked(negId, true);
  }
}

// Update auto header checkbox state per grid
function updateHeadersForGrid(gridId) {
  if (!gridId) return;

  const headers = GROUP_HEADERS[gridId];
  if (!headers) return;

  const sec = sectionForGrid(gridId);
  if (!sec) return;

  const h1 = sec.querySelector('input.column-1-symptom-checkbox#' + cssEscape(headers.col1));
  const h2 = sec.querySelector('input.column-2-symptom-checkbox#' + cssEscape(headers.col2));

  const posAny = sec.querySelectorAll('input.column-1-symptom-checkbox:not(#' + cssEscape(headers.col1) + '):checked').length > 0;
  const negAny = sec.querySelectorAll('input.column-2-symptom-checkbox:not(#' + cssEscape(headers.col2) + '):checked').length > 0;

  if (h1) h1.checked = posAny;
  if (h2) h2.checked = negAny;
}

/* =========================
   Header chips (cosmetic)
   ========================= */
function updateCounters(card) {
  if (!card) return;
  const haveN = card.querySelectorAll('.symptom-toggle.have').length;
  const dontN = card.querySelectorAll('.symptom-toggle.donthave').length;
  const haveChip = card.querySelector('.state-chip.have');
  const dontChip = card.querySelector('.state-chip.donthave');
  if (haveChip) { haveChip.dataset.countHave = String(haveN); haveChip.textContent = `${haveN} have`; }
  if (dontChip) { dontChip.dataset.countNo = String(dontN); dontChip.textContent = `${dontN} don't`; }
}

/* ==========================================
   Initial attach: build mirror + wire events
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Attach legacy sections to hidden form
  const form = document.getElementById('symptomForm') || document.body;
  Object.values(sections).forEach(sec => legacy.appendChild(sec));
  form.appendChild(legacy);

  // Build mirrored groups for each grid present
  ['redFlagGrid', 'commonGrid', 'additionalGrid', 'reproductiveGrid', 'historyGrid'].forEach(gridId => {
    const items = collectItems(gridId);
    addGroup(sectionForGrid(gridId), gridId, items);
  });

  // Wire free-text-like controls
  document.querySelectorAll(`
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
  `).forEach(wireControl);

  // Wire radio groups
  const radioNames = new Set(Array.from(document.querySelectorAll('input[type="radio"]')).map(r => r.name).filter(Boolean));
  radioNames.forEach(name => wireRadioGroup(name));

  // Wire tri-state pills
  document.querySelectorAll('.symptom-toggle').forEach(wirePill);

  // Seed counters
  document.querySelectorAll('.card').forEach(updateCounters);

  // Observe dynamic nodes and auto-wire them
  const observer = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('.symptom-toggle')) wirePill(node);
        if (node.matches?.('input[type="radio"]')) wireRadioGroup(node.name, node.ownerDocument || document);
        if (node.matches?.('textarea, input, select, [contenteditable][data-field]')) wireControl(node);
        else if (node.querySelector) {
          node.querySelectorAll('.symptom-toggle').forEach(wirePill);
          node.querySelectorAll('input[type="radio"]').forEach(r => wireRadioGroup(r.name, node));
          node.querySelectorAll('textarea, input, select, [contenteditable][data-field]').forEach(wireControl);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Enhance instruction banners
  document.querySelectorAll('.ux-instruction').forEach(b => {
    const isTopNote = b.getAttribute('role') === 'note';
    if (isTopNote) {
      b.innerHTML = '<strong>It\'s very helpful for your medical practitioner reviewing you to have as much information as possible, so they can reach the most accurate diagnosis and provide the best treatment plan.</strong>';
    } else {
      b.innerHTML = '<strong>Tap symptoms to cycle through states:</strong> <div class="legend"><span class="neutral">Neutral</span><span class="have">Have</span><span class="donthave">Don\'t Have</span></div>';
    }
  });
});

/* ============================
   REPORT GENERATION (ORDERED)
   ============================ */
async function generateOutput() {
  const outputContainer = document.getElementById('output-container');
  const outputArea = document.getElementById('output-text');
  const outputActions = document.getElementById('output-actions');
  const modal = document.getElementById('outputModal');
  const modalText = document.getElementById('outputText');

  const lines = [];

  // 1) Tri-state pills in the order they were first toggled
  document.querySelectorAll('.symptom-toggle').forEach(pill => {
    const state = pill.classList.contains('have') ? 'have'
                : pill.classList.contains('donthave') ? 'donthave'
                : 'neutral';
    if (state === 'neutral') return;

    const label = pill.textContent.trim();
    const seq = readSeq(pill);
    // One click (donthave) => "No <label>"; Two clicks (have) => "<Label>"
    const text = state === 'donthave' ? `No ${label.toLowerCase()}` : capFirst(label);
    lines.push({ seq, text });
  });

  // 2) Radio groups in order of first selection
  const radioNames = new Set(Array.from(document.querySelectorAll('input[type="radio"]')).map(r => r.name).filter(Boolean));
  radioNames.forEach(name => {
    const key = `radio:${name}`;
    const seq = readSeq(key);
    if (seq === Number.MAX_SAFE_INTEGER) return; // never selected
    const checked = document.querySelector(`input[type="radio"][name="${cssEscape(name)}"]:checked`);
    if (!checked) return;
    const rep = document.querySelector(`input[type="radio"][name="${cssEscape(name)}"]`);
    const fieldLabel = getSmartLabel(rep);
    const valueLabel =
      (document.querySelector(`label[for="${cssEscape(checked.id)}"]`)?.textContent?.trim()) ||
      checked.value || 'Yes';
    lines.push({ seq, text: `${fieldLabel} - ${valueLabel}` });
  });

  // 3) Free-text-like controls in order of first meaningful entry
  document.querySelectorAll(`
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
  `).forEach(ctrl => {
    if (ctrl.closest('#legacy-mirror')) return;
    if (ctrl.dataset?.skip === 'true') return;
    if (ctrl.matches('input[type="radio"]')) return; // radios handled above
    if (ctrl.type && ctrl.type.toLowerCase() === 'checkbox') return; // skip plain checkboxes (pills are divs)

    const val = getSmartValue(ctrl);
    if (!hasText(val)) return;

    const seq = readSeq(ctrl);
    const label = getSmartLabel(ctrl);
    const isNarrative = ctrl.tagName?.toLowerCase?.() === 'textarea' || ctrl.isContentEditable;

    let text;
    if (isNarrative) {
      const v = val.trim();
      text = capFirst(v.endsWith('.') ? v : `${v}.`);
    } else {
      text = `${label} - ${val.trim()}`;
    }

    lines.push({ seq, text });
  });

  // Sort strictly by sequence; fallback by text to keep stable order for ties
  lines.sort((a, b) => (a.seq - b.seq) || a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));

  // Compose final flat output (no hard-coded section grouping)
  const outputText = lines.map(l => l.text).join('\n');

  // Write to editable textarea + modal
  if (outputArea) outputArea.value = outputText;
  if (outputContainer && outputContainer.style.display === 'none') outputContainer.style.display = 'block';
  if (modalText) modalText.textContent = outputText || 'No output generated.';
  if (modal) modal.style.display = 'flex';

  // Build action icons/buttons once
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

/* ===================
   Copy / Email / Close
   =================== */
async function copyOutput() {
  const outputArea = document.getElementById('output-text');
  const modalText = document.getElementById('outputText');
  const text = (outputArea && outputArea.value && outputArea.value.trim())
    ? outputArea.value.trim()
    : (modalText && modalText.textContent ? modalText.textContent.trim() : '');
  if (!text) return alert('Nothing to copy yet — please generate the report first.');
  try {
    if (navigator.clipboard?.writeText) {
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

/* =================================================
   Extra: header counters on load for current cards
   ================================================= */
window.addEventListener('load', () => {
  document.querySelectorAll('.card').forEach(updateCounters);
});
