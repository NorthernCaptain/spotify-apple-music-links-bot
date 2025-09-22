/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const axios = require('axios')
const { clog } = require('../utils/logs')

/**
 * Spotify API service for retrieving track/album metadata and searching
 */
class SpotifyService {
    constructor(clientId, clientSecret) {
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.baseUrl = 'https://api.spotify.com/v1'
        this.authUrl = 'https://accounts.spotify.com/api/token'
        this.accessToken = null
        this.tokenExpiry = null
    }

    /**
     * Authenticate with Spotify API using client credentials
     * @private
     */
    async authenticate() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return
        }

        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

            const response = await axios.post(this.authUrl, 'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })

            this.accessToken = response.data.access_token
            this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000
            clog('Spotify authentication successful')
        } catch (error) {
            clog('Spotify authentication failed:', error.message)
            throw new Error('Failed to authenticate with Spotify API')
        }
    }

    /**
     * Get track by Spotify track ID
     * @param {string} trackId - Spotify track ID
     * @returns {Object|null} Track metadata or null if not found
     */
    async getTrackById(trackId) {
        await this.authenticate()

        try {
            const response = await axios.get(`${this.baseUrl}/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            })

            return this.createSongFromSpotifyTrack(response.data)
        } catch (error) {
            clog('Error fetching Spotify track:', error.message)
            return null
        }
    }

    /**
     * Get album by Spotify album ID
     * @param {string} albumId - Spotify album ID
     * @returns {Object|null} Album metadata or null if not found
     */
    async getAlbumById(albumId) {
        await this.authenticate()

        try {
            const response = await axios.get(`${this.baseUrl}/albums/${albumId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            })

            return this.createSongFromSpotifyAlbum(response.data)
        } catch (error) {
            clog('Error fetching Spotify album:', error.message)
            return null
        }
    }

    /**
     * Search for tracks on Spotify
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results (default: 10)
     * @returns {Array} Array of track objects
     */
    async searchTracks(query, limit = 10) {
        await this.authenticate()

        try {
            const encodedQuery = encodeURIComponent(query)
            const response = await axios.get(`${this.baseUrl}/search?q=${encodedQuery}&type=track&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            })

            const tracks = response.data.tracks.items
            return tracks.map(track => this.createSongFromSpotifyTrack(track))
        } catch (error) {
            clog('Error searching Spotify tracks:', error.message)
            return []
        }
    }

    /**
     * Create song object from Spotify track data
     * @param {Object} track - Spotify track data
     * @returns {Object} Normalized song object
     * @private
     */
    createSongFromSpotifyTrack(track) {
        const artists = track.artists || []
        const artistName = artists.length > 0 ? artists[0].name : 'Unknown Artist'
        const images = track.album?.images || []
        const imageUrl = images.length > 0 ? images[0].url : null

        return {
            id: track.id,
            name: track.name,
            artist: artistName,
            album: track.album?.name || 'Unknown Album',
            imageUrl,
            previewUrl: track.preview_url,
            externalUrl: track.external_urls?.spotify,
            platform: 'spotify'
        }
    }

    /**
     * Create song object from Spotify album data
     * @param {Object} album - Spotify album data
     * @returns {Object} Normalized song object
     * @private
     */
    createSongFromSpotifyAlbum(album) {
        const artists = album.artists || []
        const artistName = artists.length > 0 ? artists[0].name : 'Unknown Artist'
        const images = album.images || []
        const imageUrl = images.length > 0 ? images[0].url : null

        return {
            id: album.id,
            name: album.name,
            artist: artistName,
            album: album.name,
            imageUrl,
            previewUrl: null,
            externalUrl: album.external_urls?.spotify,
            platform: 'spotify'
        }
    }

    /**
     * Extract track ID from Spotify URL
     * @param {string} url - Spotify URL
     * @returns {string|null} Track ID or null if not found
     */
    extractTrackIdFromUrl(url) {
        const trackRegex = /spotify\.com\/track\/([a-zA-Z0-9]+)/
        const match = trackRegex.exec(url)
        return match ? match[1] : null
    }

    /**
     * Extract album ID from Spotify URL
     * @param {string} url - Spotify URL
     * @returns {string|null} Album ID or null if not found
     */
    extractAlbumIdFromUrl(url) {
        const albumRegex = /spotify\.com\/album\/([a-zA-Z0-9]+)/
        const match = albumRegex.exec(url)
        return match ? match[1] : null
    }

    /**
     * Check if URL is a valid Spotify URL
     * @param {string} url - URL to check
     * @returns {boolean} True if valid Spotify URL
     */
    isValidUrl(url) {
        return url.includes('spotify.com/') || url.includes('open.spotify.com/')
    }

    /**
     * Get platform name
     * @returns {string} Platform name
     */
    get platformName() {
        return 'spotify'
    }
}

module.exports = { SpotifyService }