"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const InventoryController_1 = require("../controllers/InventoryController");
const router = express_1.default.Router();
router.get('/items', InventoryController_1.getAllProductItems);
router.get('/items/product/:productId', InventoryController_1.getProductItemsByProductId);
router.get('/stock/:productId', InventoryController_1.getProductStock);
router.get('/products-with-stock', InventoryController_1.getAllProductsWithStock); // New endpoint to see all products with stock
router.post('/add', InventoryController_1.addStock);
router.put('/:id', InventoryController_1.updateStock);
router.delete('/:id', InventoryController_1.deleteProductItem);
exports.default = router;
//# sourceMappingURL=inventory.js.map