import express from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/auth';
import Razorpay from 'razorpay';
import z, { number } from 'zod'

import crypto from 'crypto';

const router = express.Router();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY || 'your_key_id',
    key_secret: process.env.RAZORPAY_SECRET || 'your_key_secret',
});

router.post('/create',  async(req, res) => {
  try {
      const token = req.headers['authorization'];
      if (!token) {
          return res.status(401).send('Unauthorized token'); // Unauthorized
      }

      const data = jwt.verify(token, process.env.JWT_SECRET || "secret");
      const { userId }: any = data;

      const user = await prisma.user.findUnique({
          where: {
              userId
          }
      });

      if (!user) {
          return res.status(400).json({ message: 'User not found' });
      }

      const { amount } = req.body;
      if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ message: 'Invalid amount' });
      }

      const validateAmount = z.number().positive().safeParse(amount);
      if (!validateAmount.success) {
          return res.status(400).json({ message: 'Invalid amount type' });
      }

      // Razorpay order options
      const options = {
          amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
          currency: 'INR',
          receipt: `receipt_order_${new Date().getTime()}`, // Dynamic receipt
          payment_capture: 1, // Auto-capture
      };

      const order = await razorpayInstance.orders.create(options);

      // Store the transaction in the database
      const transaction = await prisma.transactions.create({
          data: {
              orderId: order.id,
              userId,
              amount: Number(order.amount),
              currency: order.currency
          },
      });

      return res.status(200).json({ message: 'Payment created', order, transaction });
  } catch (error) {
      console.error("Razorpay Error:", error); // Log for debugging
      return res.status(500).json({ message: 'Internal server error' });
  }
});



router.post('/update', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = req.body;
    razorpay_order_id
  
    // If status is failed, no need to verify signature, directly update status
    if (status === 'failed') {
      try {
        const updatedTransaction = await prisma.transactions.updateMany({
          where: { orderId: razorpay_order_id },
          data: {
            status: "Failed", // Mark transaction as failed
          },
        });
        return res.status(200).json({ message: 'Transaction marked as failed', transaction: updatedTransaction });
      } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({ message: 'Error updating transaction', error });
      }
    }
  
    // Otherwise, verify the successful payment
    const secret = process.env.RAZORPAY_SECRET || 'your_key_secret';
    const generatedSignature = crypto.createHmac('sha256', secret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature. Payment verification failed' });
    }
  
    try {
      // Update transaction for successful payment
      const updatedTransaction = await prisma.transactions.updateMany({
        where: { orderId: razorpay_order_id },
        data: {
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: "Paid",
        },
      });
  
      res.status(200).json({ message: 'Transaction updated successfully', transaction: updatedTransaction });
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Error updating transaction', error });
    }
  });
  

export default router;