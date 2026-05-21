"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTestDrive = exports.updateTestDrive = exports.createTestDrive = exports.getTestDriveById = exports.getTestDrives = void 0;
const db_1 = __importDefault(require("../config/db"));
// GET /test-drives - List test drives
const getTestDrives = async (req, res) => {
    const user = req.user;
    const { status, vehicleId, page = '1', limit = '20' } = req.query;
    const where = {};
    if (user.role === 'CUSTOMER')
        where.userId = user.id;
    if (status)
        where.status = status;
    if (vehicleId)
        where.vehicleId = vehicleId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    try {
        const [testDrives, total] = await Promise.all([
            db_1.default.testDrive.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true, phone: true } },
                    vehicle: { select: { id: true, make: true, model: true, year: true, color: true, images: true } },
                    salesRep: { select: { id: true, name: true, email: true } },
                },
            }),
            db_1.default.testDrive.count({ where }),
        ]);
        return res.json({
            success: true,
            data: testDrives,
            pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch test drives.', error: error.message });
    }
};
exports.getTestDrives = getTestDrives;
// GET /test-drives/:id
const getTestDriveById = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const testDrive = await db_1.default.testDrive.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                vehicle: { select: { id: true, make: true, model: true, year: true, color: true, price: true, images: true } },
                salesRep: { select: { id: true, name: true, email: true } },
            },
        });
        if (!testDrive)
            return res.status(404).json({ success: false, message: 'Test drive not found.' });
        if (user.role === 'CUSTOMER' && testDrive.userId !== user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        return res.json({ success: true, data: testDrive });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch test drive.', error: error.message });
    }
};
exports.getTestDriveById = getTestDriveById;
// POST /test-drives - Schedule test drive
const createTestDrive = async (req, res) => {
    const user = req.user;
    const { vehicleId, testDriveDate, testDriveTime, location, salesRepresentativeId, notes } = req.body;
    if (!vehicleId || !testDriveDate || !testDriveTime) {
        return res.status(400).json({ success: false, message: 'vehicleId, testDriveDate, and testDriveTime are required.' });
    }
    try {
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle)
            return res.status(404).json({ success: false, message: 'Vehicle not found.' });
        if (vehicle.status === 'SOLD')
            return res.status(409).json({ success: false, message: 'Vehicle is already sold.' });
        // Check slot conflict
        const conflict = await db_1.default.testDrive.findFirst({
            where: {
                vehicleId,
                testDriveDate: new Date(testDriveDate),
                testDriveTime,
                status: { in: ['scheduled', 'approved'] },
            },
        });
        if (conflict) {
            return res.status(409).json({ success: false, message: 'This vehicle already has a test drive scheduled at this date and time.' });
        }
        // Customer cannot have multiple active test drives for same vehicle
        const existingActive = await db_1.default.testDrive.findFirst({
            where: { userId: user.id, vehicleId, status: { in: ['scheduled', 'approved'] } },
        });
        if (existingActive) {
            return res.status(409).json({ success: false, message: 'You already have an active test drive for this vehicle.' });
        }
        const testDrive = await db_1.default.testDrive.create({
            data: {
                userId: user.id,
                vehicleId,
                testDriveDate: new Date(testDriveDate),
                testDriveTime,
                location: location || 'Dealership',
                salesRepresentativeId: salesRepresentativeId || null,
                notes: notes || null,
                status: 'scheduled',
            },
            include: {
                vehicle: { select: { make: true, model: true, year: true } },
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'CREATE_TEST_DRIVE',
                entityType: 'TestDrive',
                entityId: testDrive.id,
                performedBy: user.id,
            },
        });
        return res.status(201).json({ success: true, message: 'Test drive scheduled successfully.', data: testDrive });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to schedule test drive.', error: error.message });
    }
};
exports.createTestDrive = createTestDrive;
// PUT /test-drives/:id - Update (admin: any; customer: cancel only)
const updateTestDrive = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { status, testDriveDate, testDriveTime, location, salesRepresentativeId, notes } = req.body;
    try {
        const testDrive = await db_1.default.testDrive.findUnique({ where: { id } });
        if (!testDrive)
            return res.status(404).json({ success: false, message: 'Test drive not found.' });
        if (user.role === 'CUSTOMER') {
            if (testDrive.userId !== user.id)
                return res.status(403).json({ success: false, message: 'Access denied.' });
            if (status && status !== 'cancelled')
                return res.status(403).json({ success: false, message: 'Customers can only cancel test drives.' });
        }
        const updates = {};
        if (status)
            updates.status = status;
        if (testDriveDate)
            updates.testDriveDate = new Date(testDriveDate);
        if (testDriveTime)
            updates.testDriveTime = testDriveTime;
        if (location)
            updates.location = location;
        if (salesRepresentativeId !== undefined)
            updates.salesRepresentativeId = salesRepresentativeId;
        if (notes !== undefined)
            updates.notes = notes;
        const updated = await db_1.default.testDrive.update({ where: { id }, data: updates });
        await db_1.default.activityLog.create({
            data: {
                action: `UPDATE_TEST_DRIVE_${(status || 'EDITED').toUpperCase()}`,
                entityType: 'TestDrive',
                entityId: id,
                performedBy: user.id,
            },
        });
        return res.json({ success: true, message: 'Test drive updated.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update test drive.', error: error.message });
    }
};
exports.updateTestDrive = updateTestDrive;
// DELETE /test-drives/:id (admin only)
const deleteTestDrive = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const testDrive = await db_1.default.testDrive.findUnique({ where: { id } });
        if (!testDrive)
            return res.status(404).json({ success: false, message: 'Test drive not found.' });
        await db_1.default.testDrive.delete({ where: { id } });
        await db_1.default.activityLog.create({
            data: { action: 'DELETE_TEST_DRIVE', entityType: 'TestDrive', entityId: id, performedBy: user.id },
        });
        return res.json({ success: true, message: 'Test drive deleted.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete test drive.', error: error.message });
    }
};
exports.deleteTestDrive = deleteTestDrive;
//# sourceMappingURL=testDriveController.js.map