import { Request, Response } from 'express';
import prisma from '../config/db';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const REVALIDATION_TOKEN = process.env.REVALIDATION_TOKEN || 'jl_autos_reval_token_secure_2026';

// Cache Revalidation Helper: fires off an async webhook to Frontend Next.js API
const triggerRevalidation = async (id?: string) => {
  try {
    const url = `${FRONTEND_URL}/api/revalidate?secret=${REVALIDATION_TOKEN}&tag=vehicles`;
    console.log(`[Revalidation Webhook] dispatching query: ${url}`);
    
    // Non-blocking fetch
    fetch(url, { method: 'POST' }).catch((err) =>
      console.error('[Revalidation Error] Failed to revalidate Next.js cache:', err.message)
    );

    if (id) {
      const detailUrl = `${FRONTEND_URL}/api/revalidate?secret=${REVALIDATION_TOKEN}&path=/vehicles/${id}`;
      fetch(detailUrl, { method: 'POST' }).catch((err) =>
        console.error('[Revalidation Error] Failed to revalidate vehicle page cache:', err.message)
      );
    }
  } catch (error: any) {
    console.error('[Revalidation Warning] Exception during webhook trigger:', error.message);
  }
};

// 1. Get All Vehicles (with advanced query filtering widgets)
export const getVehicles = async (req: Request, res: Response) => {
  const { make, model, yearMin, yearMax, color, mileageMin, mileageMax, status } = req.query;

  // Build filter object
  const whereClause: any = {};

  if (make) whereClause.make = { contains: String(make) };
  if (model) whereClause.model = { contains: String(model) };
  if (color) whereClause.color = { contains: String(color) };
  if (status) whereClause.status = String(status);

  // Year parsing
  if (yearMin || yearMax) {
    whereClause.year = {};
    if (yearMin) whereClause.year.gte = parseInt(String(yearMin));
    if (yearMax) whereClause.year.lte = parseInt(String(yearMax));
  }

  // Mileage parsing
  if (mileageMin || mileageMax) {
    whereClause.mileage = {};
    if (mileageMin) whereClause.mileage.gte = parseInt(String(mileageMin));
    if (mileageMax) whereClause.mileage.lte = parseInt(String(mileageMax));
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving inventory.', error: error.message });
  }
};

// 2. Get Single Vehicle Details
export const getVehicleById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error loading vehicle details.', error: error.message });
  }
};

// 3. Create New Vehicle Listing (CMS Admin Panel)
export const createVehicle = async (req: AuthenticatedRequest, res: Response) => {
  const {
    make,
    model,
    year,
    color,
    mileage,
    price,
    transmission,
    engine,
    fuelType,
    bodyStyle,
    seats,
    doors,
    description,
    status,
    images, // expects stringified JSON or standard array
    isFinanceWarrantyActive,
    financeData, // object or stringified JSON
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

    const newVehicle = await prisma.vehicle.create({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error publishing listing.', error: error.message });
  }
};

// 4. Update Vehicle (CMS Admin Panel)
export const updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Vehicle to edit was not found.' });
    }

    // Process parsed parameters
    const parsedData: any = {};
    const stringFields = ['make', 'model', 'color', 'transmission', 'engine', 'fuelType', 'bodyStyle', 'description', 'status'];
    const numberFields = ['year', 'mileage', 'price', 'seats', 'doors'];

    stringFields.forEach((field) => {
      if (updateData[field] !== undefined) parsedData[field] = updateData[field];
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

    const updated = await prisma.vehicle.update({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error editing listing details.', error: error.message });
  }
};

// 5. Delete Vehicle (CMS Admin Panel)
export const deleteVehicle = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Vehicle to delete not found.' });
    }

    await prisma.vehicle.delete({ where: { id } });

    // Instantly invalidate public caches
    triggerRevalidation();

    return res.status(200).json({ message: 'Vehicle listing removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting vehicle listing.', error: error.message });
  }
};

// 6. Fast Toggle Quick Badge States (CMS Admin panel quick-clicks)
export const updateVehicleStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, price } = req.body;

  if (!status && price === undefined) {
    return res.status(400).json({ message: 'Status toggle or pricing adjustment value is required.' });
  }

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Listing target not found.' });
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (price !== undefined) updatedData.price = parseFloat(String(price));

    const updated = await prisma.vehicle.update({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error modifying showroom states.', error: error.message });
  }
};

// 7. Multer Bulk File Upload Handler with Sharp Image compression
export const uploadImages = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'Files target not detected for multi-part processing.' });
  }

  try {
    const uploadUrls: string[] = [];

    // Ensure uploads directory exists
    const publicUploadPath = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(publicUploadPath)) {
      fs.mkdirSync(publicUploadPath, { recursive: true });
    }

    // Process files sequentially to apply compression
    for (const file of files) {
      const filename = `jl_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`;
      const outputPath = path.join(publicUploadPath, filename);

      // Perform Sharp compression converting to WEBP for optimal bandwidth delivery
      await sharp(file.buffer)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      uploadUrls.push(`/uploads/${filename}`);
    }

    return res.status(200).json({
      message: 'Images compressed and uploaded successfully.',
      urls: uploadUrls,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error resizing and compiling file multi-parts.', error: error.message });
  }
};

// 8. Favorites CRM Pipeline
export const toggleFavorite = async (req: AuthenticatedRequest, res: Response) => {
  const { id: vehicleId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  try {
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: {
          userId_vehicleId: {
            userId,
            vehicleId,
          },
        },
      });
      return res.status(200).json({ message: 'Removed from favorites.', isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          vehicleId,
        },
      });
      return res.status(200).json({ message: 'Added to favorites.', isFavorite: true });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Error toggling favorite.', error: error.message });
  }
};

export const getFavorites = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const favorites = await prisma.favorite.findMany({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching favorites.', error: error.message });
  }
};

// 9. Saved Searches Pipeline
export const saveSearch = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, queryParams } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const saved = await prisma.savedSearch.create({
      data: {
        userId,
        name: name || 'Custom Filter',
        queryParams: typeof queryParams === 'object' ? JSON.stringify(queryParams) : String(queryParams),
      },
    });

    return res.status(201).json({ message: 'Search query saved.', saved });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error saving search.', error: error.message });
  }
};

export const getSavedSearches = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const saved = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = saved.map((s) => ({
      ...s,
      queryParams: JSON.parse(s.queryParams),
    }));

    return res.status(200).json({ count: formatted.length, saved: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving saved searches.', error: error.message });
  }
};

export const deleteSavedSearch = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const existing = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Saved search not found.' });
    }

    await prisma.savedSearch.delete({ where: { id } });
    return res.status(200).json({ message: 'Saved search removed.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting saved search.', error: error.message });
  }
};
