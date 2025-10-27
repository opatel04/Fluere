import app from './app';
import config from './config/env';
import logger from './config/logger';
import { testConnection } from './config/database';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', error);
  process.exit(1);
});

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   TaskSnap API Server                                ║
    ║                                                       ║
    ║   Environment: ${config.nodeEnv.padEnd(38)}║
    ║   Port:        ${config.port.toString().padEnd(38)}║
    ║   Version:     ${config.apiVersion.padEnd(38)}║
    ║                                                       ║
    ║   Server URL:  http://localhost:${config.port.toString().padEnd(23)}║
    ║   Health:      http://localhost:${config.port}/health${' '.padEnd(11)}║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
  `);

  // Test database connection
  await testConnection();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', reason);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated!');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated!');
  });
});

export default server;
