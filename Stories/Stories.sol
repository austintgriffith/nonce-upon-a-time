pragma solidity ^0.4.24;

contract Stories {

  constructor() public {

  }

  function write(string line) external {
    emit Write(msg.sender, line);
  }
  event Write(address sender, string line);

}
