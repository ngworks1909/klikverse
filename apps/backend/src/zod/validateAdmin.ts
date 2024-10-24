import z from 'zod'


// { name, email, password, role } 
export const validateAdmin = z.object({
    name: z.string().min(4).max(10),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string()
})