/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const winston = require('winston')

/**
 * Console log wrapper with timestamp
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 */
function clog(message, ...args) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`, ...args)
}

/**
 * Winston logger configuration
 */
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'spotify-apple-music-bot' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
})

module.exports = { clog, logger }