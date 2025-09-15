import express from 'express';
import { getAllCategories } from "../controllers/product/category.js";
import { 
    getProductByCategoryId, 
    getAllProducts, 
    getProductById,
    searchProducts,
    getRelatedProducts,
    getProductVariants,
    getFeaturedProducts,
    getAllTags,
    getAllBrands
} from "../controllers/product/product.js";
import { optionalVerifyToken } from "../middleware/auth.js"; // Import optionalVerifyToken

const router = express.Router();

// Basic product routes
router.get("/products", optionalVerifyToken, getAllProducts);
router.get("/products/:categoryId", optionalVerifyToken, getProductByCategoryId);
router.get("/product/:productId", optionalVerifyToken, getProductById);

// Search and filter routes
router.get("/search", optionalVerifyToken, searchProducts);
router.get("/tags", optionalVerifyToken, getAllTags);
router.get("/brands", optionalVerifyToken, getAllBrands);

// Special product collections
router.get("/featured", optionalVerifyToken, getFeaturedProducts);

// Product details
router.get("/product/:productId/related", optionalVerifyToken, getRelatedProducts);
router.get("/product/:productId/variants", optionalVerifyToken, getProductVariants);

// Category routes (assuming categories don't need user info for now)
router.get("/categories", getAllCategories);

export default router;