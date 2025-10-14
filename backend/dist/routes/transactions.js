"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TransactionsController_1 = require("../controllers/TransactionsController");
const router = express_1.default.Router();
// Create a new transaction
router.post('/', TransactionsController_1.createTransaction);
// Get all transactions
router.get('/', TransactionsController_1.getAllTransactions);
// Get transaction by ID
router.get('/:id', TransactionsController_1.getTransactionById);
// Delete transaction by ID
router.delete('/:id', TransactionsController_1.deleteTransaction);
exports.default = router;
//# sourceMappingURL=transactions.js.map