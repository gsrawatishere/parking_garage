import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
}

const getTokenFromRequest = (req: Request): string | null => {
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (bearerToken) {
    return bearerToken;
  }

  return null;
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = getTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ message: 'Authentication token is required' });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: 'JWT secret is not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as Partial<{
      id: string;
      tenantId: string;
      role: string;
      email: string;
    }>;

    if (!decoded.id || !decoded.tenantId || !decoded.role || !decoded.email) {
      res.status(401).json({ message: 'Invalid authentication token claims' });
      return;
    }

    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email
    };
    next();
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) {
      console.error(error);
    }
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'User is not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission to access this resource' });
      return;
    }

    next();
  };
};
