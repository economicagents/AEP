// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC8004Validation} from "../interfaces/IERC8004Validation.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SLAContract
 * @notice Staking-backed SLA. Provider stakes; consumer claims on breach (validation response below threshold).
 *         Uses SafeERC20 for compatibility with non-standard ERC-20 and fee-on-transfer tokens.
 */
contract SLAContract is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error SLAContractNotProvider();
    error SLAContractNotConsumer();
    error SLAContractNotStaked();
    error SLAContractAlreadyStaked();
    error SLAContractAlreadyBreached();
    error SLAContractValidationFailed();
    error SLAContractBreachThresholdNotMet();
    error SLAContractAgentMismatch();
    error SLAContractZeroAddress();

    event Staked(address indexed provider, uint256 amount);
    event BreachDeclared(address indexed consumer, bytes32 indexed requestHash, uint256 amount);
    event Unstaked(address indexed provider, uint256 amount);

    address public immutable provider;
    address public immutable consumer;
    uint256 public immutable providerAgentId;
    IERC20 public immutable stakeToken;
    uint256 public immutable stakeAmount;
    IERC8004Validation public immutable validationRegistry;
    uint8 public immutable breachThreshold; // if validation response < this, breach

    bool public staked;
    bool public breached;

    constructor(
        address _provider,
        address _consumer,
        uint256 _providerAgentId,
        address _stakeToken,
        uint256 _stakeAmount,
        address _validationRegistry,
        uint8 _breachThreshold
    ) {
        if (
            _provider == address(0) || _consumer == address(0) || _stakeToken == address(0)
                || _validationRegistry == address(0)
        ) {
            revert SLAContractZeroAddress();
        }
        provider = _provider;
        consumer = _consumer;
        providerAgentId = _providerAgentId;
        stakeToken = IERC20(_stakeToken);
        stakeAmount = _stakeAmount;
        validationRegistry = IERC8004Validation(_validationRegistry);
        breachThreshold = _breachThreshold;
    }

    modifier onlyProvider() {
        if (msg.sender != provider) revert SLAContractNotProvider();
        _;
    }

    modifier onlyConsumer() {
        if (msg.sender != consumer) revert SLAContractNotConsumer();
        _;
    }

    function stake() external onlyProvider nonReentrant {
        if (staked) revert SLAContractAlreadyStaked();
        staked = true;
        stakeToken.safeTransferFrom(provider, address(this), stakeAmount);
        emit Staked(provider, stakeAmount);
    }

    function declareBreach(bytes32 requestHash) external onlyConsumer nonReentrant {
        if (breached) revert SLAContractAlreadyBreached();
        if (!staked) revert SLAContractNotStaked();

        (address validator, uint256 agentId, uint8 response,,,) = validationRegistry.getValidationStatus(requestHash);
        if (validator == address(0)) revert SLAContractValidationFailed();
        if (agentId != providerAgentId) revert SLAContractAgentMismatch();
        if (response >= breachThreshold) revert SLAContractBreachThresholdNotMet();

        breached = true;
        staked = false;
        stakeToken.safeTransfer(consumer, stakeAmount);
        emit BreachDeclared(consumer, requestHash, stakeAmount);
    }

    function unstake() external onlyProvider nonReentrant {
        if (!staked) revert SLAContractNotStaked();
        if (breached) revert SLAContractNotStaked();
        staked = false;
        stakeToken.safeTransfer(provider, stakeAmount);
        emit Unstaked(provider, stakeAmount);
    }

    function getState() external view returns (bool _staked, bool _breached, uint256 _balance) {
        return (staked, breached, stakeToken.balanceOf(address(this)));
    }
}
