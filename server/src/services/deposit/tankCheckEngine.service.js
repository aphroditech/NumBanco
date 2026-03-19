import cron from "node-cron";
import DailyTank from "../../models/DailyTank.js";
import FeeTank from "../../models/FeeTank.js";
import Setting from "../../models/Setting.js";
import { decrypt } from "../../utils/crypto.js";
import { ethers } from "ethers";
import TronWeb from "tronweb";

import { generateETHWallet, generateTRONWallet, generateBSCWallet } from "../../utils/walletGenerator.js";

export const tankCheckEngine = async () => {
    
    // Daily Tank Cron Job
    let isRunningDailyTank = false;
    let lastRunDailyTank = 0;
    cron.schedule("* * * * * *", async () => {
        const dailyTank = await DailyTank.findOne({active: 1});

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const checkTank = await DailyTank.findOne({
            createAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if(!checkTank) {
            const newDailyTank = new DailyTank({
                eth: generateETHWallet(),
                bsc: generateBSCWallet(),
                tron: generateTRONWallet(),
                active: 0
            });
            await newDailyTank.save();
        };
        
        if(!dailyTank) return;
        const setting = await Setting.find({});
        const X = setting[0]?.dailyTank || 60;
        const now = Math.floor(Date.now() / 1000);

        if (isRunningDailyTank) return;
        if (now - lastRunDailyTank < X) return;

        isRunningDailyTank = true;
        lastRunDailyTank = now;

        try {
            const ethPrivateKey = decrypt(dailyTank.eth.privateKey);
            
            // ETH Balance Check - pass network to skip auto-detection (stops "retry in 1s" spam when RPC unreachable)
            const ethChainId = parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10);
            const ethProvider = new ethers.JsonRpcProvider(process.env.RPC_URL, ethChainId);
            const ethWallet = new ethers.Wallet(ethPrivateKey, ethProvider);
            const ethAddress = ethWallet.address;
            const eth = await ethProvider.getBalance(ethAddress);

            const usdt = new ethers.Contract(
                process.env.ETH_TESTNET_USDT_CONTRACT, // Sepolia USDT
                [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
                ],
                ethProvider
            );

            let usdtRaw, usdtDecimals;
            try {
                usdtRaw = await usdt.balanceOf(ethAddress);
                usdtDecimals = await usdt.decimals();
            } catch (err) {
                usdtRaw = BigInt(0);
                usdtDecimals = 6;
            }

            // BSC Balance Check - pass network to skip auto-detection (stops "retry in 1s" spam when RPC unreachable)
            const bscPrivateKey = decrypt(dailyTank.bsc.privateKey);
            const bscChainId = parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10);
            const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC, bscChainId);
            const bscWallet = new ethers.Wallet(bscPrivateKey, bscProvider);
            const bscAddress = bscWallet.address;
            const bnb = await bscProvider.getBalance(bscAddress);

            const busd = new ethers.Contract(
                process.env.BSC_TESTNET_USDT_CONTRACT, // BSC Testnet BUSD
                [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
                ],
                bscProvider
            );

            let busdRaw, busdDecimals;
            try {
                busdRaw = await busd.balanceOf(bscAddress);
                busdDecimals = await busd.decimals();
            } catch (err) {
                console.warn("BUSD balance check failed:", err.message);
                busdRaw = BigInt(0);
                busdDecimals = 18;
            }

            // TRON Balance Check
            const tronPrivateKey = decrypt(dailyTank.tron.privateKey);
            const tronWeb = new TronWeb({
                fullHost: process.env.TRON_RPC, // TRON Testnet
                privateKey: tronPrivateKey
            });
            const tronAddress = tronWeb.defaultAddress.base58;
            const trxBalance = await tronWeb.trx.getBalance(tronAddress);
            
            let usdtTrxBalance = 0;
            try {
                const contract = await tronWeb.contract().at(process.env.TRON_TESTNET_USDT_CONTRACT);
                usdtTrxBalance = await contract.methods.balanceOf(tronAddress).call();
            } catch (err) {
                console.warn("TRON USDT balance check failed:", err.message);
                usdtTrxBalance = 0;
            }

            // console.log({
            //     eth: {
            //         address: ethAddress,
            //         balance: ethers.formatEther(eth),
            //         usdt: ethers.formatUnits(usdtRaw, usdtDecimals)
            //     },
            //     bsc: {
            //         address: bscAddress,
            //         balance: ethers.formatEther(bnb),
            //         busd: ethers.formatUnits(busdRaw, busdDecimals)
            //     },
            //     tron: {
            //         address: tronAddress,
            //         trx: trxBalance / 1000000, // TRX has 6 decimals
            //         usdt: usdtTrxBalance / 1000000 // USDT-TRON has 6 decimals
            //     }
            // });

            // Update DailyTank with all balances
            dailyTank.eth.fee = ethers.formatEther(eth);
            dailyTank.eth.amount = ethers.formatUnits(usdtRaw, usdtDecimals);
            dailyTank.bsc.fee = ethers.formatEther(bnb);
            dailyTank.bsc.amount = ethers.formatUnits(busdRaw, busdDecimals);
            dailyTank.tron.fee = trxBalance / 1000000;
            dailyTank.tron.amount = usdtTrxBalance / 1000000;
            await dailyTank.save();

        } catch (err) {
            // console.error("Daily Tank error:", err);
        } finally {
            isRunningDailyTank = false;
        }
    });

    // Fee Tank Cron Job
    let isRunningFeeTank = false;
    let lastRunFeeTank = 0;
    cron.schedule("* * * * * *", async () => {
        const feeTank = await FeeTank.findOne({active: 1});

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const checkTank = await FeeTank.findOne({
            createAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if(!checkTank) {
            const newFeeTank = new FeeTank({
                eth: generateETHWallet(),
                bsc: generateBSCWallet(),
                tron: generateTRONWallet(),
                active: 0
            });
            await newFeeTank.save();
        };

        if(!feeTank) return;

        const setting = await Setting.find({});
        const X = setting[0]?.feeTank || 60;
        const now = Math.floor(Date.now() / 1000);
        
        if (isRunningFeeTank) return;
        if (now - lastRunFeeTank < X) return;
        
        isRunningFeeTank = true;
        lastRunFeeTank = now;

        try {
            // ETH Balance Check - pass network to skip auto-detection (stops "retry in 1s" spam when RPC unreachable)
            const ethPrivateKey = decrypt(feeTank.eth.privateKey);
            const ethChainId = parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10);
            const ethProvider = new ethers.JsonRpcProvider(process.env.RPC_URL, ethChainId);
            const ethWallet = new ethers.Wallet(ethPrivateKey, ethProvider);
            const ethAddress = ethWallet.address;
            const eth = await ethProvider.getBalance(ethAddress);

            const usdt = new ethers.Contract(
                process.env.ETH_TESTNET_USDT_CONTRACT, // Sepolia USDT
                [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
                ],
                ethProvider
            );

            let usdtRaw, usdtDecimals;
            try {
                usdtRaw = await usdt.balanceOf(ethAddress);
                usdtDecimals = await usdt.decimals();
            } catch (err) {
                console.warn("Fee Tank USDT balance check failed:", err.message);
                usdtRaw = BigInt(0);
                usdtDecimals = 6;
            }

            // BSC Balance Check - pass network to skip auto-detection (stops "retry in 1s" spam when RPC unreachable)
            const bscPrivateKey = decrypt(feeTank.bsc.privateKey);
            const bscChainId = parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10);
            const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC, bscChainId);
            const bscWallet = new ethers.Wallet(bscPrivateKey, bscProvider);
            const bscAddress = bscWallet.address;
            const bnb = await bscProvider.getBalance(bscAddress);

            const busd = new ethers.Contract(
                process.env.BSC_TESTNET_USDT_CONTRACT, // BSC Testnet BUSD
                [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
                ],
                bscProvider
            );

            let busdRaw, busdDecimals;
            try {
                busdRaw = await busd.balanceOf(bscAddress);
                busdDecimals = await busd.decimals();
            } catch (err) {
                console.warn("Fee Tank BUSD balance check failed:", err.message);
                busdRaw = BigInt(0);
                busdDecimals = 18;
            }

            // TRON Balance Check
            const tronPrivateKey = decrypt(feeTank.tron.privateKey);
            const tronWeb = new TronWeb({
                fullHost: process.env.TRON_RPC, // TRON Testnet
                privateKey: tronPrivateKey
            });
            const tronAddress = tronWeb.defaultAddress.base58;
            const trxBalance = await tronWeb.trx.getBalance(tronAddress);
            
            let usdtTrxBalance = 0;
            try {
                const contract = await tronWeb.contract().at(process.env.TRON_TESTNET_USDT_CONTRACT);
                usdtTrxBalance = await contract.methods.balanceOf(tronAddress).call();
            } catch (err) {
                console.warn("Fee Tank TRON USDT balance check failed:", err.message);
                usdtTrxBalance = 0;
            }

            // console.log({
            //     feeTank: {
            //         eth: {
            //             address: ethAddress,
            //             balance: ethers.formatEther(eth),
            //             usdt: ethers.formatUnits(usdtRaw, usdtDecimals)
            //         },
            //         bsc: {
            //             address: bscAddress,
            //             balance: ethers.formatEther(bnb),
            //             busd: ethers.formatUnits(busdRaw, busdDecimals)
            //         },
            //         tron: {
            //             address: tronAddress,
            //             trx: trxBalance / 1000000,
            //             usdt: usdtTrxBalance / 1000000
            //         }
            //     }
            // });

            // Update FeeTank with all balances
            feeTank.eth.fee = ethers.formatEther(eth);
            feeTank.eth.amount = ethers.formatUnits(usdtRaw, usdtDecimals);
            feeTank.bsc.fee = ethers.formatEther(bnb);
            feeTank.bsc.amount = ethers.formatUnits(busdRaw, busdDecimals);
            feeTank.tron.fee = trxBalance / 1000000;
            feeTank.tron.amount = usdtTrxBalance / 1000000;
            await feeTank.save();

        } catch (err) {
            // console.error("Fee Tank error:", err);
        } finally {
            isRunningFeeTank = false;
        }
    });
};
