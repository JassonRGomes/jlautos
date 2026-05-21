"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSavedSearch = exports.getSavedSearches = exports.saveSearch = exports.getFavorites = exports.toggleFavorite = exports.uploadImages = exports.updateVehicleStatus = exports.deleteVehicle = exports.updateVehicle = exports.createVehicle = exports.getVehicleById = exports.getVehicles = void 0;
const db_1 = __importDefault(require("../config/db"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const REVALIDATION_TOKEN = process.env.REVALIDATION_TOKEN || 'jl_autos_reval_token_secure_2026';
// Cache Revalidation Helper: fires off an async webhook to Frontend Next.js API
const triggerRevalidation = async (id) => {
    try {
        const url = `${FRONTEND_URL}/api/revalidate?secret=${REVALIDATION_TOKEN}&tag=vehicles`;
        console.log(`[Revalidation Webhook] dispatching query: ${url}`);
        // Non-blocking fetch
        fetch(url, { method: 'POST' }).catch((err) => console.error('[Revalidation Error] Failed to revalidate Next.js cache:', err.message));
        if (id) {
            const detailUrl = `${FRONTEND_URL}/api/revalidate?secret=${REVALIDATION_TOKEN}&path=/vehicles/${id}`;
            fetch(detailUrl, { method: 'POST' }).catch((err) => console.error('[Revalidation Error] Failed to revalidate vehicle page cache:', err.message));
        }
    }
    catch (error) {
        console.error('[Revalidation Warning] Exception during webhook trigger:', error.message);
    }
};
// 1. Get All Vehicles (with advanced query filtering widgets)
const getVehicles = async (req, res) => {
    const { make, model, yearMin, yearMax, color, mileageMin, mileageMax, status } = req.query;
    // Build filter object
    const whereClause = {};
    if (make)
        whereClause.make = { contains: String(make) };
    if (model)
        whereClause.model = { contains: String(model) };
    if (color)
        whereClause.color = { contains: String(color) };
    if (status)
        whereClause.status = String(status);
    // Year parsing
    if (yearMin || yearMax) {
        whereClause.year = {};
        if (yearMin)
            whereClause.year.gte = parseInt(String(yearMin));
        if (yearMax)
            whereClause.year.lte = parseInt(String(yearMax));
    }
    // Mileage parsing
    if (mileageMin || mileageMax) {
        whereClause.mileage = {};
        if (mileageMin)
            whereClause.mileage.gte = parseInt(String(mileageMin));
        if (mileageMax)
            whereClause.mileage.lte = parseInt(String(mileageMax));
    }
    try {
        const vehicles = await db_1.default.vehicle.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        // Format images list and finance/warranty parameters safely
        const formattedVehicles = vehicles.map((v) => ({
            ...v,
            images: JSON.parse(v.images),
            financeData: v.financeData ? JSON.parse(v.financeData) : null,
            warrantyData: v.warrantyData ? JSON.parse(v.warrantyData) : null,
        }));
        return res.status(200).json({ count: formattedVehicles.length, vehicles: formattedVehicles });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving inventory.', error: error.message });
    }
};
exports.getVehicles = getVehicles;
// 2. Get Single Vehicle Details
const getVehicleById = async (req, res) => {
    const { id } = req.params;
    try {
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id } });
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle details not found.' });
        }
        const formattedVehicle = {
            ...vehicle,
            images: JSON.parse(vehicle.images),
            financeData: vehicle.financeData ? JSON.parse(vehicle.financeData) : null,
            warrantyData: vehicle.warrantyData ? JSON.parse(vehicle.warrantyData) : null,
        };
        return res.status(200).json({ vehicle: formattedVehicle });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error loading vehicle details.', error: error.message });
    }
};
exports.getVehicleById = getVehicleById;
// 3. Create New Vehicle Listing (CMS Admin Panel)
const createVehicle = async (req, res) => {
    const { make, model, year, color, mileage, price, transmission, engine, fuelType, bodyStyle, seats, doors, description, status, images, // expects stringified JSON or standard array
    isFinanceWarrantyActive, financeData, // object or stringified JSON
    warrantyData, // object or stringified JSON
     } = req.body;
    if (!make || !model || !year || !price || !transmission) {
        return res.status(400).json({ message: 'Missing essential listing specs (Make, Model, Year, Price, Transmission).' });
    }
    try {
        // Standardize input values
        const imagesStr = Array.isArray(images) ? JSON.stringify(images) : (images || '[]');
        const financeStr = financeData ? (typeof financeData === 'object' ? JSON.stringify(financeData) : String(financeData)) : null;
        const warrantyStr = warrantyData ? (typeof warrantyData === 'object' ? JSON.stringify(warrantyData) : String(warrantyData)) : null;
        const newVehicle = await db_1.default.vehicle.create({
            data: {
                make,
                model,
                year: parseInt(String(year)),
                color: color || 'Black',
                mileage: parseInt(String(mileage || 0)),
                price: parseFloat(String(price)),
                transmission,
                engine: engine || 'N/A',
                fuelType: fuelType || 'Gasoline',
                bodyStyle: bodyStyle || 'Sedan',
                seats: parseInt(String(seats || 5)),
                doors: parseInt(String(doors || 4)),
                description: description || '',
                status: status || 'ON_SALE',
                images: imagesStr,
                isFinanceWarrantyActive: isFinanceWarrantyActive === 'true' || isFinanceWarrantyActive === true,
                financeData: financeStr,
                warrantyData: warrantyStr,
            },
        });
        // Trigger instant frontend rebuild for vehicles index
        triggerRevalidation(newVehicle.id);
        return res.status(201).json({
            message: 'Vehicle listing posted successfully.',
            vehicle: {
                ...newVehicle,
                images: JSON.parse(newVehicle.images),
                financeData: newVehicle.financeData ? JSON.parse(newVehicle.financeData) : null,
                warrantyData: newVehicle.warrantyData ? JSON.parse(newVehicle.warrantyData) : null,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error publishing listing.', error: error.message });
    }
};
exports.createVehicle = createVehicle;
// 4. Update Vehicle (CMS Admin Panel)
const updateVehicle = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const existing = await db_1.default.vehicle.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Vehicle to edit was not found.' });
        }
        // Process parsed parameters
        const parsedData = {};
        const stringFields = ['make', 'model', 'color', 'transmission', 'engine', 'fuelType', 'bodyStyle', 'description', 'status'];
        const numberFields = ['year', 'mileage', 'price', 'seats', 'doors'];
        stringFields.forEach((field) => {
            if (updateData[field] !== undefined)
                parsedData[field] = updateData[field];
        });
        numberFields.forEach((field) => {
            if (updateData[field] !== undefined) {
                parsedData[field] = field === 'price' ? parseFloat(String(updateData[field])) : parseInt(String(updateData[field]));
            }
        });
        if (updateData.images !== undefined) {
            parsedData.images = Array.isArray(updateData.images) ? JSON.stringify(updateData.images) : String(updateData.images);
        }
        if (updateData.isFinanceWarrantyActive !== undefined) {
            parsedData.isFinanceWarrantyActive = updateData.isFinanceWarrantyActive === 'true' || updateData.isFinanceWarrantyActive === true;
        }
        if (updateData.financeData !== undefined) {
            parsedData.financeData = updateData.financeData ? (typeof updateData.financeData === 'object' ? JSON.stringify(updateData.financeData) : String(updateData.financeData)) : null;
        }
        if (updateData.warrantyData !== undefined) {
            parsedData.warrantyData = updateData.warrantyData ? (typeof updateData.warrantyData === 'object' ? JSON.stringify(updateData.warrantyData) : String(updateData.warrantyData)) : null;
        }
        const updated = await db_1.default.vehicle.update({
            where: { id },
            data: parsedData,
        });
        // Revalidate frontend caches
        triggerRevalidation(id);
        return res.status(200).json({
            message: 'Vehicle listing edited successfully.',
            vehicle: {
                ...updated,
                images: JSON.parse(updated.images),
                financeData: updated.financeData ? JSON.parse(updated.financeData) : null,
                warrantyData: updated.warrantyData ? JSON.parse(updated.warrantyData) : null,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error editing listing details.', error: error.message });
    }
};
exports.updateVehicle = updateVehicle;
// 5. Delete Vehicle (CMS Admin Panel)
const deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await db_1.default.vehicle.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Vehicle to delete not found.' });
        }
        await db_1.default.vehicle.delete({ where: { id } });
        // Instantly invalidate public caches
        triggerRevalidation();
        return res.status(200).json({ message: 'Vehicle listing removed successfully.' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting vehicle listing.', error: error.message });
    }
};
exports.deleteVehicle = deleteVehicle;
// 6. Fast Toggle Quick Badge States (CMS Admin panel quick-clicks)
const updateVehicleStatus = async (req, res) => {
    const { id } = req.params;
    const { status, price } = req.body;
    if (!status && price === undefined) {
        return res.status(400).json({ message: 'Status toggle or pricing adjustment value is required.' });
    }
    try {
        const existing = await db_1.default.vehicle.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Listing target not found.' });
        }
        const updatedData = {};
        if (status)
            updatedData.status = status;
        if (price !== undefined)
            updatedData.price = parseFloat(String(price));
        const updated = await db_1.default.vehicle.update({
            where: { id },
            data: updatedData,
        });
        // Revalidate frontend
        triggerRevalidation(id);
        return res.status(200).json({
            message: 'Showroom badge states updated successfully.',
            vehicle: {
                ...updated,
                images: JSON.parse(updated.images),
                financeData: updated.financeData ? JSON.parse(updated.financeData) : null,
                warrantyData: updated.warrantyData ? JSON.parse(updated.warrantyData) : null,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error modifying showroom states.', error: error.message });
    }
};
exports.updateVehicleStatus = updateVehicleStatus;
// 7. Multer Bulk File Upload Handler with Sharp Image compression
const uploadImages = async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Files target not detected for multi-part processing.' });
    }
    try {
        const uploadUrls = [];
        // Ensure uploads directory exists
        const publicUploadPath = path_1.default.join(__dirname, '../../public/uploads');
        if (!fs_1.default.existsSync(publicUploadPath)) {
            fs_1.default.mkdirSync(publicUploadPath, { recursive: true });
        }
        // Process files sequentially to apply compression
        for (const file of files) {
            const filename = `jl_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`;
            const outputPath = path_1.default.join(publicUploadPath, filename);
            // Perform Sharp compression converting to WEBP for optimal bandwidth delivery
            await (0, sharp_1.default)(file.buffer)
                .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(outputPath);
            uploadUrls.push(`/uploads/${filename}`);
        }
        return res.status(200).json({
            message: 'Images compressed and uploaded successfully.',
            urls: uploadUrls,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error resizing and compiling file multi-parts.', error: error.message });
    }
};
exports.uploadImages = uploadImages;
// 8. Favorites CRM Pipeline
const toggleFavorite = async (req, res) => {
    const { id: vehicleId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    try {
        const existingFavorite = await db_1.default.favorite.findUnique({
            where: {
                userId_vehicleId: {
                    userId,
                    vehicleId,
                },
            },
        });
        if (existingFavorite) {
            await db_1.default.favorite.delete({
                where: {
                    userId_vehicleId: {
                        userId,
                        vehicleId,
                    },
                },
            });
            return res.status(200).json({ message: 'Removed from favorites.', isFavorite: false });
        }
        else {
            await db_1.default.favorite.create({
                data: {
                    userId,
                    vehicleId,
                },
            });
            return res.status(200).json({ message: 'Added to favorites.', isFavorite: true });
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Error toggling favorite.', error: error.message });
    }
};
exports.toggleFavorite = toggleFavorite;
const getFavorites = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const favorites = await db_1.default.favorite.findMany({
            where: { userId },
            include: { vehicle: true },
        });
        const formattedVehicles = favorites.map((fav) => ({
            ...fav.vehicle,
            images: JSON.parse(fav.vehicle.images),
            financeData: fav.vehicle.financeData ? JSON.parse(fav.vehicle.financeData) : null,
            warrantyData: fav.vehicle.warrantyData ? JSON.parse(fav.vehicle.warrantyData) : null,
        }));
        return res.status(200).json({ count: formattedVehicles.length, vehicles: formattedVehicles });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching favorites.', error: error.message });
    }
};
exports.getFavorites = getFavorites;
// 9. Saved Searches Pipeline
const saveSearch = async (req, res) => {
    const userId = req.user?.id;
    const { name, queryParams } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const saved = await db_1.default.savedSearch.create({
            data: {
                userId,
                name: name || 'Custom Filter',
                queryParams: typeof queryParams === 'object' ? JSON.stringify(queryParams) : String(queryParams),
            },
        });
        return res.status(201).json({ message: 'Search query saved.', saved });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error saving search.', error: error.message });
    }
};
exports.saveSearch = saveSearch;
const getSavedSearches = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const saved = await db_1.default.savedSearch.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const formatted = saved.map((s) => ({
            ...s,
            queryParams: JSON.parse(s.queryParams),
        }));
        return res.status(200).json({ count: formatted.length, saved: formatted });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving saved searches.', error: error.message });
    }
};
exports.getSavedSearches = getSavedSearches;
const deleteSavedSearch = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const existing = await db_1.default.savedSearch.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Saved search not found.' });
        }
        await db_1.default.savedSearch.delete({ where: { id } });
        return res.status(200).json({ message: 'Saved search removed.' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error deleting saved search.', error: error.message });
    }
};
exports.deleteSavedSearch = deleteSavedSearch;
//# sourceMappingURL=vehicleController.js.map