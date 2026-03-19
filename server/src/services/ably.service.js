import User from "../models/User.js";

export const getChannel = async (ably, channelName) => {
    const channel = ably.channels.get(channelName);

    if (channel.state !== "attached") {
        await channel.attach();
    }

    return channel;
};

export const getUserStatusChannel = async (ably) => {
    const channel = ably.channels.get('Num2Bet');

    channel.presence.subscribe(['enter', 'leave'], async (msg) => {
        const userId = msg.data.userId;

        if (msg.action === 'enter') {
            await User.updateOne({ userId }, { active: 1 });
        }

        if (msg.action === 'leave') {
            await User.updateOne({ userId }, { active: 0 });
        }
    });
};