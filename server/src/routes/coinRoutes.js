import { Router } from 'express';

import passport from 'passport';
import { bet, getCoinFlipResults, spinComplete, getCoinHistory } from '../controllers/coinController.js';


const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.get('/getResults', passport.authenticate('jwt', { session: false }), getCoinFlipResults);
router.post('/spinComplete', passport.authenticate('jwt', { session: false }), spinComplete);
router.get('/getCoinHistory', passport.authenticate('jwt', { session: false }), getCoinHistory);
export default router;