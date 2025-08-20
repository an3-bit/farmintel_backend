import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import adviceRoutes from './routes/adviceRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://farmintel-frontend.vercel.app',
    'http://localhost:8080',
    'https://farmintel-backend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', adviceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Root endpoint: show a user-friendly message
app.get('/', (req, res) => {
  res.send('<div style="font-family:sans-serif;text-align:center;margin-top:10vh;font-size:2rem;color:#228B22;">Your backend is running.</div>');
});

// Global error handlers (optional, but good for logging)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});