document.addEventListener('DOMContentLoaded', function() {
    var profileCardToggle = document.getElementById('profileCardToggle');
    var messagingAssistantToggle = document.getElementById('messagingAssistantToggle');
    var profileCardStatus = document.getElementById('profileCardStatus');
    var messagingAssistantStatus = document.getElementById('messagingAssistantStatus');
    var apiKeyInput = document.getElementById('apiKeyInput');
    var saveApiKeyButton = document.getElementById('saveApiKey');
    var apiKeyStatus = document.getElementById('apiKeyStatus');
    var promptInput = document.getElementById('promptInput');
    var savePromptButton = document.getElementById('savePrompt');
    var promptStatus = document.getElementById('promptStatus');

    // Load the current state
    chrome.storage.sync.get(['profileCardEnabled', 'messagingAssistantEnabled', 'openaiApiKey', 'customPrompt'], function(data) {
        profileCardToggle.checked = data.profileCardEnabled || false;
        messagingAssistantToggle.checked = data.messagingAssistantEnabled || false;
        updateStatus(profileCardToggle, profileCardStatus);
        updateStatus(messagingAssistantToggle, messagingAssistantStatus);
        
        if (data.openaiApiKey) {
            apiKeyStatus.textContent = 'API Key is set';
        } else {
            apiKeyStatus.textContent = 'API Key is not set';
        }

        if (data.customPrompt) {
            promptInput.value = data.customPrompt;
            promptStatus.textContent = 'Custom prompt is set';
        } else {
            promptStatus.textContent = 'Using default prompt';
        }
    });

    profileCardToggle.addEventListener('change', function() {
        updateFeature('profileCard', this.checked);
    });

    messagingAssistantToggle.addEventListener('change', function() {
        updateFeature('messagingAssistant', this.checked);
    });

    function updateFeature(feature, isEnabled) {
        let storageKey = feature + 'Enabled';
        chrome.storage.sync.set({[storageKey]: isEnabled}, function() {
            let status = document.getElementById(feature + 'Status');
            updateStatus({checked: isEnabled}, status);
            // Notify content script of the change
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleFeature", feature: feature, enabled: isEnabled});
            });
        });
    }

    function updateStatus(toggle, statusElement) {
        statusElement.textContent = toggle.checked ? 'Enabled' : 'Disabled';
    }

    saveApiKeyButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value;
        chrome.storage.sync.set({openaiApiKey: apiKey}, function() {
            console.log('API key saved');
            apiKeyStatus.textContent = 'API Key saved successfully';
            apiKeyInput.value = '';
            // Send a message to content script to reinitialize OpenAI
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "reinitializeOpenAI"});
            });
        });
    });

    savePromptButton.addEventListener('click', function() {
        const customPrompt = promptInput.value;
        chrome.storage.sync.set({customPrompt: customPrompt}, function() {
            console.log('Custom prompt saved');
            promptStatus.textContent = 'Custom prompt saved successfully';
            // Notify content script of the new prompt
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "updatePrompt"});
            });
        });
    });

    // Add this at the end of the DOMContentLoaded event listener
    function triggerMessagePopulation() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "checkAndPopulateMessage"});
        });
    }

    // Trigger immediately when popup opens
    triggerMessagePopulation();

    // Trigger every 5 seconds for 1 minute
    let count = 0;
    const intervalId = setInterval(() => {
        if (count++ >= 12) { // 12 * 5 seconds = 60 seconds
            clearInterval(intervalId);
            return;
        }
        triggerMessagePopulation();
    }, 5000);
});