/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const EventEmitter = require('events')
const fs = require('fs')

/**
 * Configuration class to manage environment variables and settings
 */
class Config {
    constructor() {
        this.bus = new EventEmitter()

        // Telegram configuration
        this.telegram = {
            token: process.env.SMBOT_TELEGRAM_TOKEN,
            botPassword: process.env.SMBOT_BOT_PASSWORD || 'unsecure'
        }

        // Storage configuration
        this.storage = {
            folder: process.env.SMBOT_STORAGE_FOLDER || '/storage'
        }

        // Spotify API configuration
        this.spotify = {
            clientId: process.env.SMBOT_SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SMBOT_SPOTIFY_CLIENT_SECRET
        }

        // Apple Music API configuration
        this.appleMusic = {
            teamId: process.env.SMBOT_APPLE_MUSIC_TEAM_ID,
            keyId: process.env.SMBOT_APPLE_MUSIC_KEY_ID,
            privateKeyPath: process.env.SMBOT_APPLE_MUSIC_PRIVATE_KEY_PATH
        }

        this.validateConfig()
    }

    /**
     * Validate that all required configuration is present
     * @throws {Error} If required configuration is missing
     */
    validateConfig() {
        const required = [
            { key: 'SMBOT_TELEGRAM_TOKEN', value: this.telegram.token },
            { key: 'SMBOT_SPOTIFY_CLIENT_ID', value: this.spotify.clientId },
            { key: 'SMBOT_SPOTIFY_CLIENT_SECRET', value: this.spotify.clientSecret },
            { key: 'SMBOT_APPLE_MUSIC_TEAM_ID', value: this.appleMusic.teamId },
            { key: 'SMBOT_APPLE_MUSIC_KEY_ID', value: this.appleMusic.keyId },
            { key: 'SMBOT_APPLE_MUSIC_PRIVATE_KEY_PATH', value: this.appleMusic.privateKeyPath }
        ]

        const missing = required.filter(item => !item.value)
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.map(m => m.key).join(', ')}`)
        }

        // Check if Apple Music private key file exists
        if (!fs.existsSync(this.appleMusic.privateKeyPath)) {
            throw new Error(`Apple Music private key file not found: ${this.appleMusic.privateKeyPath}`)
        }
    }

    /**
     * Get Apple Music private key content
     * @returns {string} The private key content
     */
    getAppleMusicPrivateKey() {
        return fs.readFileSync(this.appleMusic.privateKeyPath, 'utf8')
    }
}

const config = new Config()

module.exports = { config }