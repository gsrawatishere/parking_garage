import { Router } from 'express';
import { createRatePolicy, listRatePolicies, updateRatePolicy } from '../controllers/ratePolicyController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticate);
router.get('/garage/:garageId', listRatePolicies);
router.post('/garage/:garageId', authorize('OWNER', 'MANAGER'), createRatePolicy);
router.put('/:id', authorize('OWNER', 'MANAGER'), updateRatePolicy);
export default router;
