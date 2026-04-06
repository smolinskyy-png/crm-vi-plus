const prisma = require('../config/db');

// GET /api/sync — load CRM data for current user
const loadData = async (req, res, next) => {
  try {
    const crmData = await prisma.crmData.findUnique({
      where: { userId: req.user.id },
    });

    res.json({ data: crmData ? crmData.data : null });
  } catch (error) {
    next(error);
  }
};

// PUT /api/sync — save CRM data for current user
const saveData = async (req, res, next) => {
  try {
    const crmData = await prisma.crmData.upsert({
      where: { userId: req.user.id },
      update: { data: req.body },
      create: { userId: req.user.id, data: req.body },
    });

    res.json({ message: 'Data saved', updatedAt: crmData.updatedAt });
  } catch (error) {
    next(error);
  }
};

module.exports = { loadData, saveData };
