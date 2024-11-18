import bcrypt from "argon2";
import express from "express";
import jwt from "jsonwebtoken";
import {prisma} from '../lib/auth'
import { validateAdmin, validateUpdateAdmin } from "../zod/validateAdmin";

const router = express.Router();

// @route   POST /api/admin/create
// @desc    Create a new admin
// @access  Private/Admin
router.post('/create', async(req, res) => {
  const {name, email, password, role} = req.body
  try {
    const adminValidate = validateAdmin.safeParse(req.body)
    if(!adminValidate.success){
      return res.status(400).json({message: "Invalid details"})
    }
    const hash = await bcrypt.hash(password);
    const admin = await prisma.admin.create({
      data: {
        name, email, password: hash, role: role || "admin"
      }
    })
    return res.status(200).json({message: "Admin created successfully", admin})
  } catch (error) {
    return res.status(500).json({message: "Internal server error", error})
  }
})



// @route   POST /api/admin/login
// @desc    Login admin and return token
// @access  Public

router.post('/login', async(req, res) => {
  const {email, password} = req.body;
  try {
    const admin = await prisma.admin.findUnique({
      where: {
        email
      }
    });
    if(!admin){
      return res.status(400).json({message: 'Invalid email or password'})
    }
    const isMatch = await bcrypt.verify(admin.password, password);
    if(!isMatch){
      return res.status(400).json({message: "Inavlid email or password"})
    }
    const token = jwt.sign( { id: admin.adminId, role: admin.role }, 
      process.env.JWT_SECRET || "secret", 
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    return res.status(200).json({
      token, // Return token to the client
      admin: {
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: admin.role
      }
    });

  } catch (error) {
    return res.status(500).json({message: "Internal server error"})
  }
})



// @route   GET /api/admin/admins
// @desc    Get all admins
// @access  Private/Admin
router.get("/admins", async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({});
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route   GET /api/admin/admin/:id
// @desc    Get an admin by ID
// @access  Private/Admin
router.get("/fetchadmin/:id", async (req, res) => {
  try {
    const adminId = req.params.id
    const admin = await prisma.admin.findUnique({
      where: {
        adminId,
      },
    });
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }
    return res.status(200).json({ admin });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// @route   PUT /api/admin/edit/:id
// @desc    Edit an admin by ID
// @access  Private/Admin
router.put("/edit/:id", async (req, res) => {
  try {
    const adminId = req.params.id;
    let admin = await prisma.admin.findUnique({
      where: {
        adminId,
      },
    });
    if(!admin){
      return res.status(400).json({message: 'Invalid credentials'})
    }
    const adminValidate = validateUpdateAdmin.safeParse(req.body);
    if(!adminValidate.success){
      return res.status(400).json({message: "Invalid credentials"})
    }
    const { name, email, password, role } = req.body;
    const checkAdmin = await prisma.admin.findUnique({
      where: {
        email,
      },
    })
    if(checkAdmin){
      return res.status(400).json({message: 'Email already exists'})
    }
    admin = await prisma.admin.update({
      where: {
        adminId,
      },
      data: {
        name: name || admin.name,
        email: email || admin.email,
        password: password || admin.password,
        role: role || admin.role,
      },
    });
    return res.status(200).json({ message: "Admin updated successfully", admin });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// @route   DELETE /api/admin/admin/:id
// @desc    Delete an admin by ID
// @access  Private/Admin
router.delete("/delete/:id", async (req, res) => {
    try {
        const adminId = req.params.id
        const admin = await prisma.admin.delete({
            where: {
                adminId
            }
        });
        if(!admin){
          return res.status(400).json({message: "Admin not found"})
        }
        return res.status(200).json({message: 'Admin deleted successfully', admin})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.put('/transfer/:adminId', async(req, res) => {
  const adminId = req.params.adminId;
  try {
    await prisma.$transaction(async(tx) => {
      const currentAdmin = await tx.admin.findFirst({
        where:{
          role: 'superadmin'
        }
      });
      if(!currentAdmin){
        return res.status(400).json({message: 'You are not authorized to perform this operation'})
      }
      await tx.admin.update({
        where: {
          adminId: currentAdmin?.adminId
        },
        data:{
          role: 'admin'
        }
      })
      await tx.admin.update({
        where: {
          adminId
        },
        data:{
          role: 'superadmin'
        }
      })
    })
    return res.status(200).json({message: 'Super admin successfully updated'})
  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
})

export default router;
