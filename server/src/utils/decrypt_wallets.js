import { decrypt } from './crypto.js';
import User from '../models/User.js';
import "dotenv/config";
import { connectDB } from '../config/db.js';

async function decryptUserWallets() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    const userAuthId = process.argv[2];
    if (!userAuthId) {
      console.log('Usage: node decrypt_wallets.js <userAuthId>');
      process.exit(1);
    }
    
    const user = await User.findOne({ userAuthId });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log(`\nWallets for user: ${userAuthId}`);
    console.log('=====================================');
    
    // Decrypt ETH wallet
    if (user.wallets?.eth) {
      const ethPrivateKey = decrypt(user.wallets.eth.privateKey);
      console.log('\nETH Wallet:');
      console.log('Address:', user.wallets.eth.address);
      console.log('Private Key:', ethPrivateKey);
      console.log('Public Key:', user.wallets.eth.publicKey);
    }
    
    // Decrypt BSC wallet
    if (user.wallets?.bsc) {
      const bscPrivateKey = decrypt(user.wallets.bsc.privateKey);
      console.log('\nBSC Wallet:');
      console.log('Address:', user.wallets.bsc.address);
      console.log('Private Key:', bscPrivateKey);
      console.log('Public Key:', user.wallets.bsc.publicKey);
    }
    
    // Decrypt TRON wallet
    if (user.wallets?.tron) {
      const tronPrivateKey = decrypt(user.wallets.tron.privateKey);
      console.log('\nTRON Wallet:');
      console.log('Address:', user.wallets.tron.address);
      console.log('Private Key:', tronPrivateKey);
      console.log('Public Key:', user.wallets.tron.publicKey);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

decryptUserWallets();
