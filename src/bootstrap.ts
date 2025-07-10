import ENSL1SubnameRegistrarService from "./web3/ens.services.js";
import readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import { parseEther } from "viem";

const privateKey = "0x1895606f6f2d1e720670c578df0495e03c6be7a45245a40f88ec465d1a30da7a";
const chainName = "sepolia";
const registrarService = new ENSL1SubnameRegistrarService(chainName, privateKey, '0x062D64Eb51f906d4cFfEf3F2954866197c63c648');

// Create readline interface
const rl = readline.createInterface({ input, output });

// Main menu function
function showMenu() {
    console.log('\n===== ENS L1 Subname Registrar Service =====');
    console.log('1. Get Name Wrapper Address');
    console.log('2. Get ID');
    console.log('3. Get Subname Owner');
    console.log('4. Check if Name is Taken');
    console.log('5. Check Parent Node Ownership');
    console.log('6. Get Parent Node');
    console.log('7. Get Subname Owner by Node');
    console.log('8. View All Subnames');
    console.log('9. Check Interface Support');
    console.log('10. Claim Name');
    console.log('11. Get Balance');
    console.log('0. Exit');
    console.log('===========================================');
}

// Function to handle user input
async function handleInput(choice: string) {
    switch (choice) {
        case '1':
            try {
                const address = await registrarService.getNameWrapperAddress();
                console.log('\nName Wrapper Address:', address);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '2':
            try {
                const id = await registrarService.getId();
                console.log('\nContract ID:', id);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '3':
            rl.question('\nEnter subname label: ', async (label) => {
                try {
                    const owner = await registrarService.getSubnameOwner(label);
                    console.log(`\nOwner of "${label}":`, owner);
                } catch (error: any) {
                    console.error('\nError:', error.message);
                }
                showMenu();
            });
            return;

        case '4':
            rl.question('\nEnter node to check: ', async (node) => {
                try {
                    const isTaken = await registrarService.isNameTaken(node);
                    console.log(`\nIs name "${node}" taken?`, isTaken);
                } catch (error: any) {
                    console.error('\nError:', error.message);
                }
                showMenu();
            });
            return;

        case '5':
            try {
                const ownsNode = await registrarService.ownsParentNode();
                console.log('\nDoes contract own parent node?', ownsNode);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '6':
            try {
                const parentNode = await registrarService.getParentNode();
                console.log('\nParent Node:', parentNode);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '7':
            rl.question('\nEnter node to check owner: ', async (node) => {
                try {
                    const owner = await registrarService.getSubnameOwnerByNode(node);
                    console.log(`\nOwner of node "${node}":`, owner);
                } catch (error: any) {
                    console.error('\nError:', error.message);
                }
                showMenu();
            });
            return;

        case '8':
            try {
                const subnames = await registrarService.viewAllSubnames();
                console.log('\nAll Subnames:', subnames);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '9':
            rl.question('\nEnter interface ID to check: ', async (interfaceId) => {
                try {
                    const isSupported = await registrarService.supportsInterface(interfaceId);
                    console.log(`\nIs interface "${interfaceId}" supported?`, isSupported);
                } catch (error: any) {
                    console.error('\nError:', error.message);
                }
                showMenu();
            });
            return;

        case '10':
            rl.question('\nEnter name to claim: ', async (name) => {
                try {
                    console.log('\nStarting name claim process...');
                    const startTime = Date.now();

                    const result: any = await registrarService.claimName(name);

                    const endTime = Date.now();
                    const timeTaken = (endTime - startTime) / 1000; // Convert to seconds

                    console.log('\nClaim successful!');
                    if (result.status === 'error' && result.details.shortBy) {
                        console.error(`Estimated cost: ${result.details.formatted.estimatedCost}`);
                        console.error(`Your balance: ${result.details.formatted.accountBalance}`);
                    } else if (result.status === 'error') {
                        console.log("RESULT", JSON.stringify(result));
                        const gasInfoMatch = result.error.match(
                            /maxFeePerGas:\s+([^\s]+)\s+gwei.*?maxPriorityFeePerGas:\s+([^\s]+)\s+gwei/s
                        );

                        if (gasInfoMatch) {
                            console.log('\nEstimated Gas Parameters:');
                            console.log(`Max Fee Per Gas: ${gasInfoMatch[1]} gwei`);
                            console.log(`Max Priority Fee Per Gas: ${gasInfoMatch[2]} gwei`);
                        }

                        if (result.error.includes('revert')) {
                            console.error('This likely means the name is already taken or you lack permission.');
                        }
                    } else {
                        console.log(`Success! Transaction hash: ${result.hash}`);
                        console.log(`Gas used: ${result.gasUsed.toString()}`);
                        console.log(`Cost: ${result.formattedCost}`);
                    }
                } catch (error: any) {
                    console.error('\nError:', error.message);
                    if (error.cause) {
                        console.error('Details:', error.cause);
                    }
                }
                showMenu();
            });
            return;

        case '11':
            try {
                const result = await registrarService.getBalance();
                console.log(`\nAddress: ${result.address}`);
                console.log(`\nSepolia ETH Balance: ${result.balance} ETH`);
            } catch (error: any) {
                console.error('\nError:', error.message);
            }
            break;

        case '0':
            console.log('\nExiting...');
            rl.close();
            return;

        default:
            console.log('\nInvalid choice. Please try again.');
    }

    showMenu();
}

// Start the CLI
console.log('ENS L1 Subname Registrar Service CLI');
showMenu();

rl.on('line', (input) => {
    handleInput(input.trim());
});

rl.on('close', () => {
    console.log('Goodbye!');
    process.exit(0);
});