import express from 'express';
import { withdraw, price } from '../controllers/withdrawController.js';
import passport from 'passport';

const router = express.Router();

// Create withdraw
router.post('/', passport.authenticate('jwt', { session: false }), withdraw);
router.post('/getprice', passport.authenticate('jwt', { session: false }), price);

export default router;

