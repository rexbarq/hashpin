import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying Hashpin Protocol contracts...");

  // Step 1: Deploy Hashpin Contract
  console.log("Deploying main Hashpin contract...");
  const Hashpin = await ethers.getContractFactory("Hashpin");
  const hashpin = await Hashpin.deploy();
  await hashpin.waitForDeployment();
  
  const hashpinAddress = await hashpin.getAddress();
  console.log(`Hashpin deployed to: ${hashpinAddress}`);
  
  // Step 2: Deploy ERC721 Adapter
  console.log("Deploying ERC721HashpinAdapter contract...");
  const ERC721Adapter = await ethers.getContractFactory("ERC721HashpinAdapter");
  
  // Deploy with name and symbol
  const nftName = "Hashpin NFT";
  const nftSymbol = "HPIN";
  const adapter = await ERC721Adapter.deploy(nftName, nftSymbol);
  await adapter.waitForDeployment();
  
  const adapterAddress = await adapter.getAddress();
  console.log(`ERC721HashpinAdapter deployed to: ${adapterAddress}`);
  
  // Step 3: Configure the contracts to work together
  console.log("Configuring contracts...");
  
  // Set Hashpin contract address in the adapter
  console.log("Setting Hashpin contract address in adapter...");
  const setHashpinTx = await adapter.setHashpinContract(hashpinAddress);
  await setHashpinTx.wait();
  console.log("Hashpin address set in adapter");
  
  // Whitelist the adapter in the Hashpin contract
  console.log("Whitelisting adapter in Hashpin contract...");
  const whitelistTx = await hashpin.setAdapterWhitelisted(adapterAddress, true);
  await whitelistTx.wait();
  console.log("Adapter whitelisted in Hashpin contract");
  
  // Save deployment information
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Save Hashpin deployment info
  const hashpinDeploymentInfo = {
    address: hashpinAddress,
    abi: JSON.parse(Hashpin.interface.formatJson())
  };
  
  fs.writeFileSync(
    path.join(deploymentDir, "hashpin.json"),
    JSON.stringify(hashpinDeploymentInfo, null, 2)
  );
  
  // Save Adapter deployment info
  const adapterDeploymentInfo = {
    address: adapterAddress,
    abi: JSON.parse(ERC721Adapter.interface.formatJson()),
    type: "ERC721",
    name: nftName,
    symbol: nftSymbol
  };
  
  fs.writeFileSync(
    path.join(deploymentDir, "erc721adapter.json"),
    JSON.stringify(adapterDeploymentInfo, null, 2)
  );
  
  // Optional: Save a combined deployment file for easier reference
  const combinedDeploymentInfo = {
    hashpin: hashpinDeploymentInfo,
    adapters: {
      erc721: adapterDeploymentInfo
    },
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(deploymentDir, "deployment.json"),
    JSON.stringify(combinedDeploymentInfo, null, 2)
  );
  
  console.log("All deployment info saved to deployments/ directory");
  console.log("✅ Deployment and configuration complete!");
  
  // Display information for environment variables
  console.log("\nAdd these to your frontend .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${hashpinAddress}`);
  console.log(`NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=${adapterAddress}`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 