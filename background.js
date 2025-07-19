// background.js - Enhanced version with better state management
chrome.runtime.onInstalled.addListener(() => {
  console.log("YT Liked Search extension installed.");
  
  // Initialize storage on install
  chrome.storage.local.set({
    isAuthenticated: false,
    authToken: null,
    tokenExpiry: null,
    likedVideos: [],
    lastSync: null
  });
});

// Handle authentication state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'clearCache') {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'checkAuth') {
    chrome.storage.local.get(['isAuthenticated', 'tokenExpiry'], (result) => {
      const isValid = result.isAuthenticated && 
                     result.tokenExpiry && 
                     Date.now() < result.tokenExpiry;
      sendResponse({ authenticated: isValid });
    });
    return true;
  }
});

// Clean up expired tokens periodically
chrome.alarms.create('tokenCleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tokenCleanup') {
    chrome.storage.local.get(['tokenExpiry'], (result) => {
      if (result.tokenExpiry && Date.now() >= result.tokenExpiry) {
        // Token has expired, clean up
        chrome.storage.local.update({
          authToken: null,
          tokenExpiry: null,
          isAuthenticated: false
        });
        console.log('Cleaned up expired token');
      }
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("YT Liked Search extension started.");
});