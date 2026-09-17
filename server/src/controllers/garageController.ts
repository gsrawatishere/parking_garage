import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

export const listGarages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garages = await prisma.garage.findMany({ where: { tenantId }, include: { _count: { select: { floors: true, spots: true, tickets: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ garages });
  } catch (error) {
    sendError(res, error, 'Something went wrong while fetching garages.');
  }
};

export const getGarageById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId } = getAuthenticatedUser(req);
    const garage = await prisma.garage.findFirst({ where: { id, tenantId }, include: { floors: { include: { spots: true }, orderBy: { level: 'asc' } }, ratePolicies: { where: { isActive: true } } } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    res.json({ garage });
  } catch (error) {
    sendError(res, error, 'Something went wrong while fetching the garage.');
  }
};

export const createGarage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const { name, address, timezone } = req.body;
    if (!name || !address) { res.status(400).json({ message: 'name and address are required.' }); return; }
    const garage = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const created = await transaction.garage.create({ data: { tenantId, name, address, timezone } });
      await transaction.auditLog.create({ data: { tenantId, garageId: created.id, userId, entityType: 'GARAGE', entityId: created.id, action: 'CREATED', afterData: created } });
      return created;
    });
    res.status(201).json({ garage });
  } catch (error) {
    sendError(res, error, 'Something went wrong while creating the garage.');
  }
};

export const updateGarage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const current = await prisma.garage.findFirst({ where: { id, tenantId } });
    if (!current) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const { name, address, timezone, status } = req.body;
    const garage = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const updated = await transaction.garage.update({ where: { id }, data: { name, address, timezone, status } });
      await transaction.auditLog.create({ data: { tenantId, garageId: id, userId, entityType: 'GARAGE', entityId: id, action: 'UPDATED', beforeData: current, afterData: updated } });
      return updated;
    });
    res.json({ garage });
  } catch (error) {
    sendError(res, error, 'Something went wrong while updating the garage.');
  }
};

export const deleteGarage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const garage = await prisma.garage.findFirst({ where: { id, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const activeTickets = await prisma.ticket.count({ where: { garageId: id, status: 'ACTIVE' } });
    if (activeTickets > 0) { res.status(409).json({ message: 'A garage with active tickets cannot be deleted.' }); return; }
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      await transaction.auditLog.create({ data: { tenantId, garageId: id, userId, entityType: 'GARAGE', entityId: id, action: 'DELETED', beforeData: garage } });
      await transaction.garage.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error) {
    sendError(res, error, 'Something went wrong while deleting the garage.');
  }
};
