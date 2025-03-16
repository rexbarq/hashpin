'use client'

import { useState, useEffect, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'

// Add type definition for window.ethereum
declare global {
  interface Window {
    ethereum?: any; // Use any to avoid conflicts with existing ethereum definitions
  }
}

// Contract configuration (same as in HashPinForm)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''

// Hashpin protocol ABI (only needed functions)
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32[]",
        "name": "merkleProof",
        "type": "bytes32[]"
      },
      {
        "internalType": "address",
        "name": "adapter",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "metadata",
        "type": "bytes"
      }
    ],
    "name": "claimHash",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "powHash",
        "type": "bytes32"
      }
    ],
    "name": "getHashDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "pinner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "adapter",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "whitelisted",
        "type": "bool"
      }
    ],
    "name": "setAdapterWhitelisted",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "adapterWhitelisted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// ABI fragments for the adapter contracts
const ADAPTER_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
    "name": "isHashMinted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Hashpin adapter contracts
// In production, these would come from a configuration or be dynamically loaded
// For now using environment variables or defaults for development
const HASHPIN_ADAPTERS = [
  {
    id: "erc721",
    name: "ERC721 Hashpin NFT",
    address: process.env.NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    description: "Standard NFT adapter - each hash becomes a unique token",
    type: "ERC721"
  },
  {
    id: "erc1155",
    name: "ERC1155 Hashpin Collection",
    address: process.env.NEXT_PUBLIC_ERC1155_ADAPTER_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    description: "Multi-token NFT adapter - supports multiple editions of the same hash",
    type: "ERC1155"
  }
]

// Diagnostic logging for initial adapter state
console.log("🔍 INITIAL ADAPTER CONFIG:", {
  adapters: HASHPIN_ADAPTERS.map(a => ({
    id: a.id,
    name: a.name,
    address: a.address,
    type: a.type
  })),
  erc721Address: process.env.NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS || "not set",
  erc1155Address: process.env.NEXT_PUBLIC_ERC1155_ADAPTER_ADDRESS || "not set"
});

// Interface for our PIN file structure
interface PinFile {
  version: string;
  fileInfo: {
    hash: string;
    name: string;
    size: number;
    mimeType: string;
  };
  pinData: {
    originalHash: string;
    powHash: string;
    timestamp: number;
    metadata: string;
    proof: string[];
  };
  pinnerInfo: {
    address: string;
    ensName?: string;
  };
  blockchainInfo: {
    network: string;
    networkId: number;
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
  };
  services: {
    claimUrl: string;
    verifyUrl: string;
  };
}

export function HashClaimForm() {
  // Debug render count
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`📊 HashClaimForm render #${renderCount.current}`);
  });

  const [mounted, setMounted] = useState(false)
  const [pinFile, setPinFile] = useState<PinFile | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedAdapter, setSelectedAdapter] = useState<string>(HASHPIN_ADAPTERS[0].address)
  const [nftMetadata, setNftMetadata] = useState('')
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [isFileHovered, setIsFileHovered] = useState(false)
  const [adapters, setAdapters] = useState(HASHPIN_ADAPTERS)
  const [isHashAlreadyClaimed, setIsHashAlreadyClaimed] = useState(false)
  
  const { writeContract, data: txHash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Get the connected wallet and public client
  const { address } = useAccount()
  const publicClient = usePublicClient()

  // Read contract to check if adapter is whitelisted
  const { data: isAdapterWhitelisted } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'adapterWhitelisted',
    args: selectedAdapter ? [selectedAdapter as `0x${string}`] : undefined,
    query: {
      enabled: mounted && !!selectedAdapter,
    },
  })

  const isLoading = isPending || isConfirming

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      
      // Log adapter state on initial mount
      console.log('🔍 COMPONENT MOUNT: Current adapters state:', adapters);
      
      // Compare initial state with HASHPIN_ADAPTERS
      if (adapters.length !== HASHPIN_ADAPTERS.length) {
        console.warn(`⚠️ Adapter length mismatch: adapters state (${adapters.length}) vs HASHPIN_ADAPTERS (${HASHPIN_ADAPTERS.length})`);
      }
      
      // Check for identical objects (possible reference issues)
      const isStateAReference = adapters === HASHPIN_ADAPTERS;
      console.log(`📊 Is adapters state a direct reference to HASHPIN_ADAPTERS? ${isStateAReference}`);
    }
  }, [mounted, adapters]);

  // Check if hash is already claimed when a pin file is loaded and adapter is selected
  useEffect(() => {
    const checkIfHashIsClaimed = async () => {
      if (!pinFile || !pinFile.pinData.originalHash || !selectedAdapter || !publicClient) return

      try {
        // Create a contract instance to check if the hash has been minted
        const adapterContract = {
          address: selectedAdapter as `0x${string}`,
          abi: ADAPTER_ABI,
        };
        
        // Call the isHashMinted function on the adapter contract
        const isClaimed = await publicClient.readContract({
          ...adapterContract,
          functionName: 'isHashMinted',
          args: [pinFile.pinData.originalHash as `0x${string}`],
        });
        
        setIsHashAlreadyClaimed(!!isClaimed);
        
        if (!!isClaimed) {
          setErrorMessage('This hash has already been claimed as an NFT.');
        } else {
          setErrorMessage(null);
        }
      } catch (error) {
        console.error('Error checking if hash is claimed:', error);
        setErrorMessage('Could not verify if hash is already claimed. Please try again.');
      }
    }

    checkIfHashIsClaimed();
  }, [pinFile, selectedAdapter, publicClient]);

  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', {
        error: writeError,
        name: writeError.name,
        message: writeError.message,
        cause: writeError.cause,
        details: typeof writeError === 'object' ? Object.keys(writeError) : undefined
      })

      // Extract the error message - look for known error patterns in the error message
      let errorMsg = 'Failed to claim hash.'
      const errorString = writeError.message || '';
      
      // Log the full error string for debugging
      console.log('Full error string:', errorString);
      
      if (errorString.includes('execution reverted')) {
        // This is a contract revert - try to extract the reason
        if (errorString.includes('HashNotPinned') || errorString.includes('hash not pinned')) {
          errorMsg = 'This hash has not been properly pinned. Please verify your .pin file.';
        } else if (errorString.includes('InvalidProof') || errorString.includes('invalid proof')) {
          errorMsg = 'The proof in your .pin file is invalid.';
        } else if (errorString.includes('AlreadyClaimed') || errorString.includes('already claimed')) {
          errorMsg = 'This hash has already been claimed as an NFT.';
          setIsHashAlreadyClaimed(true);
        } else if (errorString.includes('NotPinner') || errorString.includes('not pinner')) {
          errorMsg = 'You are not the original pinner of this hash. Only the original pinner can claim it.';
        } else if (errorString.includes('AdapterNotWhitelisted') || errorString.includes('adapter not whitelisted')) {
          errorMsg = 'The selected adapter is not whitelisted. Please select a different adapter.';
        } else if (errorString.includes('Internal JSON-RPC error')) {
          // Try to extract the specific error from the internal error
          const match = errorString.match(/error=\{(.*?)\}/);
          if (match && match[1]) {
            errorMsg = `Contract error: ${match[1]}`;
          } else {
            errorMsg = 'The transaction was rejected by the blockchain. Check the console for details.';
          }
        }
      } else if (errorString.includes('user rejected transaction')) {
        errorMsg = 'Transaction was rejected in your wallet.';
      }
      
      setErrorMessage(errorMsg)
    }
  }, [writeError])

  useEffect(() => {
    if (txHash) {
      // Clear any previous error message on successful transaction
      setErrorMessage(null)
      console.log('Transaction hash:', txHash)
    }
  }, [txHash])

  // Extract token ID from the transaction receipt when available
  useEffect(() => {
    if (isSuccess && receipt) {
      // Look for Transfer event in the logs
      // This assumes we're using a standard ERC721 or ERC1155 NFT adapter
      try {
        // Try to find a Transfer event in the logs
        const transferLogs = receipt.logs.filter(log => {
          // ERC721 Transfer event topic (keccak256 of "Transfer(address,address,uint256)")
          const erc721TransferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          // ERC1155 TransferSingle event topic (keccak256 of "TransferSingle(address,address,address,uint256,uint256)")
          const erc1155TransferSingleTopic = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
          
          return log.topics[0] === erc721TransferTopic || log.topics[0] === erc1155TransferSingleTopic;
        });
        
        if (transferLogs.length > 0) {
          const transferLog = transferLogs[0];
          
          // Try to extract token ID from the logs
          // ERC721: tokenId is in the 3rd topic
          // ERC1155: either from topics (if indexed) or by decoding the data
          const tokenIdFromLogs = transferLog.topics.length >= 4 && transferLog.topics[3] 
            ? BigInt(transferLog.topics[3])
            : BigInt(0); // Fallback if we can't extract
            
          setTokenId(tokenIdFromLogs);
          
          console.log('Successfully extracted token ID from logs:', tokenIdFromLogs.toString());
        } else {
          console.log('No Transfer events found in receipt logs');
        }
      } catch (error) {
        console.error('Error extracting token ID from logs:', error);
      }
    }
  }, [isSuccess, receipt])

  // Function to handle file upload/drop
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setErrorMessage(null)
      const fileContent = await file.text()
      const parsedPinFile = JSON.parse(fileContent) as PinFile
      
      // Validate the parsed file has the expected structure
      if (!parsedPinFile.pinData || !parsedPinFile.pinData.originalHash || !parsedPinFile.pinData.proof) {
        throw new Error('Invalid PIN file format')
      }
      
      // Verify that powHash exists
      if (!parsedPinFile.pinData.powHash || !parsedPinFile.pinData.powHash.startsWith('0x')) {
        console.warn('PIN file has no valid powHash', parsedPinFile);
        setErrorMessage('Warning: This PIN file does not contain a valid powHash which is required for verifying the hash on-chain.');
        // Continue anyway as we'll check again during claim
      }
      
      setPinFile(parsedPinFile)
      
      // Pre-fill metadata with the original metadata from the pin
      if (parsedPinFile.pinData.metadata) {
        setNftMetadata(parsedPinFile.pinData.metadata)
      }
      
      console.log('Parsed PIN file:', parsedPinFile)
    } catch (error) {
      console.error('Error parsing PIN file:', error)
      setErrorMessage('Failed to parse PIN file. Please ensure it is a valid .pin file.')
      setPinFile(null)
    }
  }

  // Function for drag-and-drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileHovered(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileHovered(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileHovered(false)
    
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.pin') && file.type !== 'application/json') {
      setErrorMessage('Please upload a .pin file')
      return
    }
    
    try {
      setErrorMessage(null)
      const fileContent = await file.text()
      const parsedPinFile = JSON.parse(fileContent) as PinFile
      
      // Validate the parsed file
      if (!parsedPinFile.pinData || !parsedPinFile.pinData.originalHash || !parsedPinFile.pinData.proof) {
        throw new Error('Invalid PIN file format')
      }
      
      setPinFile(parsedPinFile)
      
      // Pre-fill metadata with the original metadata from the pin
      if (parsedPinFile.pinData.metadata) {
        setNftMetadata(parsedPinFile.pinData.metadata)
      }
      
      console.log('Parsed PIN file:', parsedPinFile)
    } catch (error) {
      console.error('Error parsing PIN file:', error)
      setErrorMessage('Failed to parse PIN file. Please ensure it is a valid .pin file.')
      setPinFile(null)
    }
  }

  // Function to claim the hash
  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinFile) return
    
    try {
      setErrorMessage(null)
      
      // Show status to user that we're validating the claim
      console.log('Starting validation for hash claim...');
      
      // Get the necessary data from the PIN file
      const { originalHash, proof } = pinFile.pinData
      
      // Enhanced logging for debugging
      console.log('Connected wallet address:', address);
      console.log('Pinner address from PIN file:', pinFile.pinnerInfo.address);
      
      // Step 1: Verify the pinner address matches the connected wallet
      console.log('Step 1: Verifying pinner address...');
      const connectedAddress = address?.toLowerCase();
      const pinnerAddress = pinFile.pinnerInfo.address.toLowerCase();
      
      if (!connectedAddress) {
        setErrorMessage('No wallet connected. Please connect your wallet first.');
        return;
      }
      
      if (connectedAddress !== pinnerAddress) {
        setErrorMessage(`Only the original pinner (${pinFile.pinnerInfo.address}) can claim this hash. Your connected address (${address}) does not match.`);
        return;
      }
      console.log('✅ Pinner address verification passed');
      
      // Step 2: Validate PIN file data
      console.log('Step 2: Validating PIN file data...');
      // Log pinning data for debugging
      console.log('PIN data:', {
        originalHash,
        powHash: pinFile.pinData.powHash,
        contractAddress: pinFile.blockchainInfo.contractAddress,
        currentContractAddress: CONTRACT_ADDRESS,
        networkId: pinFile.blockchainInfo.networkId,
        proof
      });
      
      // Verify that the powHash exists and is in the correct format
      if (!pinFile.pinData.powHash || !pinFile.pinData.powHash.startsWith('0x')) {
        setErrorMessage('This PIN file does not contain a valid powHash. The hash might not have been properly pinned.');
        return;
      }
      console.log('✅ PIN file data validation passed');
      
      // Step 3: Verify contract addresses
      console.log('Step 3: Verifying contract addresses...');
      // Verify the contract address matches
      if (CONTRACT_ADDRESS.toLowerCase() !== pinFile.blockchainInfo.contractAddress.toLowerCase()) {
        console.warn('Contract address mismatch', {
          pinFileContract: pinFile.blockchainInfo.contractAddress,
          currentContract: CONTRACT_ADDRESS
        });
        // Just warn but continue - this might be expected when using different environments
      }
      console.log('✅ Contract address verification passed (or warning noted)');

      // Step 4: Check if hash has already been claimed
      console.log('Step 4: Checking if hash is already claimed...');
      if (publicClient) {
        const adapterContract = {
          address: selectedAdapter as `0x${string}`,
          abi: ADAPTER_ABI,
        };
        
        try {
          console.log('Checking adapter contract...');
          const isClaimed = await publicClient.readContract({
            ...adapterContract,
            functionName: 'isHashMinted',
            args: [originalHash as `0x${string}`],
          });
          
          if (!!isClaimed) {
            setErrorMessage('This hash has already been claimed as an NFT. You cannot claim it again.');
            setIsHashAlreadyClaimed(true);
            return;
          }
          console.log('✅ Hash is not already claimed');
        } catch (error) {
          console.error('Error checking claim status:', error);
          // Continue anyway since the contract will reject duplicate claims
        }
        
        // Step 5: Verify hash exists on-chain
        console.log('Step 5: Verifying hash exists on-chain...');
        try {
          console.log('Checking for hash details on-chain...');
          const hashDetails = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: 'getHashDetails',
            args: [pinFile.pinData.powHash as `0x${string}`],
          });
          
          // If we reach here, the hash exists - now check if the pinner matches
          console.log('Hash details from contract:', hashDetails);
          console.log('✅ Hash found on-chain');
          
          // hashDetails could be an array/tuple or an object depending on how viem returns the data
          let onChainPinner: string | undefined;
          
          if (Array.isArray(hashDetails)) {
            // Handle tuple return format [pinner, metadata, timestamp]
            onChainPinner = hashDetails[0] as string;
          } else if (hashDetails && typeof hashDetails === 'object' && 'pinner' in hashDetails) {
            // Handle object return format {pinner, metadata, timestamp}
            onChainPinner = hashDetails.pinner as string;
          }
          
          if (onChainPinner) {
            const normalizedOnChainPinner = onChainPinner.toLowerCase();
            if (normalizedOnChainPinner !== connectedAddress) {
              setErrorMessage(`You are not the original pinner of this hash. The hash was pinned by ${onChainPinner}.`);
              return;
            }
            console.log('✅ On-chain pinner verification passed');
          }
        } catch (error: any) {
          // If this fails, the hash might not exist on-chain
          console.error('Error getting hash details:', error);
          
          // Check for specific "Hash not found" error
          if (error.message && (
            error.message.includes('Hash not found') || 
            error.message.includes('reverted') || 
            error.message.includes('not exist')
          )) {
            console.error('This hash has not been properly pinned on the blockchain.');
            setErrorMessage('This hash has not been properly pinned on the blockchain. The hash must be successfully pinned before it can be claimed as an NFT.');
            return; // Stop the claim process
          }
          
          console.warn('This hash might not be correctly pinned on-chain.');
        }
      }
      
      // Step 6: Prepare to submit transaction
      console.log('Step 6: Preparing transaction data...');
      // Prepare metadata in contract-compatible format (hex string)
      // This properly converts the string to hex format with 0x prefix
      const encodedMetadata = ethers.hexlify(ethers.toUtf8Bytes(nftMetadata)) as `0x${string}`
      
      console.log('Claiming hash with:', {
        hash: originalHash,
        merkleProof: proof,
        adapter: selectedAdapter,
        metadata: nftMetadata,
        encodedMetadata
      })
      
      // Warn if adapter is not whitelisted
      if (isAdapterWhitelisted === false) {
        console.warn('Selected adapter is not whitelisted, transaction may fail');
      }
      
      // Step 7: Submit transaction
      console.log('Step 7: Submitting claim transaction...');
      try {
        const result = await writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'claimHash',
          args: [
            originalHash as `0x${string}`,
            proof as `0x${string}`[],
            selectedAdapter as `0x${string}`,
            encodedMetadata
          ],
        });
        console.log('Transaction submitted:', result);
      } catch (error: any) {
        console.error('Transaction error:', error);
        
        // Provide more specific error messages based on the error
        const errorMsg = error.message || '';
        
        if (errorMsg.includes('hash not pinned') || errorMsg.includes('invalid proof')) {
          setErrorMessage('This hash has not been properly pinned or has an invalid proof. Please verify your .pin file.');
        } else if (errorMsg.includes('already claimed')) {
          setErrorMessage('This hash has already been claimed as an NFT.');
          setIsHashAlreadyClaimed(true);
        } else if (errorMsg.includes('not pinner')) {
          setErrorMessage('You are not the original pinner of this hash. Only the original pinner can claim it.');
        } else if (errorMsg.includes('adapter not whitelisted')) {
          setErrorMessage('The selected adapter is not whitelisted. Please choose a different adapter.');
        } else {
          setErrorMessage(`Failed to claim hash: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      console.error('Error claiming hash:', error);
      setErrorMessage(`Failed to claim hash: ${error.message || 'Unknown error'}`);
    }
  }

  // Function to generate the OpenSea URL safely
  const getOpenSeaUrl = () => {
    if (tokenId === null) return '#';
    const adapterAddress = selectedAdapter || '';
    return `https://opensea.io/assets/${adapterAddress}/${tokenId.toString()}`;
  };

  // Debug dropdown options without changing behavior
  const logAdapters = () => {
    // Count addresses for diagnostic purposes
    const adapterAddressCounts: Record<string, number> = {};
    adapters.forEach(adapter => {
      adapterAddressCounts[adapter.address] = (adapterAddressCounts[adapter.address] || 0) + 1;
    });
    
    // Find duplicates
    const duplicateAddresses = Object.entries(adapterAddressCounts)
      .filter(([_, count]) => count > 1)
      .map(([address]) => address);
    
    if (duplicateAddresses.length > 0) {
      console.warn('⚠️ DUPLICATE ADDRESSES DETECTED in dropdown:', 
        duplicateAddresses.map(address => {
          const dupes = adapters.filter(a => a.address === address);
          return {
            address,
            count: dupes.length,
            adapters: dupes.map(a => a.name)
          };
        })
      );
    }
    
    // Annotate adapters with index for debugging
    return adapters.map((adapter, index) => ({
      ...adapter,
      _debugIndex: index
    }));
  };

  // Inside the HashClaimForm component, add this function to add NFT to MetaMask
  const addNFTToMetaMask = async () => {
    if (!tokenId || !selectedAdapter) {
      setErrorMessage('Missing token information. Cannot add to MetaMask.');
      return;
    }

    try {
      // Check if ethereum is available (MetaMask is installed)
      const ethereum = window.ethereum;
      if (!ethereum || typeof ethereum.request !== 'function') {
        setErrorMessage('MetaMask is not installed or not properly configured. Please install it to use this feature.');
        return;
      }

      // Get the adapter contract to fetch token information
      const adapterName = adapters.find(a => a.address === selectedAdapter)?.name || 'Hashpin NFT';
      const adapterType = adapters.find(a => a.address === selectedAdapter)?.type || 'ERC721';
      
      console.log('Requesting MetaMask to watch NFT asset:', {
        address: selectedAdapter,
        tokenId: tokenId.toString(),
        type: adapterType,
        name: adapterName
      });

      // Request MetaMask to watch the asset
      const wasAdded = await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721', // Currently MetaMask uses this for all NFTs
          options: {
            address: selectedAdapter, // The NFT contract address
            tokenId: tokenId.toString(), // The token ID as a string
          },
        },
      });

      if (wasAdded) {
        console.log('NFT was successfully added to MetaMask');
      } else {
        console.log('User declined to add the NFT to MetaMask');
      }
    } catch (error) {
      console.error('Error adding NFT to MetaMask:', error);
      // Safe error message extraction
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : 'Unknown error';
      setErrorMessage(`Failed to add NFT to MetaMask: ${errorMessage}`);
    }
  };

  // Render loading state
  if (!mounted) {
    return (
      <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
      <form onSubmit={handleClaim} className="space-y-4">
        <div>
          <label htmlFor="pin-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select a .pin file to claim as NFT
          </label>
          
          {/* File Drop Zone */}
          <div 
            className={`mt-1 p-6 border-2 border-dashed ${
              isFileHovered 
                ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            } rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('pin-file')?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Drag and drop your .pin file here, or click to browse
            </p>
            {pinFile && (
              <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                {pinFile.fileInfo.name} selected
              </p>
            )}
          </div>
          <input
            type="file"
            id="pin-file"
            accept=".pin,application/json"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Upload a .pin file generated when you pinned a hash
          </p>
        </div>
        
        {pinFile && (
          <>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">PIN File Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 text-sm">
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-500 dark:text-gray-400">File Name</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">{pinFile.fileInfo.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Original Hash</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-xs break-all">
                    {pinFile.pinData.originalHash}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Pinner</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-xs">
                    {pinFile.pinnerInfo.address}
                  </dd>
                </div>
              </dl>
            </div>
            
            <div>
              <label htmlFor="adapter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select NFT Adapter
              </label>
              <select
                id="adapter"
                value={selectedAdapter}
                onChange={(e) => setSelectedAdapter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                disabled={isLoading}
              >
                {logAdapters().map((adapter, index) => {
                  console.log(`🔍 Rendering adapter option #${index}:`, adapter.name, adapter.address, adapter._debugIndex);
                  return (
                    <option 
                      key={`${adapter.id}-${index}`} 
                      value={adapter.address}
                      data-debug-index={adapter._debugIndex}
                    >
                      {adapter.name} - {adapter.description} ({index})
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This adapter determines the type of NFT that will be created
              </p>
              
              {isAdapterWhitelisted === false && (
                <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                  ⚠️ This adapter is not whitelisted in the Hashpin contract and may not work
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="nft-metadata" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                NFT Metadata
              </label>
              <textarea
                id="nft-metadata"
                value={nftMetadata}
                onChange={(e) => setNftMetadata(e.target.value)}
                placeholder="Add metadata for your NFT"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This metadata will be stored with your NFT (pre-filled with original metadata)
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedAdapter === adapters[0].address ? 
                  "For ERC721 adapters, this can be a JSON string with NFT metadata properties" : 
                  "For ERC1155 adapters, this is typically used for collection-wide properties"}
              </p>
            </div>
            
            <button
              type="submit"
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
              disabled={isLoading || isHashAlreadyClaimed}
            >
              {isPending ? 'Claiming...' : isConfirming ? 'Confirming...' : isHashAlreadyClaimed ? 'Hash Already Claimed' : 'Claim as NFT'}
            </button>
          </>
        )}
        
        {errorMessage && (
          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                <div className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {errorMessage}
                  {/* Add a help message for common errors */}
                  {errorMessage.includes('not been properly pinned') && (
                    <div className="mt-2 text-xs">
                      <p>For a hash to be claimable as an NFT, it must first be properly pinned on the blockchain.</p>
                      <p className="mt-1">Possible reasons for this error:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>The hash was never successfully pinned (the transaction may have failed)</li>
                        <li>You're connected to a different network than where the hash was pinned</li>
                        <li>The .pin file contains incorrect proof data</li>
                        <li>The contract address in your environment doesn't match the one used for pinning</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isSuccess && (
          <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Success</h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                  <p className="font-medium">Hash successfully claimed as NFT!</p>
                  
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">NFT Details</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Contract Address</dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100 font-mono break-all flex items-center">
                          {selectedAdapter}
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedAdapter);
                              // Could add a toast notification here
                            }}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                            title="Copy address"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Token ID</dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100 font-mono break-all flex items-center">
                          {tokenId?.toString()}
                          <button 
                            onClick={() => {
                              if (tokenId) navigator.clipboard.writeText(tokenId.toString());
                            }}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                            title="Copy token ID"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Transaction</dt>
                        <dd className="mt-1 text-gray-900 dark:text-gray-100">
                          <a 
                            href={`https://etherscan.io/tx/${txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-600 dark:hover:text-blue-400 font-mono text-xs"
                          >
                            {txHash?.substring(0, 10)}...{txHash?.substring(txHash.length - 8)}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={addNFTToMetaMask}
                      className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.1 7.83l-9.92-4.7c-.17-.11-.44-.11-.61 0L1.66 7.83c-.3.13-.48.39-.48.7v7.74c0 .53.27 1.02.71 1.31l9.88 5.18c.13.07.27.1.42.1s.29-.03.42-.1l9.88-5.18c.44-.29.71-.78.71-1.31V8.53c0-.31-.18-.57-.48-.7z" />
                      </svg>
                      Add to MetaMask
                    </button>
                    
                    <a 
                      href={getOpenSeaUrl()}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                      View on OpenSea
                    </a>
                  </div>

                  <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Manual Addition to MetaMask:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Open MetaMask and click on "NFTs" tab</li>
                      <li>Click "Import NFTs"</li>
                      <li>Paste the contract address: <span className="font-mono">{selectedAdapter}</span></li>
                      <li>Enter Token ID: <span className="font-mono">{tokenId?.toString()}</span></li>
                      <li>Click "Import"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
} 