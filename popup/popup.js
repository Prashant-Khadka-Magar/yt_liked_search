
import { authenticateWithGoogle, isAuthenticated, getStoredToken, logout } from '../api/auth.js';
import { 
  getAllLikedVideos, 
  getCachedVideos, 
  setCachedVideos, 
  shouldRefreshCache,
  searchVideos 
} from '../api/youtube-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('auth-btn');
  const logoutBtn = document.getElementById('logout-btn');
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

  function showAuthenticatedView() {
    loginView.classList.add('hidden');
    userView.classList.remove('hidden');
    searchSection.classList.remove('hidden');
  }

  function showLoginView() {
    loginView.classList.remove('hidden');
    userView.classList.add('hidden');
    searchSection.classList.add('hidden');
  }

  async function loadLikedVideos(forceRefresh = false) {
    try {
      if (!currentToken) {
        currentToken = await getStoredToken();
        if (!currentToken) {
          throw new Error('No authentication token available');
        }
      }

      const cached = await getCachedVideos();
      
      if (!forceRefresh && cached.videos.length > 0 && !shouldRefreshCache(cached.lastSync)) {
        allLikedVideos = cached.videos;
        updateStatus(`Loaded ${allLikedVideos.length} videos from cache`);
        updateStats(allLikedVideos.length, cached.lastSync);
        renderVideos(allLikedVideos);
        return;
      }

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

  // Enhanced search with debouncing
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


  const authenticated = await isAuthenticated();
  if (authenticated) {
    currentToken = await getStoredToken();
    showAuthenticatedView();
    

    const cached = await getCachedVideos();
    if (cached.videos.length > 0) {
      allLikedVideos = cached.videos;
      updateStatus(`Loaded ${allLikedVideos.length} videos from cache`);
      updateStats(allLikedVideos.length, cached.lastSync);
      renderVideos(allLikedVideos);
    } else {
      await loadLikedVideos();
    }
  } else {
    showLoginView();
  }

  loginBtn.addEventListener('click', async () => {
    try {
      showLoading('Authenticating...');
      currentToken = await authenticateWithGoogle();
      
      showAuthenticatedView();
      hideLoading();
      await loadLikedVideos();
      
    } catch (err) {
      console.error("Login failed:", err);
      showError('Authentication failed. Please try again.');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await logout();
      currentToken = null;
      allLikedVideos = [];
      resultsContainer.innerHTML = '';
      showLoginView();
      updateStatus('');
      if (statsDiv) statsDiv.classList.add('hidden');
    } catch (err) {
      console.error("Logout failed:", err);
      showError('Logout failed. Please try again.');
    }
  });

  searchBtn.addEventListener('click', () => performSearch(true));
  
  searchInput.addEventListener('input', () => performSearch(false));
  
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
});