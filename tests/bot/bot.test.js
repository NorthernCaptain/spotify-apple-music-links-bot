/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { SMBot } = require('../../src/bot/bot')

// Mock dependencies
jest.mock('telegraf')
jest.mock('../../src/db/db')
jest.mock('../../src/services/converter')

const { Telegraf } = require('telegraf')
const { db } = require('../../src/db/db')
const { ConverterService } = require('../../src/services/converter')

describe('SMBot', () => {
    let smBot
    let mockConfig
    let mockTelegrafInstance
    let mockConverter

    beforeEach(() => {
        jest.clearAllMocks()

        mockConfig = {
            telegram: {
                token: 'test_token',
                botPassword: 'test_password'
            }
        }

        mockTelegrafInstance = {
            command: jest.fn(),
            on: jest.fn(),
            launch: jest.fn(),
            stop: jest.fn()
        }

        mockConverter = {
            convertMusicLink: jest.fn(),
            formatConversionMessage: jest.fn()
        }

        Telegraf.mockImplementation(() => mockTelegrafInstance)
        ConverterService.mockImplementation(() => mockConverter)

        db.getSetupValue = jest.fn()
        db.setSetupValue = jest.fn()

        smBot = new SMBot(mockConfig)
    })

    describe('initialization', () => {
        test('should initialize bot with correct token', () => {
            expect(Telegraf).toHaveBeenCalledWith('test_token')
            expect(ConverterService).toHaveBeenCalledWith(mockConfig)
        })
    })

    describe('extractMusicLinks', () => {
        test('should extract Spotify track links', () => {
            const text = 'Check out this song: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
            const links = smBot.extractMusicLinks(text)

            expect(links).toContain('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh')
        })

        test('should extract Apple Music links', () => {
            const text = 'Listen to this: https://music.apple.com/us/song/test-song/123456'
            const links = smBot.extractMusicLinks(text)

            expect(links).toContain('https://music.apple.com/us/song/test-song/123456')
        })

        test('should extract multiple links and remove duplicates', () => {
            const text = `
                Spotify: https://open.spotify.com/track/123
                Apple Music: https://music.apple.com/us/song/test/456
                Same Spotify: https://open.spotify.com/track/123
            `
            const links = smBot.extractMusicLinks(text)

            expect(links).toHaveLength(2)
            expect(links).toContain('https://open.spotify.com/track/123')
            expect(links).toContain('https://music.apple.com/us/song/test/456')
        })

        test('should return empty array for text without music links', () => {
            const text = 'This is just regular text with no music links'
            const links = smBot.extractMusicLinks(text)

            expect(links).toEqual([])
        })

        test('should extract album links', () => {
            const text = `
                Spotify album: https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3
                Apple Music album: https://music.apple.com/us/album/test-album/123456
            `
            const links = smBot.extractMusicLinks(text)

            expect(links).toHaveLength(2)
            expect(links).toContain('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3')
            expect(links).toContain('https://music.apple.com/us/album/test-album/123456')
        })
    })

    describe('chat management', () => {
        test('should add chat ID', async () => {
            smBot.chats = new Set([123])
            db.setSetupValue.mockResolvedValue()

            await smBot.addChatId(456)

            expect(smBot.chats.has(456)).toBe(true)
            expect(db.setSetupValue).toHaveBeenCalledWith('telegram_chat_ids', [123, 456])
        })

        test('should not add duplicate chat ID', async () => {
            smBot.chats = new Set([123])

            await smBot.addChatId(123)

            expect(db.setSetupValue).not.toHaveBeenCalled()
        })

        test('should remove chat ID', async () => {
            smBot.chats = new Set([123, 456])
            db.setSetupValue.mockResolvedValue()

            await smBot.removeChatId(123)

            expect(smBot.chats.has(123)).toBe(false)
            expect(db.setSetupValue).toHaveBeenCalledWith('telegram_chat_ids', [456])
        })

        test('should not remove non-existent chat ID', async () => {
            smBot.chats = new Set([123])

            await smBot.removeChatId(456)

            expect(db.setSetupValue).not.toHaveBeenCalled()
        })

        test('should load chat IDs from database', async () => {
            db.getSetupValue.mockResolvedValue([123, 456, 789])

            await smBot.loadChatIds()

            expect(db.getSetupValue).toHaveBeenCalledWith('telegram_chat_ids', [], true)
            expect(smBot.chats.size).toBe(3)
            expect(smBot.chats.has(123)).toBe(true)
            expect(smBot.chats.has(456)).toBe(true)
            expect(smBot.chats.has(789)).toBe(true)
        })
    })

    describe('command handlers', () => {
        test('handleStartCommand should accept correct password', async () => {
            const mockCtx = {
                chat: { id: 123 },
                payload: 'test_password',
                reply: jest.fn()
            }

            smBot.addChatId = jest.fn()

            await smBot.handleStartCommand(mockCtx)

            expect(smBot.addChatId).toHaveBeenCalledWith(123)
            expect(mockCtx.reply).toHaveBeenCalledWith(
                expect.stringContaining('Welcome to Spotify-Apple Music Links Bot!')
            )
        })

        test('handleStartCommand should reject incorrect password', async () => {
            const mockCtx = {
                chat: { id: 123 },
                payload: 'wrong_password',
                reply: jest.fn()
            }

            await smBot.handleStartCommand(mockCtx)

            expect(mockCtx.reply).toHaveBeenCalledWith('🚫 Incorrect password. I don\'t know you.')
        })

        test('handleStartCommand should handle missing chat ID', async () => {
            const mockCtx = {
                chat: null,
                payload: 'test_password',
                reply: jest.fn()
            }

            await smBot.handleStartCommand(mockCtx)

            expect(mockCtx.reply).toHaveBeenCalledWith('Error: Unable to identify chat.')
        })

        test('handleStopCommand should remove chat ID', async () => {
            const mockCtx = {
                chat: { id: 123 },
                reply: jest.fn()
            }

            smBot.removeChatId = jest.fn()

            await smBot.handleStopCommand(mockCtx)

            expect(smBot.removeChatId).toHaveBeenCalledWith(123)
            expect(mockCtx.reply).toHaveBeenCalledWith(
                expect.stringContaining('I will stop converting music links')
            )
        })

        test('handleHelpCommand should show help message', async () => {
            const mockCtx = {
                reply: jest.fn()
            }

            await smBot.handleHelpCommand(mockCtx)

            expect(mockCtx.reply).toHaveBeenCalledWith(
                expect.stringContaining('Spotify-Apple Music Links Bot Help')
            )
        })
    })

    describe('message processing', () => {
        test('should process music links in subscribed chats', async () => {
            const mockCtx = {
                chat: { id: 123 },
                message: {
                    text: 'Check this out: https://open.spotify.com/track/test123',
                    message_id: 456
                },
                sendChatAction: jest.fn(),
                reply: jest.fn()
            }

            smBot.chats = new Set([123])
            smBot.extractMusicLinks = jest.fn().mockReturnValue(['https://open.spotify.com/track/test123'])

            const mockConversionResult = {
                converted: { externalUrl: 'https://music.apple.com/song/test456' },
                confidence: '95% match'
            }

            mockConverter.convertMusicLink.mockResolvedValue(mockConversionResult)
            mockConverter.formatConversionMessage.mockReturnValue('Converted link message')

            await smBot.handleTextMessage(mockCtx)

            expect(mockCtx.sendChatAction).toHaveBeenCalledWith('typing')
            expect(mockConverter.convertMusicLink).toHaveBeenCalledWith('https://open.spotify.com/track/test123')
            expect(mockCtx.reply).toHaveBeenCalledWith('Converted link message', {
                disable_web_page_preview: false,
                reply_to_message_id: 456
            })
        })

        test('should ignore messages from unsubscribed chats', async () => {
            const mockCtx = {
                chat: { id: 999 },
                message: {
                    text: 'https://open.spotify.com/track/test123'
                }
            }

            smBot.chats = new Set([123])

            await smBot.handleTextMessage(mockCtx)

            expect(mockConverter.convertMusicLink).not.toHaveBeenCalled()
        })

        test('should ignore messages without music links', async () => {
            const mockCtx = {
                chat: { id: 123 },
                message: {
                    text: 'Just a regular message'
                }
            }

            smBot.chats = new Set([123])
            smBot.extractMusicLinks = jest.fn().mockReturnValue([])

            await smBot.handleTextMessage(mockCtx)

            expect(mockConverter.convertMusicLink).not.toHaveBeenCalled()
        })

        test('should handle conversion errors gracefully', async () => {
            const mockCtx = {
                chat: { id: 123 },
                message: {
                    text: 'https://open.spotify.com/track/test123',
                    message_id: 456
                },
                sendChatAction: jest.fn(),
                reply: jest.fn()
            }

            smBot.chats = new Set([123])
            smBot.extractMusicLinks = jest.fn().mockReturnValue(['https://open.spotify.com/track/test123'])

            mockConverter.convertMusicLink.mockRejectedValue(new Error('Conversion failed'))

            await smBot.handleTextMessage(mockCtx)

            expect(mockCtx.reply).toHaveBeenCalledWith(
                expect.stringContaining('Sorry, I encountered an error'),
                { reply_to_message_id: 456 }
            )
        })
    })
})