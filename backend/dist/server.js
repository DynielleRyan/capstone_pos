"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config"); //global import for all files 
const database_1 = require("./utils/database");
const products_1 = __importDefault(require("./routes/products"));
const auth_1 = __importDefault(require("./routes/auth"));
const transactions_1 = __importDefault(require("./routes/transactions"));
// dotenv.config(); //loads the env file globally 
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5002;
//Middlewares
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:5179", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178"],
    credentials: true
}));
app.use(express_1.default.json());
//Routes
app.use('/api/products', products_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/transactions', transactions_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await database_1.supabase.from('Product').select('*').limit(1);
        if (error) {
            throw error;
        }
        ;
        res.json({ message: 'Database Connected', data });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running http:${PORT}`);
});
//# sourceMappingURL=server.js.map