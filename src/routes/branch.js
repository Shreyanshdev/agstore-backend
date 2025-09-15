import express from "express";
import { addBranch, getBranches } from "../controllers/branch.js";

const router = express.Router();

router.post("/branch", addBranch);
router.get("/branch", getBranches);

export default router;
