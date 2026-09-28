import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { sanitizeEmail, sanitizeString, sanitizePhone } from '../utils/sanitize'

const prisma = new PrismaClient()

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
  phone: z.string().max(20).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const register = async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body)

    // Sanitize inputs
    const name = sanitizeString(validated.name, 100)
    const email = sanitizeEmail(validated.email)
    const phone = validated.phone ? sanitizePhone(validated.phone) : undefined

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ message: 'الإيميل ده مسجل قبل كده' })

    const hashedPassword = await bcrypt.hash(validated.password, 12)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone },
      select: { id: true, name: true, email: true, phone: true },
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })

    res.status(201).json({ user, token })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message })
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body)

    // Sanitize email input
    const email = sanitizeEmail(validated.email)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ message: 'الإيميل أو الباسورد غلط' })

    const valid = await bcrypt.compare(validated.password, user.password)
    if (!valid) return res.status(401).json({ message: 'الإيميل أو الباسورد غلط' })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })

    res.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message })
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ message: 'المستخدم مش موجود' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'حصل خطأ في السيرفر' })
  }
}
