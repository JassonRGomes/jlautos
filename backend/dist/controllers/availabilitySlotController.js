"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAvailabilitySlot = exports.updateAvailabilitySlot = exports.createAvailabilitySlot = exports.getAvailabilitySlotById = exports.getAvailabilitySlots = void 0;
const db_1 = __importDefault(require("../config/db"));
// GET /availability-slots
const getAvailabilitySlots = async (req, res) => {
    const { dealershipId, date, isBooked } = req.query;
    const where = {};
    if (dealershipId)
        where.dealershipId = dealershipId;
    if (isBooked !== undefined)
        where.isBooked = isBooked === 'true';
    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        where.date = { gte: startDate, lte: endDate };
    }
    try {
        const slots = await db_1.default.availabilitySlot.findMany({
            where,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
        return res.json({ success: true, data: slots });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch availability slots.', error: error.message });
    }
};
exports.getAvailabilitySlots = getAvailabilitySlots;
// GET /availability-slots/:id
const getAvailabilitySlotById = async (req, res) => {
    const { id } = req.params;
    try {
        const slot = await db_1.default.availabilitySlot.findUnique({ where: { id } });
        if (!slot)
            return res.status(404).json({ success: false, message: 'Availability slot not found.' });
        return res.json({ success: true, data: slot });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch slot.', error: error.message });
    }
};
exports.getAvailabilitySlotById = getAvailabilitySlotById;
// POST /availability-slots (admin/manager only)
const createAvailabilitySlot = async (req, res) => {
    const { dealershipId, date, startTime, endTime, type } = req.body;
    if (!dealershipId || !date || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'dealershipId, date, startTime, and endTime are required.' });
    }
    try {
        const slotDate = new Date(date);
        const slot = await db_1.default.availabilitySlot.create({
            data: { dealershipId, date: slotDate, startTime, endTime, type: type || 'TEST_DRIVE' },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'CREATE_AVAILABILITY_SLOT',
                entityType: 'AvailabilitySlot',
                entityId: slot.id,
                performedBy: req.user.id,
            },
        });
        return res.status(201).json({ success: true, message: 'Availability slot created.', data: slot });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create slot.', error: error.message });
    }
};
exports.createAvailabilitySlot = createAvailabilitySlot;
// PUT /availability-slots/:id (admin/manager only)
const updateAvailabilitySlot = async (req, res) => {
    const { id } = req.params;
    const { isBooked, type, startTime, endTime, date } = req.body;
    try {
        const existing = await db_1.default.availabilitySlot.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Availability slot not found.' });
        const updates = {};
        if (isBooked !== undefined)
            updates.isBooked = isBooked;
        if (type)
            updates.type = type;
        if (startTime)
            updates.startTime = startTime;
        if (endTime)
            updates.endTime = endTime;
        if (date)
            updates.date = new Date(date);
        const updated = await db_1.default.availabilitySlot.update({
            where: { id },
            data: updates,
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'UPDATE_AVAILABILITY_SLOT',
                entityType: 'AvailabilitySlot',
                entityId: id,
                performedBy: req.user.id,
            },
        });
        return res.json({ success: true, message: 'Slot updated.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update slot.', error: error.message });
    }
};
exports.updateAvailabilitySlot = updateAvailabilitySlot;
// DELETE /availability-slots/:id (admin/manager only)
const deleteAvailabilitySlot = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await db_1.default.availabilitySlot.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Availability slot not found.' });
        await db_1.default.availabilitySlot.delete({ where: { id } });
        await db_1.default.activityLog.create({
            data: {
                action: 'DELETE_AVAILABILITY_SLOT',
                entityType: 'AvailabilitySlot',
                entityId: id,
                performedBy: req.user.id,
            },
        });
        return res.json({ success: true, message: 'Slot deleted.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete slot.', error: error.message });
    }
};
exports.deleteAvailabilitySlot = deleteAvailabilitySlot;
//# sourceMappingURL=availabilitySlotController.js.map