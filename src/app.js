import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/health', healthRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
  });

  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
