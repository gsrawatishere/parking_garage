import { Router } from 'express';
import {
  createSpot,
  deleteSpot,
  getGarageAvailability,
  listSpots,
  updateSpot
} from '../controllers/spotController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.get('/garage/:garageId', listSpots);
router.post('/garage/:garageId', authorize('OWNER', 'MANAGER'), createSpot);
router.get('/garage/:garageId/availability', getGarageAvailability);
router.put('/:id', authorize('OWNER', 'MANAGER'), updateSpot);
router.delete('/:id', authorize('OWNER', 'MANAGER'), deleteSpot);

export default router;
