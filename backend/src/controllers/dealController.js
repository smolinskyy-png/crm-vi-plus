const prisma = require('../config/db');

// GET /api/deals
const getDeals = async (req, res, next) => {
  try {
    const { stage, userId } = req.query;
    const where = {};

    if (stage) where.stage = stage;
    if (userId) where.userId = userId;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(deals);
  } catch (error) {
    next(error);
  }
};

// GET /api/deals/:id
const getDeal = async (req, res, next) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        contact: true,
        property: true,
        user: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json(deal);
  } catch (error) {
    next(error);
  }
};

// POST /api/deals
const createDeal = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!data.userId) data.userId = req.user.id;

    const deal = await prisma.deal.create({ data });
    res.status(201).json(deal);
  } catch (error) {
    next(error);
  }
};

// PUT /api/deals/:id
const updateDeal = async (req, res, next) => {
  try {
    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(deal);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/deals/:id
const deleteDeal = async (req, res, next) => {
  try {
    await prisma.deal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deal deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDeals, getDeal, createDeal, updateDeal, deleteDeal };
