import User from '../models/User.js';
import WatchDeposit from '../models/WatchDeposit.js';

export default async function moralisWebhook(req, res) {
  try {
    // const valid = Moralis.Streams.verifySignature(
    //   req.rawBody, // 🔥 RAW BODY
    //   req.headers,
    //   process.env.MORALIS_STREAM_SECRET
    // );

    // if (!valid) {
    //   console.warn("Invalid Moralis signature");
    //   return res.sendStatus(200);
    // }

    const { confirmed } = req.body;
    const ably = req.app.locals.ably;
    const channel = ably.channels.get("Num2Bet");

    const log = req.body.logs?.[0];
    const erc20 = req.body.erc20Transfers?.[0];

    if (!log || !erc20) {
      return res.sendStatus(200);
    }

    const user = await User.findOne({
      $or: [
        { "wallets.eth.address": new RegExp(`^${erc20.to}$`, "i") },
        { "wallets.bsc.address": new RegExp(`^${erc20.to}$`, "i") }
      ]
    });

    if (!user) return res.sendStatus(200);

    if (!confirmed) {

      const exists = await WatchDeposit.findOne({
        transactionHash: log.transactionHash,
      });

      if (exists) return res.sendStatus(200);
      
      const watchDepositRecord = new WatchDeposit({
        transactionHash: log.transactionHash,
        blockNumber: req.body.block.number,
        chain: req.body.chainId,
        address: erc20.to,
        amount: erc20.valueWithDecimals,
        coin: 'USDT',
        userId: req.body.tag,
      });

      await watchDepositRecord.save();

      const pendingDeposit = user.deposit
          .filter(dep => dep.depFill === 'pending' && dep.depNet !== "TRON")
          .sort((a, b) => new Date(b.createAt) - new Date(a.createAt))[0];
      if(pendingDeposit) {
          pendingDeposit.depTxH = log.transactionHash;
          await user.save();
      }
      
      await channel.publish("CONFIRM_FALSE", {
        transactionHash: log.transactionHash,
        transferTo: erc20.to,
      });
      return res.sendStatus(200);
    }

    await channel.publish("CONFIRM_TRUE", {
      transactionHash: log.transactionHash,
      transferTo: erc20.to,
      amount: erc20.valueWithDecimals,
      token: erc20.tokenSymbol,
      chain: req.body.chainId,
    });

    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
}