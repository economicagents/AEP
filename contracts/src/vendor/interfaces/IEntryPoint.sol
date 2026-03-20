// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.5;

import {PackedUserOperation} from "./PackedUserOperation.sol";
import {IStakeManager} from "./IStakeManager.sol";
import {IAggregator} from "./IAggregator.sol";
import {INonceManager} from "./INonceManager.sol";

interface IEntryPoint is IStakeManager, INonceManager {
    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    event AccountDeployed(bytes32 indexed userOpHash, address indexed sender, address factory, address paymaster);

    event UserOperationRevertReason(
        bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason
    );

    event PostOpRevertReason(bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason);

    event UserOperationPrefundTooLow(bytes32 indexed userOpHash, address indexed sender, uint256 nonce);

    event BeforeExecution();

    event SignatureAggregatorChanged(address indexed aggregator);

    error FailedOp(uint256 opIndex, string reason);
    error FailedOpWithRevert(uint256 opIndex, string reason, bytes inner);
    error PostOpReverted(bytes returnData);
    error SignatureValidationFailed(address aggregator);
    error SenderAddressResult(address sender);

    struct UserOpsPerAggregator {
        PackedUserOperation[] userOps;
        IAggregator aggregator;
        bytes signature;
    }

    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

    function handleAggregatedOps(UserOpsPerAggregator[] calldata opsPerAggregator, address payable beneficiary) external;

    function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);

    struct ReturnInfo {
        uint256 preOpGas;
        uint256 prefund;
        uint256 accountValidationData;
        uint256 paymasterValidationData;
        bytes paymasterContext;
    }

    struct AggregatorStakeInfo {
        address aggregator;
        StakeInfo stakeInfo;
    }

    function getSenderAddress(bytes memory initCode) external;

    error DelegateAndRevert(bool success, bytes ret);

    function delegateAndRevert(address target, bytes calldata data) external;
}
