import { Router } from 'express'
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '../controllers/invoice.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/', getInvoices)
router.post('/', createInvoice)
router.get('/:id', getInvoice)
router.patch('/:id/status', updateInvoiceStatus)
router.delete('/:id', deleteInvoice)

export default router
