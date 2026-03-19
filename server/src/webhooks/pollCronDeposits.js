import WatchDeposit from "../models/WatchDeposit.js";
import SuccessDeposit from "../models/SuccessDeposit.js";
import tronWeb from "../config/tron.js";
import Setting from "../models/Setting.js";
// import { findUserByTronAddress } from "../services/user.service.js";

export const pollTronDeposits = async (ably, user) => {
    console.log("🔥 TRON cron job");
    const setting = await Setting.find({});
    const url = `${process.env.TRON_RPC}/v1/contracts/${process.env.TRON_TESTNET_USDT_CONTRACT}` + `/events?event_name=Transfer&limit=${setting[0]?.tronTransactionLimit || 10}`;

    try {
        const res = await fetch(url, { timeout: 15000 });
        const { data } = await res.json();

        for (const ev of data) {
            const to = tronWeb.address.fromHex(ev.result.to).toLowerCase();
            const txHash = ev.transaction_id;
            const blockNumber = ev.block_number;
            const amount = Number(ev.result.value) / 1e6;
            if(to == user.wallets.tron.address.toLowerCase()){
                const flagWatch = await WatchDeposit.findOne({transactionHash: txHash, blockNumber: blockNumber, address: to, amount: amount, coin: 'USDT', userId: user.userId});
                const flagSuccess = await SuccessDeposit.findOne({transactionHash: txHash, blockNumber: blockNumber, address: to, amount: amount, coin: 'USDT', userId: user.userId});
                if(flagWatch || flagSuccess) return;
                
                console.log("🔥 TRON deposit engine started");
                const watchDepositRecord = new WatchDeposit({
                    transactionHash: txHash,
                    blockNumber: blockNumber,
                    chain: "TRON",
                    address: to,
                    amount: amount,
                    coin: 'USDT',
                    userId: user.userId,
                });
                
                await watchDepositRecord.save();
        
                const pendingDeposit = user.deposit
                    .filter(dep => dep.depFill === 'pending' && dep.depNet === "TRON")
                    .sort((a, b) => new Date(b.createAt) - new Date(a.createAt))[0];
                if(pendingDeposit) {
                    pendingDeposit.depTxH = txHash;
                    await user.save();
                }

                const channel = ably.channels.get("Num2Bet");
                await channel.publish("CONFIRM_FALSE", {
                    transactionHash: txHash,
                    transferTo: to,
                });
            }
        }
    } catch (error) {
        if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
            console.log(" TRON API connection timeout - skipping this check");
        } else if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
            console.log(" TRON API fetch failed - network error, skipping this check");
        } else {
            console.error(" Error in TRON deposit polling:", error.message);
        }
        return; // Exit gracefully
    }
};