import TronWeb from "tronweb";

const tronWeb = new TronWeb({
  fullHost: process.env.TRON_RPC,
  headers: {
    "TRON-PRO-API-KEY": process.env.TRON_GRID_API_KEY,
  },
});

export default tronWeb;