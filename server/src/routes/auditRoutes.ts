import { Router } from 'express';
import { getAuditLogs, getGarageAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate, authorize('OWNER', 'MANAGER', 'AUDITOR'));
router.get('/', getAuditLogs);
router.get('/garage/:garageId', getGarageAuditLogs);

export default router;
