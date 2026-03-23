import User from '../models/User.js';
import { sendUserResponse } from "../utils/responses.js";
import { createStream } from '../streams/createStream.js';
import { deleteStream } from '../streams/deleteStream.js';
export const deposit = async (req, res) => {
    try {
        const { dep_addr, dep_amt, dep_net } = req.body;
        
        // const user = await User.findOne({userId: req.user.userId});
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
              "wallets.eth.privateKey": 0,
              "wallets.bsc.privateKey": 0,
              "wallets.tron.privateKey": 0,
            }
        );
        
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const pendingDeposits = user.deposit.filter(dep => dep.depFill === 'pending');
        if(pendingDeposits.length > 0) {
            return res.status(400).json({ message: 'You already have a pending deposit' });
        }
        
        var streamId = "";

        var chainId = dep_net.replace('-USDT', '') == "ETH" && process.env.ETH_TESTNET_CHAIN_ID || dep_net.replace('-USDT', '') == "BSC" && process.env.BSC_TESTNET_CHAIN_ID;
        if(dep_net !== "TRON-USDT") streamId = await createStream(user.userId, dep_addr, chainId);

        const depositRecord = {
            depAddr: dep_addr,
            depAmount: Number(dep_amt),
            depFill: 'pending',
            depNet: dep_net.replace('-USDT', ''),
            depCoin: 'USDT',
            depStreamId: streamId,
            depTxH: ''
        };
        user.deposit.push(depositRecord);

        await user.save();
        
        return sendUserResponse(res, "Deposit created successfully", user);
    } catch (error) {
        console.error('Error creating deposit:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const depositFail = async (req, res) => {
    try {
        // const user = await User.findOne({userId: req.user.userId});
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                
            }
        );
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }   

        const pendingDeposit = user.deposit.find(dep => dep.depFill === 'pending');
        if (pendingDeposit) {
            pendingDeposit.depFill = 'failed';
            if(pendingDeposit.depNet !== "TRON" && pendingDeposit.depStreamId) {
                try {
                    await deleteStream(pendingDeposit.depStreamId);
                } catch (error) {
                    console.error('Stream does not exist.');
                }
            }
            await user.save();
        }
        return sendUserResponse(res, "", user);
    }
    catch (error) {
        console.error('Error updating deposit status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
};
