import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import adviceRoutes from './routes/adviceRoutes.js';
import { supabase } from './src/config/supabase.js';

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = 3000;

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://farmintel-frontend.vercel.app',
    'http://localhost:8081'
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

// Supabase connection check on startup
(async () => {
  const { error } = await supabase.from('advice').select('*').limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connection successful!');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();