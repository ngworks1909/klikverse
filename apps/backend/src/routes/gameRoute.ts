import express from 'express'
import {prisma} from '../lib/auth'
import { verifyAdmin } from '../middlewares/verifyAdmin';
import { validateGameDetails } from '../zod/validateGame';
import { validateUser } from '../zod/validateUser';
import { authenticateToken } from '../middlewares/verifyUser';

const router = express();


router.post('/create', verifyAdmin, async(req, res) => {
    try {
        const isValidGame = validateGameDetails.safeParse(req.body).success;
        if(!isValidGame){
            return res.status(400).json({message: "Invalid game details"})
        }
        const {gameType, maxPlayers, entryFee, prizePool} = req.body
        const game = await prisma.game.create({
            data: {
                gameType,
                maxPlayers,
                entryFee,
                prizePool
            }
        });
        return res.status(200).json({message: 'Game created successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.get('/fetchActiveGames',  authenticateToken, async(req, res) => {
    try {
        const games = await prisma.game.findMany({
            where: {
                isActive: true
            }
        });
        return res.status(200).json({games})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.delete('/fetchAllGames', verifyAdmin, async(req, res) => {
    try {
        const games = await prisma.game.findMany({});
        return res.status(200).json({games})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.put('/updateActive/:gameId', verifyAdmin, async(req, res) => {
    try {
        const gameId = req.params.gameId;
        await prisma.$transaction(async(tx) => {
            const game = await tx.game.findUnique({
                where: {
                    gameId
                },
                select: {
                    isActive: true
                }
            });
            if(!game){
                return res.status(400).json({message: "Game not found"})
            }
            await tx.game.update({
                where: {
                    gameId
                },
                data: {
                    isActive: !game?.isActive
                }
            })
        })

        return res.status(200).json({message: 'Game updated successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})


export default router;

