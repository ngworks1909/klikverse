import z from 'zod'


export const validateGameDetails = z.object({
    gameType: z.enum(["LUDO", "CRICKET"]),
    maxPlayers: z.union([z.literal(2), z.literal(4)]),
    entryFee: z.number(),
    prizePool: z.number()
});