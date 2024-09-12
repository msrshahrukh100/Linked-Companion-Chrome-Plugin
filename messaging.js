(function() {
    console.log('Messaging script starting to load');

    chrome.runtime.sendMessage({action: "messagingScriptLoaded"}, function(response) {
        console.log("Response from background script:", response);
    });

    console.log('Messaging script loaded and running');

    function initMessagingAssistant() {
        console.log('Initializing Messaging Assistant');
        if (isMessagingPage()) {
            waitForElement('.msg-form__contenteditable', addAISuggestButton);
            logLastMessage();
            // Set up an interval to check for new messages periodically
            setInterval(logLastMessage, 5000); // Check every 5 seconds
        }
    }

    function isMessagingPage() {
        return window.location.href.includes('linkedin.com/messaging');
    }

    function waitForElement(selector, callback) {
        const maxAttempts = 10;
        let attempts = 0;

        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkElement, 1000); // Check again after 1 second
            } else {
                console.log(`Element ${selector} not found after ${maxAttempts} attempts`);
            }
        }

        checkElement();
    }

    function addAISuggestButton(messageForm) {
        console.log('Attempting to add AI Suggest button');
        if (document.getElementById('ai-suggest-button')) {
            console.log('AI Suggest button already exists');
            return;
        }

        const aiSuggestButton = document.createElement('button');
        aiSuggestButton.id = 'ai-suggest-button';
        aiSuggestButton.className = 'msg-form__footer-action artdeco-button artdeco-button--circle artdeco-button--muted artdeco-button--1 artdeco-button--tertiary';
        aiSuggestButton.innerHTML = `
            <li-icon aria-hidden="true" type="lightbulb-icon" class="artdeco-button__icon" size="small">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-supported-dps="16x16" fill="currentColor" width="16" height="16">
                    <path d="M8 1a5 5 0 013.91 8.1l-.16.17v2.23A1.5 1.5 0 0110.25 13h-4.5A1.5 1.5 0 014 11.5V9.27l-.16-.17A5 5 0 018 1zm0 11.5h4.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-4.5v-2zm-1 2H3.5a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5H7v2zm1-3H5v-1h4v1zm2.5-2.5l.16-.17a4 4 0 10-5.32 0l.16.17V9h5V8.5z"/>
                </svg>
            </li-icon>
            <span class="artdeco-button__text">AI Suggest</span>
        `;
        aiSuggestButton.addEventListener('click', handleAISuggest);

        waitForElement('.msg-form__right-actions', (actionsContainer) => {
            actionsContainer.insertBefore(aiSuggestButton, actionsContainer.firstChild);
            console.log('AI Suggest button added successfully');
        });
    }

    function handleAISuggest() {
        console.log('AI Suggest button clicked');
        // Implement AI suggestion logic here
    }

    function logLastMessage() {
        console.log('Attempting to log last message');
        waitForElement('.msg-s-event-listitem__body', () => {
            const messages = document.querySelectorAll('.msg-s-event-listitem__body');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageText = lastMessage.querySelector('.msg-s-event-listitem__body-text');
                if (messageText) {
                    const lastMessageContent = messageText.textContent.trim();
                    console.log('Last message:', lastMessageContent);
                    // Send the last message to the background script
                    chrome.runtime.sendMessage({action: "lastMessage", message: lastMessageContent}, function(response) {
                        console.log("Response from background script:", response);
                    });
                } else {
                    console.log('No message text found in the last message');
                }
            } else {
                console.log('No messages found');
            }
        });
    }

    // Initialize immediately when loaded
    initMessagingAssistant();

    // Listen for URL changes
    let messagingLastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== messagingLastUrl) {
            messagingLastUrl = url;
            initMessagingAssistant();
        }
    }).observe(document, {subtree: true, childList: true});

    // Re-run initialization periodically
    setInterval(initMessagingAssistant, 5000);

    console.log('Messaging script finished loading');
})();