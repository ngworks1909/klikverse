import z from 'zod'

export const validateInitGame = z.object({
    gameId: z.string()
})

export const validateRoomId = z.object({
    roomId: z.string()
})

export const validateMovePiece = z.object({
    roomId: z.string(),
    pieceId: z.number()
})

export const validateUpdateMove = z.object({
    roomId: z.string(),
    newPosition: z.number()
})

export const validateExit = z.object({
    roomId: z.string()
})