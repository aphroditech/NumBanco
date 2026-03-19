import tronWeb from "../../config/tron.js";
import { depositSuccess } from "./depositSuccess.service.js";

export const confirmTronDeposits = async (ably, deposit) => {
  const channel = ably.channels.get("Num2Bet");
  const latestBlock = await tronWeb.trx.getCurrentBlock();
  const currentBlock = latestBlock.block_header.raw_data.number;

  const confirmations = currentBlock - deposit.blockNumber;

  console.log('🕐 Tron confirmation cron active');
  if(confirmations < 20) {
    await channel.publish("CONFIRMATION_UPDATE", {
      transferTo: deposit.address,
      confirmations: confirmations
    });
  } else {
    console.log('🚀 Tron success', confirmations);
    depositSuccess(ably, deposit);
  }
};