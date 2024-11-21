import z from 'zod'

export const validateUser = z.object({
    name: z.string().min(4),
    mobile: z.string().refine((value) => {
        return /^[6-9][0-9]{9}$/.test(value);
      })
})

export const validateDevice = z.object({
  userId: z.string(),
  deviceId: z.string()
})