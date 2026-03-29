import { Router } from 'express';
import { bet, getKenoHistory, getKenoControls } from '../controllers/kenoController.js';
import passport from 'passport';

const router = Router();

router.post('/bet', passport.authenticate('jwt', { session: false }), bet);
router.get('/getKenoHistory', passport.authenticate('jwt', { session: false }), getKenoHistory);    
router.get('/getKenoControls', passport.authenticate('jwt', { session: false }), getKenoControls);    
export default router;

