const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    phone_number: { type: DataTypes.STRING, unique: true, allowNull: false },
    signal_username: { type: DataTypes.STRING, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    nickname: DataTypes.STRING,
    avatar: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: 'REGISTERED' }
}, { timestamps: true });

module.exports = User;
