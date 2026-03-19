# Ably Real-Time Setup Guide

## 🔑 API Key Configuration

**IMPORTANT:** Both client and server MUST use the SAME Ably API key!

### Current Configuration:

1. **Client (Frontend)**: 
   - Uses: `REACT_APP_ABLY_KEY` from `.env` file OR fallback key
   - File: `minglou2025/client/src/ably/ablyClient.js`

2. **Server (Backend)**:
   - Uses: `ABLY_API_KEY` from `.env` file OR fallback key
   - File: `minglou2025/server/src/server.js`

### Setting Up Your API Key:

1. **Get your Ably API Key:**
   - Go to https://ably.com
   - Sign up or log in
   - Create a new app or use existing one
   - Copy your API key (format: `xxxxx.xxxxx:xxxxxxxxxxxxx`)

2. **Set up Server .env file:**
   ```bash
   cd minglou2025/server
   # Create .env file if it doesn't exist
   echo "ABLY_API_KEY=your-api-key-here" >> .env
   ```

3. **Set up Client .env file:**
   ```bash
   cd minglou2025/client
   # Create .env file if it doesn't exist
   echo "REACT_APP_ABLY_KEY=your-api-key-here" >> .env
   ```

4. **IMPORTANT:** Use the SAME key in both files!

## 🧪 Testing Ably Connection

### Test Server Connection:

1. Start your server
2. Visit: `http://localhost/api/test/ably-test`
3. You should see:
   ```json
   {
     "connected": true,
     "connectionState": "connected",
     "apiKeySet": true,
     "message": "Ably is connected and ready!"
   }
   ```

### Test Publishing:

1. Send POST request to: `http://localhost/api/test/ably-test-publish`
2. Check your client console - you should see the test message received

### Check Console Logs:

**Server Console should show:**
```
🔑 [Server] Using Ably API Key: ddZbrQ.EDz...zKM
🔌 [Server] Ably connection: initialized → connecting
🔌 [Server] Ably connection: connecting → connected
✅ [Server] Ably connected successfully!
✅ [Server] Ably ready for publishing
```

**Client Console should show:**
```
🔑 [Client] Using Ably API Key: ddZbrQ.EDz...zKM
🔌 [Ably] Connection state: initialized → connecting
🔌 [Ably] Connection state: connecting → connected
✅ [Ably] Successfully connected to Ably!
```

## ❌ Common Issues:

### 1. "Connection failed" or "Authentication error"
- **Problem**: Invalid API key
- **Solution**: 
  - Verify your API key is correct
  - Make sure both client and server use the SAME key
  - Check that the key has publish/subscribe permissions

### 2. "Connection state: failed"
- **Problem**: API key doesn't have proper permissions
- **Solution**: 
  - Go to Ably dashboard
  - Check your API key capabilities
  - Ensure it has "publish" and "subscribe" permissions

### 3. Messages not received on other computers
- **Problem**: Different API keys or network issues
- **Solution**:
  - Verify both computers use the same API key
  - Check browser console for connection errors
  - Verify firewall/network allows WebSocket connections

### 4. "Ably client not found"
- **Problem**: Server didn't initialize Ably properly
- **Solution**:
  - Check server console for Ably initialization errors
  - Verify `ABLY_API_KEY` is set in server .env
  - Restart the server

## 🔍 Debugging:

1. **Check connection status indicator:**
   - Green dot = Connected ✅
   - Yellow dot = Connecting ⏳
   - Red dot = Disconnected/Failed ❌

2. **Check browser console:**
   - Look for `[Ably]` or `[useAblyTicketUpdates]` logs
   - Check for any error messages

3. **Check server console:**
   - Look for `[Server]` or `[betController]` logs
   - Check for connection state changes

4. **Test endpoints:**
   - `GET /api/test/ably-test` - Check server connection
   - `POST /api/test/ably-test-publish` - Test publishing

## 📝 Notes:

- The fallback API key in the code is for development only
- For production, ALWAYS use environment variables
- Never commit your API keys to version control
- Each Ably app has rate limits - check your plan

