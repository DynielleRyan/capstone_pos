import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        isPharmacist: boolean;
      };
    }
  }
}

// Verify token middleware - use this to protect routes
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Middleware to check if user is a pharmacist
export const requirePharmacist = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isPharmacist) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Pharmacist privileges required.' 
    });
  }
  next();
};