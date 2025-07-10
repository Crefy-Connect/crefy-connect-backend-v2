export const ENS_FACTORY_CONTRACT_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "contractAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "parentNode",
                "type": "bytes32"
            }
        ],
        "name": "SubnameContractCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_parentNode",
                "type": "bytes32"
            }
        ],
        "name": "createSubnameRegistrar",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllSubnameContracts",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "getContractsByOwner",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "parentNode",
                "type": "bytes32"
            }
        ],
        "name": "parentNodeExists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "subnameOwner",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "subNameContractsByOwner",
        "outputs": [
            {
                "internalType": "address",
                "name": "subnameContracts",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "subnameContracts",
        "outputs": [
            {
                "internalType": "contract L1Subnames",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const ENSFactoryContractABI = ENS_FACTORY_CONTRACT_ABI;