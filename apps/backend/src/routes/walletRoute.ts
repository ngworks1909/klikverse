import express from 'express'
import { verifyAdmin } from '../middlewares/verifyAdmin';
import {prisma} from "../lib/auth";
import { authenticateToken } from '../middlewares/verifyUser';


const router = express.Router();


router.post('/getallwallets', verifyAdmin, async(req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({});
        return res.status(200).json({wallets})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.post('/getwallet', authenticateToken, async(req, res) => {
    try {
        const {mobile} = req.body;
        const wallet = await prisma.wallet.findFirst({
            where: {
                user: {
                    mobile
                }
            }
        });
        if(!wallet){
            return res.status(400).json({message: 'Wallet not found'})
        }
        return res.status(200).json({wallet})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})