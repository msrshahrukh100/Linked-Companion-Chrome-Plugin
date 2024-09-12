console.log('Background script loaded');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background script:', request);
    // Log the last received message
    console.log('Last received message:', request.message);
    sendResponse({received: true});
});