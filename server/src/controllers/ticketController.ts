import { Prisma, SpotStatus, TicketStatus, VehicleType } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getAuthenticatedUser, parsePositiveInteger, sendError } from '../utils/controller';
import { calculateCharge } from '../services/billingService';

export const checkInVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const { garageId, spotId, vehicleId, plateNumber, vehicleType, isElectric, color, make, model, ratePolicyId } = req.body;
    if (!garageId || (!vehicleId && (!plateNumber || !vehicleType))) { res.status(400).json({ message: 'garageId and vehicle details are required.' }); return; }
    if (vehicleType && !Object.values(VehicleType).includes(vehicleType)) { res.status(400).json({ message: 'Invalid vehicle type.' }); return; }

    const result = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const garage = await transaction.garage.findFirst({ where: { id: garageId, tenantId } });
      if (garage?.status !== 'active') throw new Error('GARAGE_UNAVAILABLE');
      const vehicle = vehicleId
        ? await transaction.vehicle.findFirst({ where: { id: vehicleId, tenantId } })
        : await transaction.vehicle.upsert({
            where: { tenantId_plateNumber: { tenantId, plateNumber: String(plateNumber).trim().toUpperCase() } },
            update: { vehicleType, isElectric: Boolean(isElectric), color, make, model },
            create: { tenantId, plateNumber: String(plateNumber).trim().toUpperCase(), vehicleType, isElectric: Boolean(isElectric), color, make, model }
          });
      if (!vehicle) throw new Error('VEHICLE_NOT_FOUND');
      const existingTicket = await transaction.ticket.findFirst({ where: { tenantId, vehicleId: vehicle.id, status: 'ACTIVE' } });
      if (existingTicket) throw new Error('VEHICLE_ALREADY_CHECKED_IN');
      const now = new Date();
      const policy = ratePolicyId
        ? await transaction.ratePolicy.findFirst({ where: { id: ratePolicyId, garageId, tenantId, isActive: true, OR: [{ validFrom: null }, { validFrom: { lte: now } }], AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }] } })
        : await transaction.ratePolicy.findFirst({ where: { garageId, tenantId, isActive: true, OR: [{ validFrom: null }, { validFrom: { lte: now } }], AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }] }, orderBy: { createdAt: 'desc' } });
      if (!policy) throw new Error('RATE_POLICY_NOT_FOUND');
      const requestedSpot = spotId
        ? await transaction.spot.findFirst({ where: { id: spotId, garageId, type: vehicle.vehicleType, status: SpotStatus.AVAILABLE } })
        : await transaction.spot.findFirst({ where: { garageId, type: vehicle.vehicleType, status: SpotStatus.AVAILABLE }, orderBy: [{ floor: { level: 'asc' } }, { spotNumber: 'asc' }] });
      if (!requestedSpot) throw new Error('NO_AVAILABLE_SPOT');
      const claimed = await transaction.spot.updateMany({ where: { id: requestedSpot.id, status: SpotStatus.AVAILABLE }, data: { status: SpotStatus.OCCUPIED } });
      if (claimed.count !== 1) throw new Error('SPOT_WAS_CLAIMED');
      const ticket = await transaction.ticket.create({ data: { tenantId, garageId, vehicleId: vehicle.id, spotId: requestedSpot.id, ratePolicyId: policy.id, checkedInAt: now, currency: policy.currency, createdByUserId: userId }, include: { vehicle: true, spot: true, garage: true, ratePolicy: true } });
      await transaction.auditLog.create({ data: { tenantId, garageId, userId, entityType: 'TICKET', entityId: ticket.id, action: 'CHECKED_IN', details: `Vehicle ${vehicle.plateNumber} checked into spot ${requestedSpot.spotNumber}.` } });
      return ticket;
    });
    res.status(201).json({ ticket: result });
  } catch (error) {
    const messages: Record<string, [number, string]> = { GARAGE_UNAVAILABLE: [404, 'Garage not found or inactive.'], VEHICLE_NOT_FOUND: [404, 'Vehicle not found.'], VEHICLE_ALREADY_CHECKED_IN: [409, 'This vehicle already has an active ticket.'], RATE_POLICY_NOT_FOUND: [409, 'No active rate policy is configured for this garage.'], NO_AVAILABLE_SPOT: [409, 'No compatible parking spot is available.'], SPOT_WAS_CLAIMED: [409, 'The selected spot was just assigned to another vehicle.'] };
    if (error instanceof Error && messages[error.message]) { const [status, message] = messages[error.message]; res.status(status).json({ message }); return; }
    sendError(res, error, 'Something went wrong while checking in the vehicle.');
  }
};

export const checkOutVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, id: userId } = getAuthenticatedUser(req);
    const { ticketId, plateNumber } = req.body;
    if (!ticketId && !plateNumber) { res.status(400).json({ message: 'ticketId or plateNumber is required.' }); return; }
    const activeTicket = await prisma.ticket.findFirst({ where: { tenantId, status: 'ACTIVE', ...(ticketId ? { id: ticketId } : { vehicle: { plateNumber: String(plateNumber).trim().toUpperCase() } }) }, include: { ratePolicy: true, vehicle: true, spot: true } });
    if (!activeTicket) { res.status(404).json({ message: 'Active ticket not found.' }); return; }
    const checkedOutAt = new Date();
    const { elapsedHours, amount } = calculateCharge(activeTicket.checkedInAt, checkedOutAt, { firstHourRate: Number(activeTicket.ratePolicy.firstHourRate), additionalHourRate: Number(activeTicket.ratePolicy.additionalHourRate), dailyCap: Number(activeTicket.ratePolicy.dailyCap) });
    const ticket = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const claimed = await transaction.ticket.updateMany({ where: { id: activeTicket.id, status: TicketStatus.ACTIVE }, data: { status: TicketStatus.CHECKED_OUT, checkedOutAt, totalAmount: amount, checkedOutByUserId: userId } });
      if (claimed.count !== 1) throw new Error('TICKET_ALREADY_CHECKED_OUT');
      const updated = await transaction.ticket.findUniqueOrThrow({ where: { id: activeTicket.id }, include: { vehicle: true, spot: true, garage: true, ratePolicy: true } });
      await transaction.spot.update({ where: { id: activeTicket.spotId }, data: { status: SpotStatus.AVAILABLE } });
      await transaction.auditLog.create({ data: { tenantId, garageId: activeTicket.garageId, userId, entityType: 'TICKET', entityId: activeTicket.id, action: 'CHECKED_OUT', details: `Charged ${amount.toFixed(2)} for ${elapsedHours} hour(s).` } });
      return updated;
    });
    res.json({ ticket, billing: { elapsedHours, amount, currency: ticket.currency } });
  } catch (error) {
    if (error instanceof Error && error.message === 'TICKET_ALREADY_CHECKED_OUT') { res.status(409).json({ message: 'This ticket has already been checked out.' }); return; }
    sendError(res, error, 'Something went wrong while checking out the vehicle.');
  }
};

export const getTicketById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const ticket = await prisma.ticket.findFirst({ where: { id: String(req.params.id), tenantId }, include: { garage: true, spot: { include: { floor: true } }, vehicle: true, ratePolicy: true, createdByUser: { select: { id: true, name: true, email: true } }, checkedOutByUser: { select: { id: true, name: true, email: true } } } });
    if (!ticket) { res.status(404).json({ message: 'Ticket not found.' }); return; }
    res.json({ ticket });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching the ticket.'); }
};

export const listTicketsForGarage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedUser(req);
    const { status, page = '1', limit = '50' } = req.query;
    const pageNumber = parsePositiveInteger(page, 1);
    const pageSize = Math.min(parsePositiveInteger(limit, 50), 100);
    const where = { garageId: String(req.params.garageId), tenantId, ...(status === 'ACTIVE' || status === 'CHECKED_OUT' ? { status: status as TicketStatus } : {}) };
    const [tickets, total] = await prisma.$transaction([prisma.ticket.findMany({ where, include: { vehicle: true, spot: true }, orderBy: { checkedInAt: 'desc' }, skip: (pageNumber - 1) * pageSize, take: pageSize }), prisma.ticket.count({ where })]);
    res.json({ tickets, pagination: { page: pageNumber, limit: pageSize, total } });
  } catch (error) { sendError(res, error, 'Something went wrong while fetching tickets.'); }
};
