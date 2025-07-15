
// popup.js - Fixed version with proper stats display
import { authenticateWithGoogle } from '../api/auth.js';
import { 
  getAllLikedVideos, 
  getCachedVideos, 
  setCachedVideos, 
  shouldRefreshCache,
  searchVideos 
} from '../api/youtube-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('auth-btn');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results');
  const userView = document.getElementById('user-view');
  const loginView = document.getElementById('login-view');
  const searchSection = document.getElementById('search-section');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const refreshBtn = document.getElementById('refresh-btn');
  const statusDiv = document.getElementById('status');
  const statsDiv = document.getElementById('stats');
  const totalVideosSpan = document.getElementById('total-videos');
  const lastSyncSpan = document.getElementById('last-sync');

  let allLikedVideos = [];
  let currentToken = null;

  function updateStats(videoCount, lastSync) {
    if (totalVideosSpan) {
      totalVideosSpan.textContent = videoCount;
    }
    if (lastSyncSpan && lastSync) {
      const syncDate = new Date(lastSync);
      lastSyncSpan.textContent = syncDate.toLocaleString();
    }
    if (statsDiv) {
      statsDiv.classList.remove('hidden');
    }
  }

  function renderVideos(videos, append = false) {
    if (!append) {
      resultsContainer.innerHTML = '';
    }
    
    if (videos.length === 0 && !append) {
      resultsContainer.innerHTML = '<div class="no-results">No videos found matching your search.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    videos.forEach(video => {
      const videoElement = createVideoElement(video);
      fragment.appendChild(videoElement);
    });
    
    resultsContainer.appendChild(fragment);
  }

  function createVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'video-item';
    
    const title = escapeHtml(video.snippet.title);
    const thumbnailUrl = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url;
    const videoId = video.id;
    const channelTitle = escapeHtml(video.snippet.channelTitle);
    const publishedAt = new Date(video.snippet.publishedAt).toLocaleDateString();

    div.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
        <img src="${thumbnailUrl}" alt="Thumbnail" loading="lazy">
        <div class="video-content">
          <div class="video-title">${title}</div>
          <div class="video-channel">${channelTitle}</div>
          <div class="video-date">${publishedAt}</div>
        </div>
      </a>
    `;
    
    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoading(message = 'Loading...') {
    loadingDiv.textContent = message;
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
  }

  function hideLoading() {
    loadingDiv.classList.add('hidden');
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    hideLoading();
  }

  function updateStatus(message) {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.classList.remove('hidden');
    }
  }

  async function loadLikedVideos(forceRefresh = false) {
    try {
      // Check cache first
      const cached = await getCachedVideos();
      
      if (!forceRefresh && cached.videos.length > 0 && !shouldRefreshCache(cached.lastSync)) {
        allLikedVideos = cached.videos;
        updateStatus(`Loaded ${allLikedVideos.length} videos from cache`);
        updateStats(allLikedVideos.length, cached.lastSync);
        renderVideos(allLikedVideos);
        return;
      }

      // Fetch fresh data
      showLoading('Fetching your liked videos...');
      
      const videos = await getAllLikedVideos(currentToken, (progress) => {
        const message = `Loading... ${progress.currentCount} videos found (Page ${progress.pageCount})`;
        showLoading(message);
      });

      allLikedVideos = videos;
      const currentTime = Date.now();
      await setCachedVideos(videos);
      
      hideLoading();
      updateStatus(`Successfully loaded ${allLikedVideos.length} videos`);
      updateStats(allLikedVideos.length, currentTime);
      renderVideos(allLikedVideos);
      
    } catch (error) {
      console.error('Error loading liked videos:', error);
      showError('Failed to load liked videos. Please try again.');
    }
  }

  // Enhanced search with debouncing + instant search option
  let searchTimeout;
  function performSearch(immediate = false) {
    clearTimeout(searchTimeout);
    
    const executeSearch = () => {
      const query = searchInput.value.trim();
      
      if (!query) {
        renderVideos(allLikedVideos);
        updateStatus(`Showing all ${allLikedVideos.length} videos`);
        return;
      }

      const filtered = searchVideos(allLikedVideos, query);
      renderVideos(filtered);
      updateStatus(`Found ${filtered.length} videos matching "${query}"`);
    };

    if (immediate) {
      executeSearch();
    } else {
      searchTimeout = setTimeout(executeSearch, 300);
    }
  }

  // Event listeners with hybrid approach
  loginBtn.addEventListener('click', async () => {
    try {
      showLoading('Authenticating...');
      currentToken = await authenticateWithGoogle();
      
      loginView.classList.add('hidden');
      userView.classList.remove('hidden');
      searchSection.classList.remove('hidden');
      
      hideLoading();
      await loadLikedVideos();
      
    } catch (err) {
      console.error("Login failed:", err);
      showError('Authentication failed. Please try again.');
    }
  });

  // Search button for immediate search
  searchBtn.addEventListener('click', () => performSearch(true));
  
  // Debounced search as user types
  searchInput.addEventListener('input', () => performSearch(false));
  
  // Enter key for immediate search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(true);
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLikedVideos(true);
    });
  }

  // Load cached data on startup
  getCachedVideos().then(cached => {
    if (cached.videos.length > 0) {
      allLikedVideos = cached.videos;
      updateStatus(`Loaded ${allLikedVideos.length} videos from cache`);
      updateStats(allLikedVideos.length, cached.lastSync);
      renderVideos(allLikedVideos);
    }
  });
});

// background.js - Simplified version
chrome.runtime.onInstalled.addListener(() => {
  console.log("YT Liked Search extension installed.");
});

// Optional: Add background sync if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'clearCache') {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});