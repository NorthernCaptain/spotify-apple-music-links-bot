/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { ConverterService } = require('../../src/services/converter')

// Mock the services
jest.mock('../../src/services/spotify')
jest.mock('../../src/services/apple_music')
jest.mock('../../src/utils/scoring')

const { SpotifyService } = require('../../src/services/spotify')
const { AppleMusicService } = require('../../src/services/apple_music')
const { findBestMatch, getConfidenceLevel } = require('../../src/utils/scoring')

describe('ConverterService', () => {
    let converterService
    let mockConfig

    beforeEach(() => {
        jest.clearAllMocks()

        mockConfig = {
            spotify: {
                clientId: 'test_spotify_id',
                clientSecret: 'test_spotify_secret'
            },
            appleMusic: {
                teamId: 'test_team_id',
                keyId: 'test_key_id'
            },
            getAppleMusicPrivateKey: jest.fn().mockReturnValue('test_private_key')
        }

        converterService = new ConverterService(mockConfig)

        // Setup service mocks
        SpotifyService.prototype.isValidUrl = jest.fn()
        SpotifyService.prototype.extractTrackIdFromUrl = jest.fn()
        SpotifyService.prototype.extractAlbumIdFromUrl = jest.fn()
        SpotifyService.prototype.getTrackById = jest.fn()
        SpotifyService.prototype.getAlbumById = jest.fn()
        SpotifyService.prototype.searchTracks = jest.fn()

        AppleMusicService.prototype.isValidUrl = jest.fn()
        AppleMusicService.prototype.extractTrackIdFromUrl = jest.fn()
        AppleMusicService.prototype.extractAlbumIdFromUrl = jest.fn()
        AppleMusicService.prototype.getTrackById = jest.fn()
        AppleMusicService.prototype.getAlbumById = jest.fn()
        AppleMusicService.prototype.searchTracks = jest.fn()
    })

    describe('detectMusicLink', () => {
        test('should detect Spotify track URL', () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(true)
            SpotifyService.prototype.extractTrackIdFromUrl.mockReturnValue('track123')
            SpotifyService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)

            const result = converterService.detectMusicLink('https://open.spotify.com/track/track123')

            expect(result).toEqual({
                platform: 'spotify',
                type: 'track',
                id: 'track123',
                originalUrl: 'https://open.spotify.com/track/track123'
            })
        })

        test('should detect Apple Music track URL', () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(false)
            AppleMusicService.prototype.isValidUrl.mockReturnValue(true)
            AppleMusicService.prototype.extractTrackIdFromUrl.mockReturnValue('track456')
            AppleMusicService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)

            const result = converterService.detectMusicLink('https://music.apple.com/us/song/test/track456')

            expect(result).toEqual({
                platform: 'apple_music',
                type: 'track',
                id: 'track456',
                originalUrl: 'https://music.apple.com/us/song/test/track456'
            })
        })

        test('should detect Spotify album URL', () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(true)
            SpotifyService.prototype.extractTrackIdFromUrl.mockReturnValue(null)
            SpotifyService.prototype.extractAlbumIdFromUrl.mockReturnValue('album123')

            const result = converterService.detectMusicLink('https://open.spotify.com/album/album123')

            expect(result).toEqual({
                platform: 'spotify',
                type: 'album',
                id: 'album123',
                originalUrl: 'https://open.spotify.com/album/album123'
            })
        })

        test('should return null for invalid URLs', () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(false)
            AppleMusicService.prototype.isValidUrl.mockReturnValue(false)

            const result = converterService.detectMusicLink('https://youtube.com/watch?v=123')

            expect(result).toBeNull()
        })

        test('should return null for null/undefined input', () => {
            expect(converterService.detectMusicLink(null)).toBeNull()
            expect(converterService.detectMusicLink(undefined)).toBeNull()
            expect(converterService.detectMusicLink('')).toBeNull()
        })
    })

    describe('convertMusicLink', () => {
        test('should convert Spotify track to Apple Music successfully', async () => {
            // Mock detection
            SpotifyService.prototype.isValidUrl.mockReturnValue(true)
            SpotifyService.prototype.extractTrackIdFromUrl.mockReturnValue('spotify123')
            SpotifyService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)

            // Mock original song fetch
            const originalSong = {
                id: 'spotify123',
                name: 'Test Song',
                artist: 'Test Artist',
                album: 'Test Album',
                platform: 'spotify'
            }
            SpotifyService.prototype.getTrackById.mockResolvedValue(originalSong)

            // Mock search and matching
            const searchResults = [
                {
                    id: 'apple456',
                    name: 'Test Song',
                    artist: 'Test Artist',
                    album: 'Test Album',
                    platform: 'apple_music',
                    externalUrl: 'https://music.apple.com/song/apple456'
                }
            ]
            AppleMusicService.prototype.searchTracks.mockResolvedValue(searchResults)

            const bestMatch = { ...searchResults[0], matchScore: 95 }
            findBestMatch.mockReturnValue(bestMatch)
            getConfidenceLevel.mockReturnValue('95% match')

            const result = await converterService.convertMusicLink('https://open.spotify.com/track/spotify123')

            expect(result).toEqual({
                original: originalSong,
                converted: bestMatch,
                confidence: '95% match',
                sourcePlatform: 'spotify',
                targetPlatform: 'apple_music'
            })
        })

        test('should convert Apple Music track to Spotify successfully', async () => {
            // Mock detection
            SpotifyService.prototype.isValidUrl.mockReturnValue(false)
            AppleMusicService.prototype.isValidUrl.mockReturnValue(true)
            AppleMusicService.prototype.extractTrackIdFromUrl.mockReturnValue('apple456')
            AppleMusicService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)

            // Mock original song fetch
            const originalSong = {
                id: 'apple456',
                name: 'Test Song',
                artist: 'Test Artist',
                album: 'Test Album',
                platform: 'apple_music'
            }
            AppleMusicService.prototype.getTrackById.mockResolvedValue(originalSong)

            // Mock search and matching
            const searchResults = [
                {
                    id: 'spotify123',
                    name: 'Test Song',
                    artist: 'Test Artist',
                    album: 'Test Album',
                    platform: 'spotify',
                    externalUrl: 'https://open.spotify.com/track/spotify123'
                }
            ]
            SpotifyService.prototype.searchTracks.mockResolvedValue(searchResults)

            const bestMatch = { ...searchResults[0], matchScore: 100 }
            findBestMatch.mockReturnValue(bestMatch)
            getConfidenceLevel.mockReturnValue('Exact match')

            const result = await converterService.convertMusicLink('https://music.apple.com/us/song/test/apple456')

            expect(result).toEqual({
                original: originalSong,
                converted: bestMatch,
                confidence: 'Exact match',
                sourcePlatform: 'apple_music',
                targetPlatform: 'spotify'
            })
        })

        test('should return null for invalid URL', async () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(false)
            AppleMusicService.prototype.isValidUrl.mockReturnValue(false)

            const result = await converterService.convertMusicLink('https://invalid.com/song/123')

            expect(result).toBeNull()
        })

        test('should return null when original song not found', async () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(true)
            SpotifyService.prototype.extractTrackIdFromUrl.mockReturnValue('spotify123')
            SpotifyService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)
            SpotifyService.prototype.getTrackById.mockResolvedValue(null)

            const result = await converterService.convertMusicLink('https://open.spotify.com/track/spotify123')

            expect(result).toBeNull()
        })

        test('should return null when no good match found', async () => {
            SpotifyService.prototype.isValidUrl.mockReturnValue(true)
            SpotifyService.prototype.extractTrackIdFromUrl.mockReturnValue('spotify123')
            SpotifyService.prototype.extractAlbumIdFromUrl.mockReturnValue(null)

            const originalSong = {
                id: 'spotify123',
                name: 'Test Song',
                artist: 'Test Artist',
                album: 'Test Album',
                platform: 'spotify'
            }
            SpotifyService.prototype.getTrackById.mockResolvedValue(originalSong)

            AppleMusicService.prototype.searchTracks.mockResolvedValue([])
            findBestMatch.mockReturnValue(null)

            const result = await converterService.convertMusicLink('https://open.spotify.com/track/spotify123')

            expect(result).toBeNull()
        })
    })

    describe('formatConversionMessage', () => {
        test('should format successful conversion message', () => {
            const conversionResult = {
                converted: {
                    externalUrl: 'https://music.apple.com/song/test123'
                },
                confidence: '95% match',
                sourcePlatform: 'spotify',
                targetPlatform: 'apple_music'
            }

            const message = converterService.formatConversionMessage(conversionResult)

            expect(message).toBe('🎵 Spotify → 🍎 Apple Music (95% match)\nhttps://music.apple.com/song/test123')
        })

        test('should format error message for null result', () => {
            const message = converterService.formatConversionMessage(null)

            expect(message).toBe("Sorry, I couldn't convert this music link. Please make sure it's a valid Spotify or Apple Music URL.")
        })

        test('should handle Apple Music to Spotify conversion', () => {
            const conversionResult = {
                converted: {
                    externalUrl: 'https://open.spotify.com/track/test123'
                },
                confidence: 'Exact match',
                sourcePlatform: 'apple_music',
                targetPlatform: 'spotify'
            }

            const message = converterService.formatConversionMessage(conversionResult)

            expect(message).toBe('🍎 Apple Music → 🎵 Spotify (Exact match)\nhttps://open.spotify.com/track/test123')
        })
    })
})