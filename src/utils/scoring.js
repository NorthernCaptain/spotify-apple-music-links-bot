/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const stringSimilarity = require('string-similarity')

/**
 * Calculate similarity score between two songs
 * @param {Object} originalSong - The original song metadata
 * @param {Object} candidateSong - The candidate song to compare
 * @returns {number} Score between 0 and 100
 */
function calculateSongScore(originalSong, candidateSong) {
    if (!originalSong || !candidateSong) return 0

    const weights = {
        title: 0.4,
        artist: 0.4,
        album: 0.2
    }

    // Normalize strings for comparison
    const normalize = (str) => str?.toLowerCase().replace(/[^\w\s]/g, '').trim() || ''

    const originalTitle = normalize(originalSong.name)
    const originalArtist = normalize(originalSong.artist)
    const originalAlbum = normalize(originalSong.album)

    const candidateTitle = normalize(candidateSong.name)
    const candidateArtist = normalize(candidateSong.artist)
    const candidateAlbum = normalize(candidateSong.album)

    // Calculate similarity scores
    const titleScore = stringSimilarity.compareTwoStrings(originalTitle, candidateTitle)
    const artistScore = stringSimilarity.compareTwoStrings(originalArtist, candidateArtist)
    const albumScore = stringSimilarity.compareTwoStrings(originalAlbum, candidateAlbum)

    // Weighted total score
    const totalScore = (
        titleScore * weights.title +
        artistScore * weights.artist +
        albumScore * weights.album
    ) * 100

    return Math.round(totalScore)
}

/**
 * Get confidence level description based on score
 * @param {number} score - Score between 0 and 100
 * @returns {string} Confidence description
 */
function getConfidenceLevel(score) {
    if (score >= 98) return 'Exact match'
    if (score >= 90) return `${score}% match`
    if (score >= 80) return `${score}% match`
    if (score >= 60) return `${score}% match`
    return `${score}% match (low confidence)`
}

/**
 * Find the best matching song from a list of candidates
 * @param {Object} originalSong - The original song metadata
 * @param {Array} candidates - Array of candidate songs
 * @returns {Object|null} Best matching song with score, or null if no good match
 */
function findBestMatch(originalSong, candidates) {
    if (!candidates || candidates.length === 0) return null

    let bestMatch = null
    let bestScore = 0

    for (const candidate of candidates) {
        const score = calculateSongScore(originalSong, candidate)
        if (score > bestScore) {
            bestScore = score
            bestMatch = { ...candidate, matchScore: score }
        }
    }

    // Only return matches with reasonable confidence (>= 60%)
    return bestScore >= 60 ? bestMatch : null
}

module.exports = {
    calculateSongScore,
    getConfidenceLevel,
    findBestMatch
}