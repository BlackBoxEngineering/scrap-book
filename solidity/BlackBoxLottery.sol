// SPDX-License-Identifier: GPL-3.0-or-later
// BlackBoxLottery - Production v1.2
// admin@blackboxmint.com

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BlackBoxLottery is ERC721 {
    struct Lottery {
        uint128 prizePool;
        uint32 endTime;
        uint32 startTime;
        address winner;
        uint16 minParticipants;
        bool drawn;
        bool prizeClaimed;
        uint32 startTokenId;
        uint32 endTokenId;
        uint256 entropyAccumulator;
        uint32 drawableAfterBlock;
        uint16 participantCount;
    }

    IERC20 public immutable boneToken;
    address public owner;
    uint128 public ticketPrice = 50e18;
    uint16 public maxTicketsPerPerson = 10;
    uint32 public currentLottery;
    uint32 public nextTokenId = 1;
    uint8 private _status = 1;
    uint256 private _nonce;

    mapping(address => bool) public operators;
    mapping(uint32 => Lottery) public lotteries;
    mapping(uint32 => mapping(address => uint16)) public tickets;
    mapping(uint32 => mapping(uint16 => address)) public participantsByIndex;
    
    modifier onlyOwner() {require(msg.sender == owner);_;}
    modifier onlyOperator() {require(msg.sender == owner || operators[msg.sender]);_;}
    modifier nonReentrant() {require(_status == 1);_status = 2;_;_status = 1;}
    
    event TicketsPurchased(address indexed buyer, uint16 count, uint32 indexed lottery);
    event LotteryDrawn(uint32 indexed lottery, address indexed winner, uint128 prize);
    event PrizeClaimed(uint32 indexed lottery, address indexed winner, uint128 prize);
    event LotteryStarted(uint32 indexed lotteryId, uint32 duration, uint16 minParticipants);
    event LotteryExtended(uint32 indexed lotteryId, uint32 newEndTime);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    constructor(address _boneToken) ERC721("BONE Lottery", "BLT") {
        boneToken = IERC20(_boneToken);
        owner = msg.sender;
        _nonce = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)));
    }
    
    function buyTickets(uint16 _count) external nonReentrant {
        require(_count > 0 && _count <= maxTicketsPerPerson && currentLottery > 0);
        require(tickets[currentLottery][msg.sender] + _count <= maxTicketsPerPerson, "Exceeds max tickets per person");
        Lottery storage lottery = lotteries[currentLottery];
        uint32 buffer = (lottery.endTime - lottery.startTime) / 10;
        require(block.timestamp < lottery.endTime - buffer && !lottery.drawn);
        
        uint128 cost = ticketPrice * _count;
        require(boneToken.transferFrom(msg.sender, address(this), cost));
        
        if (tickets[currentLottery][msg.sender] == 0) {
            participantsByIndex[currentLottery][lottery.participantCount] = msg.sender;
            lottery.participantCount++;
        }
        tickets[currentLottery][msg.sender] += _count;
        lottery.prizePool += cost;
        
        _nonce++;
        lottery.entropyAccumulator ^= uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            _count,
            lottery.participantCount,
            _nonce,
            block.prevrandao
        )));
        
        for (uint16 i = 0; i < _count; i++) {
            _mint(msg.sender, nextTokenId++);
        }
        emit TicketsPurchased(msg.sender, _count, currentLottery);
    }
    
    function drawWinner() external onlyOperator nonReentrant {
        Lottery storage lottery = lotteries[currentLottery];
        require(block.timestamp >= lottery.endTime && !lottery.drawn);
        require(block.number >= lottery.drawableAfterBlock, "Block delay not met");
        
        if (lottery.participantCount < lottery.minParticipants) {
            lottery.endTime += 86400;
            lottery.drawableAfterBlock = uint32(block.number + 10 + (uint256(keccak256(abi.encodePacked(
                block.timestamp, block.prevrandao, currentLottery
            ))) % 40));
            emit LotteryExtended(currentLottery, lottery.endTime);
            return;
        }

        uint32 startTokenId = lottery.startTokenId;
        uint32 endTokenId = nextTokenId;
        lottery.endTokenId = endTokenId;
        uint32 totalTickets = endTokenId - startTokenId;
        
        require(totalTickets > 0, "No valid tickets");
        
        _nonce++;
        uint256 finalEntropy = uint256(keccak256(abi.encodePacked(
            lottery.endTime,
            blockhash(block.number - 1),
            blockhash(block.number - 3),
            totalTickets,
            _nonce,
            currentLottery,
            lottery.entropyAccumulator,
            block.timestamp,
            msg.sender,
            block.prevrandao
        )));
        
        uint32 winningTokenId = startTokenId + uint32(finalEntropy % totalTickets);
        
        address winner = _ownerOf(winningTokenId);
        require(winner != address(0), "Invalid winning ticket");
        
        lottery.winner = winner;
        lottery.drawn = true;
        uint128 prize = (lottery.prizePool * 8) / 10;
        emit LotteryDrawn(currentLottery, winner, prize);
    }
    
    function claimPrize(uint32 _lotteryId) external nonReentrant {
        Lottery storage lottery = lotteries[_lotteryId];
        require(lottery.drawn, "Lottery not drawn");
        require(msg.sender == lottery.winner, "Not winner");
        require(!lottery.prizeClaimed, "Prize already claimed");
        
        lottery.prizeClaimed = true;
        uint128 prize = (lottery.prizePool * 8) / 10;
        require(boneToken.transfer(msg.sender, prize), "Transfer failed");
        emit PrizeClaimed(_lotteryId, msg.sender, prize);
    }
    
    function startLottery(uint32 _duration, uint16 _minParticipants) external onlyOperator {
        require(_duration >= 660 && _minParticipants >= 3);
        if (currentLottery > 0) {
            require(lotteries[currentLottery].drawn);
        }
        
        currentLottery++;
        Lottery storage newLottery = lotteries[currentLottery];
        newLottery.startTime = uint32(block.timestamp);
        newLottery.endTime = uint32(block.timestamp + _duration);
        newLottery.minParticipants = _minParticipants;
        newLottery.startTokenId = nextTokenId;
        
        uint256 randomDelay = uint256(keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, msg.sender, _duration, currentLottery
        ))) % 40 + 10;
        newLottery.drawableAfterBlock = uint32(block.number + (_duration / 12) + randomDelay);
        
        _nonce++;
        newLottery.entropyAccumulator = uint256(keccak256(abi.encodePacked(
            block.timestamp, msg.sender, block.prevrandao, _duration, _minParticipants, _nonce
        )));
        
        emit LotteryStarted(currentLottery, _duration, _minParticipants);
    }
    
    function addOperator(address _operator) external onlyOwner {
        operators[_operator] = true;
    }
    
    function removeOperator(address _operator) external onlyOwner {
        operators[_operator] = false;
    }
    
    function setMaxTicketsPerPerson(uint16 _maxTickets) external onlyOperator {
        require(_maxTickets > 0 && _maxTickets <= 100, "Invalid ticket limit");
        maxTicketsPerPerson = _maxTickets;
    }
    
    function lowerMinParticipants(uint16 _newMin) external onlyOperator {
        require(_newMin > 0 && currentLottery > 0 && !lotteries[currentLottery].drawn);
        require(_newMin < lotteries[currentLottery].minParticipants, "Can only lower minimum");
        lotteries[currentLottery].minParticipants = _newMin;
    }
    
    function withdrawHouseFunds() external onlyOwner nonReentrant {
        uint256 balance = boneToken.balanceOf(address(this));
        uint256 reserved = 0;
        if (currentLottery > 0 && !lotteries[currentLottery].drawn) {
            reserved = (lotteries[currentLottery].prizePool * 8) / 10;
        }
        uint256 available = balance > reserved ? balance - reserved : 0;
        if (available > 0) {
            require(boneToken.transfer(owner, available));
        }
    }
    
    function emergencyWithdrawToken(address _token, uint256 _amount) external onlyOwner nonReentrant {
        require(_token != address(boneToken) || currentLottery == 0 || lotteries[currentLottery].drawn);
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        uint256 amount = _amount == 0 ? balance : _amount;
        require(token.transfer(owner, amount));
        emit EmergencyWithdrawal(_token, amount);
    }
    
    function emergencyWithdrawNative(uint256 _amount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        uint256 amount = _amount == 0 ? balance : _amount;
        (bool success,) = owner.call{value: amount}("");
        require(success);
        emit EmergencyWithdrawal(address(0), amount);
    }
    
    function extendLottery(uint32 _hours) external onlyOperator {
        require(_hours >= 1 && _hours <= 168 && currentLottery > 0);
        require(!lotteries[currentLottery].drawn);
        lotteries[currentLottery].endTime += _hours * 3600;
        emit LotteryExtended(currentLottery, lotteries[currentLottery].endTime);
    }
    
    function getCurrentLottery() external view returns (uint32, uint128, uint32, uint16, uint16, uint16) {
        if (currentLottery == 0) return (0, 0, 0, 0, 0, maxTicketsPerPerson);
        Lottery storage lottery = lotteries[currentLottery];
        return (
            currentLottery,
            lottery.prizePool,
            lottery.endTime,
            lottery.participantCount,
            tickets[currentLottery][msg.sender],
            maxTicketsPerPerson
        );
    }
    
    function getParticipantCount(uint32 lotteryId) external view returns (uint16) {
        return lotteries[lotteryId].participantCount;
    }
    
    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        string memory json = string(abi.encodePacked(
            '{"name":"BONE Lottery Ticket #', _toString(tokenId), '",',
            '"image":"https://blackboxone.io/images/lottery-ticket.png",',
            '"attributes":[{"trait_type":"Ticket ID","value":', _toString(tokenId), '}]}'
        ));
        return string(abi.encodePacked("data:application/json;utf8,", json));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}