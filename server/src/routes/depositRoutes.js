import express from 'express';
import { deposit, depositFail } from '../controllers/depositController.js';
import passport from 'passport';
const router = express.Router();

// Create deposit
router.post('/', passport.authenticate('jwt',{session: false}), deposit);
router.get('/fail', passport.authenticate('jwt',{session: false}), depositFail);

export default router;
