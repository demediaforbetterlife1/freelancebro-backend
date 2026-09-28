import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    message: 'محاولات كتير أوي، جرب تاني بعد 15 دقيقة',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'محاولات كتير أوي، جرب تاني بعد 15 دقيقة',
    })
  },
})

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    message: 'طلبات كتير أوي، جرب تاني بعد شوية',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health'
  },
})

// Stricter rate limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    message: 'وصلت للحد الأقصى من الطلبات، جرب تاني بعد ساعة',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
