import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import { encrypt } from './crypto.js';
import "dotenv/config";

// Generate Ethereum wallet
export function generateETHWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: encrypt(wallet.privateKey)
    // publicKey not needed for deposits
  };
}

// Generate BSC wallet (same as Ethereum)
export function generateBSCWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: encrypt(wallet.privateKey)
    // publicKey not needed for deposits
  };
}

// Generate TRON wallet
export function generateTRONWallet() {
  // Generate random private key (without 0x prefix for TronWeb)
  const privateKey = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  // Initialize TronWeb to get address
  // TronWeb default export is a constructor; instantiate directly
  let tronWeb;
  try {
    tronWeb = new TronWeb({
      fullHost: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
      headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
      privateKey: privateKey
    });
  } catch (err) {
    console.error('Failed to initialize TronWeb:', err);
    // 
    return;
  }

  const address = tronWeb.defaultAddress?.base58 || '';
  if (!address) {
    console.warn('TronWeb did not produce a base58 address for the generated key');
  }

  return {
    address: address,
    privateKey: encrypt(privateKey)
    // publicKey not needed for deposits
  };
}

// Generate all three wallets for a user
export function generateUserWallets() {
  return {
    eth: generateETHWallet(),
    bsc: generateBSCWallet(),
    tron: generateTRONWallet()
  };
}
