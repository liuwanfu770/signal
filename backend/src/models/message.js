const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');
const User = require('./user');
const Group = require('./group');

const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sender_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    recipient_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    group_id: { type: DataTypes.INTEGER, references: { model: Group, key: 'id' } },
    content: DataTypes.TEXT,
    type: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: 'SENDING' }
}, { timestamps: true });

module.exports = Message;
