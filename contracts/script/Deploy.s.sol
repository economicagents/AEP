// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {AEPAccountFactory} from "../src/AEPAccountFactory.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";

contract DeployScript is Script {
    address constant BASE_SEPOLIA_ENTRYPOINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            console.log("PRIVATE_KEY not set, using --account signer");
        }

        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        IEntryPoint entryPoint = IEntryPoint(BASE_SEPOLIA_ENTRYPOINT);
        AEPAccount implementation = new AEPAccount(entryPoint);
        AEPAccountFactory factory = new AEPAccountFactory(entryPoint, address(implementation));

        console.log("AEPAccount implementation:", address(implementation));
        console.log("AEPAccountFactory:", address(factory));

        vm.stopBroadcast();
    }
}
