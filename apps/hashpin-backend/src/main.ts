import express from 'express';
// Will be used when contract integration is implemented
// import { ethers } from 'ethers';
import { json } from 'body-parser';

// Import ABI and contract utilities (to be implemented in hashpin-utils)
// import { HashpinABI } from '@hashpin-monorepo/hashpin-utils';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(json());

// Environment variables - will be used when contract integration is implemented
// const PROVIDER_URL = process.env.PROVIDER_URL || 'http://localhost:8545';
// const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
// const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';

// Setup provider and wallet - will be used when contract integration is implemented
// const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
// const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract instance
// const hashpinContract = new ethers.Contract(CONTRACT_ADDRESS, HashpinABI, wallet);

// Routes
app.post('/api/hash', async (req, res) => {
  try {
    const { hash, metadata = '' } = req.body;
    
    if (!hash) {
      return res.status(400).json({ error: 'Hash is required' });
    }
    
    // TODO: Implement contract interaction once contract is deployed
    // const tx = await hashpinContract.pinHash(hash, metadata || '');
    // const receipt = await tx.wait();
    
    // Mock response for now
    console.log(`Hash received: ${hash}, metadata: ${metadata}`);
    
    return res.status(200).json({
      success: true, 
      message: 'Hash pinned successfully',
      hash,
      // txHash: receipt.hash,
    });
  } catch (error) {
    console.error('Error pinning hash:', error);
    return res.status(500).json({ 
      error: 'Failed to pin hash',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Hashpin backend listening on port ${port}`);
});

export default app; 