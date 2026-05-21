"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDealership = exports.updateDealership = exports.createDealership = exports.getDealershipById = exports.getDealerships = void 0;
const db_1 = __importDefault(require("../config/db"));
// GET /dealerships
const getDealerships = async (req, res) => {
    try {
        const dealerships = await db_1.default.dealership.findMany({
            orderBy: { name: 'asc' },
        });
        return res.json({ success: true, data: dealerships });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch dealerships.', error: error.message });
    }
};
exports.getDealerships = getDealerships;
// GET /dealerships/:id
const getDealershipById = async (req, res) => {
    const { id } = req.params;
    try {
        const dealership = await db_1.default.dealership.findUnique({
            where: { id },
            include: {
                vehicles: { select: { id: true, make: true, model: true, year: true, price: true } },
            },
        });
        if (!dealership)
            return res.status(404).json({ success: false, message: 'Dealership not found.' });
        return res.json({ success: true, data: dealership });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch dealership.', error: error.message });
    }
};
exports.getDealershipById = getDealershipById;
// POST /dealerships (admin only)
const createDealership = async (req, res) => {
    const { name, email, phone, address, city, state, zipCode, status } = req.body;
    if (!name)
        return res.status(400).json({ success: false, message: 'Name is required.' });
    try {
        const dealership = await db_1.default.dealership.create({
            data: { name, email, phone, address, city, state, zipCode, status: status || 'ACTIVE' },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'CREATE_DEALERSHIP',
                entityType: 'Dealership',
                entityId: dealership.id,
                performedBy: req.user.id,
            },
        });
        return res.status(201).json({ success: true, message: 'Dealership created successfully.', data: dealership });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create dealership.', error: error.message });
    }
};
exports.createDealership = createDealership;
// PUT /dealerships/:id (admin only)
const updateDealership = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, city, state, zipCode, status } = req.body;
    try {
        const existing = await db_1.default.dealership.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Dealership not found.' });
        const updated = await db_1.default.dealership.update({
            where: { id },
            data: { name, email, phone, address, city, state, zipCode, status },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'UPDATE_DEALERSHIP',
                entityType: 'Dealership',
                entityId: id,
                performedBy: req.user.id,
            },
        });
        return res.json({ success: true, message: 'Dealership updated successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update dealership.', error: error.message });
    }
};
exports.updateDealership = updateDealership;
// DELETE /dealerships/:id (admin only)
const deleteDealership = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await db_1.default.dealership.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Dealership not found.' });
        await db_1.default.dealership.delete({ where: { id } });
        await db_1.default.activityLog.create({
            data: {
                action: 'DELETE_DEALERSHIP',
                entityType: 'Dealership',
                entityId: id,
                performedBy: req.user.id,
            },
        });
        return res.json({ success: true, message: 'Dealership deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete dealership.', error: error.message });
    }
};
exports.deleteDealership = deleteDealership;
//# sourceMappingURL=dealershipController.js.map