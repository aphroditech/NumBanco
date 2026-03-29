import { Router } from 'express';

import passport from 'passport';
import { bet, cashOut, getSnakeResults, getSnakeHistory, bangSnake } from '../controllers/snakesController.js';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.post('/cash-out', passport.authenticate('jwt', { session: false }), cashOut);
router.get('/results', passport.authenticate('jwt', { session: false }), getSnakeResults);
router.get('/history', passport.authenticate('jwt', { session: false }), getSnakeHistory);
router.post('/bang', passport.authenticate('jwt', { session: false }), bangSnake);

export default router;