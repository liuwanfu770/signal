const express = require('express');
const router = express.Router();
const accountController = require('../accountController');
const authenticate = require('../authenticate');

// 使用认证中间件
router.post('/accounts/register/:number', authenticate, accountController.registerAccount);
router.get('/accounts', authenticate, accountController.getAccounts);
router.put('/accounts/:number', authenticate, accountController.updateAccount);

module.exports = router;
