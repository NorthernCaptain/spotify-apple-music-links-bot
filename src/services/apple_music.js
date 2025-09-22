/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const axios = require('axios')
const jwt = require('jsonwebtoken')
const { clog } = require('../utils/logs')

/**
 * Apple Music API service for retrieving track/album metadata and searching
 */
class AppleMusicService {
    constructor(teamId, keyId, privateKey) {
        this.teamId = teamId
        this.keyId = keyId
        this.privateKey = privateKey
        this.baseUrl = 'https://api.music.apple.com/v1'
        this.token = null
        this.tokenExpiry = null
    }

    /**
     * Generate JWT token for Apple Music API authentication
     * @private
     */
    async generateToken() {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return
        }

        try {
            const now = Math.floor(Date.now() / 1000)
            const exp = now + 3600 // 1 hour

            const payload = {
                iss: this.teamId,
                iat: now,
                exp: exp
            }

            const header = {
                kid: this.keyId
            }

            this.token = jwt.sign(payload, this.privateKey, {
                algorithm: 'ES256',
                header: header
            })

            this.tokenExpiry = (exp - 60) * 1000 // 50 minutes in milliseconds
            clog('Apple Music authentication successful')
        } catch (error) {
            clog('Apple Music authentication failed:', error.message)
            throw new Error('Failed to generate Apple Music token')
        }
    }

    /**
     * Get track by Apple Music track ID
     * @param {string} trackId - Apple Music track ID
     * @returns {Object|null} Track metadata or null if not found
     */
    async getTrackById(trackId) {
        await this.generateToken()

        try {
            const response = await axios.get(`${this.baseUrl}/catalog/us/songs/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            const songs = response.data.data
            if (songs && songs.length > 0) {
                return this.createSongFromAppleMusicTrack(songs[0])
            }
            return null
        } catch (error) {
            clog('Error fetching Apple Music track:', error.message)
            return null
        }
    }

    /**
     * Get album by Apple Music album ID
     * @param {string} albumId - Apple Music album ID
     * @returns {Object|null} Album metadata or null if not found
     */
    async getAlbumById(albumId) {
        await this.generateToken()

        try {
            const response = await axios.get(`${this.baseUrl}/catalog/us/albums/${albumId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            const albums = response.data.data
            if (albums && albums.length > 0) {
                return this.createSongFromAppleMusicAlbum(albums[0])
            }
            return null
        } catch (error) {
            clog('Error fetching Apple Music album:', error.message)
            return null
        }
    }

    /**
     * Search for tracks on Apple Music
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results (default: 10)
     * @returns {Array} Array of track objects
     */
    async searchTracks(query, limit = 10) {
        await this.generateToken()

        try {
            const encodedQuery = encodeURIComponent(query)
            const response = await axios.get(`${this.baseUrl}/catalog/us/search?term=${encodedQuery}&types=songs&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            const results = response.data.results
            if (results && results.songs && results.songs.data) {
                return results.songs.data.map(song => this.createSongFromAppleMusicTrack(song))
            }
            return []
        } catch (error) {
            clog('Error searching Apple Music tracks:', error.message)
            return []
        }
    }

    /**
     * Create song object from Apple Music track data
     * @param {Object} track - Apple Music track data
     * @returns {Object} Normalized song object
     * @private
     */
    createSongFromAppleMusicTrack(track) {
        const attributes = track.attributes || {}
        const artwork = attributes.artwork
        let imageUrl = null

        if (artwork && artwork.url) {
            imageUrl = artwork.url
                .replace('{w}', '640')
                .replace('{h}', '640')
        }

        const previews = attributes.previews || []
        const previewUrl = previews.length > 0 ? previews[0].url : null

        return {
            id: track.id,
            name: attributes.name || 'Unknown Track',
            artist: attributes.artistName || 'Unknown Artist',
            album: attributes.albumName || 'Unknown Album',
            imageUrl,
            previewUrl,
            externalUrl: attributes.url || `https://music.apple.com/song/${track.id}`,
            platform: 'apple_music'
        }
    }

    /**
     * Create song object from Apple Music album data
     * @param {Object} album - Apple Music album data
     * @returns {Object} Normalized song object
     * @private
     */
    createSongFromAppleMusicAlbum(album) {
        const attributes = album.attributes || {}
        const artwork = attributes.artwork
        let imageUrl = null

        if (artwork && artwork.url) {
            imageUrl = artwork.url
                .replace('{w}', '640')
                .replace('{h}', '640')
        }

        return {
            id: album.id,
            name: attributes.name || 'Unknown Album',
            artist: attributes.artistName || 'Unknown Artist',
            album: attributes.name || 'Unknown Album',
            imageUrl,
            previewUrl: null,
            externalUrl: attributes.url || `https://music.apple.com/album/${album.id}`,
            platform: 'apple_music'
        }
    }

    /**
     * Extract track ID from Apple Music URL
     * @param {string} url - Apple Music URL
     * @returns {string|null} Track ID or null if not found
     */
    extractTrackIdFromUrl(url) {
        // Handle direct song URLs: music.apple.com/us/song/song-name/123456
        const songRegex = /music\.apple\.com\/[^/]+\/song\/[^/]+\/(\d+)/
        const songMatch = songRegex.exec(url)
        if (songMatch) {
            return songMatch[1]
        }

        // Handle album URLs with track parameter: music.apple.com/us/album/album-name/123?i=456
        const albumTrackRegex = /music\.apple\.com\/[^/]+\/album\/[^/]+\/\d+\?i=(\d+)/
        const albumTrackMatch = albumTrackRegex.exec(url)
        if (albumTrackMatch) {
            return albumTrackMatch[1]
        }

        return null
    }

    /**
     * Extract album ID from Apple Music URL
     * @param {string} url - Apple Music URL
     * @returns {string|null} Album ID or null if not found
     */
    extractAlbumIdFromUrl(url) {
        const albumRegex = /music\.apple\.com\/[^/]+\/album\/[^/]+\/(\d+)/
        const match = albumRegex.exec(url)
        return match ? match[1] : null
    }

    /**
     * Check if URL is a valid Apple Music URL
     * @param {string} url - URL to check
     * @returns {boolean} True if valid Apple Music URL
     */
    isValidUrl(url) {
        return url.includes('music.apple.com/')
    }

    /**
     * Get platform name
     * @returns {string} Platform name
     */
    get platformName() {
        return 'apple_music'
    }
}

module.exports = { AppleMusicService }