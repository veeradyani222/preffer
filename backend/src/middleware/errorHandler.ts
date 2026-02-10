import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 * Always put this LAST in your middleware chain
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    // Database errors
    if (err.code === '23505') { // Unique constraint violation
        return res.status(409).json({
            error: 'Resource already exists',
            details: err.detail
        });
    }

    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({
            error: 'Invalid reference',
            details: err.detail
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.message
        });
    }

    // Default error
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error'
    });
};

export default errorHandler;
