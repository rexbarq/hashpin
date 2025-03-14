import { ethers } from "hardhat";

async function main() {
  const txHashes = [
    "0x8322810af887c39f9685bb0216f08e25654d7de3dc9d43cff52966c845c35a33",
    "0xc6acc47ec8726cd28e16f511699e64f2fbbc5bc58cc821215b39df1ab7010e4b"
  ];

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  
  for (const txHash of txHashes) {
    console.log(`\nAnalyzing transaction: ${txHash}`);
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      console.log("Transaction not found");
      continue;
    }

    // Get the contract interface
    const abi = [
      "function pinHash(bytes32 hash, string calldata metadata) external"
    ];
    const iface = new ethers.Interface(abi);

    // Decode the transaction data
    const decodedData = iface.parseTransaction({ data: tx.data });
    if (decodedData) {
      console.log("Hash being pinned:", decodedData.args[0]);
      console.log("Metadata:", decodedData.args[1]);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 