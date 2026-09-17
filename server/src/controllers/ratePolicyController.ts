import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

export const listRatePolicies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const policies = await prisma.ratePolicy.findMany({ where: { garageId }, orderBy: { createdAt: 'desc' } });
    res.json({ policies });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching rate policies.'); }
};

export const createRatePolicy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const { name, firstHourRate, additionalHourRate, dailyCap, currency, roundingMode, validFrom, validTo } = req.body;
    if (!name || firstHourRate === undefined || additionalHourRate === undefined || dailyCap === undefined) { res.status(400).json({ message: 'name, firstHourRate, additionalHourRate, and dailyCap are required.' }); return; }
    if ([firstHourRate, additionalHourRate, dailyCap].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) { res.status(400).json({ message: 'Rates must be finite non-negative numbers.' }); return; }
    if (Number(dailyCap) < Number(firstHourRate)) { res.status(400).json({ message: 'Daily cap cannot be lower than the first-hour rate.' }); return; }
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const policy = await prisma.ratePolicy.create({ data: { tenantId, garageId, name, firstHourRate, additionalHourRate, dailyCap, currency, roundingMode, validFrom: validFrom ? new Date(validFrom) : undefined, validTo: validTo ? new Date(validTo) : undefined } });
    res.status(201).json({ policy });
  } catch (error) { sendError(res, error, 'Something went wrong while creating the rate policy.'); }
};

export const updateRatePolicy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const id = String(req.params.id);
    const current = await prisma.ratePolicy.findFirst({ where: { id, tenantId } });
    if (!current) { res.status(404).json({ message: 'Rate policy not found.' }); return; }
    const { name, firstHourRate, additionalHourRate, dailyCap, currency, roundingMode, isActive, validFrom, validTo } = req.body;
    if ([firstHourRate, additionalHourRate, dailyCap].some((value) => value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0))) { res.status(400).json({ message: 'Rates must be finite non-negative numbers.' }); return; }
    if (dailyCap !== undefined && firstHourRate !== undefined && Number(dailyCap) < Number(firstHourRate)) { res.status(400).json({ message: 'Daily cap cannot be lower than the first-hour rate.' }); return; }
    const policy = await prisma.ratePolicy.update({ where: { id }, data: { name, firstHourRate, additionalHourRate, dailyCap, currency, roundingMode, isActive, validFrom: validFrom ? new Date(validFrom) : undefined, validTo: validTo ? new Date(validTo) : undefined } });
    res.json({ policy });
  } catch (error) { sendError(res, error, 'Something went wrong while updating the rate policy.'); }
};
