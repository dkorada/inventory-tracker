import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { productsRouter } from './routes/products.js';
import { movementsRouter } from './routes/movements.js';
import { categoriesRouter } from './routes/categories.js';
import { dashboardRouter } from './routes/dashboard.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', demo: process.env.DEMO_MODE === 'true' });
  });
  app.use('/api/products', productsRouter);
  app.use('/api/movements', movementsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
