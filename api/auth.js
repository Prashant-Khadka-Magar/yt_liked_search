// api/auth.js

export function authenticateWithGoogle() {
  return new Promise((resolve, reject) => {
    const clientId = "551812743698-rl8tab59h603h3h75bvrehhe2nimh1ik.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = "https://www.googleapis.com/auth/youtube.readonly";

    const authUrl = `https://accounts.google.com/o/oauth2/auth` +
      `?client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

      const fragment = new URL(redirectUrl).hash.substring(1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");

      if (accessToken) {
        console.log("Access Token:", accessToken);
        resolve(accessToken);
      } else {
        reject("Access token not found");
      }
    });
  });
}

