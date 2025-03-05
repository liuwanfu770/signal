const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');

router.post('/register/:number', auth, accountController.registerAccount);
router.get('/', auth, accountController.getAccounts);
router.put('/:number', auth, accountController.updateAccount);

module.exports = router;
