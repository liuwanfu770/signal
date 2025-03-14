const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// 简单的中间件
const auth = (req, res, next) => {
  next();
};

// 账户路由
router.post('/register/:number', auth, accountController.registerAccount);
router.get('/', auth, accountController.getAccounts);
router.put('/:number', auth, accountController.updateAccount);

module.exports = router;
