import User from "../../models/User.js";
import WatchDeposit from "../../models/WatchDeposit.js";
import SuccessDeposit from "../../models/SuccessDeposit.js";
import FundMerge from "../../models/FundMerge.js";
import { deleteStream } from "../../streams/deleteStream.js";

export const depositSuccess = async (ably, data) => {
    var message = {};
    const user = await User.findOne({ userId: data.userId });
    if(user == null) return;
    user.balance = (1000*user.balance + Number(data.amount)*1000)/1000;
    user.totalDeposit += Number(data.amount);
    
    // Delete the stream and the watch deposit record
    const exists = await SuccessDeposit.findOne({
        transactionHash: data.transactionHash,
    });

    if(exists) return;

    await SuccessDeposit.create({
        transactionHash: data.transactionHash,
        blockNumber: data.blockNumber,
        chain: data.chain,
        address: data.address,
        amount: data.amount,
        coin: data.coin,
        userId: data.userId,
    });
    const fundMerge = await FundMerge.findOne({depAddr: data.address, depNet: data.chain, depCoin: data.coin});

    if(fundMerge) {
        fundMerge.depAmt += Number(data.amount);
        await fundMerge.save();
    } else {
        const fMerge = new FundMerge({
            depAmt: data.amount,
            depNet: data.chain,
            depAddr: data.address,
            depCoin: data.coin,
            userId: data.userId,
        });
        await fMerge.save();
    }
        
    await WatchDeposit.findOneAndDelete({ transactionHash: data.transactionHash });
    const deposit = user.deposit.find( dep => dep.depAddr.toLowerCase() === data.address.toLowerCase() && dep.depFill === "pending" );
    
    if(!deposit) return;

    if(deposit.depStreamId) await deleteStream(deposit.depStreamId);
    
    // Determine message type based on deposited amount
    if(data.amount >= deposit.depAmount) {
        message = { info: "Deposit success, "+data.amount+" amount will be credited to your account.", type: "success" };
    } else {
        message = { info: "Deposit success, "+data.amount+" excess amount will not be credited enough to your account.", type: "warning" };
    }
    if (!deposit) return;

    deposit.depAmount = data.amount;
    deposit.depFill = "success";

    const depositData = {
        amount: data.amount,
        date: new Date(),
        type: "deposit"
    }
    
    // Initialize totalhistory if it doesn't exist
    if (!user.totalhistory) {
        user.totalhistory = [];
    }
    
    user.totalhistory.push(depositData);

    // partner
    const partner = await User.findOne({userId: user.partnerId})
    if(partner) {
        const partnerEarn = (data.amount * partner.partnerLevel*0.01);
        partner.partnerActivity.push({
            userId: user.userId,
            altas: user.altas,
            depositAmt: data.amount,
            partnerEarn: partnerEarn,
        }),
        partner.partnerEarn = (1000*partner.partnerEarn + partnerEarn*1000)/1000;
        await partner.save();
    }
    // Save user changes
    await user.save();

    console.log({
        transferTo: data.address,
        message: message
    })

    // Notify the client about the successful deposit
    const channel = ably.channels.get("Num2Bet");
    await channel.publish("CONFIRM_SUCCESS", {
        user: user,
        userId: user.userId,
        transferTo: data.address,
        message: message
    });
};