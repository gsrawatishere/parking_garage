import { Router } from 'express';
import { createFloor, deleteFloor, listFloors, updateFloor } from '../controllers/floorController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticate);
router.get('/garage/:garageId', listFloors);
router.post('/garage/:garageId', authorize('OWNER', 'MANAGER'), createFloor);
router.put('/:id', authorize('OWNER', 'MANAGER'), updateFloor);
router.delete('/:id', authorize('OWNER', 'MANAGER'), deleteFloor);
export default router;
