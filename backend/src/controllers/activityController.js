const prisma = require('../config/db');

// GET /api/activities
const getActivities = async (req, res, next) => {
  try {
    const { type, contactId, dealId } = req.query;
    const where = {};

    if (type) where.type = type;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

// GET /api/activities/:id
const getActivity = async (req, res, next) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { contact: true, deal: true, user: true },
    });

    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

// POST /api/activities
const createActivity = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!data.userId) data.userId = req.user.id;

    const activity = await prisma.activity.create({ data });
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

// PUT /api/activities/:id
const updateActivity = async (req, res, next) => {
  try {
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/activities/:id
const deleteActivity = async (req, res, next) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.id } });
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActivities, getActivity, createActivity, updateActivity, deleteActivity };
