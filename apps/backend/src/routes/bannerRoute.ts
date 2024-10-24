import express from 'express'
import {prisma} from '../lib/auth'
import { validateBanner } from '../zod/validateBanner';
import { authenticateToken } from '../middlewares/verifyUser';
import z from 'zod'

const router = express.Router();


router.post('/upload', async(req, res) => {
   try {
    const bannerValidate = validateBanner.safeParse(req.body)
    if(!bannerValidate.success){
      return res.status(400).json({message: 'Invalid request'})
    }
    const {url, title} = req.body
    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl: url
      }
    });
    return res.status(200).json({message: 'Banner created successfully', banner})
   } catch (error) {
    return res.status(500).json({message: 'Internal server error', error})
   }
})


// router.get('/fetchallbanners', authenticateToken, async(req, res) => {
//   try {
//     const banners = await prisma.banner.findMany({});
//     return res.status(200).json({banners})
//   } catch (error) {
//     return res.status(500).json({message: 'Internal server error'})
//   }
// })
router.get('/fetchallbanners', async(req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      select: {
        bannerId: true,
        imageUrl: true,
        title: true
      }
    });
    return res.status(200).json({banners})
  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
})

router.get('/fetchbanner/:bannerId', authenticateToken, async(req, res) => {
  try {
    const bannerId = req.params.bannerId;
    if(!bannerId){
      return res.status(400).json({message: 'Invalid banner'})
    }
    const banner = await prisma.banner.findUnique({
      where: {
        bannerId
      }
    })
    if(!banner){
      return res.status(400).json({message: 'Banner not found'})
    }
  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
})

router.put('/updatebanner/:bannerId', async(req, res) => {
  try {
    const bannerId = req.params.bannerId
    if(!bannerId){
      return res.status(400).json({message: 'Invalid banner'})
    }
    const {title} = req.body
    const bannerValidate =  z.string().min(4).safeParse(title)
    if(!bannerValidate.success){
      return res.status(400).json({message: 'Title should have atleast 4 characters'})
    }
    await prisma.banner.update({
      where: {
        bannerId
      },
      data: {
        title
      }
    });
    return res.status(200).json({message: 'Banner updated successfully'})
  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
});


router.delete('/deletebanner/:bannerId', async(req, res) => {
    try {
      const bannerId = req.params.bannerId
    if(!bannerId){
      return res.status(400).json({message: 'Invalid banner'})
    }
    await prisma.$transaction(async(tx) => {
      const banner = await tx.banner.findUnique({where: {bannerId}});
      if(!banner){
        return res.status(400).json({message: 'Banner not found'})
      }
        
  
        // Delete the corresponding record from the database
        await tx.banner.delete({
          where: {
            bannerId: banner.bannerId, // Assuming imageUrl is unique in the database
          },
        });
  
        return res.status(200).json({ message: 'Banner deleted successfully.', url: banner.imageUrl });
  
    })
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
});


export default router

