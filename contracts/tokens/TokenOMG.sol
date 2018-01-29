pragma solidity ^0.4.18;

import "@gnosis.pm/dutch-exchange/contracts/Tokens/StandardToken.sol";

contract TokenOMG is StandardToken {
    string public constant symbol = "OMG";
    string public constant name = "OmiseGO";
    uint8 public constant decimals = 18;

    function TokenOMG(
    	uint amount
    )
    	public
    {
    	balances[msg.sender] = amount;
    }
}
