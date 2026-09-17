import { EntityType } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, parsePositiveInteger, sendError } from '../utils/controller';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 50), 100);
    const entityType = typeof req.query.entityType === 'string' && Object.values(EntityType).includes(req.query.entityType as EntityType) ? req.query.entityType as EntityType : undefined;
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const where = { tenantId, ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) };
    const [logs, total] = await prisma.$transaction([prisma.auditLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true } }, garage: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.auditLog.count({ where })]);
    res.json({ logs, pagination: { page, limit, total } });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching audit logs.'); }
};

export const getGarageAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 50), 100);
    const [logs, total] = await prisma.$transaction([prisma.auditLog.findMany({ where: { tenantId, garageId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.auditLog.count({ where: { tenantId, garageId } })]);
    res.json({ logs, pagination: { page, limit, total } });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching garage audit logs.'); }
};
