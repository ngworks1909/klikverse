import z from 'zod'


// { name, email, password, role } 
export const validateAdmin = z.object({
    name: z.string().min(4).max(20),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string()
})

export const validateUpdateAdmin = z.object({
    name: z.string().min(4).max(20),
    email: z.string().email(),
})

export const validateNotification = z.object({
    title: z.string().min(3),
    body: z.string().min(5),
})