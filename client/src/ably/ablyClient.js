import Ably from "ably";

// IMPORTANT: This key must match the server's ABLY_API_KEY
// If you have a .env file, set REACT_APP_ABLY_KEY there
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;

if (!ABLY_KEY) {
    console.error("❌ [Client] ABLY_KEY is not set! Real-time updates will not work.");
}

console.log("🔑 [Client] Using Ably API Key:", ABLY_KEY ? (ABLY_KEY.substring(0, 10) + "..." + ABLY_KEY.substring(ABLY_KEY.length - 5)) : "NOT SET");

const ablyClient = new Ably.Realtime({
    key: ABLY_KEY,
    clientId: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    echoMessages: false, // Don't echo our own messages
});

// Enhanced connection state monitoring
ablyClient.connection.on((stateChange) => {
  console.log(
    "🔌 [Ably] Connection state:",
    stateChange.previous,
    "→",
    stateChange.current,
    stateChange.reason ? `(Reason: ${stateChange.reason})` : ""
  );
  
  if (stateChange.current === 'connected') {
    console.log("✅ [Ably] Successfully connected to Ably!");
  } else if (stateChange.current === 'disconnected' || stateChange.current === 'suspended') {
    console.warn("⚠️ [Ably] Connection lost, will attempt to reconnect...");
  } else if (stateChange.current === 'failed') {
    console.error("❌ [Ably] Connection FAILED!");
    console.error("❌ [Ably] Reason:", stateChange.reason);
    if (stateChange.reason) {
      const reason = stateChange.reason.toString().toLowerCase();
      if (reason.includes('auth') || reason.includes('key') || reason.includes('401') || reason.includes('403')) {
        console.error("❌ [Ably] ⚠️ AUTHENTICATION ERROR - Your Ably API key might be invalid!");
        console.error("❌ [Ably] Please check your REACT_APP_ABLY_KEY in .env file");
        console.error("❌ [Ably] Current key preview:", ABLY_KEY ? (ABLY_KEY.substring(0, 10) + "..." + ABLY_KEY.substring(ABLY_KEY.length - 5)) : "NOT SET");
        alert("⚠️ Ably Connection Failed: Invalid API Key. Please check your configuration.");
      }
    }
  }
});

// Handle connection errors
ablyClient.connection.on('failed', (stateChange) => {
  console.error("❌ [Ably] Connection failed:", stateChange.reason);
});

ablyClient.connection.on('suspended', () => {
  console.warn("⚠️ [Ably] Connection suspended");
});

export default ablyClient;