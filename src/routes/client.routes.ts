import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'
import { Response } from 'express'
import { z } from 'zod'
import { sanitizeString, sanitizeEmail, sanitizePhone } from '../utils/sanitize'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

const clientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
})

router.get('/', async (req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany({
    where: { userId: req.userId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(clients)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validated = clientSchema.parse(req.body)
    
    // Sanitize inputs
    const data = {
      name: sanitizeString(validated.name, 200),
      email: validated.email ? sanitizeEmail(validated.email) : undefined,
      phone: validated.phone ? sanitizePhone(validated.phone) : undefined,
      company: validated.company ? sanitizeString(validated.company, 200) : undefined,
    }
    
    const client = await prisma.client.create({ data: { ...data, userId: req.userId! } })
    res.status(201).json(client)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message })
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = clientSchema.partial().parse(req.body)
    const client = await prisma.client.findFirst({ where: { id: req.params.id, userId: req.userId } })
    if (!client) return res.status(404).json({ message: 'العميل مش موجود' })
    const updated = await prisma.client.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, userId: req.userId } })
  if (!client) return res.status(404).json({ message: 'العميل مش موجود' })
  await prisma.client.delete({ where: { id: req.params.id } })
  res.json({ message: 'اتمسح بنجاح' })
})

export default router
