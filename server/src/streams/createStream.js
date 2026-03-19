import Moralis from "moralis";

export async function createStream(userId, wallet, chainId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const stream = await Moralis.Streams.add({
                tag: userId,
                description: "watch wallet" + userId,
                webhookUrl: `https://${process.env.NGROK_DOMAIN}/webhook/moralis`,
                chains: [chainId],
                // chains: [process.env.ETH_MAINNET_CHAIN_ID, process.env.ETH_TESTNET_CHAIN_ID, process.env.BSC_MAINNET_CHAIN_ID, process.env.BSC_TESTNET_CHAIN_ID],
                includeNativeTxs: true,
                includeContractLogs: true,
            });

            await Moralis.Streams.addAddress({
                id: stream.result.id,
                address: wallet,
            });

            console.log("✅ Stream created:" + stream.result.id)
            return stream.result.id;
        } catch (error) {
            if (error.code === 'C0006' && i < retries - 1) {
                console.log(`⚠️  Moralis timeout (attempt ${i + 1}/${retries}), retrying in ${2000 * (i + 1)}ms...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                continue;
            }
            throw error;
        }
    }
}