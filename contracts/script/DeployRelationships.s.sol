// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {CreditFacilityFactory} from "../src/relationships/CreditFacilityFactory.sol";
import {ConditionalEscrowFactory} from "../src/relationships/ConditionalEscrowFactory.sol";
import {RevenueSplitterFactory} from "../src/relationships/RevenueSplitterFactory.sol";
import {SLAContractFactory} from "../src/relationships/SLAContractFactory.sol";

contract DeployRelationshipsScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            console.log("PRIVATE_KEY not set, using --account signer");
        }

        // Treasury for origination/setup fees. Use address(0) for fee-free (callers must pass fee=0).
        // Defaults to address derived from PRIVATE_KEY when AEP_TREASURY_ADDRESS not set.
        address treasury = vm.envOr("AEP_TREASURY_ADDRESS", address(0));
        if (treasury == address(0) && deployerPrivateKey != 0) {
            treasury = vm.addr(deployerPrivateKey);
        }
        if (treasury == address(0)) {
            console.log(
                "AEP_TREASURY_ADDRESS not set and PRIVATE_KEY not available; factories will not collect fees (pass fee=0)"
            );
        }

        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        CreditFacilityFactory creditFactory = new CreditFacilityFactory(treasury);
        ConditionalEscrowFactory escrowFactory = new ConditionalEscrowFactory(treasury);
        RevenueSplitterFactory splitterFactory = new RevenueSplitterFactory();
        SLAContractFactory slaFactory = new SLAContractFactory(treasury);

        console.log("CreditFacilityFactory:", address(creditFactory));
        console.log("ConditionalEscrowFactory:", address(escrowFactory));
        console.log("RevenueSplitterFactory:", address(splitterFactory));
        console.log("SLAContractFactory:", address(slaFactory));

        vm.stopBroadcast();
    }
}
