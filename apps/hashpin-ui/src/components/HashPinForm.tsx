'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "existingTimestamp",
        "type": "uint256"
      }
    ],
    "name": "HashCheckFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pinner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "powHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "HashPinned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newDifficulty",
        "type": "uint256"
      }
    ],
    "name": "DifficultyUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "adapter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "HashClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "adapter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "whitelisted",
        "type": "bool"
      }
    ],
    "name": "AdapterWhitelisted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "name": "pinHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
    "inputs": [],
    "name": "getDifficulty",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "name": "meetsDifficulty",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
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
      }
    ],
    "name": "verifyHash",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
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
        "internalType": "uint256",
        "name": "newDifficulty",
        "type": "uint256"
      }
    ],
    "name": "setDifficulty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

interface ContractError {
  message?: string;
  code?: string | number;
  data?: unknown;
}

export function HashPinForm() {
  // All hooks must be called before any conditional returns
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState('')
  const [fileHash, setFileHash] = useState('')
  const [powHash, setPowHash] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isMining, setIsMining] = useState(false)
  const [miningProgress, setMiningProgress] = useState(0)
  const [validNonce, setValidNonce] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<number>(0)
  const [isLoadingDifficulty, setIsLoadingDifficulty] = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false)

  const publicClient = usePublicClient()
  const { writeContract, data: txHash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txIsSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const isLoading = isPending || isConfirming || isMining || isLoadingDifficulty

  // True success is when transaction is successful and we've verified it was pinned correctly
  const isSuccess = txIsSuccess && verifiedSuccess

  useEffect(() => {
    setMounted(true)

    // Fetch current difficulty from the contract when component mounts
    const fetchDifficulty = async () => {
      if (!publicClient) {
        console.log('No public client available yet')
        return
      }

      try {
        setIsLoadingDifficulty(true)
        
        // Get current chain info
        const chainId = await publicClient.getChainId()
        console.log('🔗 Current Network:', {
          chainId,
          contractAddress: CONTRACT_ADDRESS,
          expectedChainId: 6342 // MegaETH testnet
        })
        
        // In production, ensure we're on MegaETH testnet
        if (process.env.NODE_ENV === 'production' && chainId !== 6342) {
          console.error('Wrong network - expected MegaETH testnet (6342) but got:', chainId)
          setErrorMessage('Please switch to MegaETH testnet to use this application')
          return
        }
        
        try {
          // First check if the contract exists
          const code = await publicClient.getBytecode({ address: CONTRACT_ADDRESS as `0x${string}` })
          if (!code) {
            console.error('No contract found at address:', CONTRACT_ADDRESS)
            setErrorMessage(`No contract found at address: ${CONTRACT_ADDRESS}. Please deploy the contract first.`)
            setDifficulty(4) // Set default difficulty
            return
          }
        } catch (codeError) {
          console.error('Error checking contract code:', codeError)
          // Continue anyway, let the getDifficulty check fail if needed
        }
        
        try {
          const difficulty = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: 'getDifficulty',
          })
          
          const difficultyNumber = Number(difficulty)
          console.log('Current difficulty from contract:', difficultyNumber)
          setDifficulty(difficultyNumber)
        } catch (error: unknown) {
          const contractError = error as ContractError;
          console.error('Error calling getDifficulty:', contractError)
          
          // Specifically handle the decoding error
          if (contractError.message?.includes('could not decode result data') || 
              contractError.message?.includes('BAD_DATA')) {
            setErrorMessage(`Contract error: The contract at ${CONTRACT_ADDRESS} doesn't seem to be a valid Hashpin contract. Please deploy the correct contract.`)
          } else if (contractError.message?.includes('call revert exception')) {
            setErrorMessage('Contract call reverted. The contract may be in an invalid state.')
          } else {
            setErrorMessage(`Contract error: ${contractError.message || 'Unknown error calling contract'}`)
          }
          
          // Set a default difficulty
          setDifficulty(4)
        }
      } catch (error) {
        console.error('Error fetching difficulty:', error)
        // Set a default difficulty if we cannot fetch from contract
        setDifficulty(4)
        
        if (!errorMessage) {
          setErrorMessage('Failed to connect to contract. Please check your network connection.')
        }
      } finally {
        setIsLoadingDifficulty(false)
      }
    }

    if (publicClient) {
      fetchDifficulty()
    }
  }, [errorMessage, publicClient])

  useEffect(() => {
    if (txHash && txIsSuccess) {
      // Attempt to verify the transaction was actually successful by checking for events
      const verifyTransaction = async () => {
        if (!publicClient) {
          console.log('No public client available yet')
          return
        }

        try {
          console.log('Verifying transaction success...');
          
          // Use wagmi's public client
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
          console.log('Transaction receipt:', receipt);
          
          if (!receipt || receipt.status === 'reverted') {
            console.error('Transaction failed or not found');
            setErrorMessage('Transaction failed. The contract may not exist at the specified address.');
            setVerifiedSuccess(false);
            return;
          }
          
          // Check if there were logs/events emitted (a sign the contract exists and executed our function)
          if (!receipt.logs || receipt.logs.length === 0) {
            console.error('No events emitted in transaction. The contract may not exist or the function failed.');
            setErrorMessage('No events were emitted. The hash may not have been properly pinned.');
            setVerifiedSuccess(false);
            return;
          }
          
          // Success - we have events which suggests the contract exists and our function ran
          console.log('Transaction verified successful with events');
          setVerifiedSuccess(true);
          setErrorMessage(null);
        } catch (error) {
          console.error('Error verifying transaction:', error);
          setErrorMessage('Could not verify if the hash was properly pinned.');
          setVerifiedSuccess(false);
        }
      };
      
      verifyTransaction();
    }
  }, [txHash, txIsSuccess, publicClient]);

  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', {
        error: writeError,
        name: writeError.name,
        message: writeError.message,
        cause: writeError.cause,
        details: typeof writeError === 'object' ? Object.keys(writeError) : undefined
      })

      // Extract the error message
      let errorMsg = 'Failed to write to contract.'
      if (writeError.message?.includes('Internal JSON-RPC error')) {
        errorMsg = 'This hash has already been registered.'
      } else if (writeError.message?.includes('contract not deployed') || 
                writeError.message?.includes('address may not exist') ||
                writeError.message?.includes('cannot estimate gas')) {
        errorMsg = 'The contract does not exist at the specified address or is not deployed.'
      } else if (writeError.message) {
        errorMsg = `Error: ${writeError.message}`
      }
      
      setErrorMessage(errorMsg)
      setVerifiedSuccess(false)
    }
  }, [writeError])

  useEffect(() => {
    if (txHash) {
      // Clear any previous error message on successful transaction
      setErrorMessage(null)
      console.log('Transaction hash:', txHash)
    }
  }, [txHash])

  // Function to check if a hash meets the difficulty requirement
  const checkDifficulty = (hash: string): boolean => {
    // Convert difficulty to number of bytes and bits to check
    const fullBytes = Math.floor(difficulty / 8)
    const remainingBits = difficulty % 8
    
    console.log(`Checking difficulty: ${difficulty} (${fullBytes} bytes + ${remainingBits} bits)`);
    
    // Check full bytes first (most efficient)
    for (let i = 0; i < fullBytes; i++) {
      const byteValue = parseInt(hash.slice(2 + i*2, 4 + i*2), 16)
      console.log(`Byte ${i}: ${byteValue.toString(16).padStart(2, '0')}`);
      if (byteValue !== 0) {
        return false
      }
    }
    
    // Check remaining bits if any
    if (remainingBits > 0) {
      // Create mask for remaining bits
      // e.g., for 3 bits: 11100000 (0xE0)
      const mask = 0xFF << (8 - remainingBits)
      console.log(`Mask for ${remainingBits} bits: ${mask.toString(16).padStart(2, '0')}`);
      
      // Apply mask and check if result is 0
      const byteToCheck = parseInt(hash.slice(2 + fullBytes*2, 4 + fullBytes*2), 16)
      console.log(`Byte to check: ${byteToCheck.toString(16).padStart(2, '0')}`);
      console.log(`After mask: ${(byteToCheck & mask).toString(16).padStart(2, '0')}`);
      
      if ((byteToCheck & mask) !== 0) {
        return false
      }
    }
    
    return true
  }

  // Function to mine a valid nonce
  const mineValidNonce = async (hash: string): Promise<{nonce: number, powHash: string} | null> => {
    if (!hash) return null
    
    try {
      console.log("Starting mining process for hash:", hash);
      
      // If difficulty wasn't set by the contract, use a default value
      if (difficulty === 0) {
        console.log("Using default difficulty: 4");
        setDifficulty(4);
      }
      
      setIsMining(true)
      setMiningProgress(0)
      setValidNonce(null)
      setPowHash('')
      
      let nonce = 0
      const maxNonce = 1000000 // Prevent infinite loops
      const updateInterval = 1000 // Update progress every 1000 attempts
      
      console.log("Starting mining loop with difficulty:", difficulty);
      
      // Try a few nonces for debugging
      for (let debugNonce = 0; debugNonce < 5; debugNonce++) {
        const powHash = ethers.keccak256(
          ethers.solidityPacked(["bytes32", "uint256"], [hash, debugNonce])
        )
        console.log(`Debug nonce ${debugNonce} produces hash:`, powHash);
        console.log(`First few bytes: 0x${powHash.slice(2, 10)}`);
        
        // Check with our JavaScript implementation
        const jsCheck = checkDifficulty(powHash);
        console.log(`Meets difficulty (JS): ${jsCheck}`);
      }
      
      while (nonce < maxNonce) {
        // Calculate proof of work hash
        const powHash = ethers.keccak256(
          ethers.solidityPacked(["bytes32", "uint256"], [hash, nonce])
        )
        
        // Check if it meets difficulty
        const meets = checkDifficulty(powHash);
        
        // Log every 10000th attempt
        if (nonce % 10000 === 0) {
          console.log(`Nonce ${nonce} produces hash:`, powHash.slice(0, 10) + "...");
          console.log(`Meets difficulty: ${meets}`);
        }
        
        if (meets) {
          console.log(`Found valid nonce: ${nonce} with hash:`, powHash);
          setValidNonce(nonce)
          setPowHash(powHash)
          setIsMining(false)
          return { nonce, powHash }
        }
        
        nonce++
        
        // Update progress periodically
        if (nonce % updateInterval === 0) {
          setMiningProgress(nonce)
          // Allow UI to update by yielding execution
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
      
      console.error("Mining failed: Could not find valid nonce within reasonable time");
      throw new Error("Could not find valid nonce within reasonable time")
    } catch (error) {
      console.error("Mining error:", error)
      if (error instanceof Error) {
        setErrorMessage(`Failed to mine a valid nonce: ${error.message}`)
      } else {
        setErrorMessage("Failed to mine a valid nonce. Please try again.")
      }
      setIsMining(false)
      return null
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFile(file)
    setErrorMessage(null) // Clear any previous error when selecting a new file
    setValidNonce(null) // Reset nonce when file changes
    setPowHash('') // Reset powHash when file changes
    
    // Calculate hash
    const buffer = await file.arrayBuffer()
    const hash = ethers.keccak256(new Uint8Array(buffer))
    setFileHash(hash)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileHash) return

    setErrorMessage(null) // Clear any previous error when submitting

    try {
      // If we don't have a valid nonce yet, mine one
      let nonce: number;
      if (validNonce === null) {
        const miningResult = await mineValidNonce(fileHash);
        if (miningResult === null) return; // Mining failed
        nonce = miningResult.nonce;
        setPowHash(miningResult.powHash);
      } else {
        nonce = validNonce;
      }

      console.log('Attempting to write to contract:', {
        address: CONTRACT_ADDRESS,
        functionName: 'pinHash',
        args: [fileHash, nonce, metadata],
      });

      // Store these values before transaction in case we need them
      const calculatedPowHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [fileHash, nonce])
      );
      console.log("Calculated powHash before transaction:", calculatedPowHash);
      
      // Make sure we have the powHash even if we didn't mine it in this session
      if (!powHash) {
        setPowHash(calculatedPowHash);
      }

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'pinHash',
        args: [fileHash as `0x${string}`, BigInt(nonce), metadata],
      });
    } catch (error) {
      console.error("Submission error:", error);
      setErrorMessage("Failed to submit transaction. Please try again.");
    }
  }

  // Function to download the PIN file
  const handleDownloadPinFile = () => {
    if (!file || validNonce === null || !fileHash || !powHash) {
      console.error("Missing required data for PIN file:", {
        hasFile: !!file,
        hasValidNonce: validNonce !== null,
        hasFileHash: !!fileHash,
        hasPowHash: !!powHash
      });
      setErrorMessage("Unable to generate PIN file: missing required data");
      return;
    }
    
    try {
      // Convert nonce to bytes32 hex string for the proof
      const nonceAsHex = `0x${validNonce.toString(16).padStart(64, '0')}`;
      
      // Current timestamp
      const timestamp = Math.floor(Date.now() / 1000); // Convert to Unix timestamp (seconds)
      
      // Mock network info - in a real app, this would come from the connected wallet
      const networkId = 1337; // Local hardhat network
      const networkName = 'localhost';
      
      // Mock wallet address - in a real app, this would be the connected wallet address
      const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Default Hardhat account
      
      // Generate the PIN file data structure
      const pinData = {
        version: "1.0",
        fileInfo: {
          hash: fileHash,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream'
        },
        pinData: {
          originalHash: fileHash,
          powHash: powHash,
          timestamp: timestamp,
          metadata: metadata,
          proof: [nonceAsHex]
        },
        pinnerInfo: {
          address: walletAddress
        },
        blockchainInfo: {
          network: networkName,
          networkId: networkId,
          contractAddress: CONTRACT_ADDRESS,
          transactionHash: txHash,
          blockNumber: 0 // This would be updated in a real app
        },
        services: {
          claimUrl: `https://hashpin.io/claim?hash=${fileHash}`,
          verifyUrl: `https://hashpin.io/verify?hash=${fileHash}`
        }
      }
      
      // Stringify with pretty formatting
      const pinFileJSON = JSON.stringify(pinData, null, 2);
      console.log("PIN file data generated:", pinFileJSON.substring(0, 100) + "...");
      
      // Create a blob with the PIN data
      const blob = new Blob([pinFileJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.split('.')[0] || 'file'}.pin`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PIN file:", error);
      setErrorMessage("Error generating PIN file");
    }
  }

  // Render loading state if not mounted
  if (!mounted) {
    return (
      <div className="p-4 border border-gray-800 rounded-lg bg-black">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-900 rounded w-3/4"></div>
          <div className="h-10 bg-gray-900 rounded"></div>
          <div className="h-4 bg-gray-900 rounded w-1/2"></div>
          <div className="h-10 bg-gray-900 rounded"></div>
          <div className="h-10 bg-gray-900 rounded w-1/4"></div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-300">
            Select a file to hash and pin
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black file:text-green-400 file:border file:border-green-400 hover:file:bg-green-400 hover:file:text-black"
            disabled={isLoading}
          />
        </div>
        
        {fileHash && (
          <div>
            <label className="block text-sm font-medium text-gray-300">
              File Hash
            </label>
            <div className="mt-1 p-2 bg-black border border-gray-800 rounded-md text-xs font-mono break-all text-gray-300">
              {fileHash}
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-300">
            Metadata (optional)
          </label>
          <input
            type="text"
            id="metadata"
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder="Add some metadata about this file"
            className="mt-1 block w-full rounded-md border-gray-800 bg-black text-gray-300 shadow-sm focus:border-green-400 focus:ring-green-400 placeholder-gray-600"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Current Difficulty: {isLoadingDifficulty ? 'Loading...' : `${difficulty} bits`}
          </label>
          <p className="text-xs text-gray-500">
            The proof-of-work requires finding a hash with {difficulty} leading zero bits
          </p>
        </div>
        
        {isMining && (
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Mining Proof of Work (Difficulty: {difficulty} bits)
            </label>
            <div className="mt-1">
              <div className="w-full bg-gray-900 rounded-full h-2.5">
                <div className="bg-green-400 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tried {miningProgress.toLocaleString()} nonces...
              </p>
            </div>
          </div>
        )}
        
        {validNonce !== null && (
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Valid Nonce Found
            </label>
            <div className="mt-1 p-2 bg-black border border-gray-800 rounded-md text-xs font-mono text-gray-300">
              {validNonce}
            </div>
          </div>
        )}

        {powHash && (
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Proof-of-Work Hash
            </label>
            <div className="mt-1 p-2 bg-black border border-gray-800 rounded-md text-xs font-mono break-all text-gray-300">
              {powHash}
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${
            isLoading
              ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-black text-green-400 border-green-400 hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400'
          }`}
          disabled={isLoading || !fileHash}
        >
          {isMining ? 'Mining...' : isPending ? 'Pinning...' : isConfirming ? 'Confirming...' : validNonce !== null ? 'Pin Hash' : 'Mine & Pin Hash'}
        </button>
        
        {errorMessage && (
          <div className="text-red-400 text-sm mt-2">
            {errorMessage}
          </div>
        )}
        
        {txIsSuccess && !verifiedSuccess && !errorMessage && (
          <div className="space-y-4 bg-yellow-900/20 p-4 rounded-lg border border-yellow-900">
            <div className="text-yellow-500 font-medium">
              Transaction was processed, but we couldn&apos;t verify if the hash was properly pinned.
              The contract may not exist at the specified address.
            </div>
          </div>
        )}
        
        {isSuccess && (
          <div className="space-y-4 bg-green-900/20 p-4 rounded-lg border border-green-900">
            <div className="text-green-400 font-medium">
              Hash successfully pinned to the blockchain!
            </div>
            
            <button
              type="button"
              onClick={handleDownloadPinFile}
              className="w-full flex justify-center py-2 px-4 border border-green-400 rounded-md shadow-sm text-sm font-medium text-green-400 bg-black hover:bg-green-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
            >
              Download .pin File
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
