const { Sequelize } = require('sequelize');
const dotenv = require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: 'localhost',
    port: process.env.DB_PORT,
    dialect: 'postgres',
});

// Database configuration for RMV
const rmvSequelize = new Sequelize(process.env.RMV_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: 'localhost',
    port: process.env.DB_PORT,
    dialect: 'postgres',
});

module.exports = {
    sequelize: sequelize,
    rmvSequelize: rmvSequelize,
};