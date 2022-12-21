const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.RDS_DATABASE, process.env.RDS_USERNAME, process.env.RDS_PASSWORD, {
    host: process.env.RDS_HOSTNAME,
    dialect: 'mysql'
});

module.exports = sequelize;