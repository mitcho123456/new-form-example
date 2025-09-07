// Collapse/expand cards
function toggleCard(header) {
  header.parentElement.classList.toggle('collapsed');
}

// ===== Legacy-compatible helpers kept intact =====
function capitalizeAndAddFullStop(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');
}

function formatCheckboxText(column, checked) {
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
          const lastInput = checked[i-1] || '';
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
  if (column === 2) {
    text = text.trim() + '\n';
  }
  return text;
}

function generateOutput() {
  return new Promise(resolve => {
    const outputContainer = document.getElementById('output-container');
    outputContainer.innerHTML = '';
    let outputText = '';

    const sections = Array.from(document.getElementsByClassName('form-section')).sort((a, b) => {
      return parseInt(a.id) - parseInt(b.id);
    });

    sections.forEach(section => {
      const description = section.querySelector('textarea:not([data-associated-checkbox])');
      if (description && description.value.trim()) {
        outputText += capitalizeAndAddFullStop(description.value.trim()) + '\n';
      }

      if (section.id === "mixed") {
        const inputFields = section.querySelectorAll('input[type="text"], input[type="number"]');
        inputFields.forEach(input => {
          if (input.value.trim()) {
            outputText += input.id + ' ' + input.value.trim() + '\n';
          }
        });
      }

      const column1Checkboxes = section.querySelectorAll('input.column-1-symptom-checkbox');
      const column2Checkboxes = section.querySelectorAll('input.column-2-symptom-checkbox');

      const column1Checked = [];
      const column2Checked = [];

      column1Checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          const textareaId = checkbox.getAttribute('data-textarea');
          const textarea = textareaId ? document.getElementById(textareaId) : null;
          const associatedText = textarea && textarea.value.trim() ? ' ' + textarea.value.trim() : '';
          column1Checked.push(checkbox.id + associatedText);
        }
      });

      column2Checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          const textareaId = checkbox.getAttribute('data-textarea');
          const textarea = textareaId ? document.getElementById(textareaId) : null;
          const associatedText = textarea && textarea.value.trim() ? ' ' + textarea.value.trim() : '';
          column2Checked.push(checkbox.id + associatedText);
        }
      });

      if (column1Checked.length > 0) {
        outputText += formatCheckboxText(1, column1Checked);
      }
      if (column2Checked.length > 0) {
        const formattedText = formatCheckboxText(2, column2Checked);
        outputText += '\n' + formattedText;
      }
    });

    // Write text
    outputContainer.textContent = outputText.trim();

    // Append action icons under output
    const imagesContainer = document.createElement('div');
    imagesContainer.style.display = 'flex';
    imagesContainer.style.flexWrap = 'wrap';
    imagesContainer.style.gap = '10px';
    imagesContainer.style.marginTop = '10px';

    const anchorEmail = document.createElement('a');
    anchorEmail.href = '#';
    anchorEmail.title = 'Email Report';
    const imgEmail = document.createElement('img');
    imgEmail.src = 'https://checksymptoms.co.uk/wp-content/uploads/2024/04/email.gif';
    imgEmail.alt = 'Click to Email';
    imgEmail.style.width = '180px';
    imgEmail.style.height = 'auto';
    imgEmail.addEventListener('click', emailOutput);
    anchorEmail.appendChild(imgEmail);
    imagesContainer.appendChild(anchorEmail);

    const anchorCopyInfo = document.createElement('a');
    anchorCopyInfo.href = '#';
    anchorCopyInfo.title = 'Copy Report';
    const imgCopyInfo = document.createElement('img');
    imgCopyInfo.src = 'https://checksymptoms.co.uk/wp-content/uploads/2024/07/copy-icon.png';
    imgCopyInfo.alt = 'Click to copy information';
    imgCopyInfo.style.width = '100px';
    imgCopyInfo.style.height = 'auto';
    imgCopyInfo.addEventListener('click', copyOutput);
    anchorCopyInfo.appendChild(imgCopyInfo);
    imagesContainer.appendChild(anchorCopyInfo);

    outputContainer.appendChild(imagesContainer);
    resolve();
  });
}

async function copyOutput() {
  const outputText = document.getElementById('output-text').value.trim();
  if (!outputText) {
    alert('Nothing to copy yet — please generate the report first.');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(outputText);
    } else {
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = outputText;
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextarea);
    }
    alert('Report copied to clipboard.');
  } catch (e) {
    alert('Copy failed. You can select the text and copy manually.');
  }
}

function emailOutput() {
  const outputText = document.getElementById('output-text').value.trim();
  if (!outputText) {
    alert('Please generate the report before sending an email.');
    return;
  }
  const subject = encodeURIComponent('Abdominal pain symptom form for ');
  const body = encodeURIComponent(outputText);
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
}

function closeOutput() {
  document.getElementById('outputModal').style.display = 'none';
}

// ===== Dashboard → Legacy adapter (tri-state pills → legacy checkboxes, auto-headers) =====
(function() {
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

  const legacy = document.createElement('div');
  legacy.id = 'legacy-mirror';
  legacy.style.display = 'none';

  // Build legacy sections matching the legacy script expectations
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

    // Tri-state behavior across ALL grids
    document.querySelectorAll('.symptom-toggle').forEach(pill => {
      pill.addEventListener('click', () => {
        cycleTriState(pill); // UI cycle
        syncPillToLegacy(pill); // mirror to legacy checkbox
        updateHeadersForGrid(closestGridId(pill)); // auto header once per column
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

    // Sync pretty inputs → legacy IDs (including meds & lifestyle)
    wireInputs();

    // Seed counters
    document.querySelectorAll('.card').forEach(updateCounters);
  });

  function mkSection(id) {
    const s = document.createElement('div');
    s.className = 'form-section';
    s.id = id;
    return s;
  }

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

  function cssEscape(id) {
    return (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/([ #.;,()%&!+])/g, '\\$1');
  }

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
    const headers = GROUP_HEADERS[gridId];
    // Column headers (auto-checked later)
    sec.append(mkCheckbox(headers.col1, 'column-1-symptom-checkbox'), mkCheckbox(headers.col2, 'column-2-symptom-checkbox'));
    // Items: add both positive and negative IDs (column 1 and 2)
    legacyIds.forEach(legacyId => {
      sec.append(mkCheckbox(legacyId, 'column-1-symptom-checkbox'));
      sec.append(mkCheckbox(makeNegativeId(legacyId), 'column-2-symptom-checkbox'));
    });
  }

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

  function syncPillToLegacy(pill) {
    const key = normalizeKey(pill.dataset.symptom);
    const base = LEGACY_ID[key];
    if (!base) return;
    const posId = base;
    const negId = makeNegativeId(base);
    // neutral clears both; have checks pos; donthave checks neg
    if (!pill.classList.contains('have') && !pill.classList.contains('donthave')) {
      setLegacyChecked(posId, false);
      setLegacyChecked(negId, false);
    } else if (pill.classList.contains('have')) {
      setLegacyChecked(posId, true);
      setLegacyChecked(negId, false);
    } else { // donthave
      setLegacyChecked(posId, false);
      setLegacyChecked(negId, true);
    }
  }

  function wireInputs() {
    const map = [
      // initial info
      ['description', 'description', 'textarea'],
      ['lastPeriod', 'Last menstrual period-'],
      // pain
      ['painLocation', 'Pain located in'],
      ['painRadiation', 'Radiates to'],
      ['painCharacter', 'Character of pain is'],
      ['painAssociated', 'Pain is associated with'],
      ['painRelief', 'Alleviated by'],
      ['painWorsen', 'Pain is exacerbated by'],
      ['painSeverity', 'Pain severity -'],
      // meds & lifestyle into legacy "mixed" section (as inputs)
      ['currentMeds', 'Currently taking -'],
      ['drugAllergies', 'Drug Allergies -'],
      ['medicalConditions', 'Past Medical History -'],
      ['surgicalHistory', 'Past Surgical History -'],
      ['prevResponse', ' Response to previous treatments or interventions -'],
      ['smokingHistory', 'Smoking History -'],
      ['alcoholHistory', 'Alcohol History -'],
      ['drugUse', 'Recreational drug use -'],
      // additional free text
      ['additionalDetails', 'further-details', 'textarea']
    ];
    const legacyRoot = document.getElementById('legacy-mirror');
    map.forEach(([srcId, legacyId, type]) => {
      const src = document.getElementById(srcId);
      if (!src) return;
      let target = legacyRoot.querySelector('#' + cssEscape(legacyId));
      if (!target) {
        target = document.createElement(type === 'textarea' ? 'textarea' : 'input');
        if (type !== 'textarea') target.type = 'text';
        target.id = legacyId;
        const painIds = ['Pain located in', 'Radiates to', 'Character of pain is', 'Pain is associated with', 'Alleviated by', 'Pain is exacerbated by', 'Pain severity -'];
        let bucket = sections.mixed;
        if (legacyId === 'description' || legacyId === 'Last menstrual period-') bucket = sections.s1;
        if (painIds.includes(legacyId)) bucket = sections.s2;
        if (legacyId === 'further-details') bucket = sections.add;
        bucket.appendChild(target);
      }
      src.addEventListener('input', () => {
        target.value = src.value;
      });
    });
  }

  function normalizeKey(s) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
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
    const card = pill.closest('.card');
    return card ? card.getAttribute('data-grid') : null;
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
})();

// Enhance instruction banners (ensure legend is present)
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
