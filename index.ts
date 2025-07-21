import { normalize, namehash } from 'viem/ens';

const name = "jimleston.eth";
console.log("ENS NAMES");
const normalizedName = normalize(name);
console.log("NORMALISED NAME: ", normalizedName)
const node = namehash(normalizedName);
console.log("HASHED NODE: ", node);