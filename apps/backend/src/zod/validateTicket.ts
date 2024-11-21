import z from 'zod'


export const validateTicket = z.object({
    issue: z.string().min(5),
    description: z.string().min(5),
    email: z.string().email(),
    name: z.string().min(5),
    image: z.string() || z.null()
})

export const validateResolve = z.object({
    input: z.string().email(),
    textarea: z.string().min(5),
    solved: z.boolean(),
    ticketId: z.string().min(5)
})