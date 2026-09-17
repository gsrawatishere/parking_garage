import { Router } from 'express';
import { getVehicleStatus, registerVehicle, updateVehicle } from '../controllers/vehicleController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.post('/', authorize('OWNER', 'MANAGER', 'ATTENDANT'), registerVehicle);
router.get('/:plate/status', getVehicleStatus);
router.put('/:id', authorize('OWNER', 'MANAGER'), updateVehicle);

export default router;
