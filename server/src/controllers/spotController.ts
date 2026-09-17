import { Prisma, SpotStatus, SpotType } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

const validSpotTypes = Object.values(SpotType);
const validSpotStatuses = Object.values(SpotStatus);

export const listSpots = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const garageId = String(req.params.garageId);
    const { tenantId } = getAuthenticatedUser(req);
    const { status, type, floorId } = req.query;
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const spots = await prisma.spot.findMany({
      where: { garageId, ...(typeof status === 'string' && validSpotStatuses.includes(status as SpotStatus) ? { status: status as SpotStatus } : {}), ...(typeof type === 'string' && validSpotTypes.includes(type as SpotType) ? { type: type as SpotType } : {}), ...(typeof floorId === 'string' ? { floorId } : {}) },
      include: { floor: true }, orderBy: [{ floor: { level: 'asc' } }, { spotNumber: 'asc' }]
    });
    res.json({ spots });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching spots.'); }
};

export const createSpot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const garageId = String(req.params.garageId);
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const { floorId, spotNumber, type, label } = req.body;
    if (!floorId || !spotNumber || !type || !validSpotTypes.includes(type)) { res.status(400).json({ message: 'floorId, spotNumber, and a valid type are required.' }); return; }
    const floor = await prisma.floor.findFirst({ where: { id: floorId, garageId, garage: { tenantId } } });
    if (!floor) { res.status(404).json({ message: 'Floor not found in this garage.' }); return; }
    const spot = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const created = await transaction.spot.create({ data: { garageId, floorId, spotNumber, type, label } });
      await transaction.auditLog.create({ data: { tenantId, garageId, userId, entityType: 'SPOT', entityId: created.id, action: 'CREATED', afterData: created } });
      return created;
    });
    res.status(201).json({ spot });
  } catch (error) { sendError(res, error, 'Something went wrong while creating the spot.'); }
};

export const updateSpot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const current = await prisma.spot.findFirst({ where: { id, garage: { tenantId } } });
    if (!current) { res.status(404).json({ message: 'Spot not found.' }); return; }
    const { spotNumber, type, status, label, floorId } = req.body;
    if (type && !validSpotTypes.includes(type)) { res.status(400).json({ message: 'Invalid spot type.' }); return; }
    if (status && !validSpotStatuses.includes(status)) { res.status(400).json({ message: 'Invalid spot status.' }); return; }
    if (status && status !== current.status) {
      const activeTicket = await prisma.ticket.findFirst({ where: { spotId: id, status: 'ACTIVE' } });
      if (activeTicket) { res.status(409).json({ message: 'This spot is assigned to an active ticket and cannot change status.' }); return; }
    }
    if (floorId) {
      const floor = await prisma.floor.findFirst({ where: { id: floorId, garageId: current.garageId } });
      if (!floor) { res.status(400).json({ message: 'The floor does not belong to this garage.' }); return; }
    }
    const spot = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const updated = await transaction.spot.update({ where: { id }, data: { spotNumber, type, status, label, floorId } });
      await transaction.auditLog.create({ data: { tenantId, garageId: current.garageId, userId, entityType: 'SPOT', entityId: id, action: 'UPDATED', beforeData: current, afterData: updated } });
      return updated;
    });
    res.json({ spot });
  } catch (error) { sendError(res, error, 'Something went wrong while updating the spot.'); }
};

export const deleteSpot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const spot = await prisma.spot.findFirst({ where: { id, garage: { tenantId } } });
    if (!spot) { res.status(404).json({ message: 'Spot not found.' }); return; }
    const ticketCount = await prisma.ticket.count({ where: { spotId: id } });
    if (ticketCount > 0) { res.status(409).json({ message: 'A spot with ticket history cannot be deleted. Mark it as maintenance instead.' }); return; }
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      await transaction.auditLog.create({ data: { tenantId, garageId: spot.garageId, userId, entityType: 'SPOT', entityId: id, action: 'DELETED', beforeData: spot } });
      await transaction.spot.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error) { sendError(res, error, 'Something went wrong while deleting the spot.'); }
};

export const getGarageAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const garageId = String(req.params.garageId);
    const { tenantId } = getAuthenticatedUser(req);
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const grouped = await prisma.spot.groupBy({ by: ['type', 'status'], where: { garageId }, _count: { _all: true } });
    const availability = grouped.reduce<Record<string, Record<string, number>>>((result, item) => {
      result[item.type] ??= {};
      result[item.type][item.status] = item._count._all;
      return result;
    }, {});
    res.json({ garageId, availability });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching garage availability.'); }
};
