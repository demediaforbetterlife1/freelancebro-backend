import cron from 'node-cron'
import { PrismaClient, ReminderType } from '@prisma/client'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendReminderEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  total: number,
  daysLate: number
) {
  const subject =
    daysLate === 1
      ? `تذكير: الفاتورة ${invoiceNumber} استحقت اليوم`
      : daysLate === 3
      ? `الفاتورة ${invoiceNumber} متأخرة 3 أيام`
      : `تنبيه نهائي: الفاتورة ${invoiceNumber}`

  const message =
    daysLate === 1
      ? `مرحباً ${clientName}،\n\nنذكركم بأن الفاتورة ${invoiceNumber} بمبلغ ${total} جنيه استحق سدادها اليوم.\n\nشكراً لتعاملكم معنا.`
      : daysLate === 3
      ? `مرحباً ${clientName}،\n\nالفاتورة ${invoiceNumber} بمبلغ ${total} جنيه متأخرة الآن 3 أيام.\n\nيرجى السداد في أقرب وقت.`
      : `مرحباً ${clientName}،\n\nهذا تنبيه نهائي بشأن الفاتورة ${invoiceNumber} بمبلغ ${total} جنيه المتأخرة 7 أيام.\n\nنرجو السداد الفوري وإلا سيتم اتخاذ الإجراءات اللازمة حسب العقد المبرم.`

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@freelancepro.app',
    to,
    subject,
    text: message,
  })
}

async function processReminders() {
  const now = new Date()

  // Find overdue invoices that still have pending status
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['PENDING', 'LATE'] },
      dueDate: { lt: now },
    },
    include: {
      client: true,
      reminders: true,
    },
  })

  for (const invoice of overdueInvoices) {
    const daysLate = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))

    const reminderMap: Record<number, ReminderType> = {
      1: ReminderType.DAY_1,
      3: ReminderType.DAY_3,
      7: ReminderType.DAY_7,
    }

    const reminderType = reminderMap[daysLate]
    if (!reminderType) continue

    // Check if reminder already sent
    const alreadySent = invoice.reminders.some(
      r => r.type === reminderType && r.status === 'SENT'
    )
    if (alreadySent) continue

    // Create reminder record
    const reminder = await prisma.reminder.create({
      data: { type: reminderType, invoiceId: invoice.id },
    })

    try {
      if (invoice.client.email) {
        await sendReminderEmail(
          invoice.client.email,
          invoice.client.name,
          invoice.number,
          invoice.total,
          daysLate
        )
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT', sentAt: new Date() },
      })

      // Update invoice to LATE
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'LATE' },
      })

      console.log(`✅ Reminder ${reminderType} sent for invoice ${invoice.number}`)
    } catch (err) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED' },
      })
      console.error(`❌ Failed to send reminder for ${invoice.number}:`, err)
    }
  }
}

export function startReminderCron() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Running reminder check...')
    await processReminders()
  })
  console.log('✅ Reminder cron started')
}
