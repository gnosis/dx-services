pragma solidity ^0.4.18;

import "@gnosis.pm/dutch-exchange/contracts/Tokens/StandardToken.sol";

contract TokenRDN is StandardToken {
    string public constant symbol = "RDN";
    string public constant name = "Raiden Network Token";
    uint8 public constant decimals = 18;

    function TokenRDN(
    	uint amount
    )
    	public
    {
    	balances[msg.sender] = amount;
    }
}
