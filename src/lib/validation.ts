import { z } from 'zod'
import type { Messages } from '@/lib/i18n/types'

export function buildValidationSchemas(v: Messages['validation']) {
  const nameSchema = z
    .string()
    .min(1, v.nameRequired)
    .max(255, v.nameMax)

  const emailSchema = z.string().email(v.emailInvalid).max(255, v.emailInvalid)

  const passwordSchema = z
    .string()
    .min(8, v.passwordMin)
    .regex(/[A-Z]/, v.passwordUppercase)
    .regex(/[a-z]/, v.passwordLowercase)
    .regex(/[0-9]/, v.passwordDigit)

  const taskTitleSchema = z
    .string()
    .min(1, v.taskTitleRequired)
    .max(500, v.taskTitleMax)

  const groupNameSchema = z
    .string()
    .min(1, v.groupNameRequired)
    .max(100, v.groupNameMax)

  const tagNameSchema = z.string().min(1, v.tagNameRequired).max(50, v.tagNameMax)

  const checklistTextSchema = z
    .string()
    .min(1, v.checklistTextRequired)
    .max(500, v.checklistTextMax)

  const colorHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, v.colorHexInvalid)

  const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
  })

  const registerSchema = z
    .object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1, v.confirmPasswordRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v.passwordsDoNotMatch,
      path: ['confirmPassword'],
    })

  return {
    nameSchema,
    emailSchema,
    passwordSchema,
    taskTitleSchema,
    groupNameSchema,
    tagNameSchema,
    checklistTextSchema,
    colorHexSchema,
    loginSchema,
    registerSchema,
  }
}
