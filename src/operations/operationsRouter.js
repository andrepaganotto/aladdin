import { Router } from "express";
import controller from './operationsController.js';

const router = Router();

router.get('/', controller.getOperations);

export default router;