import { Router } from 'express';
import { bet, spinComplete, getAToZResults } from '../controllers/aToZController.js';
import passport from 'passport';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.post('/spinComplete', passport.authenticate('jwt', { session: false }), spinComplete);
router.get('/getAToZResults', passport.authenticate('jwt', { session: false }), getAToZResults);

export default router;

