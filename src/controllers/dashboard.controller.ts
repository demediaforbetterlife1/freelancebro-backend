import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'

const prisma = new PrismaClient()

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // Current month boundaries
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Previous month boundaries (for % change)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      thisMonthPaid,
      lastMonthPaid,
      lateInvoices,
      pendingInvoices,
      activeClients,
      recentInvoices,
    ] = await Promise.all([
      // This month revenue
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', updatedAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { total: true },
      }),
      // Last month revenue
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total: true },
      }),
      // Late invoices
      prisma.invoice.findMany({
        where: { userId, status: { in: ['PENDING', 'LATE'] }, dueDate: { lt: now } },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      // Pending amount
      prisma.invoice.aggregate({
        where: { userId, status: 'PENDING' },
        _sum: { total: true },
        _count: true,
      }),
      // Active clients
      prisma.client.count({ where: { userId } }),
      // Recent 5 invoices
      prisma.invoice.findMany({
        where: { userId },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Mark overdue invoices
    const overdueIds = lateInvoices.map(i => i.id)
    if (overdueIds.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: overdueIds }, status: 'PENDING' },
        data: { status: 'LATE' },
      })
    }

    const thisMonthTotal = thisMonthPaid._sum.total || 0
    const lastMonthTotal = lastMonthPaid._sum.total || 0
    const percentChange = lastMonthTotal === 0
      ? 100
      : Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)

    res.json({
      monthRevenue: thisMonthTotal,
      percentChange,
      lateCount: lateInvoices.length,
      lateTotal: lateInvoices.reduce((s, i) => s + i.total, 0),
      pendingCount: pendingInvoices._count,
      pendingTotal: pendingInvoices._sum.total || 0,
      activeClients,
      recentInvoices,
      lateInvoices,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}
