# Hashpin Protocol

Hashpin is a protocol that enables users to pin cryptographic hashes to the blockchain and claim them as NFTs, ensuring on-chain proof of existence for any digital content.

## Overview

The Hashpin protocol allows users to:
- Pin cryptographic hashes to the blockchain with proof-of-work
- Verify the existence and ownership of pinned hashes
- Claim pinned hashes as NFTs through various adapters
- Prove origin and timestamp of digital content

## Project Structure

```
hashpin-monorepo/
├── apps/
│   ├── hashpin-backend/       # Node.js + TypeScript backend
│   │   ├── src/
│   │   │   ├── main.ts       # Entry point for transaction posting
│   │   │   └── main.test.ts  # Backend tests
│   │   ├── package.json      # Deps: ethers, express
│   │   ├── project.json      # Nx config
│   │   ├── tsconfig.json     # TS config
│   │   └── jest.config.ts    # Jest config
│   └── hashpin-ui/           # Next.js + React frontend
│       ├── src/
│       │   ├── app/          # Next.js app directory
│       │   └── components/    # React components
│       ├── package.json      # Deps: next, wagmi, ethers
│       └── tsconfig.json     # TS config
├── packages/
│   ├── hashpin-contracts/     # Solidity contracts
│   │   ├── contracts/
│   │   │   ├── Hashpin.sol   # Hashpin protocol contract
│   │   │   ├── adapters/     # NFT adapter implementations
│   │   │   └── interfaces/   # Contract interfaces
│   │   ├── scripts/
│   │   │   └── deploy.ts     # Deployment script
│   │   ├── test/
│   │   │   ├── Hashpin.test.ts            # Core protocol tests
│   │   │   └── ERC721HashpinAdapter.test.ts  # NFT adapter tests
│   │   ├── hardhat.config.ts # Hardhat config
│   │   ├── package.json      # Deps: hardhat, ethers
│   │   ├── project.json      # Nx config
│   │   └── tsconfig.json     # TS config
│   └── hashpin-utils/         # Shared TS utilities
│       ├── src/
│       │   └── index.ts      # Exports (e.g., ABIs)
│       ├── package.json      # Deps (if any)
│       ├── project.json      # Nx config
│       └── tsconfig.json     # TS config
├── nx.json                    # Nx monorepo config
├── package.json               # Root deps and scripts
├── tsconfig.base.json         # Base TS config
└── README.md                  # This file
```

## Repository Overview

This monorepo contains several packages:

- `hashpin-contracts`: Solidity smart contracts for the Hashpin protocol
  - Core protocol implementation
  - NFT adapters for claiming hashes as tokens
  - Interfaces defining protocol interaction
- `hashpin-utils`: Utility functions for interacting with the Hashpin protocol

## Development

### Prerequisites

- Node.js >= 16
- npm

### Getting Started

1. Clone the repository:
```
git clone https://github.com/rexbarq/hashpin.git
```

2. Install dependencies:
```
cd hashpin
npm install
```

3. Build all packages:
```
npm run build
```

4. Set up environment variables:
```

2. Create environment files for the UI (after deploying contracts):

```bash
# In apps/hashpin-ui/.env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_hashpin_contract_address
NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=your_deployed_adapter_address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Running a Local Blockchain

1. Start a local Hardhat node:
```bash
cd packages/hashpin-contracts
npx hardhat node
```

This will start a local blockchain on http://127.0.0.1:8545 with pre-funded accounts.

2. In a new terminal, deploy the contracts to the local node:
```bash
cd packages/hashpin-contracts
npx hardhat run scripts/deploy.ts --network localhost
```

The deployment script will output the contract addresses to add to your frontend .env.local file.

3. After deployment, the contract addresses will be:
   - Printed to the console
   - Saved to the deployments/ directory

4. Copy the contract addresses to your frontend .env.local file:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_hashpin_contract_address
NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=your_deployed_adapter_address
```

5. Run tests:
```
cd packages/hashpin-contracts
npx hardhat test
```

## Smart Contracts

The Hashpin contract allows users to pin cryptographic hashes to the blockchain with optional metadata.

To compile the contracts:
```
cd packages/hashpin-contracts
npm run compile
```

To run contract tests:
```
npm test
```

## Frontend UI

The frontend provides a web interface for interacting with the Hashpin contract directly through Web3 wallets.

To start the UI in development mode:
```
cd apps/hashpin-ui
npm run dev
```

Features:
- Wallet connection (MetaMask, WalletConnect)
- File hashing and pinning to blockchain
- Hash verification
- Transaction status tracking

## License

MIT
