import { Web3Service } from "./services/web3.service.js";

const web3Service = new Web3Service("sepolia");

// Get native balance
const nativeBalance = await web3Service.getNativeBalance("0x1Cc927DF6b3AB1E3783aD8b31b8F5ebAF41b8393");

// // Get token balance
// const tokenBalance = await web3Service.getTokenBalance("0xTokenAddress", "0xWalletAddress");

// // Get all balances (native + tokens)
// const balances = await web3Service.getWalletBalances("0xWalletAddress", [
//     "0xToken1Address",
//     "0xToken2Address"
// ]);

console.log(nativeBalance);
/*
{
    nativeBalance: 1234567890000000000n, // 1.23456789 ETH
    tokens: [
        {
            token: "0xToken1Address",
            balance: 1000000000000000000n,
            symbol: "USDC",
            decimals: 6,
            name: "USD Coin"
        },
        // ... other tokens
    ]
}
*/