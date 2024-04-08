// SPDX-License-Identifier: MIT
// Apples for pears - Scaling for divsor
// MattMcP@blackboxmint.com

pragma solidity ^0.8.25;

contract ApplesForPears{

    uint256 private constant UNITS_PEAR = 10 ** 18;
    uint256 private constant UNITS_APPLE = 10 ** 18;

    function scale_to_next_power(uint256 _value) internal pure returns (uint256) {
        uint256 multiplier = 10; while (multiplier < _value) {multiplier *= 10;}
        return multiplier;
    }

    function price_pears_and_apples(uint256 _pears, uint256 _apples) external pure returns (uint256,uint256) {
        uint256 multiplyForDivision = scale_to_next_power(_apples);
        uint256 applesInPears = _pears * multiplyForDivision * UNITS_APPLE/ _apples  / multiplyForDivision;
        multiplyForDivision = scale_to_next_power(_pears);
        uint256 pearsInApples = _apples * multiplyForDivision * UNITS_PEAR / _pears / multiplyForDivision;
        return (pearsInApples,applesInPears);
    }

} 