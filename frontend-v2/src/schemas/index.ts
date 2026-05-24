import { z } from 'zod'

const ROLES = ['admin', 'hr', 'manager', 'employee'] as const

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().min(1, 'Ce champ est requis').email("Format d'e-mail invalide"),
  password: z.string().min(1, 'Ce champ est requis'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

// ─── User ─────────────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  firstName:  z.string().min(1, 'Le prénom est requis'),
  lastName:   z.string().min(1, 'Le nom est requis'),
  email:      z.string().min(1, "L'e-mail est requis").email("Format d'e-mail invalide"),
  role:       z.enum(ROLES, { error: 'Le rôle est requis' }),
  department: z.string().optional(),
  position:   z.string().optional(),
})
export type UserCreateFormValues = z.infer<typeof userCreateSchema>

export const userEditSchema = z.object({
  firstName:  z.string().min(1, 'Le prénom est requis').optional(),
  lastName:   z.string().min(1, 'Le nom est requis').optional(),
  email:      z.string().email("Format d'e-mail invalide").optional(),
  role:       z.enum(ROLES).optional(),
  department: z.string().optional(),
  position:   z.string().optional(),
})
export type UserEditFormValues = z.infer<typeof userEditSchema>

// ─── Campaign ─────────────────────────────────────────────────────────────────

export const campaignSchema = z
  .object({
    name:        z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Nom trop long'),
    description: z.string().max(500, 'Description trop longue').optional(),
    startDate:   z.string().min(1, 'La date de début est requise'),
    endDate:     z.string().min(1, 'La date de fin est requise'),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate)
      }
      return true
    },
    { message: 'La date de fin doit être après la date de début', path: ['endDate'] },
  )
export type CampaignFormValues = z.infer<typeof campaignSchema>
