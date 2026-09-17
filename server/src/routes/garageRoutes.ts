import { Router } from 'express';
import {
  createGarage,
  deleteGarage,
  getGarageById,
  listGarages,
  updateGarage
} from '../controllers/garageController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.get('/', listGarages);
router.post('/', authorize('OWNER', 'MANAGER'), createGarage);
router.get('/:id', getGarageById);
router.put('/:id', authorize('OWNER', 'MANAGER'), updateGarage);
router.delete('/:id', authorize('OWNER'), deleteGarage);

export default router;
