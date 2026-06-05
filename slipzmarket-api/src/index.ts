import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { SocketService } from './services/socket.service';

// Import routes
import authRoutes from './routes/auth.js'; // Ensure .js extension for NodeNext
import packagesRoutes from './routes/packages.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import BillingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhook.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import accountRoutes from './routes/account.js';
import workspaceRoutes from './routes/workspace.js';
import { startInactivityJob } from './jobs/inactivity.job.js';
import HistoryRoutes from './routes/history.js';
import adminInvoiceRoutes from './routes/admin.invoice.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payment.js';
import datasetRoutes from './routes/datasets.js';
import adminDashboardRoutes from './routes/admin.dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Create the HTTP server instance
const httpServer = createServer(app);

// 2. Initialize SocketService
SocketService.init(httpServer);

// 3. CORS Configuration
// This must be updated to include your Render production domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://slipz-market-1.onrender.com',
  'https://slipz-market-2.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) 
    // or if the origin is in our allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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
app.use('/api/admin-dashboard', adminDashboardRoutes);

startInactivityJob();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// 4. Listen on httpServer
httpServer.listen(PORT, () => {
  console.log(`🚀 SlipZMarket API & Socket Server running on port ${PORT}`);
});