import { VehicleType } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

const normalizePlate = (plate: string) => plate.trim().toUpperCase();

export const getVehicleStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const vehicle = await prisma.vehicle.findFirst({ where: { tenantId, plateNumber: normalizePlate(String(req.params.plate)) }, include: { tickets: { where: { status: 'ACTIVE' }, include: { garage: true, spot: true }, take: 1 } } });
    if (!vehicle) { res.status(404).json({ message: 'Vehicle not found.' }); return; }
    res.json({ vehicle });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching vehicle status.'); }
};

export const registerVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const { plateNumber, vehicleType, isElectric, color, make, model } = req.body;
    if (!plateNumber || !Object.values(VehicleType).includes(vehicleType)) { res.status(400).json({ message: 'plateNumber and a valid vehicleType are required.' }); return; }
    const vehicle = await prisma.vehicle.create({ data: { tenantId, plateNumber: normalizePlate(plateNumber), vehicleType, isElectric: Boolean(isElectric), color, make, model } });
    res.status(201).json({ vehicle });
  } catch (error) { sendError(res, error, 'Something went wrong while registering the vehicle.'); }
};

export const updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const id = String(req.params.id);
    const existing = await prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!existing) { res.status(404).json({ message: 'Vehicle not found.' }); return; }
    const { plateNumber, vehicleType, isElectric, color, make, model } = req.body;
    if (vehicleType && !Object.values(VehicleType).includes(vehicleType)) { res.status(400).json({ message: 'Invalid vehicle type.' }); return; }
    const vehicle = await prisma.vehicle.update({ where: { id }, data: { plateNumber: plateNumber ? normalizePlate(plateNumber) : undefined, vehicleType, isElectric, color, make, model } });
    res.json({ vehicle });
  } catch (error) { sendError(res, error, 'Something went wrong while updating the vehicle.'); }
};
