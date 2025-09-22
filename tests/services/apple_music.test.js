/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { AppleMusicService } = require('../../src/services/apple_music')

// Mock dependencies
jest.mock('axios')
jest.mock('jsonwebtoken')

const axios = require('axios')
const jwt = require('jsonwebtoken')

describe('AppleMusicService', () => {
    let appleMusicService

    beforeEach(() => {
        jest.clearAllMocks()
        appleMusicService = new AppleMusicService('test_team_id', 'test_key_id', 'test_private_key')
    })

    describe('URL validation and extraction', () => {
        test('should validate Apple Music URLs correctly', () => {
            expect(appleMusicService.isValidUrl('https://music.apple.com/us/song/test-song/123456')).toBe(true)
            expect(appleMusicService.isValidUrl('https://music.apple.com/gb/album/test-album/123456')).toBe(true)
            expect(appleMusicService.isValidUrl('https://open.spotify.com/track/123456')).toBe(false)
            expect(appleMusicService.isValidUrl('https://youtube.com/watch?v=123')).toBe(false)
        })

        test('should extract track ID from Apple Music URLs', () => {
            // Direct song URL
            const trackId1 = appleMusicService.extractTrackIdFromUrl('https://music.apple.com/us/song/test-song/123456')
            expect(trackId1).toBe('123456')

            // Album URL with track parameter
            const trackId2 = appleMusicService.extractTrackIdFromUrl('https://music.apple.com/us/album/test-album/123456?i=789012')
            expect(trackId2).toBe('789012')

            // Invalid URL
            const invalidUrl = appleMusicService.extractTrackIdFromUrl('https://music.apple.com/us/album/test-album/123456')
            expect(invalidUrl).toBeNull()
        })

        test('should extract album ID from Apple Music URLs', () => {
            const albumId = appleMusicService.extractAlbumIdFromUrl('https://music.apple.com/us/album/test-album/123456')
            expect(albumId).toBe('123456')

            const invalidUrl = appleMusicService.extractAlbumIdFromUrl('https://music.apple.com/us/song/test-song/123456')
            expect(invalidUrl).toBe('123456') // This would still extract the ID part
        })
    })

    describe('token generation', () => {
        test('should generate JWT token successfully', async () => {
            jwt.sign.mockReturnValue('test_jwt_token')

            await appleMusicService.generateToken()

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    iss: 'test_team_id',
                    iat: expect.any(Number),
                    exp: expect.any(Number)
                }),
                'test_private_key',
                expect.objectContaining({
                    algorithm: 'ES256',
                    header: { kid: 'test_key_id' }
                })
            )

            expect(appleMusicService.token).toBe('test_jwt_token')
        })

        test('should reuse valid token', async () => {
            appleMusicService.token = 'existing_token'
            appleMusicService.tokenExpiry = Date.now() + 60000 // 1 minute from now

            await appleMusicService.generateToken()

            expect(jwt.sign).not.toHaveBeenCalled()
            expect(appleMusicService.token).toBe('existing_token')
        })

        test('should handle token generation failure', async () => {
            jwt.sign.mockImplementation(() => {
                throw new Error('JWT generation failed')
            })

            await expect(appleMusicService.generateToken()).rejects.toThrow('Failed to generate Apple Music token')
        })
    })

    describe('data transformation', () => {
        test('should create song object from Apple Music track data', () => {
            const mockTrackData = {
                id: 'track123',
                attributes: {
                    name: 'Test Track',
                    artistName: 'Test Artist',
                    albumName: 'Test Album',
                    artwork: {
                        url: 'https://example.com/{w}x{h}.jpg'
                    },
                    previews: [{ url: 'https://example.com/preview.mp3' }],
                    url: 'https://music.apple.com/us/song/test-track/track123'
                }
            }

            const song = appleMusicService.createSongFromAppleMusicTrack(mockTrackData)

            expect(song).toEqual({
                id: 'track123',
                name: 'Test Track',
                artist: 'Test Artist',
                album: 'Test Album',
                imageUrl: 'https://example.com/640x640.jpg',
                previewUrl: 'https://example.com/preview.mp3',
                externalUrl: 'https://music.apple.com/us/song/test-track/track123',
                platform: 'apple_music'
            })
        })

        test('should handle missing data gracefully', () => {
            const mockTrackData = {
                id: 'track123',
                attributes: {}
            }

            const song = appleMusicService.createSongFromAppleMusicTrack(mockTrackData)

            expect(song.name).toBe('Unknown Track')
            expect(song.artist).toBe('Unknown Artist')
            expect(song.album).toBe('Unknown Album')
            expect(song.imageUrl).toBeNull()
            expect(song.previewUrl).toBeNull()
            expect(song.externalUrl).toBe('https://music.apple.com/song/track123')
        })

        test('should replace artwork URL placeholders', () => {
            const mockTrackData = {
                id: 'track123',
                attributes: {
                    name: 'Test Track',
                    artistName: 'Test Artist',
                    albumName: 'Test Album',
                    artwork: {
                        url: 'https://example.com/{w}x{h}.jpg'
                    }
                }
            }

            const song = appleMusicService.createSongFromAppleMusicTrack(mockTrackData)

            expect(song.imageUrl).toBe('https://example.com/640x640.jpg')
        })
    })

    describe('API calls', () => {
        beforeEach(() => {
            // Mock successful token generation
            jwt.sign.mockReturnValue('test_jwt_token')
        })

        test('should get track by ID successfully', async () => {
            const mockTrackResponse = {
                data: {
                    data: [{
                        id: 'track123',
                        attributes: {
                            name: 'Test Track',
                            artistName: 'Test Artist',
                            albumName: 'Test Album'
                        }
                    }]
                }
            }

            axios.get.mockResolvedValueOnce(mockTrackResponse)

            const track = await appleMusicService.getTrackById('track123')

            expect(track).toBeDefined()
            expect(track.id).toBe('track123')
            expect(track.name).toBe('Test Track')
            expect(track.platform).toBe('apple_music')

            expect(axios.get).toHaveBeenCalledWith(
                'https://api.music.apple.com/v1/catalog/us/songs/track123',
                expect.objectContaining({
                    headers: { 'Authorization': 'Bearer test_jwt_token' }
                })
            )
        })

        test('should return null for failed track request', async () => {
            axios.get.mockRejectedValueOnce(new Error('Track not found'))

            const track = await appleMusicService.getTrackById('invalid_id')

            expect(track).toBeNull()
        })

        test('should return null for empty track response', async () => {
            const mockEmptyResponse = { data: { data: [] } }
            axios.get.mockResolvedValueOnce(mockEmptyResponse)

            const track = await appleMusicService.getTrackById('track123')

            expect(track).toBeNull()
        })

        test('should search tracks successfully', async () => {
            const mockSearchResponse = {
                data: {
                    results: {
                        songs: {
                            data: [
                                {
                                    id: 'track1',
                                    attributes: {
                                        name: 'Track 1',
                                        artistName: 'Artist 1',
                                        albumName: 'Album 1'
                                    }
                                },
                                {
                                    id: 'track2',
                                    attributes: {
                                        name: 'Track 2',
                                        artistName: 'Artist 2',
                                        albumName: 'Album 2'
                                    }
                                }
                            ]
                        }
                    }
                }
            }

            axios.get.mockResolvedValueOnce(mockSearchResponse)

            const tracks = await appleMusicService.searchTracks('test query')

            expect(tracks).toHaveLength(2)
            expect(tracks[0].id).toBe('track1')
            expect(tracks[1].id).toBe('track2')

            expect(axios.get).toHaveBeenCalledWith(
                'https://api.music.apple.com/v1/catalog/us/search?term=test%20query&types=songs&limit=10',
                expect.objectContaining({
                    headers: { 'Authorization': 'Bearer test_jwt_token' }
                })
            )
        })

        test('should return empty array for failed search', async () => {
            axios.get.mockRejectedValueOnce(new Error('Search failed'))

            const tracks = await appleMusicService.searchTracks('test query')

            expect(tracks).toEqual([])
        })

        test('should return empty array for empty search results', async () => {
            const mockEmptyResponse = { data: { results: {} } }
            axios.get.mockResolvedValueOnce(mockEmptyResponse)

            const tracks = await appleMusicService.searchTracks('test query')

            expect(tracks).toEqual([])
        })
    })
})