"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ens_1 = require("viem/ens");
var name = "jimleston.eth";
console.log("ENS NAMES");
var normalizedName = (0, ens_1.normalize)(name);
var node = (0, ens_1.namehash)(normalizedName);
console.log(node);
