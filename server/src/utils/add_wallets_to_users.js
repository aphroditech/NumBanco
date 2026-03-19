import User from '../models/User.js';
import { generateUserWallets } from './walletGenerator.js';
import "dotenv/config";
import { connectDB } from '../config/db.js';

async function addWalletsToExistingUsers() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    // Find users without wallets
    const usersWithoutWallets = await User.find({
      $or: [
        { 'wallets.eth.address': { $exists: false } },
        { 'wallets.bsc.address': { $exists: false } },
        { 'wallets.tron.address': { $exists: false } }
      ]
    });
    
    console.log(`Found ${usersWithoutWallets.length} users without wallets`);
    
    for (const user of usersWithoutWallets) {
      console.log(`Generating wallets for user: ${user.userAuthId}`);
      
      // Generate wallets
      const wallets = generateUserWallets();
      
      // Update user with wallets
      user.wallets = wallets;
      await user.save();
      
      console.log(`  ETH: ${wallets.eth.address}`);
      console.log(`  BSC: ${wallets.bsc.address}`);
      console.log(`  TRON: ${wallets.tron.address}`);
      console.log('  ✅ Wallets added successfully\n');
    }
    
    console.log('✅ All users updated with wallets!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addWalletsToExistingUsers();
