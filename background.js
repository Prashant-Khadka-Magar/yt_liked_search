chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
//   console.log(data);

  chrome.storage.local.set({title: data.title});
  sendResponse({ success: true });
  return true;
});
