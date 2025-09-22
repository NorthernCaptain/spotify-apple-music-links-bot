/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { clog } = require("./utils/logs")
const { SMBot } = require("./bot/bot")
const { config } = require("./config/config")
const { db } = require("./db/db")
const fs = require("fs")

clog("Starting Spotify-Apple Music Links Bot...")

/**
 * Create storage directory if it doesn't exist
 */
function ensureStorageDirectory() {
    if (!fs.existsSync(config.storage.folder)) {
        fs.mkdirSync(config.storage.folder, { recursive: true })
        clog(`Created storage directory: ${config.storage.folder}`)
    }
}

/**
 * Initialize and start the bot application
 */
async function start() {
    try {
        // Ensure storage directory exists
        ensureStorageDirectory()

        // Initialize database
        await db.start()
        clog("Database initialized successfully")

        // Initialize and start bot
        const bot = new SMBot(config)
        await bot.start()

        clog("🎵 Spotify-Apple Music Links Bot is now running!")
        clog(`📁 Storage folder: ${config.storage.folder}`)
        clog(`🔐 Bot password: ${config.telegram.botPassword}`)
        clog("Ready to convert music links between Spotify and Apple Music!")

    } catch (error) {
        clog("❌ Failed to start bot:", error.message)
        process.exit(1)
    }
}

/**
 * Graceful shutdown handling
 */
process.on('SIGINT', () => {
    clog("Received SIGINT, shutting down gracefully...")
    process.exit(0)
})

process.on('SIGTERM', () => {
    clog("Received SIGTERM, shutting down gracefully...")
    process.exit(0)
})

process.on('uncaughtException', (error) => {
    clog("Uncaught exception:", error)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    clog("Unhandled rejection at:", promise, "reason:", reason)
    process.exit(1)
})

// Start the application
start().catch((error) => {
    clog("Failed to start application:", error)
    process.exit(1)
})