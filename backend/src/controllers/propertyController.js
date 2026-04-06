const prisma = require('../config/db');

// GET /api/properties
const getProperties = async (req, res, next) => {
  try {
    const { type, status, search } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(properties);
  } catch (error) {
    next(error);
  }
};

// GET /api/properties/:id
const getProperty = async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { contact: true, deals: true },
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (error) {
    next(error);
  }
};

// POST /api/properties
const createProperty = async (req, res, next) => {
  try {
    const property = await prisma.property.create({ data: req.body });
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

// PUT /api/properties/:id
const updateProperty = async (req, res, next) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(property);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/properties/:id
const deleteProperty = async (req, res, next) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } });
    res.json({ message: 'Property deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty };
