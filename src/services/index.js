const userService = require('./user');
const adminService = require('./admin');
const notificationService = require('./notificationService');

const invoiceService = require('./invoiceService');

module.exports = {
  user: userService,
  admin: adminService,
  notificationService,
  invoiceService
};
