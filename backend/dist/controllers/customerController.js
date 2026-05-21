"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomerById = exports.getCustomers = void 0;
const db_1 = __importDefault(require("../config/db"));
// GET /customers
const getCustomers = async (req, res) => {
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { document: { contains: search } },
        ];
    }
    try {
        const [customers, total] = await Promise.all([
            db_1.default.customer.findMany({
                where, skip, take,
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { sales: true } } },
            }),
            db_1.default.customer.count({ where }),
        ]);
        return res.json({
            success: true,
            data: customers,
            pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch customers.', error: error.message });
    }
};
exports.getCustomers = getCustomers;
// GET /customers/:id
const getCustomerById = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await db_1.default.customer.findUnique({
            where: { id },
            include: {
                sales: {
                    orderBy: { createdAt: 'desc' },
                    include: { items: true, transactions: true },
                },
            },
        });
        if (!customer)
            return res.status(404).json({ success: false, message: 'Customer not found.' });
        return res.json({ success: true, data: customer });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch customer.', error: error.message });
    }
};
exports.getCustomerById = getCustomerById;
// POST /customers
const createCustomer = async (req, res) => {
    const { name, email, phone, document, address, city, state, zipCode } = req.body;
    if (!name)
        return res.status(400).json({ success: false, message: 'Customer name is required.' });
    try {
        if (email) {
            const exists = await db_1.default.customer.findUnique({ where: { email } });
            if (exists)
                return res.status(409).json({ success: false, message: 'A customer with this email already exists.' });
        }
        const customer = await db_1.default.customer.create({
            data: { name, email, phone, document, address, city, state, zipCode },
        });
        await db_1.default.activityLog.create({
            data: { action: 'CREATE_CUSTOMER', entityType: 'Customer', entityId: customer.id, performedBy: req.user.id },
        });
        return res.status(201).json({ success: true, message: 'Customer created successfully.', data: customer });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create customer.', error: error.message });
    }
};
exports.createCustomer = createCustomer;
// PUT /customers/:id
const updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, document, address, city, state, zipCode } = req.body;
    try {
        const exists = await db_1.default.customer.findUnique({ where: { id } });
        if (!exists)
            return res.status(404).json({ success: false, message: 'Customer not found.' });
        const updated = await db_1.default.customer.update({
            where: { id },
            data: { name, email, phone, document, address, city, state, zipCode },
        });
        await db_1.default.activityLog.create({
            data: { action: 'UPDATE_CUSTOMER', entityType: 'Customer', entityId: id, performedBy: req.user.id },
        });
        return res.json({ success: true, message: 'Customer updated.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update customer.', error: error.message });
    }
};
exports.updateCustomer = updateCustomer;
// DELETE /customers/:id
const deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const exists = await db_1.default.customer.findUnique({ where: { id } });
        if (!exists)
            return res.status(404).json({ success: false, message: 'Customer not found.' });
        await db_1.default.customer.delete({ where: { id } });
        await db_1.default.activityLog.create({
            data: { action: 'DELETE_CUSTOMER', entityType: 'Customer', entityId: id, performedBy: req.user.id },
        });
        return res.json({ success: true, message: 'Customer deleted.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete customer.', error: error.message });
    }
};
exports.deleteCustomer = deleteCustomer;
//# sourceMappingURL=customerController.js.map