"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Inventory routes
const express_1 = __importDefault(require("express"));
const ProductsController_1 = require("../controllers/ProductsController");
const router = express_1.default.Router();
router.get('/', ProductsController_1.getAllProducts);
router.get('/:id', ProductsController_1.getProductById);
router.post('/', ProductsController_1.createProduct);
router.put('/:id', ProductsController_1.updateProduct);
router.delete('/:id', ProductsController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=products.js.map