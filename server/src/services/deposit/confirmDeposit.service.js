import cron from "node-cron";
import { ethers } from "ethers";
import WatchDeposit from "../../models/WatchDeposit.js";
import { depositSuccess } from "./depositSuccess.service.js";
import Setting from "../../models/Setting.js";

const getRpcUrl = (chainId) => {
    const normalizedChain = typeof chainId === 'string' 
        ? chainId.toLowerCase().startsWith('0x') 
            ? chainId.toLowerCase() 
            : `0x${parseInt(chainId).toString(16)}`
        : `0x${parseInt(chainId).toString(16)}`;
    
    if (chainId === process.env.BSC_TESTNET_CHAIN_ID || normalizedChain === '0x61') {
        return process.env.BSC_RPC;
    }
    if (chainId === process.env.ETH_TESTNET_CHAIN_ID || normalizedChain === '0xaa36a7') {
        return process.env.RPC_URL;
    }
    return process.env.RPC_URL;
};

const getLatestBlockNumber = async (chainId) => {
    const rpcUrl = getRpcUrl(chainId);
    const chainIdNum = typeof chainId === 'string' && chainId.toLowerCase().startsWith('0x') 
        ? parseInt(chainId, 16) 
        : parseInt(chainId, 10);
    const provider = new ethers.JsonRpcProvider(rpcUrl, chainIdNum);
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
};

export const confirmDepositEngine = (ably) => {
    let isRunning = false;
    let lastRun = 0;
    cron.schedule("* * * * * *", async () => {
        const setting = await Setting.find({});
        const X = setting[0]?.confirmation || 60;
        const now = Math.floor(Date.now() / 1000);

        if (isRunning) return;
        if (now - lastRun < X) return;

        isRunning = true;
        lastRun = now;

        try {
            const deposits = await getDeposits();
            for (const deposit of deposits) {
                if(deposit.chain == "TRON") return;
                try {
                    const channel = ably.channels.get("Num2Bet");

                    // Use ethers RPC to get the latest block number - more reliable than Moralis API
                    const currentBlock = await getLatestBlockNumber(deposit.chain);
                    const confirmations = currentBlock - Number(deposit.blockNumber);
                    console.log("deposit chain", deposit.chain, "current block", currentBlock, "deposit block", deposit.blockNumber, "confirmations", confirmations);
                    const required = deposit.chain === process.env.BSC_MAINNET_CHAIN_ID && 12 || deposit.chain === process.env.BSC_TESTNET_CHAIN_ID && 3 || 12;

                    if (confirmations >= required) {
                        depositSuccess(ably, deposit);
                    } else {
                        await channel.publish("CONFIRMATION_UPDATE", {
                            transferTo: deposit.address,
                            confirmations: confirmations
                        });
                    }
                } catch (err) {
                    console.error("Confirm deposit error:", err);
                }
            }
        } catch (err) {
            console.error("Confirm deposit error:", err);
        } finally {
            isRunning = false;
        }
    });
}

export const getDeposits = async () => {
    const watchDeposits = await WatchDeposit.find({});  
    return watchDeposits;
}