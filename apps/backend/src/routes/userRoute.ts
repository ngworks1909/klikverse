import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/auth';
import { validateUser } from '../zod/validateUser';

const router = express.Router();

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}


router.post('/create', async(req, res) => {
    try {
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }
        const {name, mobile} = req.body;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(user){
            return res.status(400).json({message: 'User already exists'})
        }
        const otp = generateOtp()
        await prisma.$transaction(async(tx) => {
            user = await tx.user.create({
                data: {
                    username: name,
                    mobile,
                    otp
                }
            });
            await tx.wallet.create({
                data: {
                    userId: user.userId
                }
            })
        })
        fetch(`https://test.troposcore.com/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mobile,
                otp
            })
        })
        return res.status(200).json({message: 'OTP generated. Please verify.'})        
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
});

router.post('/update/:id', async(req, res) => {
    try {
        const userId = req.params.id
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }

        const {mobile, username} = req.body;
        

        let user = await prisma.user.findUnique({
            where: {
                userId
            }
        })
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const previousName = user.username
        const previousMobile = user.mobile
        user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });

        if(user){
            return res.status(400).json({message: 'Mobile number already registered'})
        }
        user = await prisma.user.update({
            where: {
                userId
            },
            data: {
                mobile: mobile || previousMobile,
                username: username || previousName
            }
        });
        return res.status(200).json({message: 'User updated successfully', user})


    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.post('/login', async(req, res) => {
    try {
        const {mobile} = req.body;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'Mobile number not registered'})
        }
        const otp = generateOtp()
        user = await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });
        fetch(`https://test.troposcore.com/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mobile,
                otp
            })
        })

        return res.status(200).json({message: "OTP sent"})
    } catch (error) {
        return res.status(500).json({message: 'Some error occured', error})
    }
})



router.post('/verifyotp', async(req, res) => {
    try {
        const {otp, mobile} = req.body;
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        if(otp !== user.otp){
            return res.status(400).json({message: 'Incorrect OTP'})
        }
        const token = jwt.sign( { mobile: user.mobile, userId: user.userId, username: user.username }, 
            process.env.JWT_SECRET || "secret", 
        );
        return res.status(200).json({token, message: 'Login successful'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
})

router.post('/delete/:id', async(req, res) => {
    try {
        const userId = await req.params.id;
        await prisma.$transaction(async(tx) => {
            const user = await tx.user.findUnique({
                where: {
                    userId
                }
            });
            if(!user){
                return res.status(400).json({message: 'User not found'})
            }
            await tx.wallet.deleteMany({
                where: {
                    userId
                }
            });
            return res.status(200).json({message: 'User deleted successfully'})
        })
        
        return res.status(200).json({message: 'User deleted successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.get('/fetchuser', async(req, res) => {
    try {
        const token = req.headers['authorization']
    if (!token) {
        return res.status(401).send('Unauthorized token'); // Unauthorized
    }
    
    jwt.verify(token, process.env.JWT_SECRET || "secret", async(err: any, user: any) => {
        if (err) {
          return res.status(403).send('Forbidden error'); // Forbidden
        }
        const { mobile } = user;
        const person = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!person){
            return res.status(400).json({message: 'User not found'})
        }
        return res.status(200).json({user: person})
      });
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.put('/resendotp', async(req, res) => {
    try {
        const {mobile} = req.body
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const otp = generateOtp();
        await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });
        fetch(`https://test.troposcore.com/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mobile,
                otp
            })
        })
        return res.status(200).json({message: 'OTP updated'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.get('/fetchalluser', async(req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                userId: true,
                username: true,
                mobile: true,
                wallet: {
                    select: {
                        totalBalance: true
                    },
                    take: 1
                }
            }
        })
        return res.status(200).json({users})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

export default router;