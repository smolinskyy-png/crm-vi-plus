const prisma = require('../config/db');

// GET /api/contacts
const getContacts = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: { _count: { select: { deals: true, activities: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

// GET /api/contacts/:id
const getContact = async (req, res, next) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        properties: true,
        deals: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (error) {
    next(error);
  }
};

// POST /api/contacts
const createContact = async (req, res, next) => {
  try {
    const contact = await prisma.contact.create({ data: req.body });
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
};

// PUT /api/contacts/:id
const updateContact = async (req, res, next) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(contact);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/contacts/:id
const deleteContact = async (req, res, next) => {
  try {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact };
