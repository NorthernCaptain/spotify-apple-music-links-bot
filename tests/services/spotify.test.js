/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { SpotifyService } = require('../../src/services/spotify')

// Mock axios
jest.mock('axios')
const axios = require('axios')

describe('SpotifyService', () => {
    let spotifyService

    beforeEach(() => {
        jest.clearAllMocks()
        spotifyService = new SpotifyService('test_client_id', 'test_client_secret')
    })

    describe('URL validation and extraction', () => {
        test('should validate Spotify URLs correctly', () => {
            expect(spotifyService.isValidUrl('https://open.spotify.com/track/1234567890')).toBe(true)
            expect(spotifyService.isValidUrl('https://spotify.com/album/1234567890')).toBe(true)
            expect(spotifyService.isValidUrl('https://music.apple.com/us/song/test/123')).toBe(false)
            expect(spotifyService.isValidUrl('https://youtube.com/watch?v=123')).toBe(false)
        })

        test('should extract track ID from Spotify URLs', () => {
            const trackId = spotifyService.extractTrackIdFromUrl('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh')
            expect(trackId).toBe('4iV5W9uYEdYUVa79Axb7Rh')

            const invalidUrl = spotifyService.extractTrackIdFromUrl('https://open.spotify.com/album/123')
            expect(invalidUrl).toBeNull()
        })

        test('should extract album ID from Spotify URLs', () => {
            const albumId = spotifyService.extractAlbumIdFromUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3')
            expect(albumId).toBe('1DFixLWuPkv3KT3TnV35m3')

            const invalidUrl = spotifyService.extractAlbumIdFromUrl('https://open.spotify.com/track/123')
            expect(invalidUrl).toBeNull()
        })
    })

    describe('authentication', () => {
        test('should authenticate successfully', async () => {
            const mockAuthResponse = {
                data: {
                    access_token: 'test_access_token',
                    expires_in: 3600
                }
            }

            axios.post.mockResolvedValueOnce(mockAuthResponse)

            await spotifyService.authenticate()

            expect(axios.post).toHaveBeenCalledWith(
                'https://accounts.spotify.com/api/token',
                'grant_type=client_credentials',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Basic'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    })
                })
            )

            expect(spotifyService.accessToken).toBe('test_access_token')
        })

        test('should handle authentication failure', async () => {
            axios.post.mockRejectedValueOnce(new Error('Authentication failed'))

            await expect(spotifyService.authenticate()).rejects.toThrow('Failed to authenticate with Spotify API')
        })

        test('should reuse valid token', async () => {
            spotifyService.accessToken = 'existing_token'
            spotifyService.tokenExpiry = Date.now() + 60000 // 1 minute from now

            await spotifyService.authenticate()

            expect(axios.post).not.toHaveBeenCalled()
            expect(spotifyService.accessToken).toBe('existing_token')
        })
    })

    describe('data transformation', () => {
        test('should create song object from Spotify track data', () => {
            const mockTrackData = {
                id: 'track123',
                name: 'Test Track',
                artists: [{ name: 'Test Artist' }],
                album: {
                    name: 'Test Album',
                    images: [{ url: 'https://example.com/image.jpg' }]
                },
                preview_url: 'https://example.com/preview.mp3',
                external_urls: { spotify: 'https://open.spotify.com/track/track123' }
            }

            const song = spotifyService.createSongFromSpotifyTrack(mockTrackData)

            expect(song).toEqual({
                id: 'track123',
                name: 'Test Track',
                artist: 'Test Artist',
                album: 'Test Album',
                imageUrl: 'https://example.com/image.jpg',
                previewUrl: 'https://example.com/preview.mp3',
                externalUrl: 'https://open.spotify.com/track/track123',
                platform: 'spotify'
            })
        })

        test('should handle missing data gracefully', () => {
            const mockTrackData = {
                id: 'track123',
                name: 'Test Track',
                artists: [],
                album: {}
            }

            const song = spotifyService.createSongFromSpotifyTrack(mockTrackData)

            expect(song.artist).toBe('Unknown Artist')
            expect(song.album).toBe('Unknown Album')
            expect(song.imageUrl).toBeNull()
        })
    })

    describe('API calls', () => {
        beforeEach(() => {
            // Mock successful authentication
            const mockAuthResponse = {
                data: {
                    access_token: 'test_access_token',
                    expires_in: 3600
                }
            }
            axios.post.mockResolvedValue(mockAuthResponse)
        })

        test('should get track by ID successfully', async () => {
            const mockTrackResponse = {
                data: {
                    id: 'track123',
                    name: 'Test Track',
                    artists: [{ name: 'Test Artist' }],
                    album: { name: 'Test Album', images: [] },
                    external_urls: { spotify: 'https://open.spotify.com/track/track123' }
                }
            }

            axios.get.mockResolvedValueOnce(mockTrackResponse)

            const track = await spotifyService.getTrackById('track123')

            expect(track).toBeDefined()
            expect(track.id).toBe('track123')
            expect(track.name).toBe('Test Track')
            expect(track.platform).toBe('spotify')
        })

        test('should return null for failed track request', async () => {
            axios.get.mockRejectedValueOnce(new Error('Track not found'))

            const track = await spotifyService.getTrackById('invalid_id')

            expect(track).toBeNull()
        })

        test('should search tracks successfully', async () => {
            const mockSearchResponse = {
                data: {
                    tracks: {
                        items: [
                            {
                                id: 'track1',
                                name: 'Track 1',
                                artists: [{ name: 'Artist 1' }],
                                album: { name: 'Album 1', images: [] },
                                external_urls: { spotify: 'https://open.spotify.com/track/track1' }
                            },
                            {
                                id: 'track2',
                                name: 'Track 2',
                                artists: [{ name: 'Artist 2' }],
                                album: { name: 'Album 2', images: [] },
                                external_urls: { spotify: 'https://open.spotify.com/track/track2' }
                            }
                        ]
                    }
                }
            }

            axios.get.mockResolvedValueOnce(mockSearchResponse)

            const tracks = await spotifyService.searchTracks('test query')

            expect(tracks).toHaveLength(2)
            expect(tracks[0].id).toBe('track1')
            expect(tracks[1].id).toBe('track2')
        })

        test('should return empty array for failed search', async () => {
            axios.get.mockRejectedValueOnce(new Error('Search failed'))

            const tracks = await spotifyService.searchTracks('test query')

            expect(tracks).toEqual([])
        })
    })
})