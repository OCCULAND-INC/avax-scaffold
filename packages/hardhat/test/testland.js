const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

before(async function(){
  [deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
 
     console.log(`Deployer Address: ${deployer.address}`);
     console.log(`addr1 Address: ${addr1.address}`);
     console.log(`addr2 Address: ${addr2.address}`);
     console.log(`addr3 Address: ${addr3.address}`);
     console.log(`addr4 Address: ${addr4.address}`);

 });

describe("Occuland", function () {
  let estateAddress;
  let myContract;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("LAND Contract Deployment", function () {

    it("Contract is deployed with parameters", async function () {
      const occuland = await ethers.getContractFactory("Land");
      contract = await occuland.deploy();
    });

    it("Mint Land", async function () {
      let res = await contract.mintLand();
      let bal = await contract.balanceOf(deployer.address);
      expect(bal).to.equal(1);
    });


    it("Update Operator", async function () {
      let res = await contract.setUpdateOperator(1, addr1.address);
      let res2 = await contract.updateOperator(1);
      expect(res2).to.equal(addr1.address);
      //let bal = await contract.balanceOf(deployer.address);
      //expect(bal).to.equal(1);
    });
    
    });
  });
