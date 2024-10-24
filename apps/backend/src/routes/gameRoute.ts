import express from 'express'
import {prisma} from '../lib/auth'

const router = express();


router.post('/create', async(req, res) => {
    // const {gameType, maxPlayers, entryFee, prizePool} = req.body
    try {
        console.log(req.body)
        const game = await prisma.game.create({
            data: {
                gameType: "LUDO",
                maxPlayers: 2,
                entryFee: 100,
                prizePool: 2000
            }
        });
        return res.status(200).json({success: true})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});


export default router;

