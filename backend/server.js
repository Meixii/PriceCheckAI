"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes/routes"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("dotenv/config");
const server_app = (0, express_1.default)();
const port = 3000;
server_app.use(express_1.default.json());
// More permissive CORS for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
const options = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow all origins in development
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
};
server_app.use((0, cors_1.default)(options));
// Add request logging
server_app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.get('origin') || 'unknown'}`);
    next();
});
server_app.use("/scrape", routes_1.default);
// Add a simple health check endpoint
server_app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
server_app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`🚀 Server listening on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🔍 API endpoint: http://localhost:${port}/scrape/all?SEARCH_TERM=test`);
}));
exports.default = server_app;
