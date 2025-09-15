import express from 'express';
import {
    getUserProfile,
    updateUserProfile,
  } from "../controllers/userController.js";
  
  import { verifyToken } from "../middleware/auth.js";
  
  const router = express.Router();
  
  router.use(verifyToken);
  
  router.get("/user/profile", getUserProfile);
  router.put("/user/profile", updateUserProfile);
  
export default router;