import User from "../models/User.js";
import DailyLoot from "../models/DailyLoot.js";
import { sendUserResponse } from "../utils/responses.js";
import Reward from "../models/Reward.js";
import { truncateToTwo } from "./rubicController.js";

export const dailyloot = async (req, res) => {
  try {
    const { userAuthId } = req.user;
    const flag = req.body.flag;
    const user = await User.findOne(
        { userAuthId: userAuthId },
        {
            "wallets.eth.privateKey": 0,
            "wallets.bsc.privateKey": 0,
            "wallets.tron.privateKey": 0,
            password: 0,
            country: 0,
            pumpingMode: 0,
            fishingMode: 0,
            rubicMode: 0,
            partnerId: 0,
            partnerActivity: 0,
            
        }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const serverNow = new Date();
    const today = new Date(serverNow);
    today.setHours(0, 0, 0, 0);
    if (user.lastClickDate) {
      let lastPlay;
      
      if (user.lastClickDate instanceof Date) {
        lastPlay = new Date(user.lastClickDate);
      } else if (user.lastClickDate.year !== undefined) {
        lastPlay = new Date(
          user.lastClickDate.year,
          user.lastClickDate.month,
          user.lastClickDate.day
        );
      } else {
        lastPlay = new Date(user.lastClickDate);
      }
      
      lastPlay.setHours(0, 0, 0, 0);
      if (lastPlay.getTime() === today.getTime()) {
        const nextDay = new Date(serverNow);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        const timeRemaining = nextDay - serverNow;
        if(flag) return res.json(timeRemaining);
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        return res.status(400).json({ 
          message: `You have already played today. Please wait ${hours}:${minutes}:${seconds} before playing again.`,
           timeRemaining: { hours, minutes, seconds }
        });
      }
    }
    // If flag is true, return 0 to indicate loot is available (user hasn't played today)
    if(flag) return res.json(0);
    
    const dlAmt = req.body.data.data;

    const dailyLoot = new DailyLoot();
    dailyLoot.userName = req.user.altas;
    dailyLoot.lootAmt = dlAmt;
    await dailyLoot.save();
    user.lastClickDate = today;
    user.balance = (user.balance*1000 + Number(dlAmt) * 1000)/1000;
    user.lotterybet = 0;
    user.showlottery = dlAmt;
    const data = {
        amount: dlAmt,
        date: new Date(),
        type: "lottery"
    }
    
    // Initialize totalhistory if it doesn't exist
    if (!user.totalhistory) {
        user.totalhistory = [];
    }

    user.totalhistory.push(data);
    await user.save();
    return sendUserResponse(res, `You have earned $${truncateToTwo(dlAmt)} as daily loot!`, user);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing lottery', error: err.message });
  }
};

export const reward = async (req, res) => {
  try {
    const user = await User.findOne(
        { userAuthId: req.user.userAuthId },
        {
            "wallets.eth.privateKey": 0,
            "wallets.bsc.privateKey": 0,
            "wallets.tron.privateKey": 0,
            password: 0,
            country: 0,
            pumpingMode: 0,
            fishingMode: 0,
            rubicMode: 0,
            partnerId: 0,
            partnerActivity: 0,
            lastClickDate: 0,
            
        }
    );
    if(user) {
      
      const rewardAmt = user.refreshBet * 0.02;

      const reward = new Reward({
        username: req.user.altas,
        rwAmt: user.refreshBet * 0.02,
        userId: req.user.userId,
      })
      user.balance = (user.balance*1000 + rewardAmt*1000)/1000;
      user.refreshBet = 0;
      user.showEarn = rewardAmt;
      const data = {
          amount: rewardAmt,
          date: new Date(),
          type: "reward"
      }
      
      // Initialize totalhistory if it doesn't exist
      if (!user.totalhistory) {
          user.totalhistory = [];
      }

      user.totalhistory.push(data);
      await user.save();
      await reward.save();

      return sendUserResponse(res,`You received $${truncateToTwo(rewardAmt)} from reward successfully!`, user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

