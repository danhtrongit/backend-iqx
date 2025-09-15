import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { StockSymbolsService } from '../services/stock-symbols.service';

async function stockSymbolsInitPlugin(app: FastifyInstance) {
  const stockSymbolsService = new StockSymbolsService(app);

  // Check and import symbols on startup
  app.addHook('onReady', async () => {
    try {
      const count = await stockSymbolsService.getSymbolCount();
      
      if (count === 0) {
        app.log.info('Stock symbols table is empty. Initiating automatic import...');
        
        const result = await stockSymbolsService.importSymbols(false);
        
        if (result.imported > 0) {
          app.log.info(`✅ Successfully imported ${result.imported} stock symbols on startup`);
        } else {
          app.log.warn('⚠️ No stock symbols were imported during startup');
        }
      } else {
        app.log.info(`Stock symbols table already initialized with ${count} records`);
      }
    } catch (error) {
      // Don't fail the server startup if stock symbols import fails
      app.log.error('Failed to initialize stock symbols:', error);
      app.log.warn('Server will continue without stock symbols. You can import them manually later.');
    }
  });
}

export default fp(stockSymbolsInitPlugin, {
  name: 'stock-symbols-init',
});