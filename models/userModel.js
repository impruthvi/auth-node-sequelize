const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/database");
const crypto = require("crypto");

const Users = sequelize.define("user", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  email: {
    type: DataTypes.CHAR,
    allowNull: false,
    unique: true,
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.CHAR,
    allowNull: true,
  },
  password: {
    type: DataTypes.CHAR,
    allowNull: false,
  },
  otp: {
    type: DataTypes.CHAR,
    allowNull: true,
  },
  passwordResetToken: {
    type: DataTypes.CHAR,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
        allowNull: true,
  },
});

Users.prototype.createResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = Users;
