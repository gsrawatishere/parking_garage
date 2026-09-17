import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { sendError } from '../utils/controller';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 15 * 60 * 1000
};

const createAccessToken = (user: { id: string; tenantId: string; role: string; email: string }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(user, secret, { expiresIn: '15m' });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { tenantName, tenantEmail, name, email, password } = req.body;
    if ([tenantName, tenantEmail, name, email, password].some((value) => typeof value !== 'string') || password.length < 8) {
      res.status(400).json({ message: 'tenantName, tenantEmail, name, email, and an 8-character password are required.' });
      return;
    }

    const result = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const tenant = await transaction.tenant.create({
        data: { name: tenantName, email: tenantEmail.toLowerCase().trim() }
      });
      const user = await transaction.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email: email.toLowerCase().trim(),
          passwordHash: await hashPassword(password),
          role: 'OWNER'
        },
        select: { id: true, tenantId: true, role: true, email: true, name: true }
      });
      return { tenant, user };
    });

    const accessToken = createAccessToken(result.user);
    res.cookie('accessToken', accessToken, cookieOptions);
    res.status(201).json({ user: result.user, tenant: result.tenant });
  } catch (error) {
    sendError(res, error, 'Something went wrong while registering the user.');
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password, tenantId } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      res.status(400).json({ message: 'email and password are required.' });
      return;
    }

    const users = await prisma.user.findMany({
      where: { email: email.toLowerCase().trim(), ...(tenantId ? { tenantId } : {}) },
      select: { id: true, tenantId: true, role: true, email: true, name: true, passwordHash: true, isActive: true }
    });
    if (!tenantId && users.length > 1) {
      res.status(400).json({ message: 'tenantId is required when an email belongs to multiple garages.' });
      return;
    }
    const user = users[0];

    if (!user?.isActive || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const { passwordHash: _passwordHash, isActive: _isActive, ...safeUser } = user;
    res.cookie('accessToken', createAccessToken(safeUser), cookieOptions);
    res.status(200).json({ user: safeUser });
  } catch (error) {
    sendError(res, error, 'Something went wrong while logging in.');
  }
};

export const logoutUser = async (_req: Request, res: Response) => {
  try {
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ message: 'User logged out successfully.' });
  } catch {
    res.status(500).json({ message: 'Something went wrong while logging out.' });
  }
};
