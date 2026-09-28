/**
 * Sanitize user input to prevent XSS and injection attacks
 */

// Remove potentially dangerous HTML tags and scripts
export function sanitizeHtml(input: string): string {
  if (!input) return input
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim()
}

// Sanitize string input by trimming and limiting length
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input) return input
  
  return input
    .trim()
    .substring(0, maxLength)
}

// Sanitize email
export function sanitizeEmail(email: string): string {
  if (!email) return email
  
  return email
    .toLowerCase()
    .trim()
    .substring(0, 255)
}

// Sanitize phone number (remove non-numeric except + at start)
export function sanitizePhone(phone: string): string {
  if (!phone) return phone
  
  phone = phone.trim()
  
  // Allow + at the start for international format
  if (phone.startsWith('+')) {
    return '+' + phone.substring(1).replace(/[^\d]/g, '')
  }
  
  return phone.replace(/[^\d]/g, '')
}

// Sanitize numeric input
export function sanitizeNumber(input: any, defaultValue: number = 0): number {
  const num = parseFloat(input)
  return isNaN(num) ? defaultValue : num
}

// Sanitize object by recursively sanitizing all string values
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    const value = sanitized[key]
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value) as any
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value)
    }
  }
  
  return sanitized
}
