import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './config/logger.js';

let server;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Server shutdown started', { signal });

    const timeout = setTimeout(() => {
        logger.error('Graceful shutdown timed out');
        process.exit(1);
    }, 10_000);
    timeout.unref();

    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDatabase();
    clearTimeout(timeout);
    logger.info('Server shutdown complete');
    process.exit(exitCode);
}

async function connectDatabaseWithRetry() {
    while (!shuttingDown) {
        try {
            await connectDatabase();
            return;
        } catch (error) {
            logger.error('MongoDB connection failed; retrying in 5 seconds', {
                error: error.message,
                errorName: error.name,
                errorCode: error.code,
            });
            await new Promise((resolve) => setTimeout(resolve, 5_000));
        }
    }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { error: reason instanceof Error ? reason.message : 'Unknown rejection' });
    void shutdown('unhandledRejection', 1);
});

try {
    // Bind before connecting so cloud health checks can reach the process during database outages.
    server = app.listen(env.port, '0.0.0.0');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    logger.info('Server listening', { port: env.port, environment: env.nodeEnv });
    void connectDatabaseWithRetry();
} catch (error) {
    logger.error('Server startup failed', {
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    await disconnectDatabase().catch(() => {});
    process.exitCode = 1;
}
