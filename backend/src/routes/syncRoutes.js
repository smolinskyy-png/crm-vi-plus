const express = require('express');
const { loadData, saveData } = require('../controllers/syncController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', loadData);
router.put('/', saveData);

module.exports = router;
