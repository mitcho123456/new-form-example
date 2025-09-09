// State management
const symptomStates = new Map();
const formData = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeSymptomToggles();
    initializeFormInputs();
    initializeDynamicInstructions();
    updateAllCounters();
});

function initializeSymptomToggles() {
    const toggles = document.querySelectorAll('.symptom-toggle');
    
    toggles.forEach(toggle => {
        const symptomName = toggle.getAttribute('data-symptom');
        symptomStates.set(symptomName, 'neutral');
        
        toggle.addEventListener('click', () => {
            cycleSymptomState(toggle, symptomName);
        });
        
        // Add keyboard support
        toggle.setAttribute('tabindex', '0');
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cycleSymptomState(toggle, symptomName);
            }
        });
    });
}

function cycleSymptomState(toggle, symptomName) {
    const currentState = symptomStates.get(symptomName);
    let nextState;
    
    // Determine the next state based on current state
    switch (currentState) {
        case 'neutral':
            nextState = 'have';
            break;
        case 'have':
            nextState = 'donthave';
            break;
        case 'donthave':
            nextState = 'neutral';
            break;
        default:
            nextState = 'neutral';
    }
    
    // Update state
    symptomStates.set(symptomName, nextState);
    
    // Update UI
    updateToggleAppearance(toggle, nextState);
    updateCountersForGrid(toggle.closest('.card'));
    updateInstructionText(toggle.closest('.card'));
}

function updateToggleAppearance(toggle, state) {
    // Remove all state classes
    toggle.classList.remove('neutral', 'have', 'donthave');
    
    // Add the current state class
    if (state !== 'neutral') {
        toggle.classList.add(state);
    }
}

function updateCountersForGrid(card) {
    const toggles = card.querySelectorAll('.symptom-toggle');
    let haveCount = 0;
    let donthaveCount = 0;
    
    toggles.forEach(toggle => {
        const symptomName = toggle.getAttribute('data-symptom');
        const state = symptomStates.get(symptomName);
        
        if (state === 'have') haveCount++;
        if (state === 'donthave') donthaveCount++;
    });
    
    // Update counter displays
    const haveCounter = card.querySelector('[data-count-have]');
    const donthaveCounter = card.querySelector('[data-count-no]');
    
    if (haveCounter) {
        haveCounter.textContent = `${haveCount} have`;
        haveCounter.setAttribute('data-count-have', haveCount);
    }
    
    if (donthaveCounter) {
        donthaveCounter.textContent = `${donthaveCount} don't`;
        donthaveCounter.setAttribute('data-count-no', donthaveCount);
    }
}

function updateAllCounters() {
    const cards = document.querySelectorAll('.card[data-grid]');
    cards.forEach(card => updateCountersForGrid(card));
}

function updateInstructionText(card) {
    const instructionDiv = card.querySelector('.ux-instruction');
    if (!instructionDiv) return;
    
    const gridId = card.getAttribute('data-grid');
    let instructionText = '';
    let legendHtml = '';
    
    switch (gridId) {
        case 'generalGrid':
            instructionText = '**Tap symptoms to cycle through states:**';
            legendHtml = `
                <div class="legend">
                    <span class="neutral">Neutral</span>
                    <span class="have">Have</span>
                    <span class="donthave">Don't have</span>
                </div>
            `;
            break;
        case 'redFlagGrid':
            instructionText = '**Tap symptoms to cycle through states:**';
            legendHtml = `
                <div class="legend">
                    <span class="neutral">Neutral</span>
                    <span class="have">Have</span>
                    <span class="donthave">Don't have</span>
                </div>
            `;
            break;
        case 'drugGrid':
            instructionText = '**Tap medications to cycle through states:**';
            legendHtml = `
                <div class="legend">
                    <span class="neutral">Neutral</span>
                    <span class="have">Used</span>
                    <span class="donthave">Haven't used</span>
                </div>
            `;
            break;
        case 'historyGrid':
            instructionText = '**Tap conditions to cycle through states:**';
            legendHtml = `
                <div class="legend">
                    <span class="neutral">Neutral</span>
                    <span class="have">Have had</span>
                    <span class="donthave">Haven't had</span>
                </div>
            `;
            break;
    }
    
    instructionDiv.innerHTML = instructionText + legendHtml;
}

function initializeDynamicInstructions() {
    const cards = document.querySelectorAll('.card[data-grid]');
    cards.forEach(card => updateInstructionText(card));
}

function initializeFormInputs() {
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const key = input.id || input.getAttribute('id');
            if (key) {
                formData[key] = input.value;
            }
        });
    });
}

function toggleCard(header) {
    const card = header.closest('.card');
    card.classList.toggle('collapsed');
}

function generateOutput() {
    let output = [];
    
    // Add initial description
    const description = document.getElementById('description').value.trim();
    if (description) {
        output.push(`**Symptom onset and duration:** ${description}`);
        output.push('');
    }
    
    // Add symptoms by category
    addSymptomsToOutput(output, 'General Symptoms', 'generalGrid');
    addSymptomsToOutput(output, 'Red Flag Symptoms', 'redFlagGrid');
    addSymptomsToOutput(output, 'Recent Medication Use', 'drugGrid');
    addSymptomsToOutput(output, 'Medical History', 'historyGrid');
    
    // Add form data
    addFormDataToOutput(output);
    
    // Add expectations
    const expectations = document.getElementById('further-details').value.trim();
    if (expectations) {
        output.push(`**Expectations:** ${expectations}`);
        output.push('');
    }
    
    // Display output
    const outputText = output.join('\n');
    document.getElementById('outputText').value = outputText;
    document.getElementById('outputModal').style.display = 'flex';
}

function addSymptomsToOutput(output, categoryName, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    const toggles = grid.querySelectorAll('.symptom-toggle');
    const haveSymptoms = [];
    const donthaveSymptoms = [];
    
    toggles.forEach(toggle => {
        const symptomName = toggle.getAttribute('data-symptom').trim();
        const state = symptomStates.get(toggle.getAttribute('data-symptom'));
        
        if (state === 'have') {
            haveSymptoms.push(symptomName);
        } else if (state === 'donthave') {
            donthaveSymptoms.push(symptomName);
        }
    });
    
    if (haveSymptoms.length > 0 || donthaveSymptoms.length > 0) {
        output.push(`**${categoryName}:**`);
        
        if (haveSymptoms.length > 0) {
            const verb = getAppropriateVerb(gridId, true);
            output.push(`${verb}: ${haveSymptoms.join(', ')}`);
        }
        
        if (donthaveSymptoms.length > 0) {
            const verb = getAppropriateVerb(gridId, false);
            output.push(`${verb}: ${donthaveSymptoms.join(', ')}`);
        }
        
        output.push('');
    }
}

function getAppropriateVerb(gridId, isPositive) {
    switch (gridId) {
        case 'drugGrid':
            return isPositive ? 'Used' : 'Haven\'t used';
        case 'historyGrid':
            return isPositive ? 'Have had' : 'Haven\'t had';
        default:
            return isPositive ? 'Have' : 'Don\'t have';
    }
}

function addFormDataToOutput(output) {
    const formFields = [
        { id: 'Currently taking -', label: 'Currently taking' },
        { id: 'Drug Allergies -', label: 'Drug allergies' },
        { id: 'Past Medical History -', label: 'Past medical history' },
        { id: 'Past Surgical History -', label: 'Past surgical history' },
        { id: ' Response to previous treatments or interventions -', label: 'Response to previous treatments' },
        { id: 'Smoking History -', label: 'Smoking history' },
        { id: 'Alcohol History -', label: 'Alcohol history' },
        { id: 'Recreational drug use -', label: 'Recreational drug use' }
    ];
    
    formFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && element.value.trim()) {
            output.push(`**${field.label}:** ${element.value.trim()}`);
            output.push('');
        }
    });
}

function closeOutput() {
    document.getElementById('outputModal').style.display = 'none';
}

function copyOutput() {
    const outputText = document.getElementById('outputText');
    outputText.select();
    document.execCommand('copy');
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}

function emailOutput() {
    const outputText = document.getElementById('outputText').value;
    const subject = 'Medical Symptom Report';
    const body = encodeURIComponent(outputText);
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
}
