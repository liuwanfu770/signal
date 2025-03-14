const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// 账户路由
router.post('/register/:number', accountController.registerAccount);
router.get('/', accountController.getAccounts);
router.put('/:number', accountController.updateAccount);

module.exports = router;
