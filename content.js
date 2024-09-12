let card = null;
let isProfileCardEnabled = false; // Initialize to false
let isMessagingAssistantEnabled = false; // Initialize to false
let isUserEditing = false;
let isMessageSet = false;

console.log('Content script starting to load');

chrome.runtime.sendMessage({action: "contentScriptLoaded"}, function(response) {
    console.log("Response from background script:", response);
});

function createCard() {
    if (!card) {
        card = document.createElement('div');
        card.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ccc;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000000;
            width: 300px;
        `;
        
        const nameElement = document.createElement('h2');
        nameElement.id = 'cardName';
        nameElement.style.margin = '0 0 10px 0';
        
        const messageElement = document.createElement('p');
        messageElement.id = 'customMessage';
        messageElement.style.margin = '0 0 10px 0';
        messageElement.style.minHeight = '100px'; // Ensure there's space for the message
        
        const loadingSpinner = document.createElement('div');
        loadingSpinner.id = 'loadingSpinner';
        loadingSpinner.style.cssText = `
            display: none;
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 10px auto;
        `;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Message';
        copyButton.addEventListener('click', copyCustomMessage);
        
        const notificationElement = document.createElement('span');
        notificationElement.id = 'copyNotification';
        notificationElement.style.cssText = `
            display: none;
            color: green;
            margin-left: 10px;
            transition: opacity 0.5s ease-in-out;
        `;
        
        card.appendChild(nameElement);
        card.appendChild(messageElement);
        card.appendChild(loadingSpinner);
        card.appendChild(copyButton);
        card.appendChild(notificationElement);
        document.body.appendChild(card);
        
        // Add the keyframe animation for the spinner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function showCard(name) {
    if (!card) createCard();
    document.getElementById('cardName').textContent = name;
    card.style.display = 'block';
    generateCustomMessage(); // Only called when the card is shown
}

function hideCard() {
    if (card) card.style.display = 'none';
}

function getProfileInfo() {
    const nameElement = document.querySelector('.text-heading-xlarge');
    const headlineElement = document.querySelector('.text-body-medium');
    if (nameElement) {
        const name = nameElement.textContent.trim();
        const headline = headlineElement ? headlineElement.textContent.trim() : '';
        return { name, headline };
    }
    return null;
}

function checkForProfilePage() {
    if (window.location.href.includes('linkedin.com/messaging')) {
        console.log('On messaging page, not showing profile card');
        hideCard();
        return;
    }

    if (!isProfileCardEnabled) {
        console.log('Profile Card feature is disabled');
        hideCard();
        return;
    }

    const profileInfo = getProfileInfo();
    if (profileInfo) {
        showCard(profileInfo.name);
        // We'll only generate the message if the card is shown
    } else {
        hideCard();
    }
}

function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'block';
    }
    const messageElement = document.getElementById('customMessage');
    if (messageElement) {
        messageElement.textContent = 'Generating message...';
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

async function generateCustomMessage() {
    if (!isProfileCardEnabled) {
        console.log('Profile Card feature is disabled. Skipping message generation.');
        return;
    }

    const profileInfo = getProfileInfo();
    if (!profileInfo) return;

    try {
        showLoadingSpinner();
        await initializeOpenAI();

        // Get the system prompt from storage
        const systemPrompt = await new Promise((resolve) => {
            chrome.storage.sync.get('customPrompt', function(data) {
                resolve(data.customPrompt);
            });
        });

        let formattedSystemPrompt;
        if (systemPrompt) {
            // Replace placeholders in the system prompt
            formattedSystemPrompt = systemPrompt.replace('{name}', profileInfo.name).replace('{headline}', profileInfo.headline);
        } else {
            // Use default system prompt if no custom prompt is set
            formattedSystemPrompt = `You are an AI assistant helping to generate personalized LinkedIn connection requests. Be friendly and professional.`;
        }

        // User prompt
        const userPrompt = `Generate a personalized LinkedIn connection request message for ${profileInfo.name}, who is a ${profileInfo.headline}. The message should be under 200 characters.`;

        console.log('Preparing to make OpenAI API call for message generation');
        const response = await getOpenAIResponse(formattedSystemPrompt, userPrompt);
        console.log('OpenAI response for message generation:', response);
        document.getElementById('customMessage').textContent = response;
        triggerCustomMessagePopulation(response); // Pass the generated message to this function
    } catch (error) {
        console.error('Error generating custom message:', error);
        document.getElementById('customMessage').textContent = `Failed to generate message: ${error.message}. Please check your API key and refresh the page.`;
    } finally {
        hideLoadingSpinner();
    }
}

function copyCustomMessage() {
    const messageElement = document.getElementById('customMessage');
    const message = messageElement.textContent;
    navigator.clipboard.writeText(message).then(() => {
        showCopyNotification('Copied!');
    }).catch(err => {
        console.error('Failed to copy message: ', err);
        showCopyNotification('Failed to copy', 'red');
    });
}

function showCopyNotification(text, color = 'green') {
    const notification = document.getElementById('copyNotification');
    notification.textContent = text;
    notification.style.color = color;
    notification.style.display = 'inline';
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, 1500);
}

// Initialize OpenAI
async function initializeOpenAI() {
    return new Promise((resolve, reject) => {
        if (window.openai && typeof window.openai.initialize === 'function') {
            chrome.storage.sync.get('openaiApiKey', function(data) {
                if (data.openaiApiKey) {
                    window.openai.initialize(data.openaiApiKey);
                    console.log('OpenAI initialized with API key');
                    resolve();
                } else {
                    reject(new Error('OpenAI API key not found in storage. Please set your API key in the extension popup.'));
                }
            });
        } else {
            console.error('OpenAI object not found. Attempting to reload openai.js');
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('openai.js');
            script.onload = () => {
                chrome.storage.sync.get('openaiApiKey', function(data) {
                    if (data.openaiApiKey) {
                        window.openai.initialize(data.openaiApiKey);
                        console.log('OpenAI initialized with API key after reloading');
                        resolve();
                    } else {
                        reject(new Error('OpenAI API key not found in storage. Please set your API key in the extension popup.'));
                    }
                });
            };
            script.onerror = () => {
                reject(new Error('Failed to load openai.js. Please check the file and try again.'));
            };
            document.head.appendChild(script);
        }
    });
}

// Function to use OpenAI
async function getOpenAIResponse(systemPrompt, userPrompt) {
    if (!window.openai || typeof window.openai.sendPrompt !== 'function') {
        throw new Error('OpenAI not initialized correctly. Please check your API key and refresh the page.');
    }
    try {
        console.log('Making OpenAI API call with prompts:', { systemPrompt, userPrompt });
        const response = await window.openai.sendPrompt(systemPrompt, userPrompt);
        console.log('OpenAI API response received:', response);
        return response;
    } catch (error) {
        console.error('Error getting OpenAI response:', error);
        throw error;
    }
}

// Initialize the extension
chrome.storage.sync.get(['profileCardEnabled', 'messagingAssistantEnabled'], function(data) {
    isProfileCardEnabled = data.profileCardEnabled || false;
    isMessagingAssistantEnabled = data.messagingAssistantEnabled || false;
    console.log('Profile Card feature initialized as:', isProfileCardEnabled);
    console.log('Messaging Assistant feature initialized as:', isMessagingAssistantEnabled);
    if (isProfileCardEnabled) {
        createCard();
        checkForProfilePage();
    }
});

// Listen for URL changes (for single-page application navigation)
let contentLastUrl = location.href; 
new MutationObserver(() => {
    const url = location.href;
    if (url !== contentLastUrl) {
        contentLastUrl = url;
        checkForProfilePage();
    }
}).observe(document, {subtree: true, childList: true});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "toggleFeature") {
        if (request.feature === "profileCard") {
            isProfileCardEnabled = request.enabled;
            console.log('Profile Card feature ' + (isProfileCardEnabled ? 'activated' : 'deactivated'));
            if (isProfileCardEnabled) {
                checkForProfilePage();
            } else {
                hideCard();
            }
        } else if (request.feature === "messagingAssistant") {
            isMessagingAssistantEnabled = request.enabled;
            console.log('Messaging Assistant feature ' + (isMessagingAssistantEnabled ? 'activated' : 'deactivated'));
            // You can add logic here to enable/disable messaging assistant features
        }
        sendResponse({});
    } else if (request.action === "reinitializeOpenAI") {
        initializeOpenAI()
            .then(() => {
                console.log('OpenAI reinitialized successfully');
                sendResponse({success: true});
            })
            .catch(error => {
                console.error('Failed to reinitialize OpenAI:', error);
                sendResponse({success: false, error: error.message});
            });
        return true; // Indicates that the response is asynchronous
    } else if (request.action === "updatePrompt") {
        // Regenerate the message with the new prompt only if Profile Card is enabled
        if (isProfileCardEnabled) {
            generateCustomMessage();
        }
    } else if (request.action === "checkAndPopulateMessage") {
        if (isProfileCardEnabled) {
            const customMessage = document.getElementById('customMessage');
            if (customMessage && customMessage.textContent && customMessage.textContent !== 'Generating message...') {
                triggerCustomMessagePopulation(customMessage.textContent);
            }
        }
    }
});

console.log('Content script finished loading');

function setCustomMessage(message) {
    const textarea = document.querySelector('textarea#custom-message.connect-button-send-invite__custom-message');
    if (textarea && !isMessageSet) {
        textarea.value = message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Custom message set in textarea');
        isMessageSet = true;
        return true;
    } else {
        console.log('Custom message textarea not found or message already set');
        return false;
    }
}

function watchForCustomMessageTextarea(message) {
    const observer = new MutationObserver(() => {
        if (setCustomMessage(message)) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try to set the message immediately in case the textarea already exists
    setCustomMessage(message);
}

function triggerCustomMessagePopulation(message) {
    if (message) {
        watchForCustomMessageTextarea(message);
    }
}