document.addEventListener('DOMContentLoaded', function() {
    var toggleSwitch = document.getElementById('extensionToggle');
    var statusText = document.getElementById('status');
    var apiKeyInput = document.getElementById('apiKeyInput');
    var saveApiKeyButton = document.getElementById('saveApiKey');
    var apiKeyStatus = document.getElementById('apiKeyStatus');

    // Load the current state
    chrome.storage.sync.get(['enabled', 'openaiApiKey'], function(data) {
        toggleSwitch.checked = data.enabled || false;
        updateStatus(toggleSwitch.checked);
        if (data.openaiApiKey) {
            apiKeyStatus.textContent = 'API Key is set';
        } else {
            apiKeyStatus.textContent = 'API Key is not set';
        }
    });

    toggleSwitch.addEventListener('change', function() {
        var isEnabled = this.checked;
        chrome.storage.sync.set({enabled: isEnabled}, function() {
            updateStatus(isEnabled);
            // Notify content script of the change
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleExtension", enabled: isEnabled});
            });
        });
    });

    function updateStatus(isEnabled) {
        statusText.textContent = isEnabled ? 'Assistant is enabled on LinkedIn' : 'Assistant is disabled on LinkedIn';
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

    var promptInput = document.getElementById('promptInput');
    var savePromptButton = document.getElementById('savePrompt');
    var promptStatus = document.getElementById('promptStatus');

    // Load the current prompt
    chrome.storage.sync.get('customPrompt', function(data) {
        if (data.customPrompt) {
            promptInput.value = data.customPrompt;
            promptStatus.textContent = 'Custom prompt is set';
        } else {
            promptStatus.textContent = 'Using default prompt';
        }
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