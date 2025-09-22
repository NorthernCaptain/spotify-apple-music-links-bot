/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { Telegraf } = require("telegraf")
const { clog } = require("../utils/logs")
const { db } = require("../db/db")
const { ConverterService } = require("../services/converter")

/**
 * Telegram bot class for handling music link conversions
 */
class SMBot {
    static SETUP_CHATS_KEY = "telegram_chat_ids"

    constructor(config) {
        this.config = config
        this.bot = new Telegraf(config.telegram.token)
        this.chats = new Set()
        this.converter = new ConverterService(config)
    }

    /**
     * Start the Telegram bot and set up message handlers
     */
    async start() {
        await this.loadChatIds()

        // Command handlers
        this.bot.command("start", this.handleStartCommand.bind(this))
        this.bot.command("stop", this.handleStopCommand.bind(this))
        this.bot.command("help", this.handleHelpCommand.bind(this))

        // Message handler for link detection
        this.bot.on("text", this.handleTextMessage.bind(this))

        await this.bot.launch()
        process.once('SIGINT', () => this.bot.stop('SIGINT'))
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

        clog('Spotify-Apple Music bot started successfully')
    }

    /**
     * Handle /start command with password verification
     * @param {Object} ctx - Telegram context
     */
    async handleStartCommand(ctx) {
        const chatId = ctx.chat?.id
        const password = ctx.payload

        if (!chatId) {
            clog("SMBOT: Got start command without chat id")
            await ctx.reply("Error: Unable to identify chat.")
            return
        }

        if (password !== this.config.telegram.botPassword) {
            clog(`SMBOT: Got start command with incorrect password from chat ${chatId}`)
            await ctx.reply("🚫 Incorrect password. I don't know you.")
            return
        }

        await this.addChatId(chatId)
        await ctx.reply(`🎵 Welcome to Spotify-Apple Music Links Bot!

Your chat ID is ${chatId}

I will now monitor this chat for music links and automatically convert them between Spotify and Apple Music.

Supported links:
• Spotify tracks and albums
• Apple Music tracks and albums

Simply post any music link and I'll respond with the converted version!`)
    }

    /**
     * Handle /stop command
     * @param {Object} ctx - Telegram context
     */
    async handleStopCommand(ctx) {
        const chatId = ctx.chat?.id

        if (!chatId) {
            await ctx.reply("Error: Unable to identify chat.")
            return
        }

        clog(`SMBOT: Got stop command from chat ${chatId}`)
        await this.removeChatId(chatId)
        await ctx.reply(`🛑 I will stop converting music links in this chat.

You can start me again with:
/start <password>

Goodbye! 👋`)
    }

    /**
     * Handle /help command
     * @param {Object} ctx - Telegram context
     */
    async handleHelpCommand(ctx) {
        await ctx.reply(`🎵 Spotify-Apple Music Links Bot Help

🔧 Commands:
• /start <password> - Subscribe to music link conversion
• /stop - Unsubscribe from link conversion
• /help - Show this help message

🎶 How it works:
1. Subscribe to the bot with the correct password
2. Post any Spotify or Apple Music link in this chat
3. I'll automatically respond with the converted link

🔗 Supported links:
• Spotify: https://open.spotify.com/track/...
• Spotify: https://open.spotify.com/album/...
• Apple Music: https://music.apple.com/.../song/...
• Apple Music: https://music.apple.com/.../album/...

✨ Features:
• Smart matching with confidence scores
• Bidirectional conversion (Spotify ↔ Apple Music)
• Works in groups and channels
• Password protection

Need the password? Contact your administrator.`)
    }

    /**
     * Handle text messages and detect music links
     * @param {Object} ctx - Telegram context
     */
    async handleTextMessage(ctx) {
        const chatId = ctx.chat?.id
        const messageText = ctx.message?.text
        const chatType = ctx.chat?.type
        const messageFrom = ctx.message?.from?.username || ctx.message?.from?.first_name

        clog(`SMBOT: Received message from chat ${chatId} (type: ${chatType}), user: ${messageFrom}`)
        clog(`SMBOT: Subscribed chats: [${Array.from(this.chats).join(', ')}]`)

        // Only process messages from subscribed chats
        if (!this.chats.has(chatId)) {
            clog(`SMBOT: Chat ${chatId} not subscribed, ignoring message`)
            return
        }

        if (!messageText) {
            clog(`SMBOT: No text in message from chat ${chatId}`)
            return
        }

        clog(`SMBOT: Processing message: "${messageText.substring(0, 100)}..."`)

        // Look for music links in the message
        const musicLinks = this.extractMusicLinks(messageText)

        if (musicLinks.length === 0) {
            clog(`SMBOT: No music links found in message from chat ${chatId}`)
            return
        }

        clog(`SMBOT: Found ${musicLinks.length} music link(s): ${musicLinks.join(', ')}`)

        // Process the first music link found
        await this.processAndReplyWithConversion(ctx, musicLinks[0])
    }

    /**
     * Extract music links from text message
     * @param {string} text - Message text
     * @returns {Array} Array of music link URLs
     * @private
     */
    extractMusicLinks(text) {
        const links = []

        // Spotify link patterns
        const spotifyPatterns = [
            /https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/g,
            /https?:\/\/open\.spotify\.com\/album\/[a-zA-Z0-9]+/g,
            /https?:\/\/spotify\.com\/track\/[a-zA-Z0-9]+/g,
            /https?:\/\/spotify\.com\/album\/[a-zA-Z0-9]+/g
        ]

        // Apple Music link patterns
        const appleMusicPatterns = [
            /https?:\/\/music\.apple\.com\/[^\/]+\/song\/[^\/]+\/\d+/g,
            /https?:\/\/music\.apple\.com\/[^\/]+\/album\/[^\/]+\/\d+(\?i=\d+)?/g
        ]

        const allPatterns = [...spotifyPatterns, ...appleMusicPatterns]

        for (const pattern of allPatterns) {
            const matches = text.match(pattern)
            if (matches) {
                links.push(...matches)
            }
        }

        return [...new Set(links)] // Remove duplicates
    }

    /**
     * Process music link conversion and reply
     * @param {Object} ctx - Telegram context
     * @param {string} musicLink - Music link URL
     * @private
     */
    async processAndReplyWithConversion(ctx, musicLink) {
        try {
            clog(`SMBOT: Converting music link: ${musicLink}`)

            // Show typing indicator
            await ctx.sendChatAction('typing')

            const conversionResult = await this.converter.convertMusicLink(musicLink)
            const responseMessage = this.converter.formatConversionMessage(conversionResult)

            await ctx.reply(responseMessage, {
                disable_web_page_preview: false,
                reply_to_message_id: ctx.message.message_id
            })

        } catch (error) {
            clog('SMBOT: Error processing music link:', error.message)
            await ctx.reply("🚫 Sorry, I encountered an error while converting this music link. Please try again later.", {
                reply_to_message_id: ctx.message.message_id
            })
        }
    }

    /**
     * Add chat ID to subscribed chats
     * @param {number} chatId - Telegram chat ID
     */
    async addChatId(chatId) {
        if (this.chats.has(chatId)) {
            clog(`SMBOT: Chat id ${chatId} already added`)
            return
        }

        this.chats.add(chatId)
        await db.setSetupValue(SMBot.SETUP_CHATS_KEY, Array.from(this.chats))
        clog(`SMBOT: Added chat id ${chatId}`)
    }

    /**
     * Remove chat ID from subscribed chats
     * @param {number} chatId - Telegram chat ID
     */
    async removeChatId(chatId) {
        if (!this.chats.has(chatId)) {
            clog(`SMBOT: Chat id ${chatId} not found`)
            return
        }

        this.chats.delete(chatId)
        await db.setSetupValue(SMBot.SETUP_CHATS_KEY, Array.from(this.chats))
        clog(`SMBOT: Removed chat id ${chatId}`)
    }

    /**
     * Load subscribed chat IDs from database
     * @private
     */
    async loadChatIds() {
        const chatIds = await db.getSetupValue(SMBot.SETUP_CHATS_KEY, [], true)
        this.chats = new Set(chatIds)
        clog(`SMBOT: Loaded ${chatIds.length} chat ids`)
    }
}

module.exports = { SMBot }