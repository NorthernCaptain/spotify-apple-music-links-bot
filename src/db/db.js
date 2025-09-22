/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { Sequelize } = require("sequelize")
const { clog } = require("../utils/logs")
const { Setup } = require("./setup")
const path = require("path")

/**
 * Database management class using SQLite
 */
class DB {
    constructor(config) {
        this.config = config
        this.sequelize = null
    }

    /**
     * Initialize database connection and models
     */
    async start() {
        const dbPath = path.join(this.config.storage.folder, 'bot.db')

        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: dbPath,
            logging: false
        })

        try {
            await this.sequelize.authenticate()
            clog("DB Connection has been established successfully.")
        } catch (error) {
            clog("Unable to connect to the database:", error)
            throw error
        }

        Setup.init(this.sequelize, Sequelize)
        await this.sequelize.sync()
    }

    /**
     * Get a setup value from the database
     * @param {string} name - The name of the setup value
     * @param {any} def - Default value if not found
     * @param {boolean} asJSON - Whether to parse the value as JSON
     * @returns {any} The setup value
     */
    async getSetupValue(name, def = null, asJSON = false) {
        let setup = await Setup.findByPk(name)
        if (setup) {
            return asJSON ? JSON.parse(setup.value) : setup.value
        } else {
            return def
        }
    }

    /**
     * Set a setup value in the database
     * @param {string} name - The name of the setup value
     * @param {any} value - The value to store
     */
    async setSetupValue(name, value) {
        let setup = await Setup.findByPk(name)
        const valueToSave = value instanceof Object ? JSON.stringify(value) : value.toString()

        if (setup) {
            setup.value = valueToSave
            await setup.save()
        } else {
            await Setup.create({ name, value: valueToSave })
        }
    }
}

const db = new DB(require("../config/config").config)

module.exports = { DB, db }