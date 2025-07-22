
export async function getAllLikedVideos(token, onProgress = null) {
  const allVideos = [];
  let nextPageToken = null;
  let pageCount = 0;
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=LL&maxResults=50${
      nextPageToken ? `&pageToken=${nextPageToken}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404 && pageCount === 0) {
          console.log("LL playlist not found, falling back to videos endpoint");
          return await getLikedVideosV1(token, onProgress);
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      const videos = data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        snippet: {
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnails: item.snippet.thumbnails,
          tags: item.snippet.tags || []
        }
      }));

      allVideos.push(...videos);
      nextPageToken = data.nextPageToken;
      pageCount++;

      if (onProgress) {
        onProgress({
          currentCount: allVideos.length,
          pageCount: pageCount,
          hasMore: !!nextPageToken
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error fetching page ${pageCount}:`, error);
      if (allVideos.length > 0) {
        console.log(`Returning ${allVideos.length} videos from ${pageCount} pages`);
        break;
      }
      throw error;
    }
  } while (nextPageToken);

  return allVideos;
}

async function getLikedVideosV1(token, onProgress = null) {
  const allVideos = [];
  let nextPageToken = null;
  let pageCount = 0;
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50${
      nextPageToken ? `&pageToken=${nextPageToken}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      allVideos.push(...data.items);
      nextPageToken = data.nextPageToken;
      pageCount++;

      if (onProgress) {
        onProgress({
          currentCount: allVideos.length,
          pageCount: pageCount,
          hasMore: !!nextPageToken
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error fetching page ${pageCount}:`, error);
      break;
    }
  } while (nextPageToken);

  return allVideos;
}

export async function getCachedVideos() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['likedVideos', 'lastSync'], (result) => {
      resolve({
        videos: result.likedVideos || [],
        lastSync: result.lastSync || null
      });
    });
  });
}

export async function setCachedVideos(videos) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      likedVideos: videos,
      lastSync: Date.now()
    }, resolve);
  });
}

export function shouldRefreshCache(lastSync, maxAgeHours = 24) {
  if (!lastSync) return true;
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  return (Date.now() - lastSync) > maxAge;
}

export function searchVideos(videos, query) {
  if (!query.trim()) return videos;
  
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return videos.filter(video => {
    const title = video.snippet.title.toLowerCase();
    const channel = video.snippet.channelTitle.toLowerCase();
    const description = video.snippet.description?.toLowerCase() || '';
    const tags = video.snippet.tags?.join(' ').toLowerCase() || '';
    
    const searchableText = `${title} ${channel} ${description} ${tags}`;
    
    return searchTerms.every(term => searchableText.includes(term));
  });
}