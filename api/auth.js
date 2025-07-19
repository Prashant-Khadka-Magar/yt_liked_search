// api/auth.js - Fixed version with persistent authentication (compatible with your setup)
export async function authenticateWithGoogle() {
  return new Promise((resolve, reject) => {
    // First check if we have a cached token
    chrome.storage.local.get(['authToken', 'tokenExpiry'], async (result) => {
      if (result.authToken && result.tokenExpiry && Date.now() < result.tokenExpiry) {
        console.log('Using cached token');
        resolve(result.authToken);
        return;
      }

      // If no valid cached token, get a new one using your existing method
      const clientId = "551812743698-rl8tab59h603h3h75bvrehhe2nimh1ik.apps.googleusercontent.com";
      const redirectUri = chrome.identity.getRedirectURL();
      const scope = "https://www.googleapis.com/auth/youtube.readonly";

      const authUrl = `https://accounts.google.com/o/oauth2/auth` +
        `?client_id=${clientId}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}`;

      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Auth error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (!redirectUrl) {
          reject(new Error('No redirect URL received'));
          return;
        }

        try {
          const fragment = new URL(redirectUrl).hash.substring(1);
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const expiresIn = params.get("expires_in");

          if (accessToken) {
            console.log("Access Token received");
            
            // Calculate expiry time (default to 1 hour if not provided)
            const expiryTime = Date.now() + ((expiresIn ? parseInt(expiresIn) : 3600) * 1000);
            
            // Cache the token with expiration
            chrome.storage.local.set({
              authToken: accessToken,
              tokenExpiry: expiryTime,
              isAuthenticated: true
            }, () => {
              console.log('Token cached successfully');
              resolve(accessToken);
            });
          } else {
            reject(new Error("Access token not found in response"));
          }
        } catch (error) {
          console.error('Error parsing auth response:', error);
          reject(error);
        }
      });
    });
  });
}

export async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'tokenExpiry'], (result) => {
      if (result.authToken && result.tokenExpiry && Date.now() < result.tokenExpiry) {
        resolve(result.authToken);
      } else {
        resolve(null);
      }
    });
  });
}

export async function isAuthenticated() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isAuthenticated', 'tokenExpiry'], (result) => {
      const isValid = result.isAuthenticated && 
                     result.tokenExpiry && 
                     Date.now() < result.tokenExpiry;
      resolve(isValid);
    });
  });
}

export async function logout() {
  return new Promise((resolve) => {
    // Clear all auth data from storage
    chrome.storage.local.remove(['authToken', 'tokenExpiry', 'isAuthenticated'], () => {
      console.log('Auth data cleared from storage');
      resolve();
    });
  });
}