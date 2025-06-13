# YouTube Liked Videos Search Extension

A browser extension that lets you search through your YouTube liked videos with fuzzy matching and caching.

## Features

- **OAuth 2.0 Authentication** - Secure access to your YouTube account
- **Liked Videos Search** - Search through your entire liked videos playlist
- **Fuzzy Search** - Find videos even with typos or partial matches
- **Smart Caching** - Fast search results with intelligent cache management

## Setup

1. Clone the repository
2. Set up YouTube Data API credentials in your Google Cloud Console
3. Configure OAuth 2.0 client ID in `config.js`
4. Load the extension in your browser's developer mode

## Usage

1. Click the extension icon and authenticate with YouTube
2. Start typing to search your liked videos
3. Click any result to open the video

## Permissions

- YouTube Data API access
- Storage (for caching search results)