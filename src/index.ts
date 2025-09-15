import { buildServer } from './server';
import { config } from './config/env';
import { testConnection, closeConnection } from './db';

const start = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    console.log('✅ Database connected');

    // Build and start server
    const app = await buildServer();
    
    await app.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });

    console.log(`🚀 Server running at http://${config.HOST}:${config.PORT}`);
    
    if (config.NODE_ENV !== 'production') {
      console.log(`📚 API Documentation: http://${config.HOST}:${config.PORT}/docs`);
    }

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        try {
          await app.close();
          await closeConnection();
          console.log('✅ Server closed');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during shutdown:', err);
          process.exit(1);
        }
      });
    });
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

start();

