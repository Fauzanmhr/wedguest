const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Attendance = require('./Attendance');

const Guest = sequelize.define('Guest', {
  guest_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phone_number: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('vip', 'peserta', 'panitia'),
    allowNull: false,
  },
  info: {
    type: DataTypes.ENUM('tamu mempelai pria', 'tamu mempelai wanita', 'tidak-terdaftar'),
    allowNull: false,
  },
  qr_code_url: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
});

Guest.hasMany(Attendance, { foreignKey: 'guest_id' });
Attendance.belongsTo(Guest, { foreignKey: 'guest_id' });

module.exports = Guest;
