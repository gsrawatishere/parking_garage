import { Router } from 'express';
import {
  checkInVehicle,
  checkOutVehicle,
  getTicketById,
  listTicketsForGarage
} from '../controllers/ticketController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.post('/check-in', authorize('OWNER', 'MANAGER', 'ATTENDANT'), checkInVehicle);
router.post('/check-out', authorize('OWNER', 'MANAGER', 'ATTENDANT'), checkOutVehicle);
router.get('/:id', getTicketById);
router.get('/garage/:garageId', listTicketsForGarage);

export default router;
