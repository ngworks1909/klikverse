import z from 'zod'

export const validateBanner = z.object({
    title: z.string().min(4, { message: "Title should have at least 4 characters" }),
    url: z.string()
});