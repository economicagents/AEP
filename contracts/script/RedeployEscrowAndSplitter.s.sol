// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ConditionalEscrowFactory} from "../src/relationships/ConditionalEscrowFactory.sol";
import {RevenueSplitterFactory} from "../src/relationships/RevenueSplitterFactory.sol";

/**
 * @title RedeployEscrowAndSplitterScript
 * @notice Deploys only ConditionalEscrowFactory and RevenueSplitterFactory.
 *         Use after contract changes (e.g. I-13, I-14 remediation).
 *         Preserves CreditFacilityFactory and SLAContractFactory addresses.
 */
contract RedeployEscrowAndSplitterScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            console.log("PRIVATE_KEY not set, using --account signer");
        }

        address treasury = vm.envOr("AEP_TREASURY_ADDRESS", address(0));
        if (treasury == address(0) && deployerPrivateKey != 0) {
            treasury = vm.addr(deployerPrivateKey);
        }

        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        ConditionalEscrowFactory escrowFactory = new ConditionalEscrowFactory(treasury);
        RevenueSplitterFactory splitterFactory = new RevenueSplitterFactory();

        console.log("ConditionalEscrowFactory:", address(escrowFactory));
        console.log("RevenueSplitterFactory:", address(splitterFactory));

        vm.stopBroadcast();
    }
}
