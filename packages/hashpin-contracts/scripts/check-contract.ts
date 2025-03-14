import { ethers } from "hardhat";

async function main() {
  // Get the contract instance
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Updated contract address
  const Hashpin = await ethers.getContractFactory("Hashpin");
  const hashpin = await Hashpin.attach(contractAddress);

  console.log("Contract address:", contractAddress);
  
  // Check if the contract has code deployed
  const provider = ethers.provider;
  const code = await provider.getCode(contractAddress);
  console.log("Has code deployed:", code !== "0x");
  console.log("Code length:", (code.length - 2) / 2, "bytes");

  // Get the current difficulty
  const difficulty = await hashpin.getDifficulty();
  console.log("Current difficulty:", difficulty, "bits");

  // List recent transactions (if any)
  const blockNumber = await provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  // Check the last 5 blocks for transactions to our contract
  console.log("\nChecking recent transactions to the contract...");
  for (let i = 0; i < 5; i++) {
    if (blockNumber - i < 0) break;
    
    const block = await provider.getBlock(blockNumber - i);
    if (!block) continue;
    
    console.log(`\nBlock #${blockNumber - i}:`);
    console.log("Timestamp:", new Date(Number(block.timestamp) * 1000).toLocaleString());
    console.log("Transaction count:", block.transactions.length);
    
    // Check each transaction in the block
    for (const txHash of block.transactions) {
      const tx = await provider.getTransaction(txHash);
      if (!tx) continue;
      
      if (tx.to?.toLowerCase() === contractAddress.toLowerCase()) {
        console.log("\nFound transaction to our contract:");
        console.log("Transaction hash:", txHash);
        console.log("From:", tx.from);
        
        // Get transaction receipt to check status
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
          console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
          console.log("Gas used:", receipt.gasUsed.toString());
          
          // Check for HashPinned events
          if (receipt.logs.length > 0) {
            console.log("\nEvent logs:");
            for (const log of receipt.logs) {
              if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
                try {
                  // Try to decode the event
                  const event = Hashpin.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data
                  });
                  
                  if (event?.name === "HashPinned") {
                    console.log("HashPinned event found!");
                    console.log("Pinner:", event.args.pinner);
                    console.log("Hash:", event.args.hash);
                    console.log("Metadata:", event.args.metadata);
                    console.log("Timestamp:", new Date(Number(event.args.timestamp) * 1000).toLocaleString());
                    
                    // Verify the hash is actually pinned
                    const details = await hashpin.getHashDetails(event.args.hash);
                    console.log("\nVerifying hash in contract storage:");
                    console.log("Pinner:", details[0]);
                    console.log("Metadata:", details[1]);
                    console.log("Timestamp:", new Date(Number(details[2]) * 1000).toLocaleString());
                  }
                } catch (e) {
                  console.log("Could not decode event log");
                }
              }
            }
          }
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 