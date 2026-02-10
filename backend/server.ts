import dotenv from 'dotenv';
dotenv.config();
import app from './src/app';
import pool from './src/config/database';

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    // Close database connections
    await pool.end();
    console.log('✅ Database connections closed');

    process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🚀 Server running on port ${PORT}     ║
║   📝 Environment: ${process.env.NODE_ENV}      ║
║   🌐 Frontend: ${process.env.FRONTEND_URL} ║
╚═══════════════════════════════════════╝
  `);
});
