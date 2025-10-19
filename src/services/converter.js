/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { SpotifyService } = require("./spotify")
const { AppleMusicService } = require("./apple_music")
const { findBestMatch, getConfidenceLevel } = require("../utils/scoring")
const { clog } = require("../utils/logs")

/**
 * Music link converter service that handles conversion between Spotify and Apple Music
 */
class ConverterService {
    constructor(config) {
        this.spotifyService = new SpotifyService(
            config.spotify.clientId,
            config.spotify.clientSecret
        )

        this.appleMusicService = new AppleMusicService(
            config.appleMusic.teamId,
            config.appleMusic.keyId,
            config.getAppleMusicPrivateKey()
        )
    }

    /**
     * Detect and extract music link information from a URL
     * @param {string} url - The music URL to analyze
     * @returns {Object|null} Link information or null if not a valid music URL
     */
    detectMusicLink(url) {
        if (!url || typeof url !== "string") return null

        // Check Spotify URLs
        if (this.spotifyService.isValidUrl(url)) {
            const trackId = this.spotifyService.extractTrackIdFromUrl(url)
            const albumId = this.spotifyService.extractAlbumIdFromUrl(url)

            if (trackId) {
                return {
                    platform: "spotify",
                    type: "track",
                    id: trackId,
                    originalUrl: url,
                }
            } else if (albumId) {
                return {
                    platform: "spotify",
                    type: "album",
                    id: albumId,
                    originalUrl: url,
                }
            }
        }

        // Check Apple Music URLs
        if (this.appleMusicService.isValidUrl(url)) {
            const trackId = this.appleMusicService.extractTrackIdFromUrl(url)
            const albumId = this.appleMusicService.extractAlbumIdFromUrl(url)

            if (trackId) {
                return {
                    platform: "apple_music",
                    type: "track",
                    id: trackId,
                    originalUrl: url,
                }
            } else if (albumId) {
                return {
                    platform: "apple_music",
                    type: "album",
                    id: albumId,
                    originalUrl: url,
                }
            }
        }

        return null
    }

    /**
     * Convert a music link from one platform to another
     * @param {string} url - The original music URL
     * @returns {Object|null} Conversion result with original and converted songs, or null if conversion failed
     */
    async convertMusicLink(url) {
        const linkInfo = this.detectMusicLink(url)
        if (!linkInfo) {
            clog("No valid music link detected in URL:", url)
            return null
        }

        try {
            // Get original song metadata
            const originalSong = await this.getOriginalSong(linkInfo)
            if (!originalSong) {
                clog("Could not fetch original song metadata: " + JSON.stringify(linkInfo))
                return null
            }

            // Convert to opposite platform
            const convertedSong = await this.convertToOppositePlatform(
                originalSong,
                linkInfo.platform
            )
            if (!convertedSong) {
                clog(`Could not find matching song on target platform ${linkInfo.platform}, search query: ${originalSong.artist} ${originalSong.name}`)
                return null
            }

            return {
                original: originalSong,
                converted: convertedSong,
                confidence: getConfidenceLevel(convertedSong.matchScore),
                sourcePlatform: linkInfo.platform,
                targetPlatform: convertedSong.platform,
            }
        } catch (error) {
            clog("Error converting music link:", error.message)
            return null
        }
    }

    /**
     * Get original song metadata from the source platform
     * @param {Object} linkInfo - Link information object
     * @returns {Object|null} Original song metadata or null if not found
     * @private
     */
    async getOriginalSong(linkInfo) {
        const service =
            linkInfo.platform === "spotify"
                ? this.spotifyService
                : this.appleMusicService

        if (linkInfo.type === "track") {
            return await service.getTrackById(linkInfo.id)
        } else if (linkInfo.type === "album") {
            return await service.getAlbumById(linkInfo.id)
        }

        return null
    }

    /**
     * Convert song to opposite platform using search and matching
     * @param {Object} originalSong - Original song metadata
     * @param {string} sourcePlatform - Source platform ('spotify' or 'apple_music')
     * @returns {Object|null} Best matching song on target platform or null if no good match
     * @private
     */
    async convertToOppositePlatform(originalSong, sourcePlatform) {
        const targetService =
            sourcePlatform === "spotify"
                ? this.appleMusicService
                : this.spotifyService

        // Create search query combining artist and track name
        const searchQuery = `${originalSong.artist} ${originalSong.name}`

        // Search for matches on target platform
        const searchResults = await targetService.searchTracks(searchQuery, 10)
        if (searchResults.length === 0) {
            return null
        }

        // Find best match using scoring algorithm
        const bestMatch = findBestMatch(originalSong, searchResults)
        return bestMatch
    }

    /**
     * Create a formatted response message for the converted link
     * @param {Object} conversionResult - Result from convertMusicLink
     * @returns {string} Formatted message for Telegram
     */
    formatConversionMessage(conversionResult) {
        if (!conversionResult) {
            clog("No valid conversion result")
            return "Sorry, I couldn't convert this music link. Please make sure it's a valid Spotify or Apple Music URL."
        }

        const { converted, confidence, sourcePlatform, targetPlatform } =
            conversionResult

        const platformEmojis = {
            spotify: "🟢",
            apple_music: "🍎",
        }

        const sourceName =
            sourcePlatform === "spotify" ? "Spotify" : "Apple Music"
        const targetName =
            targetPlatform === "spotify" ? "Spotify" : "Apple Music"
        const sourceEmoji = platformEmojis[sourcePlatform]
        const targetEmoji = platformEmojis[targetPlatform]

        clog(
            `Converted: ${sourceEmoji} ${sourceName} → ${targetEmoji} ${targetName} (${confidence}), link: ${converted.externalUrl}`
        )
        return `${sourceEmoji} ${sourceName} → ${targetEmoji} ${targetName} (${confidence})\n${converted.externalUrl}`
    }
}

module.exports = { ConverterService }
