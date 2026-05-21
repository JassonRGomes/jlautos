import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// GET /customers
export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  const { search, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } },
      { phone: { contains: search as string } },
      { document: { contains: search as string } },
    ];
  }

  try {
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sales: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.json({
      success: true,
      data: customers,
      pagination: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.', error: error.message });
  }
};

// GET /customers/:id
export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, transactions: true },
        },
      },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    return res.json({ success: true, data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer.', error: error.message });
  }
};

// POST /customers
export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, document, address, city, state, zipCode } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Customer name is required.' });

  try {
    if (email) {
      const exists = await prisma.customer.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'A customer with this email already exists.' });
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, document, address, city, state, zipCode },
    });

    await prisma.activityLog.create({
      data: { action: 'CREATE_CUSTOMER', entityType: 'Customer', entityId: customer.id, performedBy: req.user!.id },
    });

    return res.status(201).json({ success: true, message: 'Customer created successfully.', data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create customer.', error: error.message });
  }
};

// PUT /customers/:id
export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, document, address, city, state, zipCode } = req.body;

  try {
    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const updated = await prisma.customer.update({
      where: { id },
      data: { name, email, phone, document, address, city, state, zipCode },
    });

    await prisma.activityLog.create({
      data: { action: 'UPDATE_CUSTOMER', entityType: 'Customer', entityId: id, performedBy: req.user!.id },
    });

    return res.json({ success: true, message: 'Customer updated.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update customer.', error: error.message });
  }
};

// DELETE /customers/:id
export const deleteCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ success: false, message: 'Customer not found.' });

    await prisma.customer.delete({ where: { id } });

    await prisma.activityLog.create({
      data: { action: 'DELETE_CUSTOMER', entityType: 'Customer', entityId: id, performedBy: req.user!.id },
    });

    return res.json({ success: true, message: 'Customer deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete customer.', error: error.message });
  }
};
