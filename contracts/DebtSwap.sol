// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ILendingPool } from "./interfaces/ILendingPool.sol";
import { AddressesProvider } from "./adapters/AddressesProvider.sol";
import { Uniswap } from "./adapters/Uniswap.sol";
import { Aave } from "./adapters/Aave.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
contract DebtSwap is Aave, Uniswap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address provider, address _uniswapFactory) AddressesProvider(provider, _uniswapFactory) {}
}
