import express from 'express';
import { getAdvice } from '../src/controller/adviceController.js';

const router = express.Router();

// New endpoint: POST /api/get-agri-advice
router.post('/get-agri-advice', getAdvice);

export default router;
