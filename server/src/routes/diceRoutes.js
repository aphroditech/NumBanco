import { Router } from 'express';
import { bet, getDiceHistory } from '../controllers/diceController.js';
import passport from 'passport';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.get('/getDiceHistory', passport.authenticate('jwt', { session: false }), getDiceHistory);    
export default router;

