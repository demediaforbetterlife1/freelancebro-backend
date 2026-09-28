import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'
import { z } from 'zod'
import { sanitizeString } from '../utils/sanitize'

const prisma = new PrismaClient()

const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(1000000),
  unitPrice: z.number().positive().max(1000000000),
})

const createInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  tax: z.number().min(0).max(100).optional().default(0),
  items: z.array(invoiceItemSchema).min(1).max(100),
})

// Generate invoice number: INV-0042
async function generateInvoiceNumber(userId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { userId } })
  return `INV-${String(count + 1).padStart(4, '0')}`
}

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createInvoiceSchema.parse(req.body)
    const userId = req.userId!

    // Sanitize text inputs
    const title = sanitizeString(validated.title, 200)
    const notes = validated.notes ? sanitizeString(validated.notes, 2000) : undefined

    // Calculate totals
    const itemsWithTotals = validated.items.map(item => ({
      description: sanitizeString(item.description, 500),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }))
    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0)
    const taxAmount = (subtotal * (validated.tax ?? 0)) / 100
    const total = subtotal + taxAmount

    const number = await generateInvoiceNumber(userId)

    const invoice = await prisma.invoice.create({
      data: {
        number,
        title,
        dueDate: new Date(validated.dueDate),
        notes,
        subtotal,
        tax: taxAmount,
        total,
        userId,
        clientId: validated.clientId,
        items: { create: itemsWithTotals },
      },
      include: { items: true, client: true },
    })

    res.status(201).json(invoice)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message })
    res.status(500).json({ message: 'حصل خطأ أثناء إنشاء الفاتورة' })
  }
}

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = { userId: req.userId }
    if (status) where.status = status

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { select: { name: true } }, items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.invoice.count({ where }),
    ])

    res.json({ invoices, total, page: parseInt(page as string) })
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: true, items: true, reminders: true },
    })
    if (!invoice) return res.status(404).json({ message: 'الفاتورة مش موجودة' })
    res.json(invoice)
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}

export const updateInvoiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!invoice) return res.status(404).json({ message: 'الفاتورة مش موجودة' })

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!invoice) return res.status(404).json({ message: 'الفاتورة مش موجودة' })
    if (invoice.status === 'PAID') return res.status(400).json({ message: 'مينفعش تمسح فاتورة مدفوعة' })

    await prisma.invoice.delete({ where: { id: req.params.id } })
    res.json({ message: 'اتمسحت بنجاح' })
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}
