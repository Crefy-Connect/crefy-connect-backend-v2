import { ethers } from "ethers";
import { IBundler } from "@biconomy/bundler";
import { IPaymaster } from "@biconomy/paymaster";
import { ChainId } from "@biconomy/core-types";

export type SmartAccountConfig = {
    signer: ethers.Signer;
    chainId: ChainId;
    bundler: IBundler;
    paymaster: IPaymaster;
    entryPointAddress: string;
    accountAddress?: string;
    index?: number;
}


export type GaslessTransaction = {
    to: string;
    data: string;
    value?: string;
}

export type TransactionResult = {
    txHash: string;
    userOpHash: string;
}
