'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
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

  const { writeContract, data: txHash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const isLoading = isPending || isConfirming || isMining || isLoadingDifficulty

  useEffect(() => {
    setMounted(true)

    // Fetch current difficulty from the contract when component mounts
    const fetchDifficulty = async () => {
      try {
        setIsLoadingDifficulty(true)
        // This is a simplified approach - in production you should use a proper provider
        // and contract instance
        const provider = new ethers.JsonRpcProvider()
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
        const difficultyBigInt = await contract.getDifficulty()
        const difficultyNumber = Number(difficultyBigInt)
        console.log('Current difficulty from contract:', difficultyNumber)
        setDifficulty(difficultyNumber)
      } catch (error) {
        console.error('Error fetching difficulty:', error)
        // Set a default difficulty if we cannot fetch from contract
        setDifficulty(4)
      } finally {
        setIsLoadingDifficulty(false)
      }
    }

    fetchDifficulty()
  }, [])

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
      } else if (writeError.message) {
        errorMsg = `Error: ${writeError.message}`
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
      };
      
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
      <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select a file to hash and pin
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-200"
            disabled={isLoading}
          />
        </div>
        
        {fileHash && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              File Hash
            </label>
            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-md text-xs font-mono break-all">
              {fileHash}
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Metadata (optional)
          </label>
          <input
            type="text"
            id="metadata"
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder="Add some metadata about this file"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Difficulty: {isLoadingDifficulty ? 'Loading...' : `${difficulty} bits`}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The proof-of-work requires finding a hash with {difficulty} leading zero bits
          </p>
        </div>
        
        {isMining && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mining Proof of Work (Difficulty: {difficulty} bits)
            </label>
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tried {miningProgress.toLocaleString()} nonces...
              </p>
            </div>
          </div>
        )}
        
        {validNonce !== null && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valid Nonce Found
            </label>
            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-md text-xs font-mono">
              {validNonce}
            </div>
          </div>
        )}

        {powHash && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Proof-of-Work Hash
            </label>
            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-md text-xs font-mono break-all">
              {powHash}
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
          disabled={isLoading || !fileHash}
        >
          {isMining ? 'Mining...' : isPending ? 'Pinning...' : isConfirming ? 'Confirming...' : validNonce !== null ? 'Pin Hash' : 'Mine & Pin Hash'}
        </button>
        
        {errorMessage && (
          <div className="text-red-500 text-sm mt-2">
            {errorMessage}
          </div>
        )}
        
        {isSuccess && (
          <div className="space-y-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-green-600 dark:text-green-400 font-medium">
              Hash successfully pinned to the blockchain!
            </div>
            
            <button
              type="button"
              onClick={handleDownloadPinFile}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Download .pin File
            </button>
          </div>
        )}
      </form>
    </div>
  )
}