/**
 *  The MIT License (MIT)
 *  Copyright (c) 2025 Northern Captain
 */

const { Model, DataTypes } = require("sequelize")

/**
 * Setup model for storing configuration values in the database
 */
class Setup extends Model {
    /**
     * Initialize the Setup model
     * @param {Sequelize} sequelize - Sequelize instance
     * @param {Object} DataTypes - Sequelize DataTypes
     * @returns {Setup} The initialized model
     */
    static init(sequelize, DataTypes) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                unique: true,
                primaryKey: true
            },
            value: {
                type: DataTypes.TEXT
            }
        }, {
            sequelize,
            modelName: "Setup",
            tableName: "setup",
        })
    }
}

module.exports = { Setup }