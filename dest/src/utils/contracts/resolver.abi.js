const RESOLVER_ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "node", "type": "bytes32" },
            { "internalType": "address", "name": "a", "type": "address" }
        ],
        "name": "setAddr",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "node", "type": "bytes32" }
        ],
        "name": "addr",
        "outputs": [
            { "internalType": "address payable", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
export default RESOLVER_ABI;
