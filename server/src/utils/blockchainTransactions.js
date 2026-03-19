import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import "dotenv/config";
import mongoose from "mongoose";
import cron from "node-cron";
import User from "../models/User.js";
import { type } from 'os';
import WithdrawDailyTank from '../models/WithdrawDailyTank.js';

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
        
        // Find WithdrawDailyTank where when equals today (convert string to Date)
        let withdrawDailyTank = await WithdrawDailyTank.findOne({
            $expr: {
                $and: [
                    { $gte: [{ $dateFromString: { dateString: { $toString: "$when" } } }, today] },
                    { $lt: [{ $dateFromString: { dateString: { $toString: "$when" } } }, tomorrow] }
                ]
            }
        });
        
        // If no tank found for today, check for active tank as fallback
        if (!withdrawDailyTank) {
            console.log('No tank found for today, checking for active tank as fallback');
            withdrawDailyTank = await WithdrawDailyTank.findOne({ active: 1 });
        }
        
        // Debug: Try to find the specific tank and check if it matches our criteria
        
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



async function waitForTronReceipt(tronWeb, txid, timeout = 60) {
    for (let i = 0; i < timeout; i++) {
        const info = await tronWeb.trx.getTransactionInfo(txid);
        if (info && info.receipt && info.receipt.energy_usage_total !== undefined) {
        return info;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    // throw new Error("Transaction receipt not available after timeout");
    return;
}

// Helper: Try multiple RPCs - pass chainId to skip ethers network detection (stops "retry in 1s" spam)
async function getProviderWithFallback(rpcUrls, networkName, chainId) {
    const urls = Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls];
    for (let i = 0; i < urls.length; i++) {
        try {
        const provider = new ethers.JsonRpcProvider(urls[i], chainId);
        await provider.getNetwork();
        console.log(`✅ Connected to ${networkName} via: ${urls[i]}`);
        return provider;
        } catch (error) {
        console.warn(`⚠️ Failed to connect to ${urls[i]}: ${error.message}`);
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

async function getLivePrices() {
    const now = Date.now();

    // cache valid for 60 seconds
    if (now - PRICE_CACHE.updated < 60_000) {
        return PRICE_CACHE;
    }

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


export async function sendUSDT(network, fromPrivateKey, toAddress, amount, userId) {
    console.log(network, fromPrivateKey, toAddress, amount, userId)
    const networkUpper = network.toUpperCase();
    const prices = await getLivePrices();

    try {
        console.log(`[sendUSDT] Checking withdraw flag for user ${userId}...`);
        if (networkUpper === 'ETH' || networkUpper === 'BSC') {
            const rpcUrls = networkUpper === 'ETH'
                ? (USE_TESTNET ? RPC_URLS.ETHEREUM_TESTNET : RPC_URLS.ETHEREUM_MAINNET)
                : (USE_TESTNET ? RPC_URLS.BSC_TESTNET : RPC_URLS.BSC_MAINNET);
            const chainId = networkUpper === 'ETH'
                ? (USE_TESTNET ? parseInt(process.env.ETH_TESTNET_CHAIN_ID || "11155111", 10) : 1)
                : (USE_TESTNET ? parseInt(process.env.BSC_TESTNET_CHAIN_ID || "97", 10) : 56);
            if (!ethers.isAddress(toAddress)) {
                return { success: false, error: `Invalid ${networkUpper} address format` };
            }

            if (toAddress === ethers.ZeroAddress) {
                return { success: false, error: "Cannot send to zero address" };
            }
            const provider = await getProviderWithFallback(rpcUrls, networkUpper, chainId);
            const usdtAddr = networkUpper === 'ETH' ? USDT_CONTRACTS.ETHEREUM : USDT_CONTRACTS.BSC;
            const code = await provider.getCode(usdtAddr);
            if (!code || code === '0x') return { success: false, error: `No USDT contract at ${usdtAddr}` };
            const feeData = await provider.getFeeData();

            const wallet = new ethers.Wallet(fromPrivateKey, provider);
            const contract = new ethers.Contract(usdtAddr, ERC20_ABI, wallet);
            const amountInWei = ethers.parseUnits(amount.toString(), USDT_DECIMALS);
            const usdtBalance = await contract.balanceOf(wallet.address);
            
            
            
            const legacyGasPrice = feeData.gasPrice;
            const maxFeePerGas = feeData.maxFeePerGas;
            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
            const feePerGas = networkUpper === 'BSC' ? legacyGasPrice : maxFeePerGas;
            if (!feePerGas) {
                return { success: false, error: 'Gas price unavailable' };
            }
            
            let gasEstimate;
            try {
                gasEstimate = await contract.transfer.estimateGas(toAddress, amountInWei);
                console.log(`[sendUSDT] Gas estimate success:`, gasEstimate.toString());
            } catch (e) {
                console.error(`[sendUSDT] Gas estimate failed:`, e.message);
                // Use fallback gas limit for USDT transfers
                gasEstimate = BigInt(100000); // Standard gas limit for ERC20 transfers
                console.log(`[sendUSDT] Using fallback gas limit:`, gasEstimate.toString());
            }
            const gasEstimateBI = (typeof gasEstimate === 'bigint') ? gasEstimate : BigInt(gasEstimate);
            const feePerGasBI = (typeof feePerGas === 'bigint') ? feePerGas : BigInt(feePerGas);
            const feeWei = gasEstimateBI * feePerGasBI;
            const feeNative = ethers.formatEther(feeWei);
            const nativePriceUsd = networkUpper === 'ETH' ? prices.ethereum : prices.binancecoin;
            const fee = nativeToUSDT(feeNative, nativePriceUsd);
            if (usdtBalance < amountInWei) {
                const formatted = ethers.formatUnits(usdtBalance, USDT_DECIMALS);
                return { success: false, error: `Insufficient USDT. Please contact the support team.` };
            }
            console.log(`Estimated Gas Limit: ${gasEstimate.toString()}`);
            
            // Convert the gas fee from native (ETH/BNB) to USDT
            console.log("GasLimit:", gasEstimate.toString());
            console.log("Fee ETH:", feeNative);
            console.log("Fee USDT:", fee);

            console.log(`[sendUSDT] Sending ${amount} USDT on ${networkUpper} to ${toAddress}`);
            console.log(`Estimated Gas: ${gasEstimate}, Fee: ${feeNative} ${networkUpper === 'ETH' ? 'ETH' : 'BNB'} ≈ ${fee} USDT`);

            const ethBalance = await provider.getBalance(wallet.address);
            if (ethBalance < feeWei) {  // use < instead of .lt()
                return { success: false, error: "Insufficient ETH for gas" };
            }
            
            let tx;

            if(networkUpper === "BSC") {
                tx = await contract.transfer(toAddress, amountInWei, {
                    gasLimit: gasEstimate,
                    gasPrice: legacyGasPrice
                });
            } else {
                tx = await contract.transfer(toAddress, amountInWei, {
                gasLimit: gasEstimate,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas});
            }
            const receipt = await tx.wait();
            const sentTx = await provider.getTransaction(receipt.hash);
            // 1️⃣ Exact gas used
            const gasUsed = receipt.gasUsed;
            
            // 2️⃣ Real gas price paid
            let gasPrice;
            if (sentTx.type === 2) {
            if(USE_TESTNET) {
                gasPrice = receipt.gasPrice;
                console.log("gasprice", gasPrice);
            }
            else {
                gasPrice = receipt.effectiveGasPrice;
            }
            } else {
                // Legacy (BSC + old ETH)
                gasPrice = sentTx.gasPrice;
            }
            console.log(2);
            console.log(gasPrice)
            // 3️⃣ Exact native fee
            if (gasPrice == null) {
                return { success: false, error: 'Gas price unavailable after tx' };
            }
            console.log(3)
            const gasUsedBI2 = (typeof gasUsed === 'bigint') ? gasUsed : BigInt(gasUsed);
            console.log("4",gasUsedBI2);
            const gasPriceBI2 = (typeof gasPrice === 'bigint') ? gasPrice : BigInt(gasPrice);
            console.log("5", gasPriceBI2);
            const afterfeeWei = gasUsedBI2 * gasPriceBI2;
            const afterfeeNative = ethers.formatEther(afterfeeWei);
            console.log("6", afterfeeNative)
            // 4️⃣ Convert to USDT
            const nativeUsd =
                networkUpper === 'ETH'
                ? prices.ethereum
                : prices.binancecoin;
            console.log("nativeUsd", nativeUsd)

            const feeUSDT = Number(afterfeeNative * nativeUsd);
            const ethBalance1 = await provider.getBalance(wallet.address);
            const remain = Number(ethBalance1) / 1e18;


            console.log("nativeusdt============>", nativeUsd)
            console.log("afterGas Used:", gasUsed.toString());
            console.log("afterGas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
            console.log("afterFee Native:", afterfeeNative);
            console.log("afterFee USDT:", feeUSDT);
            return { success: true, txHash: receipt.transactionHash || receipt.hash, blockNumber: receipt.blockNumber, feeNative: afterfeeNative, fee: feeUSDT, type: 1 };
        }


        if (networkUpper === 'TRON') {
            const rpcUrl = USE_TESTNET ? RPC_URLS.TRON_TESTNET : RPC_URLS.TRON_MAINNET;
            const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: fromPrivateKey });
            const sender = tronWeb.defaultAddress.base58;
            const usdtAddr = USDT_CONTRACTS.TRON;
            const contract = await tronWeb.contract().at(usdtAddr);

            if (!tronWeb.isAddress(toAddress)) {
                return { success: false, error: `Invalid TRON address: ${toAddress}` };
            }

            // Check balances
            const trxBalanceSun = await tronWeb.trx.getBalance(sender);
            const trxBalance = trxBalanceSun / 1e6;
            const usdtBalanceSun = await contract.balanceOf(sender).call();
            const usdtBalance = Number(usdtBalanceSun) / 1e6;

            if (usdtBalance < Number(amount)) {
                return { success: false, error: `Insufficient USDT. Please contact support.` };
            }

            const amountInSun = (BigInt(Math.round(Number(amount) * 1e6))).toString();

            // Recompute resources right before signing/broadcasting
            let feeEstimate;
            try {
                feeEstimate = await estimateTronFee({
                    tronWeb,
                    from: sender,
                    to: toAddress,
                    amountSun: amountInSun,
                    contractAddress: usdtAddr
                });
            } catch (err) {
                return { success: false, error: `TRON fee estimation failed: ${err.message || err}` };
            }
            console.log("feeEstimate", feeEstimate)
            if (trxBalanceSun < feeEstimate.feeSUN) {
                const requiredTRX = feeEstimate.feeSUN / SUN;
                return { success: false, error: `Insufficient TRX for energy. Please contact support.` };
            }

            // --- BROADCAST TRANSACTION IMMEDIATELY ---
            let tx;
            try {
                tx = await contract.transfer(toAddress, amountInSun).send({
                    feeLimit: 100_000_000 // max energy/bandwidth
                });
                console.log(`[sendUSDT] TRON tx broadcasted: ${tx}`);
            } catch (err) {
                return { success: false, error: `TRON transfer failed: ${err.message || err}` };
            }

            // --- RETURN IMMEDIATELY FOR UI TOASTR ---
            const result = {
                success: true,
                txHash: tx,
                feeNative: 0,
                fee: 0,
                type: 0
            };

            // --- ASYNCHRONOUS CONFIRMATION & FEE CALCULATION ---
            (async () => {
                try {
                    const info = await waitForTronReceipt(tronWeb, tx);

                    const afterEnergyUsed = info.receipt.energy_usage_total || 0;
                    const afterEnergyFeeTRX = (info.receipt.energy_fee || 0) / 1e6;
                    const netFeeTRX = (info.receipt.net_fee || 0) / 1e6;
                    const totalTrxFee = afterEnergyFeeTRX + netFeeTRX;
                    const usdtFee = totalTrxFee * prices.tron;

                    const address = await getWithdrawDailyTankYesterday();
                    const history = address.data;
                    const withdrawRecord = {
                        userId: userId,
                        amount: Number(amount),
                        when: new Date(),
                        fee: Number(totalTrxFee),
                        txhash: tx,
                        toaddress: toAddress,
                        net: network
                    };

                    history.history.push(withdrawRecord);
                    await history.save();

                    console.log("[TRON CONFIRMED]", {
                        tx,
                        energyUsed: afterEnergyUsed,
                        energyFeeTRX: afterEnergyFeeTRX,
                        netFeeTRX,
                        totalTrxFee,
                        usdtFee
                    });

                    // Optional: store in DB
                    if (userId) {
                        const user = await User.findOne({userId: userId});
                        let data = {};
                        // if(user.membership !== 2) {
                            user.balance = user.balance - usdtFee;
                            data = {
                                amount: -(amount+usdtFee),
                                date: new Date(),
                                type: "withdraw"
                            }
                        // }

                        // data = {
                        //     amount: -(amount),
                        //     date: new Date(),
                        //     type: "withdraw"
                        // }
                        
                        // Initialize totalhistory if it doesn't exist
                        if (!user.totalhistory) {
                            user.totalhistory = [];
                        }

                        user.totalhistory.push(data);
                        await user.save();
                    }
                } catch (err) {
                    console.error("[TRON CONFIRMATION ERROR]", err);
                }
            })();

            return result;
        }

        return { success: false, error: `Unsupported network: ${network}` };
    } catch (err) {
        console.error('[sendUSDT] error:', err.message || err);
        return { success: false, error: err.message || String(err) };
    }
}
