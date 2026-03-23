import User from '../models/User.js';
import WithdrawDailyTank from '../models/WithdrawDailyTank.js';
import Amount from '../models/Amount.js';
import { sendUserResponse } from "../utils/responses.js";
import { sendUSDT } from '../utils/blockchainTransactions.js';
import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import cron from "node-cron"

import { decrypt } from './../utils/crypto.js';


async function getWithdrawDailyTankYesterday() {
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    try {
        // Calculate today's date range using server local time
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today (local)

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // Show all tanks with their when fields for comparison

        
        // Find WithdrawDailyTank where when equals today (convert string to Date)
        const withdrawDailyTank = await WithdrawDailyTank.findOne({
            $expr: {
                $and: [
                    { $gte: [{ $dateFromString: { dateString: { $toString: "$when" } } }, today] },
                    { $lt: [{ $dateFromString: { dateString: { $toString: "$when" } } }, tomorrow] }
                ]
            }
        });
        

        if (!withdrawDailyTank) {
            return({ 
                message: 'No WithdrawDailyTank found for today',
                date: formatLocalDate(today) // YYYY-MM-DD format (local)
            });
        }
        
        return({
            message: 'WithdrawDailyTank data retrieved successfully',
            data: withdrawDailyTank,
            date: formatLocalDate(today) // YYYY-MM-DD format (local)
        });
        
    } catch (error) {
        console.error('Error getting WithdrawDailyTank data:', error);
        return { 
            message: 'Internal server error',
            error: error.message 
        };
    }
};

const USE_TESTNET = process.env.USE_TESTNET === 'true' || process.env.NODE_ENV === 'development';

// USDT Contract Addresses - Mainnet (defaults)
const USDT_CONTRACTS_MAINNET = {
  ETHEREUM: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  BSC: '0x55d398326f99059fF775485246999027B3197955',
  TRON: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
};

// Testnet Contract Addresses
const USDT_CONTRACTS_TESTNET = {
  ETHEREUM: process.env.ETH_TESTNET_USDT_CONTRACT,
  BSC: process.env.BSC_TESTNET_USDT_CONTRACT,
  TRON: process.env.TRON_TESTNET_USDT_CONTRACT
};

const defaultContracts = USE_TESTNET ? USDT_CONTRACTS_TESTNET : USDT_CONTRACTS_MAINNET;
const USDT_CONTRACTS = {
  ETHEREUM: process.env.ETHEREUM_USDT_ADDRESS || defaultContracts.ETHEREUM,
  BSC: process.env.BSC_USDT_ADDRESS || defaultContracts.BSC,
  TRON: process.env.TRON_USDT_ADDRESS || defaultContracts.TRON,
};

const RPC_URLS = {
    ETHEREUM_MAINNET: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com'
    ],
    ETHEREUM_TESTNET: [
        'https://eth-sepolia-public.unifra.io',
        'https://1rpc.io/sepolia',
        'https://sepolia.drpc.org',
        'https://sepolia.gateway.tenderly.co'
    ],
    BSC_MAINNET: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://rpc.ankr.com/bsc'
    ],
    BSC_TESTNET: [
        process.env.BSC_RPC,
        'https://data-seed-prebsc-2-s1.binance.org:8545'
    ],
    TRON_MAINNET: 'https://api.trongrid.io',
    TRON_TESTNET: process.env.TRON_RPC
};

// ERC20 ABI for transfer function
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

// USDT has 6 decimals
const USDT_DECIMALS = 6;

// Convert native token (ETH/BNB) to USDT approx
function nativeToUSDT(nativeAmount, priceUsd) {
    return (Number(nativeAmount) * Number(priceUsd)).toFixed(4);
}

const SUN = 1_000_000;

async function estimateTronFee({
    tronWeb,
    from,
    to,
    amountSun,
    contractAddress
}) {
    let tx;
    try {
        tx = await tronWeb.transactionBuilder.triggerSmartContract(
            contractAddress,
            "transfer(address,uint256)",
            { feeLimit: 100_000_000 },
            [
                { type: "address", value: to },
                { type: "uint256", value: amountSun }
            ],
            tronWeb.address.toHex(from)
        );
    } catch (err) {
        tx = await tronWeb.transactionBuilder.triggerConstantContract(
            contractAddress,
            "transfer(address,uint256)",
            {},
            [
                { type: "address", value: to },
                { type: "uint256", value: amountSun }
            ],
            tronWeb.address.toHex(from)
        );
    }

    let signedTx;
    try {
        signedTx = await tronWeb.trx.sign(tx.transaction);
    } catch (err) {
        signedTx = null;
    }
    const rawHex = signedTx?.raw_data_hex || tx?.transaction?.raw_data_hex || "";
    const rawBytes = Math.ceil(rawHex.length / 2);
    const signatureCount = Array.isArray(signedTx?.signature)
        ? signedTx.signature.length
        : 0;
    const PROTOBUF_EXTRA_SIZE = 3;
    const MAX_RESULT_SIZE = 64;
    const SIGNATURE_SIZE = 67;
    let bandwidthUsed =
        rawBytes +
        PROTOBUF_EXTRA_SIZE +
        MAX_RESULT_SIZE +
        (signatureCount * SIGNATURE_SIZE);
    if (!bandwidthUsed) {
        bandwidthUsed = rawBytes;
    }

    const account = await tronWeb.trx.getAccountResources(from);
    const freeBandwidth = Math.max(
        0,
        (account.freeNetLimit || 0) - (account.freeNetUsed || 0)
    );
    const stakedBandwidth = Math.max(
        0,
        (account.NetLimit || account.netLimit || 0) -
        (account.NetUsed || account.netUsed || 0)
    );
    let totalBandwidth = freeBandwidth + stakedBandwidth;
    try {
        const availableBandwidth = await tronWeb.trx.getBandwidth(from);
        if (Number.isFinite(availableBandwidth)) {
            totalBandwidth = Math.max(0, availableBandwidth);
        }
    } catch (err) {
        // Fallback to resources-based estimate
    }
    const energyAvailable = Math.max(
        0,
        (account.EnergyLimit || account.energyLimit || 0) -
        (account.EnergyUsed || account.energyUsed || 0)
    );

    const contract = await tronWeb.trx.getContract(contractAddress);
    const isEnergySponsored =
        Number(contract.consume_user_resource_percent || 0) === 0;

    const energyRequired = Number(
        tx?.energy_used || tx?.result?.energy_used || 0
    );
    const energyBurned = isEnergySponsored
        ? 0
        : Math.max(0, energyRequired - energyAvailable);
    const bandwidthBurned = Math.max(0, bandwidthUsed - totalBandwidth);

    const params = await tronWeb.trx.getChainParameters();
    const energyPriceSUN = Number(
        params.find(p => p.key === "getEnergyFee")?.value || 0
    );
    const bandwidthPriceSUN = Number(
        params.find(p => p.key === "getTransactionFee")?.value || 0
    );

    const feeSUN =
        energyBurned * energyPriceSUN +
        bandwidthBurned * bandwidthPriceSUN;

    if (process.env.TRON_FEE_DEBUG === 'true') {
        console.log('[TRON_FEE_DEBUG] estimate', {
            bandwidthUsed,
            availableBandwidth: totalBandwidth,
            bandwidthBurned,
            energyRequired,
            energyBurned,
            energyPriceSUN,
            bandwidthPriceSUN,
            isEnergySponsored
        });
    }

    return {
        feeSUN,
        energyRequired,
        energyBurned,
        bandwidthUsed,
        bandwidthBurned,
        freeBandwidth,
        stakedBandwidth,
        totalBandwidth,
        energyPriceSUN,
        bandwidthPriceSUN,
        isEnergySponsored
    };
}

export const withdraw = async (req, res) => {
    try {
        const { wd_addr, wd_amt, wd_net } = req.body;
        if(wd_amt <= 0) {
            return res.status(400).json({message: 'Invalid withdraw amounts'})
        }
        const network = wd_net.replace('-USDT', '').toUpperCase();
        const coin = (network === 'ETHEREUM' ? "ETH" : network === 'BSC' ? "BSC" : network === 'TRON' ? "TRON" : network);
        
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
        const amounts = user.dailyWithdraw + wd_amt;

        
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if(wd_amt > user.balance) {
            return res.status(400).json({ message: "You don't have enough money." });
        }

        if(user.partnerLevel === 1) {
            // if(user.membership === 0 && amounts > 100){
            //     return res.status(400).json({ message: "As a free member, you can only withdraw up to $100. Please upgrade your membership for higher withdrawal limits." });
            // }

            // if(user.membership === 1 && amounts > 10000){
            //     return res.status(400).json({ message: "As a plus member, you can only withdraw up to $10000. Please upgrade your membership for higher withdrawal limits." });
            // }

            if(user.canWithdraw === false){
                return res.status(400).json({ message: "You are not allowed to withdraw. Please contact support team." });
            }
            const total = user.totalBet - user.totalWithdraw;
            if(amounts > total){
                return res.status(400).json({ message: "You are not allowed to withdraw. Please contact support team." });
            }

            // try {
            //     const deposits = user?.deposit || [];
            //     const successfulDeposits = deposits.filter(d => d.depFill === 'success');
            //     const totalDepositAmount = successfulDeposits.reduce((sum, d) => sum + Number(d.depAmount), 0);
                
            //     if (totalDepositAmount < 10) {
            //         return res.status(400).json({ message: 'You have to deposit at least 10$' });
            //     }
            // } catch (err) {
            //     console.warn('Error checking deposit history for withdrawal:', err);
            // }
        }
        
        if(!user.canWithdraw) {
            return res.status(400).json({message: 'You are not allowed to withdraw. Please contact support team.'})
        }


        for(let i = 0; i < user.withdraw.length; i++) {
            if(user.withdraw[i].wdFill === 'pending') {
               return res.status(400).json({message: 'You have a pending request'})
            }
        }

        const amount = await Amount.findOne({});
        
        if(wd_amt >= amount.withdraw) {
            const withdrawRecord = {
                wdAddr: wd_addr,
                wdAmount: Number(wd_amt),
                wdFill: 'pending',
                wdNet: coin,
                wdCoin: 'USDT',
                createAt: new Date(),
                withdrawflag: 2
            };
            user.balance = user.balance - wd_amt;
            user.withdraw.push(withdrawRecord);
            await user.save();
            return sendUserResponse(
                res,
                    `You have to approve by admin. Send the message or ticket to the admin and please wait.`,
                user
            );
        }

        const withdrawRecord = {
            wdAddr: wd_addr,
            wdAmount: Number(wd_amt),
            wdFill: 'pending',
            wdNet: coin,
            wdCoin: 'USDT',
            createAt: new Date(),
            withdrawflag: 1
        };
        user.balance = user.balance - wd_amt;
        user.withdraw.push(withdrawRecord);
        await user.save();

        const address = await getWithdrawDailyTankYesterday();
        const MANAGER_ETH_PRIVATE_KEY = address.data.eth.privateKey;
        const MANAGER_BSC_PRIVATE_KEY = address.data.bsc.privateKey;
        const MANAGER_TRON_PRIVATE_KEY = address.data.tron.privateKey;
        
        const managerKey = (network === 'ETHEREUM')
            ? (decrypt(MANAGER_ETH_PRIVATE_KEY))
                : (network === 'BSC')
                ? (decrypt(MANAGER_BSC_PRIVATE_KEY))
                : (decrypt(MANAGER_TRON_PRIVATE_KEY));

        if (!managerKey) {
            console.warn('[WITHDRAW] Manager private key not configured for network:', network);
            const ably = req.app.locals.ably;
            if (ably) {
                const channel = ably.channels.get('Num2Bet');
                await channel.publish('CONFIRM_FALSE', { transferTo: wd_addr });
            }
            return sendUserResponse(res, "Withdraw created (pending) - manager key not configured", user);
        }

        // Derive and display manager address
        let managerAddress = '';
        try {
            if (network === 'ETHEREUM' || network === 'BSC') {
                const wallet = new ethers.Wallet(managerKey);
                managerAddress = wallet.address;
            } else if (network === 'TRON') {
                managerAddress = TronWeb.address.fromPrivateKey(managerKey);
            }
        } catch (e) {
            console.error(`❌ Error deriving manager address:`, e.message);
        }


        // console.log(`⏱️  Starting transfer...`);
        // console.log('📋 ==========================================\n');

        // console.log(`[WITHDRAW] Attempting to send ${Number(wd_amt)} USDT to ${wd_addr} on ${network}`);
        const sendResult = await sendUSDT(coin, managerKey, wd_addr, Number(wd_amt), user.userId);

        const ably = req.app.locals.ably;
        const channel = ably ? ably.channels.get('WITHDRAW') : null;
        if (sendResult && sendResult.success) {
            console.log("success")
            // Mark withdraw as success and deduct user balance
            const last = user.withdraw.slice(-1)[0];
            if (last) {
                last.wdFill = 'success';
                last.txhash = sendResult.txHash || sendResult.hash || null;
                last.sentAt = new Date();
            }
            
            // if(user.membership  === 0 || user.membership === 1){
                user.balance = Number(user.balance || 0) - Number(sendResult.fee || 0);
            // }
            user.totalWithdraw = Number(user.totalWithdraw || 0) + Number(wd_amt);
            user.dailyWithdraw = (user.dailyWithdraw || 0) + Number(wd_amt);
            await user.save();
            
            // Publish success event to Ably so client can show toastr and re-enable UI
            if (channel) {
                try {
                await channel.publish('WITHDRAW_SUCCESS', {
                    userId: user.userId,
                    transferTo: wd_addr,
                    wdAmount: Number(wd_amt),
                    wdNet: coin,
                    txHash: sendResult.txHash || sendResult.hash,
                    fee: Number(sendResult.fee || 0),
                    balance: Number(user.balance || 0),
                    message: { type: 'success', info: 'Withdraw confirmed!' }
                });
                } catch (e) {
                    console.warn('[WITHDRAW] Ably publish WITHDRAW_SUCCESS failed:', e?.message || e);
                }
            }
            if(sendResult.type === 1) {
                const address = await getWithdrawDailyTankYesterday();
                const history = address.data;
                const withdrawRecord = {
                    userId: user.userId,
                    amount: Number(wd_amt),
                    when: new Date(),
                    fee: Number(sendResult.feeNative),
                    txhash: sendResult.txHash,
                    toaddress: wd_addr,
                    net: coin
                };
                history.history.push(withdrawRecord);
                await history.save();
                const data = {
                    amount: -(wd_amt+Number(sendResult.fee || 0)),
                    date: new Date(),
                    type: "withdraw"
                }

                user.withdraw.txhash = sendResult.txHash;
                
                // Initialize totalhistory if it doesn't exist
                if (!user.totalhistory) {
                    user.totalhistory = [];
                }

                user.totalhistory.push(data);
                await user.save();

            }
            
        } else {
            console.log("failed")
            // Failed to send - mark failed
            const last = user.withdraw.slice(-1)[0];
            user.balance = Number(user.balance || 0) + Number(wd_amt);
            if (last) {
                last.wdFill = 'failed';
                last.error = sendResult?.error || 'send failed';
            }
            await user.save();
            // Publish failure event to Ably
            if (channel) {
                try {
                await channel.publish('WITHDRAW_FAILED', {
                    userId: user.userId,
                    transferTo: wd_addr,
                    wdAmount: Number(wd_amt),
                    wdNet: coin,
                    error: sendResult?.error || 'send failed'
                });
                } catch (e) {
                    console.warn('[WITHDRAW] Ably publish WITHDRAW_FAILED failed:', e?.message || e);
                }
            }
        }

    } catch (error) {
        console.error('Error creating withdraw:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

let cronStarted = false;

export const startWithdrawApprovalCron = (ably) => {
    if (cronStarted) return;
    cronStarted = true;

    cron.schedule("*/1 * * * *", async () => {
        try {
        const users = await User.find({},
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
        let network = 'ETH';
        let wd_addr = '';
        let wd_amt = 0;
        let userId = '';
        for (const user of users) {
            for(const withdraw of user.withdraw) {
                if (withdraw.withdrawflag === 3) {
                    withdraw.withdrawflag = 1;
                    network = withdraw.wdNet;
                    wd_addr = withdraw.wdAddr;
                    wd_amt = withdraw.wdAmount;
                    userId = user.userId;
                    await user.save();
                        const address = await getWithdrawDailyTankYesterday();
                        const MANAGER_ETH_PRIVATE_KEY = address.data.eth.privateKey;
                        const MANAGER_BSC_PRIVATE_KEY = address.data.bsc.privateKey;
                        const MANAGER_TRON_PRIVATE_KEY = address.data.tron.privateKey;
                        const managerKey = (network === 'ETH')
                        ? (decrypt(MANAGER_ETH_PRIVATE_KEY))
                        : (network === 'BSC')
                            ? (decrypt(MANAGER_BSC_PRIVATE_KEY))
                            : (decrypt(MANAGER_TRON_PRIVATE_KEY));
    
                // Derive and display manager address
                let managerAddress = '';
                try {
                    if (network === 'ETH' || network === 'BSC') {
                        const wallet = new ethers.Wallet(managerKey);
                        managerAddress = wallet.address;
                    } else if (network === 'TRON') {
                        managerAddress = TronWeb.address.fromPrivateKey(managerKey);
                    }
                } catch (e) {
                    console.error(`❌ Error deriving manager address:`, e.message);
                }
    
                // console.log(`[WITHDRAW] Attempting to send ${Number(wd_amt)} USDT to ${wd_addr} on ${network}`);
                const sendResult = await sendUSDT(coin, managerKey, wd_addr, Number(wd_amt), userId);
                const channel = ably.channels.get("WITHDRAW");
                if (sendResult && sendResult.success) {
                    // Mark withdraw as success and deduct user balance
                        const last = user.withdraw.slice(-1)[0];
                        if (last) {
                            last.wdFill = 'success';
                            last.txhash = sendResult.txHash || sendResult.hash || null;
                            last.sentAt = new Date();
                        }
                        if(user.membership !== 2) {
                            user.balance = Number(user.balance || 0) - Number(sendResult.fee || 0);
                        }
                        user.totalWithdraw = Number(user.totalWithdraw || 0) + Number(wd_amt);
                        user.dailyWithdraw = (user.dailyWithdraw || 0) + Number(wd_amt);
                        const data = {
                            amount: -(wd_amt+Number(sendResult.fee || 0)),
                            date: new Date(),
                            type: "withdraw"
                        }
                        
                        // Initialize totalhistory if it doesn't exist
                        if (!user.totalhistory) {
                            user.totalhistory = [];
                        }

                        user.totalhistory.push(data);
                        await user.save();
                    
                    // Publish success event to Ably so client can show toastr and re-enable UI
                        if (channel) {
                            try {
                            await channel.publish('WITHDRAW_SUCCESS', {
                                userId: user.userId,
                                transferTo: wd_addr,
                                wdAmount: Number(wd_amt),
                                wdNet: network,
                                txHash: sendResult.txHash || sendResult.hash,
                                fee: Number(sendResult.fee || 0),
                                balance: Number(user.balance || 0),
                                message: { type: 'success', info: 'Withdraw confirmed!' }
                            });
                            } catch (e) {
                                console.warn('[WITHDRAW] Ably publish WITHDRAW_SUCCESS failed:', e?.message || e);
                            }
                        }
    
                        const address = await getWithdrawDailyTankYesterday();
                        const history = address.data;
                        const withdrawRecord = {
                            userId: user.userId,
                            amount: Number(wd_amt),
                            when: new Date(),
                            fee: Number(sendResult.feeNative),
                            txhash: sendResult.txHash,
                            toaddress: wd_addr,
                            net: network
                        };
                        history.history.push(withdrawRecord);
                        await history.save();
                } else {
                    // Failed to send - mark failed
                    const last = user.withdraw.slice(-1)[0];
                    if (last) {
                        last.wdFill = 'failed';
                        last.error = sendResult?.error || 'send failed';
                    }
                    // if(user.membership !== 2) {
                        user.balance = Number(user.balance || 0) - Number(sendResult.fee || 0);
                    // }
                    user.totalWithdraw = Number(user.totalWithdraw || 0) + Number(wd_amt);
                    user.dailyWithdraw = (user.dailyWithdraw || 0) + Number(wd_amt);
                    const data = {
                        amount: -(wd_amt+Number(sendResult.fee || 0)),
                        date: new Date(),
                        type: "withdraw"
                    }
                    
                    // Initialize totalhistory if it doesn't exist
                    if (!user.totalhistory) {
                        user.totalhistory = [];
                    }

                    user.totalhistory.push(data);
                    await user.save();
                    // Publish failure event to Ably
                    const channel = ably.channels.get("Num2Bet");
                    if (channel) {
                        await channel.publish('WITHDRAW_FAILED', {
                            userId: user.userId,
                            transferTo: wd_addr,
                            error: sendResult?.error || 'send failed'
                        });
                    }
                }
            }
            else if(withdraw.withdrawflag === 4) {
                wd_amt = withdraw.wdAmount;
                user.balance = user.balance + Number(wd_amt);
                withdraw.withdrawflag = 0;
                withdraw.wdFill = 'failed'
                await user.save();
                // Publish failure event to Ably
                const channel = ably.channels.get("WITHDRAW");
                if (channel) {
                    await channel.publish('WITHDRAW_FAILED', {
                        userId: user.userId,
                        transferTo: wd_addr,
                        error: "Requst failed. Ask about the admin"
                    });
                } 
            }
        }
    }

        } catch (error) {
            console.error("[CRON] Partner deposit failed:", error);
        }
    });
};

async function getProviderWithFallback(rpcUrls, networkName, chainId) {  
  const urls = Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls];
  for (let i = 0; i < urls.length; i++) {
    try {
        const provider = new ethers.JsonRpcProvider(urls[i], chainId);
        await provider.getNetwork();
        return provider;
    } catch (error) {
      if (i === urls.length - 1) {
        // throw new Error(`All ${networkName} RPC endpoints failed. Last error: ${error.message}`);
        return;
      }
    }
  }
}

let PRICE_CACHE = {
    ethereum: 3127,
    binancecoin: 900,
    tron: 0.31,
    updated: 0
};

// Get live ETH/BNB/TRX prices
async function getLivePrices() {
    const now = Date.now();

    // cache valid for 60 seconds
    // if (now - PRICE_CACHE.updated < 60_000) {
    //     return PRICE_CACHE;
    // }

    try {
        const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,tron&vs_currencies=usd"
        );

        const data = await res.json();

        if (!data.tron || !data.ethereum || !data.binancecoin) {
        // throw new Error("Invalid price payload");
        return;
        }

        PRICE_CACHE = {
            ethereum: data.ethereum.usd,
            binancecoin: data.binancecoin.usd,
            tron: data.tron.usd,
            updated: now
        };

    return PRICE_CACHE;

    } catch (err) {
        console.warn("⚠️ Price API failed, using cached values");
        return PRICE_CACHE;
    }
}

export const price = async (req, res) => {
    const user = await User.findOne(
        { userAuthId: req.user.userAuthId });
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }
    const prices = await getLivePrices();
    const network = req.body.wd_net;
    const amount = req.body.wd_amt;
    const toAddress = req.body.wd_addr;
    const networkUpper = network.replace('-USDT', '').toUpperCase();
    const address = await getWithdrawDailyTankYesterday();
    
    // Check if address data is valid
    if (!address.data || !address.data.eth || !address.data.bsc || !address.data.tron) {
        console.error('Invalid WithdrawDailyTank data:', address);
        return res.status(500).json({ message: 'Withdraw tank configuration not found for today' });
    }
    
    const MANAGER_ETH_PRIVATE_KEY = address.data.eth.privateKey;
    const MANAGER_BSC_PRIVATE_KEY = address.data.bsc.privateKey;
    const MANAGER_TRON_PRIVATE_KEY = address.data.tron.privateKey;
    const fromPrivateKey = (networkUpper === 'ETHEREUM')
    ? (decrypt(MANAGER_ETH_PRIVATE_KEY))
    : (networkUpper === 'BSC')
        ? (decrypt(MANAGER_BSC_PRIVATE_KEY))
        : (decrypt(MANAGER_TRON_PRIVATE_KEY))
    if (networkUpper === 'ETHEREUM' || networkUpper === 'BSC') {
        const rpcUrls = networkUpper === 'ETHEREUM'
        ? (USE_TESTNET ? RPC_URLS.ETHEREUM_TESTNET : RPC_URLS.ETHEREUM_MAINNET)
        : (USE_TESTNET ? RPC_URLS.BSC_TESTNET : RPC_URLS.BSC_MAINNET);
        const chainId = networkUpper === 'ETHEREUM'
            ? (USE_TESTNET ? parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10) : 1)
            : (USE_TESTNET ? parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10) : 56);
        const provider = await getProviderWithFallback(rpcUrls, networkUpper, chainId);

        const usdtAddr = networkUpper === 'ETHEREUM' ? USDT_CONTRACTS.ETHEREUM : USDT_CONTRACTS.BSC;
        const code = await provider.getCode(usdtAddr);
        if (!code || code === '0x') return { success: false, error: `No USDT contract at ${usdtAddr}` };
        const feeData = await provider.getFeeData();
        
        const wallet = new ethers.Wallet(fromPrivateKey, provider);
        const contract = new ethers.Contract(usdtAddr, ERC20_ABI, wallet);
        const amountInWei = ethers.parseUnits(amount.toString(), USDT_DECIMALS);
        
        // Check native balance before estimateGas
        const nativeBalance = await provider.getBalance(wallet.address);
        let maxFee;
        if(networkUpper === 'ETHEREUM') {
            maxFee = feeData.gasPrice + feeData.maxPriorityFeePerGas;
        }

        maxFee = feeData.gasPrice;
        console.log("maxfee",feeData)
        if (!maxFee) {
            return res.status(500).json({ success: false, error: 'Gas price unavailable' });
        }
        
        // Estimate gas limit (use a reasonable default)
        let gasEstimate;
        try {
            gasEstimate = await contract.transfer.estimateGas(toAddress, amountInWei);
        } catch (e) {
            // If estimateGas fails, use a default gas limit for USDT transfers
            gasEstimate = BigInt(100000);
        }
        
        // Calculate required gas cost
        const gasEstimateBI = (typeof gasEstimate === 'bigint') ? gasEstimate : BigInt(gasEstimate);
        const maxFeeBI = (typeof maxFee === 'bigint') ? maxFee : BigInt(maxFee);
        const requiredGasWei = gasEstimateBI * maxFeeBI;
        
        // Check if wallet has enough native balance for gas
        if (nativeBalance < requiredGasWei) {
            const nativeBalanceEth = ethers.formatEther(nativeBalance);
            const requiredGasEth = ethers.formatEther(requiredGasWei);
            const nativePriceUsd = networkUpper === 'ETHEREUM' ? prices.ethereum : prices.binancecoin;
            const requiredGasUsdt = nativeToUSDT(requiredGasEth, nativePriceUsd);
            return res.status(500).json({ 
                success: false, 
                error: `Gas fee is not enough. Please contact the support team.` 
            });
        }
        
        // Now safely estimate gas again for accurate calculation
        try {
            gasEstimate = await contract.transfer.estimateGas(toAddress, amountInWei);
        } catch (e) {
            // Keep the default estimate if it still fails
            gasEstimate = BigInt(100000);
        }
        console.log(maxFeeBI);
        const feeWei = gasEstimateBI * maxFeeBI;
        const feeNative = ethers.formatEther(feeWei);
        const nativePriceUsd = networkUpper === 'ETHEREUM' ? prices.ethereum : prices.binancecoin;
        const fee = nativeToUSDT(feeNative, nativePriceUsd);
        console.log("fee", feeNative, nativePriceUsd);
        const feedata = {
            fee: fee,
            feedata: feeNative
        }

        // Convert the gas fee from native (ETH/BNB) to USDT
        return res.json({ data: feedata });
    }

    if (networkUpper === 'TRON') {
        const rpcUrl = USE_TESTNET ? RPC_URLS.TRON_TESTNET : RPC_URLS.TRON_MAINNET;
        const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: fromPrivateKey });
        const sender = tronWeb.defaultAddress.base58;
        const usdtAddr = USDT_CONTRACTS.TRON;
        const contract = await tronWeb.contract().at(usdtAddr);
        if (!tronWeb.isAddress(toAddress)) {
            return res.status(500).json({ success: false, error: `Invalid TRON address: ${toAddress}` });
        }
        
        // Check TRX balance before estimating
        const trxBalanceSun = await tronWeb.trx.getBalance(sender);
        
        // Check USDT balance before proceeding
        const usdtBalanceSun = await contract.balanceOf(sender).call();
        const usdtBalance = Number(usdtBalanceSun) / 1e6;
        // const data = await tronLinkExactFee({
        //     tronWeb,
        //     from: sender,
        //     to: toAddress,
        //     amount: amount * 1e6, // USDT
        //     contractAddress: usdtAddr
        //     });

        //     console.log("fee",data);
        
        if (usdtBalance < Number(amount)) {
            return res.status(500).json({ 
                success: false, 
                error: `Insufficient USDT balance. Please contact the support team.` 
            });
        }
        
        const amountInSun = (BigInt(Math.round(Number(amount) * 1e6))).toString();

        let feeEstimate;
        try {
            feeEstimate = await estimateTronFee({
                tronWeb,
                from: sender,
                to: toAddress,
                amountSun: amountInSun,
                contractAddress: usdtAddr
            });
        } catch (error) {
            console.error('TRON fee estimation failed:', error.message);
            return res.status(500).json({ 
                success: false, 
                error: `Gas fee is not enough. Please contact the support team.` 
            });
        }

        console.log("feeEstimate", feeEstimate)

        const trxFee = feeEstimate.bandwidthUsed / feeEstimate.bandwidthPriceSUN;
        
        // Check if wallet has enough TRX for energy fee
        if (trxBalanceSun < feeEstimate.feeSUN) {
            const trxBalanceTRX = trxBalanceSun / SUN;
            const requiredTRX = trxFee;
            const requiredTRXUsdt = requiredTRX * prices.tron;
            return res.status(500).json({ 
                success: false, 
                error: `Insufficient TRX for energy. Required: ${requiredTRX} TRX (~$${requiredTRXUsdt}), Available: ${trxBalanceTRX} TRX. Please contact the support team` 
            });
        }

        const fee = trxFee * prices.tron;

        const feedata = {
            fee: fee,
            feedata: trxFee
        }
        // Send transaction

        return res.json({ data: feedata });
    }

    return { success: false, error: `Unsupported network: ${network}` };
};

let withdrawWalletCronStarted = false;

export const getWithdrawWallet = async() => {
    if (withdrawWalletCronStarted) return;
    withdrawWalletCronStarted = true;
    
    cron.schedule("*/30 * * * * *", async () => {
        // Get ALL WithdrawDailyTank records from database
        const tanks = await getWithdrawDailyTankYesterday()
        const allTanks = tanks.data;
        // const allTanks = await WithdrawDailyTank.find().sort({ createAt: -1 })

        const networkUpper = ["ETHEREUM", "BSC", "TRON"];
        for(let i = 0; i < networkUpper.length; i++) {

            const tank = allTanks;
            const MANAGER_ETH_PRIVATE_KEY = tank.eth.privateKey;
            const MANAGER_BSC_PRIVATE_KEY = tank.bsc.privateKey;
            const MANAGER_TRON_PRIVATE_KEY = tank.tron.privateKey;
            const fromPrivateKey = (networkUpper[i] === 'ETHEREUM')
                ? (decrypt(MANAGER_ETH_PRIVATE_KEY))
                : (networkUpper[i] === 'BSC')
                    ? (decrypt(MANAGER_BSC_PRIVATE_KEY))
                    : (decrypt(MANAGER_TRON_PRIVATE_KEY))
                    
            if(networkUpper[i] === "ETHEREUM" || networkUpper[i] === "BSC") {
                try {
                    const rpcUrls = networkUpper[i] === 'ETHEREUM'
                        ? (USE_TESTNET ? RPC_URLS.ETHEREUM_TESTNET : RPC_URLS.ETHEREUM_MAINNET)
                        : (USE_TESTNET ? RPC_URLS.BSC_TESTNET : RPC_URLS.BSC_MAINNET);
                    const chainId = networkUpper[i] === 'ETHEREUM'
                        ? (USE_TESTNET ? parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10) : 1)
                        : (USE_TESTNET ? parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10) : 56);

                    const provider = await getProviderWithFallback(rpcUrls, networkUpper[i], chainId);
                    
                    const wallet = new ethers.Wallet(fromPrivateKey, provider);
                    const usdtAddr = networkUpper[i] === 'ETHEREUM' ? USDT_CONTRACTS.ETHEREUM : USDT_CONTRACTS.BSC;
                    const contract = new ethers.Contract(usdtAddr, ERC20_ABI, wallet);
                    const usdtBalance = await contract.balanceOf(wallet.address);
                    const ethBalance = await provider.getBalance(wallet.address);
                    const usdt = Number(usdtBalance) / 1e6;
                    const coin = Number(ethBalance) / 1e18;
                    
                    // Update this tank's balances
                    if(networkUpper[i] === "ETHEREUM") {
                        tank.eth.amount = usdt;
                        tank.eth.coin = coin;
                    } else if(networkUpper[i] === "BSC") {
                        tank.bsc.amount = usdt;
                        tank.bsc.coin = coin;
                    }
                    await tank.save();
                } catch (error) {
                    console.error(`Error updating ${networkUpper[i]} balances for tank ${j}:`, error);
                }
            }
            
            else if(networkUpper[i] === "TRON") {
                try {
                    const rpcUrl = USE_TESTNET ? RPC_URLS.TRON_TESTNET : RPC_URLS.TRON_MAINNET;
                    const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: fromPrivateKey });
                    const sender = tronWeb.defaultAddress.base58;
                    const usdtAddr = USDT_CONTRACTS.TRON;
                    const contract = await tronWeb.contract().at(usdtAddr);
            
                    const trxBalanceSun = await tronWeb.trx.getBalance(sender);
                    const trxBalance = trxBalanceSun / 1e6;
            
                    const usdtBalanceSun = await contract.balanceOf(sender).call();
                    const usdtBalance = Number(usdtBalanceSun) / 1e6;

                    // Update this tank's TRON balances
                    tank.tron.amount = usdtBalance;
                    tank.tron.coin = trxBalance;
                    await tank.save();
                } catch (error) {
                    console.error(`Error updating TRON balances for tank ${j}:`, error);
                }
                }
            
        }
    });
};

