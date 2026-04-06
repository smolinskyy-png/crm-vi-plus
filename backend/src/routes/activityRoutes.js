const express = require('express');
const { getActivities, getActivity, createActivity, updateActivity, deleteActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getActivities).post(createActivity);
router.route('/:id').get(getActivity).put(updateActivity).delete(deleteActivity);

module.exports = router;
