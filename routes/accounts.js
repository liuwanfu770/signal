const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accounts');

// 简单的中间件，稍后可以替换为真正的认证
const auth = (req, res, next) => {
  next();
};

// 账户路由
router.post('/register/:number', auth, accountController.registerAccount);
router.get('/', auth, accountController.getAccounts);
router.put('/:number', auth, accountController.updateAccount);

module.exports = router;
