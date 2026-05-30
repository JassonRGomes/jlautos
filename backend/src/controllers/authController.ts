import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'jl_autos_premium_luxury_secret_key_2026';

// HTTP-Only Cookie options
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
};

// 1. Register User (CUSTOMER role by default)
export const register = async (req: Request, res: Response) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Email, password, and name are required fields.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(409).json({ message: 'A profile with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // First registered user becomes ADMIN
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'CUSTOMER';

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        phone,
        role,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, cookieOptions);

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error during registration.', error: error.message });
  }
};

// 2. Login User
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error during login.', error: error.message });
  }
};

// 3. Get Current Authenticated Profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, image: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    // Generate a fresh token so the frontend can recover it if localStorage was wiped
    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({ user, token: newToken });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching profile.', error: error.message });
  }
};

// 4. Update Profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
  const { name, phone, image, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (image !== undefined) updates.image = image;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password required to set new password.' });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ message: 'User not found.' });
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) return res.status(401).json({ message: 'Current password incorrect.' });
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await prisma.user.update({ where: { id: userId }, data: updates });
    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        image: updatedUser.image,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
};

// 5. Logout
export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  });
  return res.status(200).json({ message: 'Session logged out and cookies cleared successfully.' });
};
