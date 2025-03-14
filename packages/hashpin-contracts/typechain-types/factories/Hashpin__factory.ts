/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../common";
import type { Hashpin, HashpinInterface } from "../Hashpin";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newDifficulty",
        type: "uint256",
      },
    ],
    name: "DifficultyUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pinner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "string",
        name: "metadata",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "HashPinned",
    type: "event",
  },
  {
    inputs: [],
    name: "INITIAL_DIFFICULTY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentDifficulty",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDifficulty",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
    ],
    name: "getHashDetails",
    outputs: [
      {
        internalType: "address",
        name: "pinner",
        type: "address",
      },
      {
        internalType: "string",
        name: "metadata",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
    ],
    name: "meetsDifficulty",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "metadata",
        type: "string",
      },
    ],
    name: "pinHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "pinnedHashes",
    outputs: [
      {
        internalType: "address",
        name: "pinner",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
      {
        internalType: "string",
        name: "metadata",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newDifficulty",
        type: "uint256",
      },
    ],
    name: "setDifficulty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
    ],
    name: "verifyHash",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b506004600155610a96806100256000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c806380a25abc1161006657806380a25abc1461010257806395314d5114610125578063b6baffe314610148578063d3ed240914610150578063ef020f4a1461015857600080fd5b80631758c77a146100985780634c8460a1146100c35780635c062d6c146100d8578063602512e1146100ef575b600080fd5b6100ab6100a63660046106e1565b610199565b6040516100ba93929190610740565b60405180910390f35b6100d66100d1366004610774565b6102b5565b005b6100e160015481565b6040519081526020016100ba565b6100d66100fd3660046106e1565b6104da565b6101156101103660046106e1565b610571565b60405190151581526020016100ba565b6101386101333660046106e1565b610626565b6040516100ba94939291906107f4565b6001546100e1565b6100e1600481565b6101816101663660046106e1565b6000908152602081905260409020546001600160a01b031690565b6040516001600160a01b0390911681526020016100ba565b60008181526020819052604081206003015460609082906101f25760405162461bcd60e51b815260206004820152600e60248201526d12185cda081b9bdd08199bdd5b9960921b60448201526064015b60405180910390fd5b6000848152602081905260409020805460038201546002830180546001600160a01b039093169290919082906102279061082c565b80601f01602080910402602001604051908101604052809291908181526020018280546102539061082c565b80156102a05780601f10610275576101008083540402835291602001916102a0565b820191906000526020600020905b81548152906001019060200180831161028357829003601f168201915b50505050509150935093509350509193909250565b836102f95760405162461bcd60e51b8152602060048201526014602482015273486173682063616e6e6f7420626520656d70747960601b60448201526064016101e9565b6000848152602081905260409020600301541561034e5760405162461bcd60e51b815260206004820152601360248201527212185cda08185b1c9958591e481c1a5b9b9959606a1b60448201526064016101e9565b6040805160208082018790528183018690528251808303840181526060909201909252805191012061037f81610571565b6103dd5760405162461bcd60e51b815260206004820152602960248201527f4861736820646f6573206e6f74206d65657420646966666963756c74792072656044820152681c5d5a5c995b595b9d60ba1b60648201526084016101e9565b6040518060800160405280336001600160a01b0316815260200186815260200184848080601f016020809104026020016040519081016040528093929190818152602001838380828437600092018290525093855250504260209384015250878152808252604090819020835181546001600160a01b0319166001600160a01b03909116178155918301516001830155820151600282019061047f90826108cb565b506060820151816003015590505084336001600160a01b03167fe4bba2d0223259da1a7581431df71e45609917cfb573b4d2c434499441f23ea18585426040516104cb9392919061098b565b60405180910390a35050505050565b6101008111156105365760405162461bcd60e51b815260206004820152602160248201527f446966666963756c74792063616e6e6f742065786365656420323536206269746044820152607360f81b60648201526084016101e9565b60018190556040518181527f5a790c48cbebdceff3f1fcd445afd12d57302b7196738d61c60dcd491bf3efba9060200160405180910390a150565b600080600860015461058391906109f0565b9050600060086001546105969190610a04565b905060005b828110156105d8578481602081106105b5576105b5610a18565b1a156105c657506000949350505050565b806105d081610a2e565b91505061059b565b50801561061c5760006105ec826008610a47565b60ff901b90508085846020811061060557610605610a18565b1a1660ff161561061a57506000949350505050565b505b5060019392505050565b6000602081905290815260409020805460018201546002830180546001600160a01b039093169391926106589061082c565b80601f01602080910402602001604051908101604052809291908181526020018280546106849061082c565b80156106d15780601f106106a6576101008083540402835291602001916106d1565b820191906000526020600020905b8154815290600101906020018083116106b457829003601f168201915b5050505050908060030154905084565b6000602082840312156106f357600080fd5b5035919050565b6000815180845260005b8181101561072057602081850181015186830182015201610704565b506000602082860101526020601f19601f83011685010191505092915050565b6001600160a01b0384168152606060208201819052600090610764908301856106fa565b9050826040830152949350505050565b6000806000806060858703121561078a57600080fd5b8435935060208501359250604085013567ffffffffffffffff808211156107b057600080fd5b818701915087601f8301126107c457600080fd5b8135818111156107d357600080fd5b8860208285010111156107e557600080fd5b95989497505060200194505050565b60018060a01b038516815283602082015260806040820152600061081b60808301856106fa565b905082606083015295945050505050565b600181811c9082168061084057607f821691505b60208210810361086057634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b601f8211156108c657600081815260208120601f850160051c810160208610156108a35750805b601f850160051c820191505b818110156108c2578281556001016108af565b5050505b505050565b815167ffffffffffffffff8111156108e5576108e5610866565b6108f9816108f3845461082c565b8461087c565b602080601f83116001811461092e57600084156109165750858301515b600019600386901b1c1916600185901b1785556108c2565b600085815260208120601f198616915b8281101561095d5788860151825594840194600190910190840161093e565b508582101561097b5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b604081528260408201528284606083013760006060848301015260006060601f19601f8601168301019050826020830152949350505050565b634e487b7160e01b600052601260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6000826109ff576109ff6109c4565b500490565b600082610a1357610a136109c4565b500690565b634e487b7160e01b600052603260045260246000fd5b600060018201610a4057610a406109da565b5060010190565b81810381811115610a5a57610a5a6109da565b9291505056fea26469706673582212203be077f512cf22faae1160884e4a2febb529ca9471c7eed8e7551309452e9be564736f6c63430008140033";

type HashpinConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: HashpinConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Hashpin__factory extends ContractFactory {
  constructor(...args: HashpinConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      Hashpin & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): Hashpin__factory {
    return super.connect(runner) as Hashpin__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): HashpinInterface {
    return new Interface(_abi) as HashpinInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): Hashpin {
    return new Contract(address, _abi, runner) as unknown as Hashpin;
  }
}
