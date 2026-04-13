from web3 import Web3
import hashlib
import json

# Connect to private blockchain
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # from hardhat
account = w3.eth.account.from_key(PRIVATE_KEY)

CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_hash", "type": "string"}],
        "name": "storeLog",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)


def hash_data(data):
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def log_to_blockchain(data):
    data_hash = hash_data(data)

    tx = contract.functions.storeLog(data_hash).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 200000,
        "gasPrice": w3.to_wei("1", "gwei")
    })

    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    return {
        "tx_hash": tx_hash.hex(),
        "data_hash": data_hash
    }