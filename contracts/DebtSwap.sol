// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ILendingPool } from "./Aave/interfaces/ILendingPool.sol";
import { Provider } from "./provider/Provider.sol";
import { Uniswap } from "./Uniswap/Uniswap.sol";
import { Aave } from "./Aave/Aave.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
contract DebtSwap is Uniswap, Aave {

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address provider, address _uniswapFactory) Provider(provider, _uniswapFactory) {}
}
