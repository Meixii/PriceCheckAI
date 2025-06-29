import express from 'express';
import scrapeRoute from './routes/routes';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import 'dotenv/config';


const server_app = express();
const port = 3000;


server_app.use(express.json());

// More permissive CORS for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  FRONTEND_URL, 
  'http://localhost:3000', 
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:5175',
  'http://127.0.0.1:5173', 
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000'
];
const options: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // For development, allow any localhost origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};
server_app.use(cors(options));

// Add request logging
server_app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.get('origin') || 'unknown'}`);
  next();
});

server_app.use("/scrape", scrapeRoute);

// Add a simple health check endpoint
server_app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server_app.listen(port, async () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🔍 API endpoint: http://localhost:${port}/scrape/all?SEARCH_TERM=test`);
});

export default server_app;