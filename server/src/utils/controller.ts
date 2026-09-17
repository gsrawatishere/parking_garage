import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getAuthenticatedUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new Error('AUTHENTICATION_REQUIRED');
  }

  return req.user;
};

export const sendError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message === 'AUTHENTICATION_REQUIRED') {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const prismaError = error as { code?: string };
  if (prismaError.code === 'P2002') {
      res.status(409).json({ message: 'A record with these values already exists.' });
      return;
  }

  if (prismaError.code === 'P2025') {
      res.status(404).json({ message: 'The requested record was not found.' });
      return;
  }

  console.error(error);
  res.status(500).json({ message: fallbackMessage });
};

export const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
