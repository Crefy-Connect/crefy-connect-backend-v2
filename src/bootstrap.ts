import ENSL1SubnameRegistrarService from "./web3/ens.services.js";

(async () => {
    try {
        console.log("Starting testing");
        const ens = new ENSL1SubnameRegistrarService(
            'sepolia',
            '0x5185ccf835b7612dfba9daf1d8bd0ee6d0eccc4b3b073ea5dc62ef8828b89cdd',
            '0x95bb9f387e6d345537b6badf0e2313249ba88fad'
        );

        const subnames = await ens.viewAllSubnames();
        console.log("Subnames:", subnames);
    } catch (error) {
        console.error("Error during ENS test:", error);
    }
})();