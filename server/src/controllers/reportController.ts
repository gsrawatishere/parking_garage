import { TicketStatus } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, sendError } from '../utils/controller';

const dayRange = (dateValue?: string) => {
  const start = dateValue ? new Date(`${dateValue}T00:00:00.000Z`) : new Date();
  if (!dateValue) start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const monthRange = (monthValue?: string) => {
  const start = monthValue ? new Date(`${monthValue}-01T00:00:00.000Z`) : new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

export const getDailyRevenueReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const { start, end } = dayRange(typeof req.query.date === 'string' ? req.query.date : undefined);
    const result = await prisma.ticket.aggregate({ where: { tenantId, status: TicketStatus.CHECKED_OUT, checkedOutAt: { gte: start, lt: end } }, _count: { _all: true }, _sum: { totalAmount: true } });
    res.json({ period: { start, end }, tickets: result._count._all, revenue: result._sum.totalAmount ?? 0 });
  } catch (error) { sendError(res, error, 'Something went wrong while generating the daily report.'); }
};

export const getMonthlyRevenueReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const { start, end } = monthRange(typeof req.query.month === 'string' ? req.query.month : undefined);
    const result = await prisma.ticket.aggregate({ where: { tenantId, status: TicketStatus.CHECKED_OUT, checkedOutAt: { gte: start, lt: end } }, _count: { _all: true }, _sum: { totalAmount: true } });
    res.json({ period: { start, end }, tickets: result._count._all, revenue: result._sum.totalAmount ?? 0 });
  } catch (error) { sendError(res, error, 'Something went wrong while generating the monthly report.'); }
};

export const getGarageRevenueSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const garageId = String(req.params.garageId);
    const garage = await prisma.garage.findFirst({ where: { id: garageId, tenantId } });
    if (!garage) { res.status(404).json({ message: 'Garage not found.' }); return; }
    const { start, end } = dayRange(typeof req.query.date === 'string' ? req.query.date : undefined);
    const result = await prisma.ticket.aggregate({ where: { tenantId, garageId, status: TicketStatus.CHECKED_OUT, checkedOutAt: { gte: start, lt: end } }, _count: { _all: true }, _sum: { totalAmount: true } });
    res.json({ garage, period: { start, end }, tickets: result._count._all, revenue: result._sum.totalAmount ?? 0 });
  } catch (error) { sendError(res, error, 'Something went wrong while generating the garage summary.'); }
};
