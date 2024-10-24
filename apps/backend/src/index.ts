import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import adminRouter from './routes/adminRoute'
import userRouter from './routes/userRoute'
import transactionRouter from './routes/transactionRoute'
import bannerRouter from './routes/bannerRoute'
import gameRouter from './routes/gameRoute'

dotenv.config()

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log(process.env.DATABASE_URL)

export { prisma };

const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


app.use('/api/admin', adminRouter)
app.use('/api/user', userRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/banner', bannerRouter)
app.use('/api/game', gameRouter)

app.get("/",(req,res)=>{
    res.send("Hello User");
})

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

