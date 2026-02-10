import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        username: string;
    }
}

/**
 * Middleware to verify JWT token and protect routes
 * Usage: Add to any route that requires authentication
 */
const authenticate = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔐 AUTHENTICATE MIDDLEWARE HIT:', req.method, req.path);
    console.log('   Authorization Header:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('   ❌ No token provided');
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username
        };

        console.log('   ✅ Token verified for user:', decoded.userId);
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            console.log('   ❌ Token expired');
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            console.log('   ❌ Invalid token');
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.error('   ❌ Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

export default authenticate;
