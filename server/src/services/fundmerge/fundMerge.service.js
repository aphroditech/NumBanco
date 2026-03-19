import FundMerge from "../../models/FundMerge.js";
import RequestBank from "../../models/RequestBank.js"
import User from "../../models/User.js";
import DailyTank from '../../models/DailyTank.js';
import FeeTank from '../../models/FeeTank.js';
import TronWeb from "tronweb";
import { ethers } from "ethers";
import { decrypt } from '../../utils/crypto.js';
import Setting from '../../models/Setting.js';

export const fundMerge = async () => {
    const fundMerges = await FundMerge.find({});
    const setting = await Setting.findOne({});

    for (const fundMerge of fundMerges) {
        console.log("fundMerge active");

        const dailyTank = await DailyTank.findOne({active: 1});
        const feeTank = await FeeTank.findOne({active: 1});

        if (!dailyTank || !feeTank) {
            console.log("Missing dailyTank or feeTank, skipping fund merge");
            continue;
        }

        if (fundMerge.depNet === process.env.ETH_TESTNET_CHAIN_ID) {
            if (fundMerge.depAmt < setting.ethLimit) {
                console.log(fundMerge.depAmt, "ETH amount is less than limit, skipping", setting.ethLimit);
                continue;
            };
            
            const user = await User.findOne({
                "wallets.eth.address": new RegExp(`^${fundMerge.depAddr}$`, "i")
            });

            if (!user) continue;
            const userWalletAddress = user.wallets.eth.address;
            const userWalletPrivateKey = decrypt(user.wallets.eth.privateKey);
            const userWalletAmount = fundMerge.depAmt;
    
            const dailyTankWalletAddress = dailyTank.eth.address;
            const dailyTankWalletPrivateKey = decrypt(dailyTank.eth.privateKey);

            const feeTankWalletAddress = feeTank.eth.address;
            const feeTankWalletPrivateKey = decrypt(feeTank.eth.privateKey);
    
            const eth = await calculateEth(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
            console.log(eth.ethCost);
            // 1️⃣ Fund ETH
            await sendETH(feeTankWalletPrivateKey, userWalletAddress, eth.ethCost);
            console.log("send eth successfully");
    
            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_ETH(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
                console.log("setUsdt", setUsdt);
        
                if (setUsdt) {
                    const historyRecord = {
                        userId: user.userId,
                        amount: fundMerge.depAmt,
                        txhash: setUsdt,
                        toaddress: dailyTankWalletAddress,
                        net: "ETH"
                    };
                    dailyTank.history.push(historyRecord);
                    await dailyTank.save();
                    await fundMerge.deleteOne();
                    console.log("success");
                }
            } catch (error) {
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    console.log(`Insufficient funds for gas. Balance: ${ethers.formatEther(error.info.error.message.match(/balance (\d+)/)?.[1] || 0)} ETH, Required: ${ethers.formatEther(error.info.error.message.match(/tx cost (\d+)/)?.[1] || 0)} ETH`);
                    console.log("Skipping this transaction due to insufficient gas funds");
                    continue;
                } else {
                    console.error("Error sending USDT:", error.message);
                    continue;
                }
            }
        }

        if (fundMerge.depNet === process.env.BSC_TESTNET_CHAIN_ID) {
            if (fundMerge.depAmt < setting.bscLimit) {
                console.log(fundMerge.depAmt, "BSC amount is less than limit, skipping", setting.bscLimit);
                continue;
            };

            const user = await User.findOne({
                "wallets.bsc.address": new RegExp(`^${fundMerge.depAddr}$`, "i")
            });

            if (!user) continue;
            const userWalletAddress = user.wallets.bsc.address;
            const userWalletPrivateKey = decrypt(user.wallets.bsc.privateKey);
            const userWalletAmount = fundMerge.depAmt;
    
            const dailyTankWalletAddress = dailyTank.bsc.address;
            const dailyTankWalletPrivateKey = decrypt(dailyTank.bsc.privateKey);

            const feeTankWalletAddress = feeTank.bsc.address;
            const feeTankWalletPrivateKey = decrypt(feeTank.bsc.privateKey);
            
            const bsc = await calculateBSC(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
            // 1️⃣ Fund BSC
            const bnbResult = await sendBSC(feeTankWalletPrivateKey, userWalletAddress, bsc.bscCost);
            if (bnbResult === false) {
                console.log("Failed to send BNB for gas, skipping USDT transfer");
                continue;
            }
            
            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_BSC(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
                console.log(setUsdt)
                
                if (setUsdt) {
                    const historyRecord = {
                        userId: user.userId,
                        amount: fundMerge.depAmt,
                        txhash: setUsdt,
                        toaddress: dailyTankWalletAddress,
                        net: "BSC"
                    };
                    dailyTank.history.push(historyRecord);
                    // dailyTank.bsc.amount += Number(fundMerge.depAmt);
                    await dailyTank.save();
                    await fundMerge.deleteOne();
                    console.log("success");
                }
            } catch (error) {
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    console.log(`Insufficient funds for gas on BSC. Balance: ${ethers.formatEther(error.info.error.message.match(/balance (\d+)/)?.[1] || 0)} BNB, Required: ${ethers.formatEther(error.info.error.message.match(/tx cost (\d+)/)?.[1] || 0)} BNB`);
                    console.log("Skipping this transaction due to insufficient gas funds");
                    continue;
                } else {
                    console.error("Error sending USDT on BSC:", error.message);
                    continue;
                }
            }
        }

        if (fundMerge.depNet === "TRON") {
            if (fundMerge.depAmt < setting.tronLimit) {
                console.log(fundMerge.depAmt, "TRON amount is less than limit, skipping", setting.tronLimit);
                continue;
            };

            const user = await User.findOne({
                "wallets.tron.address": new RegExp(`^${fundMerge.depAddr}$`, "i")
            });
            if (!user) continue;

            const userWalletAddress = user.wallets.tron.address;
            const userWalletPrivateKey = decrypt(user.wallets.tron.privateKey);
            const userWalletAmount = fundMerge.depAmt;

            const dailyTankWalletAddress = dailyTank.tron.address;
            const dailyTankWalletPrivateKey = decrypt(dailyTank.tron.privateKey);

            const feeTankWalletAddress = feeTank.tron.address;
            const feeTankWalletPrivateKey = decrypt(feeTank.tron.privateKey);

          
            const trx = await calculateTrx(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
            console.log("estimatied trx in fund merge", trx);
            // 1️⃣ Send TRX for gas
            const trxResult = await sendTRX(feeTankWalletPrivateKey, userWalletAddress, trx);
            if (trxResult === false) {
                console.log("Failed to send TRX for gas, skipping USDT transfer");
                continue;
            }
            
            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_TRON(
                    userWalletPrivateKey,
                    dailyTankWalletAddress,
                    userWalletAmount
                );
                console.log(setUsdt);
                
                if (setUsdt) {
                    dailyTank.history.push({
                        userId: user.userId,
                        amount: fundMerge.depAmt,
                        txhash: setUsdt,
                        toaddress: dailyTankWalletAddress,
                        net: "TRON"
                    });
                    // dailyTank.eth.amount += Number(fundMerge.depAmt);

                    // dailyTank.tron.amount += Number(fundMerge.depAmt);
                    await dailyTank.save();
                    await fundMerge.deleteOne();
                    console.log("TRON success");
                }
            } catch (error) {
                console.error("Error sending USDT on TRON:", error.message);
                console.log("Skipping this transaction due to error");
                continue;
            }
        }
    }
    
    const requestBanks = await RequestBank.find({active: 1});

    for (const requestBank of requestBanks) {
        console.log("Request Bank active");
        
        const dailyTank = await DailyTank.findOne({active: 1});
        const feeTank = await FeeTank.findOne({active: 1});
        if (!dailyTank || !feeTank) {
            console.log("Missing dailyTank or feeTank, skipping fund merge");
            continue;
        }

        if (requestBank.chain === process.env.ETH_TESTNET_CHAIN_ID) {
            const dailyTankAddress = requestBank.dailyTankAddress;
            const dailyTankPrivateKey = decrypt(requestBank.dailyTankPrivateKey);
            const dailyTankAmount = requestBank.dailyTankAmount;
            const feeTankPrivateKey = decrypt(feeTank.eth.privateKey);
            
            const bankAddress = requestBank.bankAddress;
            // 1️⃣ Fund ETH
            const eth = await calculateEth(dailyTankPrivateKey, bankAddress, dailyTankAmount);

            await sendETH(feeTankPrivateKey, dailyTankAddress, eth.ethCost);
            console.log("send eth successfully");
    
            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_ETH(dailyTankPrivateKey, bankAddress, dailyTankAmount);
                console.log("setUsdt", setUsdt);
        
                if (setUsdt) {
                    console.log("success");
                    requestBank.active = 0;
                    requestBank.transactionHash = setUsdt;
                    await requestBank.save();
                }
                
                dailyTank.history.push({
                    userId: "admin",
                    amount: - dailyTankAmount,
                    txhash: setUsdt,
                    toaddress: dailyTankAddress,
                    net: "ETH"
                });
                await dailyTank.save();
            } catch (error) {
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    console.log(`Insufficient funds for gas. Balance: ${ethers.formatEther(error.info.error.message.match(/balance (\d+)/)?.[1] || 0)} ETH, Required: ${ethers.formatEther(error.info.error.message.match(/tx cost (\d+)/)?.[1] || 0)} ETH`);
                    console.log("Skipping this transaction due to insufficient gas funds");
                    continue;
                } else {
                    console.error("Error sending USDT:", error.message);
                    continue;
                }
            }
        }

        if (requestBank.chain === process.env.BSC_TESTNET_CHAIN_ID) {
            const dailyTankAddress = requestBank.dailyTankAddress;
            const dailyTankPrivateKey = decrypt(requestBank.dailyTankPrivateKey);
            const dailyTankAmount = requestBank.dailyTankAmount;
            const feeTankPrivateKey = decrypt(feeTank.bsc.privateKey);
            const bankAddress = requestBank.bankAddress;
            // 1️⃣ Fund ETH
            const bsc = await calculateBSC(dailyTankPrivateKey, bankAddress, dailyTankAmount);

            await sendBSC(feeTankPrivateKey, dailyTankAddress, bsc.bscCost);
            console.log("send eth successfully");

            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_BSC(dailyTankPrivateKey, bankAddress, dailyTankAmount);
                console.log("setUsdt", setUsdt);
        
                if (setUsdt) {
                    console.log("success");
                    requestBank.active = 0;
                    requestBank.transactionHash = setUsdt;
                    await requestBank.save();
                    
                    dailyTank.history.push({
                        userId: "admin",
                        amount: - dailyTankAmount,
                        txhash: setUsdt,
                        toaddress: dailyTankAddress,
                        net: "BSC"
                    });
                    await dailyTank.save();
                }
            } catch (error) {
                if (error.code === 'INSUFFICIENT_FUNDS') {
                    console.log(`Insufficient funds for gas on BSC. Balance: ${ethers.formatEther(error.info.error.message.match(/balance (\d+)/)?.[1] || 0)} BNB, Required: ${ethers.formatEther(error.info.error.message.match(/tx cost (\d+)/)?.[1] || 0)} BNB`);
                    console.log("Skipping this transaction due to insufficient gas funds");
                    continue;
                } else {
                    console.error("Error sending USDT on BSC:", error.message);
                    continue;
                }
            }
        }

        if (requestBank.chain === "TRON") {
            const dailyTankAddress = requestBank.dailyTankAddress;
            const dailyTankPrivateKey = decrypt(requestBank.dailyTankPrivateKey);
            const dailyTankAmount = requestBank.dailyTankAmount;
            const feeTankPrivateKey = decrypt(feeTank.tron.privateKey);
            const bankAddress = requestBank.bankAddress;
            
            
            // 1️⃣ Send TRX for gas
            const trx = await calculateTrx(dailyTankPrivateKey, bankAddress, dailyTankAmount);
            console.log("estimatied trx in bank Wallet", trx);
            const trxResult = await sendTRX(feeTankPrivateKey, dailyTankAddress, trx);
            if (trxResult === false) {
                console.log("Failed to send TRX for gas, skipping USDT transfer");
                continue;
            }
            console.log("send tron successfully");
    
            // 2️⃣ Send USDT
            try {
                const setUsdt = await sendUSDT_TRON(dailyTankPrivateKey, bankAddress, dailyTankAmount);
                console.log("setUsdt", setUsdt);
        
                if (setUsdt) {
                    console.log("success");
                    requestBank.active = 0;
                    requestBank.transactionHash = setUsdt;
                    await requestBank.save();
                    
                    dailyTank.history.push({
                        userId: "admin",
                        amount: - dailyTankAmount,
                        txhash: setUsdt,
                        toaddress: dailyTankAddress,
                        net: "TRON"
                    });
                    await dailyTank.save();
                }
            } catch (error) {
                console.error("Error sending USDT on TRON:", error.message);
                console.log("Skipping this transaction due to error");
                continue;
            }
        }
    }
};


async function sendETH(feeTankWalletPrivateKey, userWalletAddress, targetEth = "0.0001") {
    try{
        const setting = await Setting.findOne({});
        // targetEth = targetEth > setting.ethLimitFee ? setting.ethLimitFee : targetEth;
        targetEth = "0.0004";
        console.log("targetEth", targetEth);

        const ethChainId = parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10);
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, ethChainId);
        
        const senderWallet = new ethers.Wallet(
            feeTankWalletPrivateKey,
            provider
        );
        
        const balanceWei = await provider.getBalance(userWalletAddress);
        const balanceEth = ethers.formatEther(balanceWei);
        
        const targetWei = ethers.parseEther(targetEth);
        
        if (balanceWei >= targetWei) {
            console.log(`No ETH needed. Balance = ${balanceEth} ETH`);
            return false;
        }
        
        const amountToSend = targetWei - balanceWei;
        console.log("sendEth", amountToSend);
    
        const tx = await senderWallet.sendTransaction({
            to: userWalletAddress,
            value: amountToSend
        });
        
        console.log(`Sent ${ethers.formatEther(amountToSend)} ETH → TX: ${tx.hash}`);
    
        console.log("Eth tx hash", tx.hash);
        return tx.hash;
    }catch(error){
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log(`Insufficient funds for gas on ETH. Fee tank balance: ${ethers.formatEther(error.info.error.message.match(/have (\d+)/)?.[1] || 0)} ETH, Required: ${ethers.formatEther(error.info.error.message.match(/want (\d+)/)?.[1] || 0)} ETH`);
        } else {
            console.error("Error sending ETH:", error.message);
        }
        return false;
    }
}

async function sendBSC(feeTankWalletPrivateKey, userWalletAddress, targetBNB = "0.00001") {
    try {
        const setting = await Setting.findOne({});
        targetBNB = targetBNB > setting.bscLimitFee ? setting.bscLimitFee : targetBNB;
        console.log("targetBNB", targetBNB);

        const bscChainId = parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10);
        const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC, bscChainId);
        
        const wallet = new ethers.Wallet(
            feeTankWalletPrivateKey,
            provider
        );
        
        const balance = await provider.getBalance(userWalletAddress);
        const target = ethers.parseEther(targetBNB);
        
        if (balance >= target) return true;
        
        console.log("sendBSC", target - balance);
        const tx = await wallet.sendTransaction({
            to: userWalletAddress,
            value: target - balance
        });
        
        console.log(`Sent ${ethers.formatEther(target - balance)} BSC → TX: ${tx.hash}`);
    
        console.log("BNB tx hash", tx.hash);
        return tx.hash;
    } catch (error) {
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log(`Insufficient funds for gas on BSC. Fee tank balance: ${ethers.formatEther(error.info.error.message.match(/have (\d+)/)?.[1] || 0)} BNB, Required: ${ethers.formatEther(error.info.error.message.match(/want (\d+)/)?.[1] || 0)} BNB`);
        } else {
            console.error("Error sending BNB:", error.message);
        }
        return false;
    }
}

async function sendTRX( feeTankWalletPrivateKey, userWalletAddress, targetTRX = 20) {
    try {
        const setting = await Setting.findOne({});
        targetTRX = targetTRX > setting.tronLimitFee ? setting.tronLimitFee : targetTRX;
        console.log("targetTRX", targetTRX);

        const tronweb = new TronWeb({
            fullHost: process.env.TRON_RPC,
            privateKey: feeTankWalletPrivateKey
        });

        const balanceSun = await tronweb.trx.getBalance(userWalletAddress);
        const targetSun = tronweb.toSun(targetTRX);

        if (balanceSun >= targetSun) {
            console.log("Enough TRX");
            return true;
        }

        const amount = targetSun - balanceSun;
        console.log("sendTRX", amount);

        const tx = await tronweb.trx.sendTransaction(
            userWalletAddress,
            amount
        );

        console.log("TRX tx hash", tx.txid);
        return tx.txid;
    } catch (error) {
        console.error("Error sending TRX:", error.message);
        return false;
    }
}

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];

async function sendUSDT_ETH(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    const ethChainId = parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, ethChainId);

    const wallet = new ethers.Wallet(
        userWalletPrivateKey,
        provider
    );

    const usdt = new ethers.Contract(
        process.env.ETH_TESTNET_USDT_CONTRACT,
        ERC20_ABI,
        wallet
    );

    const decimals = await usdt.decimals();
    const amount = ethers.parseUnits(userWalletAmount.toString(), decimals);

    const balance = await usdt.balanceOf(wallet.address);
    console.log(balance, amount);
    if (balance < amount) {
        console.log("FEE ETH USDT");
        return false;
    }

    const tx = await usdt.transfer(
        dailyTankWalletAddress,
        amount
    );

    console.log("USDT ETH tx hash", tx.hash);
    
    return tx.hash;
}

async function sendUSDT_BSC(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    console.log("sendUSDT_BSC")
    const bscChainId = parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10);
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC, bscChainId);

    const wallet = new ethers.Wallet(
        userWalletPrivateKey,
        provider
    );

    const usdt = new ethers.Contract(
        process.env.BSC_TESTNET_USDT_CONTRACT,
        ERC20_ABI,
        wallet
    );

    const decimals = await usdt.decimals();
    const amount = ethers.parseUnits(userWalletAmount.toString(), decimals);

    const balance = await usdt.balanceOf(wallet.address);

    console.log(balance, amount);

    if (balance < amount) {
        console.log("FEE BSC USDT");
        return false;
    }

    const tx = await usdt.transfer(
        dailyTankWalletAddress,
        amount
    );
    console.log("USDT BSC tx hash", tx.hash);
    
    return tx.hash;
}

async function sendUSDT_TRON(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    const rpcUrl = process.env.TRON_RPC;
    const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: userWalletPrivateKey });
    const usdtAddr = process.env.TRON_TESTNET_USDT_CONTRACT;

    try {
        const contractInfo = await tronWeb.trx.getContract(usdtAddr);
        if (!contractInfo) return { success: false, error: `No contract found at ${usdtAddr} for TRON provider` };
    } catch (err) {
        return { success: false, error: `TRON contract check failed: ${err.message || err}` };
    }

    const contract = await tronWeb.contract().at(usdtAddr);
    const amountInSun = (BigInt(Math.round(Number(userWalletAmount) * 1e6))).toString();
    
    console.log(`[sendUSDT] Sending ${userWalletAmount} USDT on TRON to ${dailyTankWalletAddress}`);
    const tx = await contract.transfer(dailyTankWalletAddress, amountInSun).send();
    console.log("USDT TRON tx hash", tx);
    
    return tx;
}

async function calculateTrx(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    console.log("TRON", userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
    const tronWeb = new TronWeb({ fullHost: process.env.TRON_RPC, privateKey: userWalletPrivateKey });

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
        process.env.TRON_TESTNET_USDT_CONTRACT,
        "transfer(address,uint256)",
        {
            estimateEnergy: true,
        },
        [
            { type: "address", value: dailyTankWalletAddress },
            { type: "uint256", value: tronWeb.toSun(userWalletAmount) },
        ],
        tronWeb.defaultAddress.base58
    );

    const energyUsed =
        tx.energy_required ??
        tx.energy_used ??
        tx.energyRequired ??
        0;

    return energyUsed / 1000;
}

async function calculateEth(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    console.log("ETH", userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
    const ethChainId = parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, ethChainId);

    const wallet = new ethers.Wallet(
        userWalletPrivateKey,
        provider
    );

    const usdt = new ethers.Contract(
        process.env.ETH_TESTNET_USDT_CONTRACT,
        ERC20_ABI,
        wallet
    );

    const decimals = await usdt.decimals();
    const amount = ethers.parseUnits(userWalletAmount.toString(), decimals);

      // 1️⃣ Estimate gas
    const gasLimit = await usdt.transfer.estimateGas(dailyTankWalletAddress, amount);

    // 2️⃣ Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice; // wei

    // 3️⃣ Total ETH cost
    const ethCostWei = gasLimit * gasPrice;
    const ethCost = ethers.formatEther(ethCostWei);

    return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        ethCost
    };
}

async function calculateBSC(userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount) {
    console.log("BSC", userWalletPrivateKey, dailyTankWalletAddress, userWalletAmount);
    const bscChainId = parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10);
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC, bscChainId);

    const wallet = new ethers.Wallet(
        userWalletPrivateKey,
        provider
    );

    const usdt = new ethers.Contract(
        process.env.BSC_TESTNET_USDT_CONTRACT,
        ERC20_ABI,
        wallet
    );

    const decimals = await usdt.decimals();
    const amount = ethers.parseUnits(userWalletAmount.toString(), decimals);

      // 1️⃣ Estimate gas
    const gasLimit = await usdt.transfer.estimateGas(dailyTankWalletAddress, amount);

    // 2️⃣ Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice; // wei

    // 3️⃣ Total ETH cost
    const feeWei = gasLimit * gasPrice;
    const bscCost = ethers.formatEther(feeWei);

    return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        bscCost
    };

}