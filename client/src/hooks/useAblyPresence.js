import { useEffect } from 'react';
import ablyClient from '../ably/ablyClient';

export default function useAblyPresence(userId) {
  const channel = ablyClient.channels.get('Num2Bet');
  useEffect(() => {
    if (!userId) return;

    channel.presence.enter({ userId });

    return () => {
      channel.presence.leave();
    };
  }, [userId]);
}
