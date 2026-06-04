import express from 'express';
import { createServer } from 'http'; // Required for unified HTTP/Socket server
import cors from 'cors';
import { SocketService } from './services/socket.service'; // Ensure your path is correct

// Import routes
import authRoutes from './routes/auth';
import packagesRoutes from './routes/packages';
import cartRoutes from './routes/cart';
import checkoutRoutes from './routes/checkout';
import BillingRoutes from './routes/billing';
import webhookRoutes from './routes/webhook';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import accountRoutes from './routes/account';
import workspaceRoutes from './routes/workspace';
import { startInactivityJob } from './jobs/inactivity.job';
import HistoryRoutes from './routes/history';
import adminInvoiceRoutes from './routes/admin.invoice';
import chatRoutes from './routes/chat';
import paymentRoutes from './routes/payment';
import datasetRoutes from './routes/datasets';

const app = express();
const PORT = 5000;

// 1. Create the HTTP server instance
const httpServer = createServer(app);

// 2. Initialize SocketService with the httpServer instance
SocketService.init(httpServer);

// Middleware
app.use(cors({
      origin: [
    'http://localhost:3000',
    'http://localhost:5173'
  ],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/billing', BillingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/history', HistoryRoutes);
app.use('/api/admin-invoice', adminInvoiceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/datasets', datasetRoutes);

startInactivityJob();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// 3. Listen on httpServer, NOT app.listen
httpServer.listen(PORT, () => {
    console.log(`🚀 SlipZMarket API & Socket Server running on http://localhost:${PORT}`);
});