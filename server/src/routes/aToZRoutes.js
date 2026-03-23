import { Router } from 'express';
import { bet, spinComplete } from '../controllers/aToZController.js';
import passport from 'passport';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.post('/spinComplete', passport.authenticate('jwt', { session: false }), spinComplete);

export default router;

