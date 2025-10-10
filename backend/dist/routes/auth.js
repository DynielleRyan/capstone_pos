"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Auth routes
router.post('/register', authController_1.register);
router.get('/profile', authController_1.getProfile);
router.put('/profile', authController_1.updateProfile);
router.put('/change-password', authController_1.changePassword);
router.delete('/deactivate', authController_1.deactivateAccount);
exports.default = router;
//# sourceMappingURL=auth.js.map