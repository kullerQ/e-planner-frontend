import { z } from 'zod'
import { messages } from '@/lib/messages'

const validation = messages.validation

export const nameSchema = z
  .string()
  .min(1, validation.nameRequired)
  .max(255, validation.nameMax)

export const emailSchema = z.string().email(validation.emailInvalid).max(255, validation.emailInvalid)

export const passwordSchema = z
  .string()
  .min(8, validation.passwordMin)
  .regex(/[A-Z]/, validation.passwordUppercase)
  .regex(/[a-z]/, validation.passwordLowercase)
  .regex(/[0-9]/, validation.passwordDigit)

export const taskTitleSchema = z
  .string()
  .min(1, validation.taskTitleRequired)
  .max(500, validation.taskTitleMax)

export const groupNameSchema = z
  .string()
  .min(1, validation.groupNameRequired)
  .max(100, validation.groupNameMax)

export const tagNameSchema = z
  .string()
  .min(1, validation.tagNameRequired)
  .max(50, validation.tagNameMax)

export const checklistTextSchema = z
  .string()
  .min(1, validation.checklistTextRequired)
  .max(500, validation.checklistTextMax)

export const colorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, validation.colorHexInvalid)

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, validation.confirmPasswordRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: validation.passwordsDoNotMatch,
    path: ['confirmPassword'],
  })
