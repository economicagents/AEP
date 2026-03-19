// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC8004Validation} from "../interfaces/IERC8004Validation.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ConditionalEscrow
 * @notice Escrow for multi-step agent workflows. Consumer deposits; provider executes; release on 8004 validation.
 *         Supports single-amount (legacy) or multi-milestone with partial release.
 *         Uses SafeERC20 for compatibility with non-standard ERC-20 and fee-on-transfer tokens.
 */
contract ConditionalEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum State {
        FUNDED,
        IN_PROGRESS,
        VALIDATING,
        RELEASED,
        DISPUTED
    }

    struct Milestone {
        uint256 amount;
        bytes32 requestHash;
        bool released;
    }

    error ConditionalEscrowNotConsumer();
    error ConditionalEscrowNotProvider();
    error ConditionalEscrowWrongState();
    error ConditionalEscrowZeroAmount();
    error ConditionalEscrowValidationFailed();
    error ConditionalEscrowAgentMismatch();
    error ConditionalEscrowZeroAddress();
    error ConditionalEscrowInvalidMilestoneIndex();
    error ConditionalEscrowMilestoneAlreadySubmitted();

    event Funded(address indexed consumer, uint256 amount);
    event Acknowledged(address indexed provider);
    event ValidationSubmitted(bytes32 indexed requestHash, uint256 indexed milestoneIndex);
    event Released(address indexed provider, uint256 amount, uint256 indexed milestoneIndex);
    event Disputed(address indexed consumer, uint256 amount);

    address public immutable consumer;
    address public immutable provider;
    uint256 public immutable providerAgentId;
    IERC20 public immutable token;
    IERC8004Validation public immutable validationRegistry;
    address public immutable validatorAddress;

    uint256 public amount;
    uint8 public immutable releaseThreshold; // 0-100
    State public state;
    bytes32 public requestHash;

    /// @dev When length > 0, use milestone flow; otherwise legacy single-amount.
    Milestone[] public milestones;

    uint8 constant DEFAULT_RELEASE_THRESHOLD = 80;
    uint256 constant MAX_MILESTONES = 16;

    constructor(
        address _consumer,
        address _provider,
        uint256 _providerAgentId,
        address _token,
        address _validationRegistry,
        address _validatorAddress,
        uint8 _releaseThreshold,
        uint256[] memory _milestoneAmounts
    ) {
        if (
            _consumer == address(0) || _provider == address(0) || _token == address(0)
                || _validationRegistry == address(0)
        ) {
            revert ConditionalEscrowZeroAddress();
        }
        uint8 effectiveThreshold = _releaseThreshold == 0 ? DEFAULT_RELEASE_THRESHOLD : _releaseThreshold;
        if (effectiveThreshold > 0 && _validatorAddress == address(0)) revert ConditionalEscrowZeroAddress();
        consumer = _consumer;
        provider = _provider;
        providerAgentId = _providerAgentId;
        token = IERC20(_token);
        validationRegistry = IERC8004Validation(_validationRegistry);
        validatorAddress = _validatorAddress;
        releaseThreshold = effectiveThreshold;

        if (_milestoneAmounts.length > 0) {
            if (_milestoneAmounts.length > MAX_MILESTONES) revert ConditionalEscrowWrongState();
            for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
                if (_milestoneAmounts[i] == 0) revert ConditionalEscrowZeroAmount();
                milestones.push(Milestone({amount: _milestoneAmounts[i], requestHash: bytes32(0), released: false}));
            }
        }
    }

    function _useMilestones() internal view returns (bool) {
        return milestones.length > 0;
    }

    modifier onlyConsumer() {
        if (msg.sender != consumer) revert ConditionalEscrowNotConsumer();
        _;
    }

    modifier onlyProvider() {
        if (msg.sender != provider) revert ConditionalEscrowNotProvider();
        _;
    }

    function fund(uint256 _amount) external onlyConsumer nonReentrant {
        if (_amount == 0) revert ConditionalEscrowZeroAmount();
        if (state != State.FUNDED || amount > 0) revert ConditionalEscrowWrongState();
        if (_useMilestones()) {
            uint256 total = 0;
            uint256 len = milestones.length;
            for (uint256 i = 0; i < len; i++) {
                total += milestones[i].amount;
            }
            if (_amount != total) revert ConditionalEscrowWrongState();
        }
        amount = _amount;
        token.safeTransferFrom(consumer, address(this), _amount);
        emit Funded(consumer, _amount);
    }

    function acknowledge() external onlyProvider {
        if (state != State.FUNDED) revert ConditionalEscrowWrongState();
        state = State.IN_PROGRESS;
        emit Acknowledged(provider);
    }

    /// @param _milestoneIndex For legacy (no milestones), pass 0. For milestones, pass the index.
    function submitForValidation(bytes32 _requestHash, uint256 _milestoneIndex) external onlyProvider {
        if (state != State.IN_PROGRESS) revert ConditionalEscrowWrongState();
        if (_useMilestones()) {
            if (_milestoneIndex >= milestones.length) revert ConditionalEscrowInvalidMilestoneIndex();
            if (milestones[_milestoneIndex].requestHash != bytes32(0)) {
                revert ConditionalEscrowMilestoneAlreadySubmitted();
            }
            milestones[_milestoneIndex].requestHash = _requestHash;
            requestHash = _requestHash;
            emit ValidationSubmitted(_requestHash, _milestoneIndex);
        } else {
            if (_milestoneIndex != 0) revert ConditionalEscrowInvalidMilestoneIndex();
            state = State.VALIDATING;
            requestHash = _requestHash;
            emit ValidationSubmitted(_requestHash, 0);
        }
        state = State.VALIDATING;
    }

    /// @notice Anyone may call when validation passes; releases funds to provider.
    /// @param _milestoneIndex For legacy, pass 0. For milestones, pass the index to release.
    function release(uint256 _milestoneIndex) external nonReentrant {
        if (state != State.VALIDATING) revert ConditionalEscrowWrongState();
        if (_useMilestones()) {
            if (_milestoneIndex >= milestones.length) revert ConditionalEscrowInvalidMilestoneIndex();
            Milestone storage m = milestones[_milestoneIndex];
            if (m.released) revert ConditionalEscrowWrongState();
            (address validator, uint256 agentId, uint8 response,,,) =
                validationRegistry.getValidationStatus(m.requestHash);
            if (validator == address(0)) revert ConditionalEscrowValidationFailed();
            if (validator != validatorAddress) revert ConditionalEscrowValidationFailed();
            if (agentId != providerAgentId) revert ConditionalEscrowAgentMismatch();
            if (response < releaseThreshold) revert ConditionalEscrowValidationFailed();

            m.released = true;
            token.safeTransfer(provider, m.amount);
            emit Released(provider, m.amount, _milestoneIndex);

            bool allReleased = true;
            uint256 len = milestones.length;
            for (uint256 i = 0; i < len; i++) {
                if (!milestones[i].released) {
                    allReleased = false;
                    break;
                }
            }
            if (allReleased) {
                state = State.RELEASED;
            } else {
                state = State.IN_PROGRESS;
            }
        } else {
            if (_milestoneIndex != 0) revert ConditionalEscrowInvalidMilestoneIndex();
            (address validator, uint256 agentId, uint8 response,,,) =
                validationRegistry.getValidationStatus(requestHash);
            if (validator == address(0)) revert ConditionalEscrowValidationFailed();
            if (validator != validatorAddress) revert ConditionalEscrowValidationFailed();
            if (agentId != providerAgentId) revert ConditionalEscrowAgentMismatch();
            if (response < releaseThreshold) revert ConditionalEscrowValidationFailed();

            state = State.RELEASED;
            token.safeTransfer(provider, amount);
            emit Released(provider, amount, 0);
        }
    }

    function dispute() external onlyConsumer nonReentrant {
        if (state == State.RELEASED || state == State.DISPUTED) revert ConditionalEscrowWrongState();
        if (state == State.VALIDATING) {
            bytes32 hashToCheck = requestHash;
            if (_useMilestones()) {
                uint256 len = milestones.length;
                for (uint256 i = 0; i < len; i++) {
                    if (milestones[i].requestHash != bytes32(0) && !milestones[i].released) {
                        hashToCheck = milestones[i].requestHash;
                        break;
                    }
                }
            }
            try validationRegistry.getValidationStatus(hashToCheck) returns (
                address validator, uint256 agentId, uint8 response, bytes32, string memory, uint256
            ) {
                if (validator != address(0) && agentId == providerAgentId && response >= releaseThreshold) {
                    revert ConditionalEscrowValidationFailed();
                }
            } catch {
                // Request not in registry or other error - allow dispute (timeout)
            }
        }
        state = State.DISPUTED;
        uint256 toReturn = _useMilestones() ? _remainingAmount() : amount;
        if (toReturn > 0) {
            token.safeTransfer(consumer, toReturn);
        }
        emit Disputed(consumer, toReturn);
    }

    function _remainingAmount() internal view returns (uint256) {
        uint256 remaining = 0;
        uint256 len = milestones.length;
        for (uint256 i = 0; i < len; i++) {
            if (!milestones[i].released) {
                remaining += milestones[i].amount;
            }
        }
        return remaining;
    }

    function getState() external view returns (State _state, uint256 _amount, bytes32 _requestHash) {
        return (state, amount, requestHash);
    }
}
