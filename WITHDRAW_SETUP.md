# Automatic Withdraw Flow - Complete Setup

## How It Works

### 1. **User clicks Withdraw Button** (Frontend)
- User enters: withdraw address, amount, network (Ethereum/BSC/TRON)
- Frontend validates and sends POST request to `/api/withdraw`

### 2. **Server Receives Request** (withdrawController.js)
```javascript
const { wd_addr, wd_amt, wd_net } = req.body;
```

### 3. **Manager Private Key is Loaded**
- Tries fallback chain for each network:
  - **ETHEREUM**: `MANAGER_ETH_PRIVATE_KEY` → `ETH_PRIVATE_KEY` → `MANAGER_PRIVATE_KEY`
  - **BSC**: `MANAGER_BSC_PRIVATE_KEY` → `BSC_PRIVATE_KEY` → `MANAGER_PRIVATE_KEY`
  - **TRON**: `MANAGER_TRON_PRIVATE_KEY` → `TRON_PRIVATE_KEY` → `MANAGER_PRIVATE_KEY`

### 4. **Automatic Money Transfer**
- `sendUSDT()` function is called immediately:
  ```javascript
  const sendResult = await sendUSDT(network, managerKey, wd_addr, Number(wd_amt));
  ```
- This connects to blockchain and sends USDT from manager wallet to user's wallet
- Blockchain connection with automatic RPC failover if first RPC fails

### 5. **On Success**
- ✅ Mark withdraw as `success` in database
- ✅ Deduct amount from user's balance
- ✅ Store transaction hash (txHash)
- ✅ Publish `CONFIRM_SUCCESS` event to Ably real-time channel
- ✅ Client receives event → shows "Withdraw confirmed" toast

### 6. **On Failure**
- ❌ Mark withdraw as `failed` in database
- ❌ Publish `CONFIRM_FALSE` event to Ably
- ❌ Client shows error message

---

## Setup Instructions

### Step 1: Set Manager Private Key in `.env`
Edit `server/.env`:
```
MANAGER_ETH_PRIVATE_KEY=0xYOUR_MANAGER_PRIVATE_KEY_HERE
USE_TESTNET=true
```

### Step 2: Get Testnet Tokens
Get test ETH and USDC on Sepolia:
- **Sepolia Faucet**: https://sepoliafaucet.com
- Request test ETH to your manager address

### Step 3: Check Manager Wallet Balance
```bash
cd server
node checkManagerBalance.js
```

Output shows:
```
--- ETHEREUM (SEPOLIA TESTNET) ---
✅ Manager Address: 0xC587af71a71bE7da727C70314977c0e55320104C
💰 ETH Balance: 0.5 ETH
💵 USDC/USDT Balance: 100 USDC
```

### Step 4: Restart Server
```bash
cd server
npm run dev
```

### Step 5: Test Withdraw
1. Login to the app
2. Click "Withdraw" button
3. Enter:
   - Withdraw address (user's address)
   - Amount (e.g., 10 USDC)
   - Network (Ethereum)
4. Click Submit

### Step 6: Monitor Transfer
Watch your server terminal for:
```
[WITHDRAW] Attempting to send 10 USDT to 0x1234... on ETHEREUM
[WITHDRAW] SUCCESS - txHash: 0x5678...
```

---

## Files Involved

| File | Purpose |
|------|---------|
| `server/src/controllers/withdrawController.js` | Handles withdraw requests, calls sendUSDT |
| `server/src/utils/blockchainTransactions.js` | sendUSDT function (does the actual transfer) |
| `server/.env` | Manager private key configuration |
| `server/checkManagerBalance.js` | Diagnostic tool to check wallet balance |
| `client/src/hooks/useAblyWithdrawStatus.js` | Real-time Ably subscription on client |

---

## Network & Contract Addresses

### Sepolia Testnet (Ethereum)
- **USDC Contract**: `0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c`
- **RPC**: https://rpc.sepolia.org

### BSC Testnet
- **USDT Contract**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **RPC**: https://data-seed-prebsc-1-b.binance.org:8545

### TRON Testnet (Shasta)
- **USDT Contract**: `TXYZopYRdj2D9XRtbG411XZZ3kM5VkA00B`
- **RPC**: https://api.shasta.trongrid.io

---

## Troubleshooting

### ❌ "Manager private key NOT FOUND"
- Check `.env` file has `MANAGER_ETH_PRIVATE_KEY` set
- Restart server: `npm run dev`

### ❌ "No contract found at address"
- Wrong network selected or contract not deployed on that RPC
- Check contract address in `blockchainTransactions.js`

### ❌ "Insufficient balance"
- Manager wallet doesn't have enough USDC/USDT
- Get tokens from faucet

### ✅ "SUCCESS - txHash: 0x..."
- Transfer successful!
- Check blockchain explorer with the txHash
