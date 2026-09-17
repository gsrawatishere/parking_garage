import { Router } from 'express';
import {
  getDailyRevenueReport,
  getGarageRevenueSummary,
  getMonthlyRevenueReport
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'));
router.get('/daily', getDailyRevenueReport);
router.get('/monthly', getMonthlyRevenueReport);
router.get('/garage/:garageId', getGarageRevenueSummary);

export default router;
