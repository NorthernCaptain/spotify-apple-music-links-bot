/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { calculateSongScore, getConfidenceLevel, findBestMatch } = require('../../src/utils/scoring')

describe('Scoring Utilities', () => {
    describe('calculateSongScore', () => {
        test('should return 100 for identical songs', () => {
            const originalSong = {
                name: 'Never Gonna Give You Up',
                artist: 'Rick Astley',
                album: 'Whenever You Need Somebody'
            }

            const candidateSong = {
                name: 'Never Gonna Give You Up',
                artist: 'Rick Astley',
                album: 'Whenever You Need Somebody'
            }

            const score = calculateSongScore(originalSong, candidateSong)
            expect(score).toBe(100)
        })

        test('should return 0 for null inputs', () => {
            expect(calculateSongScore(null, {})).toBe(0)
            expect(calculateSongScore({}, null)).toBe(0)
            expect(calculateSongScore(null, null)).toBe(0)
        })

        test('should handle partial matches', () => {
            const originalSong = {
                name: 'Bohemian Rhapsody',
                artist: 'Queen',
                album: 'A Night at the Opera'
            }

            const candidateSong = {
                name: 'Bohemian Rhapsody',
                artist: 'Queen',
                album: 'Queen Greatest Hits'
            }

            const score = calculateSongScore(originalSong, candidateSong)
            expect(score).toBeGreaterThan(70)
            expect(score).toBeLessThan(100)
        })

        test('should handle case insensitive matching', () => {
            const originalSong = {
                name: 'HELLO',
                artist: 'ADELE',
                album: '25'
            }

            const candidateSong = {
                name: 'hello',
                artist: 'adele',
                album: '25'
            }

            const score = calculateSongScore(originalSong, candidateSong)
            expect(score).toBe(100)
        })

        test('should handle punctuation differences', () => {
            const originalSong = {
                name: "Don't Stop Me Now",
                artist: 'Queen',
                album: 'Jazz'
            }

            const candidateSong = {
                name: 'Dont Stop Me Now',
                artist: 'Queen',
                album: 'Jazz'
            }

            const score = calculateSongScore(originalSong, candidateSong)
            expect(score).toBeGreaterThan(90)
        })
    })

    describe('getConfidenceLevel', () => {
        test('should return "Exact match" for scores >= 98', () => {
            expect(getConfidenceLevel(100)).toBe('Exact match')
            expect(getConfidenceLevel(98)).toBe('Exact match')
        })

        test('should return percentage for scores 90-97', () => {
            expect(getConfidenceLevel(95)).toBe('95% match')
            expect(getConfidenceLevel(90)).toBe('90% match')
        })

        test('should return low confidence warning for scores < 60', () => {
            expect(getConfidenceLevel(50)).toBe('50% match (low confidence)')
            expect(getConfidenceLevel(30)).toBe('30% match (low confidence)')
        })
    })

    describe('findBestMatch', () => {
        const originalSong = {
            name: 'Imagine',
            artist: 'John Lennon',
            album: 'Imagine'
        }

        test('should return null for empty candidates', () => {
            expect(findBestMatch(originalSong, [])).toBeNull()
            expect(findBestMatch(originalSong, null)).toBeNull()
        })

        test('should return best matching candidate', () => {
            const candidates = [
                {
                    name: 'Imagine',
                    artist: 'John Lennon',
                    album: 'The John Lennon Collection'
                },
                {
                    name: 'Imagine',
                    artist: 'John Lennon',
                    album: 'Imagine'
                },
                {
                    name: 'Yesterday',
                    artist: 'The Beatles',
                    album: 'Help!'
                }
            ]

            const bestMatch = findBestMatch(originalSong, candidates)
            expect(bestMatch).toBeDefined()
            expect(bestMatch.name).toBe('Imagine')
            expect(bestMatch.album).toBe('Imagine')
            expect(bestMatch.matchScore).toBeGreaterThan(90)
        })

        test('should return null if no good match found', () => {
            const candidates = [
                {
                    name: 'Completely Different Song',
                    artist: 'Different Artist',
                    album: 'Different Album'
                }
            ]

            const bestMatch = findBestMatch(originalSong, candidates)
            expect(bestMatch).toBeNull()
        })

        test('should include match score in result', () => {
            const candidates = [
                {
                    name: 'Imagine',
                    artist: 'John Lennon',
                    album: 'Imagine'
                }
            ]

            const bestMatch = findBestMatch(originalSong, candidates)
            expect(bestMatch).toBeDefined()
            expect(bestMatch.matchScore).toBeDefined()
            expect(typeof bestMatch.matchScore).toBe('number')
        })
    })
})