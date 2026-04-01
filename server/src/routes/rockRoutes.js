import { Router } from 'express';

import passport from "passport";

import { bet, cashout, getRockHistory, getRockResults, bang } from '../controllers/rockController.js';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.get('/history', passport.authenticate('jwt', { session: false }), getRockHistory);
router.get('/results', passport.authenticate('jwt', { session: false }), getRockResults);
router.post('/cashout', passport.authenticate('jwt', { session: false }), cashout);
router.post('/bang', passport.authenticate('jwt', { session: false }), bang);

export default router;