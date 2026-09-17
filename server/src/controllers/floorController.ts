import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

export const listFloors = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const floors = await prisma.floor.findMany({ where: { garageId }, include: { _count: { select: { spots: true } } }, orderBy: { level: 'asc' } });
    res.json({ floors });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching floors.'); }
};

export const createFloor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const { name, level } = req.body;
    if (!name || !Number.isInteger(level)) { res.status(400).json({ message: 'name and integer level are required.' }); return; }
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const floor = await prisma.floor.create({ data: { garageId, name, level } });
    res.status(201).json({ floor });
  } catch (error) { sendError(res, error, 'Something went wrong while creating the floor.'); }
};

export const updateFloor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const id = String(req.params.id);
    const current = await prisma.floor.findFirst({ where: { id, garage: { tenantId } } });
    if (!current) { res.status(404).json({ message: 'Floor not found.' }); return; }
    const { name, level, status } = req.body;
    const floor = await prisma.floor.update({ where: { id }, data: { name, level, status } });
    res.json({ floor });
  } catch (error) { sendError(res, error, 'Something went wrong while updating the floor.'); }
};

export const deleteFloor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const id = String(req.params.id);
    const floor = await prisma.floor.findFirst({ where: { id, garage: { tenantId } }, include: { _count: { select: { spots: true } } } });
    if (!floor) { res.status(404).json({ message: 'Floor not found.' }); return; }
    if (floor._count.spots > 0) { res.status(409).json({ message: 'A floor with spots cannot be deleted.' }); return; }
    await prisma.floor.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { sendError(res, error, 'Something went wrong while deleting the floor.'); }
};
