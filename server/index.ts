import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '@/config/index';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';
import { vaccinationService } from '@/services/vaccinationService';
import { diseaseService } from '@/services/diseaseService';
import { wastewaterService } from '@/services/wastewaterService';
import { newsService } from '@/services/newsService';
import { syncService } from '@/services/syncService';
import { csvCacheService } from '@/services/csvCacheService';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    environment: config.NODE_ENV
  });
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const [vaccination, disease, wastewater, news, cacheStats] = await Promise.all([
      vaccinationService.getData(),
      diseaseService.getData(),
      wastewaterService.getData(),
      newsService.getData(),
      csvCacheService.getCacheStats()
    ]);

    res.json({
      vaccinationData: vaccination,
      diseaseStats: { nyc: disease },
      wastewaterData: wastewater,
      newsData: news,
      cacheMetadata: {
        lastFetched: new Date().toISOString(),
        csvCache: cacheStats
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/refresh', async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const isAdmin = req.query.admin === 'true';

    const result = await syncService.requestManualRefresh(ip, isAdmin);

    if (result.status === 'rejected') {
      res.status(429).json(result);
    } else {
      res.json(result);
      
      broadcastUpdate({
        type: 'sync_status',
        status: result.status,
        message: result.message
      });
    }
  } catch (error) {
    next(error);
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  clients.add(ws);
  
  ws.send(JSON.stringify({ type: 'connection_established', timestamp: new Date().toISOString() }));

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
    clients.delete(ws);
  });
});

function broadcastUpdate(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function startServer() {
  try {
    await database.ready;
    
    server.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();