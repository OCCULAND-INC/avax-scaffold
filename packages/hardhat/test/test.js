const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

before(async function () {
  [deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`addr1 Address: ${addr1.address}`);
  console.log(`addr2 Address: ${addr2.address}`);
  console.log(`addr3 Address: ${addr3.address}`);
  console.log(`addr4 Address: ${addr4.address}`);
});

describe("Occuland", function () {
  let myContract;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("Occuland Contract Deployment", function () {
    it("Contract is deployed with parameters", async function () {
      const occuland = await ethers.getContractFactory("Occuland");
      contract = await occuland.deploy(addr1.address);
    });

    it("The name of the contract should be: Occuland: NFT Asset", async function () {
      expect(await contract.name()).to.be.equal("Occuland: NFT Asset");
    });

    it("The symbol of the contract should be: OCCLND", async function () {
      expect(await contract.symbol()).to.be.equal("OCCLND");
    });

    describe("Access Roles", function () {
      it("The admin role should equal the deployer", async function () {
        const adminRole = await contract.DEFAULT_ADMIN_ROLE();
        expect(await contract.hasRole(adminRole, deployer.address)).to.equal(
          true
        );
      });

      it("The admin role should not be open to non-deployer: addr1 (minter)", async function () {
        const adminRole = await contract.DEFAULT_ADMIN_ROLE();
        expect(await contract.hasRole(adminRole, addr1.address)).to.equal(
          false
        );
      });

      it("The admin role should not be open to non-deployer: addr2", async function () {
        const adminRole = await contract.DEFAULT_ADMIN_ROLE();
        expect(await contract.hasRole(adminRole, addr1.address)).to.equal(
          false
        );
      });

      it("Minter role should equal addr1", async function () {
        const minterRole = await contract.MINTER_ROLE();
        expect(await contract.hasRole(minterRole, addr1.address)).to.equal(
          true
        );
      });

      it("Minter role should not equal anyone else but addr1: deployer", async function () {
        const minterRole = await contract.MINTER_ROLE();
        expect(await contract.hasRole(minterRole, deployer.address)).to.equal(
          false
        );
      });

      it("Minter role should not equal anyone else but addr1: addr2", async function () {
        const minterRole = await contract.MINTER_ROLE();
        expect(await contract.hasRole(minterRole, addr2.address)).to.equal(
          false
        );
      });

      it("Revoking minter access should stop them from minting", async function () {
        const minterRole = await contract.MINTER_ROLE();
        await contract.revokeRole(minterRole, addr1.address);
        await expect(contract.connect(addr1).mint(addr2.address, "1111")).to.be
          .reverted;
      });

      it("Grant minter role to address, should be allowed to mint", async function () {
        const minterRole = await contract.MINTER_ROLE();
        await contract.grantRole(minterRole, addr1.address);
        expect(await contract.hasRole(minterRole, addr1.address)).to.equal(
          true
        );
      });
      it("Grant minter role to multiple addresses, should be allowed to mint", async function () {
        const minterRole = await contract.MINTER_ROLE();
        await contract.grantRole(minterRole, addr3.address);
        expect(await contract.hasRole(minterRole, addr1.address)).to.equal(
          true
        );
        expect(await contract.hasRole(minterRole, addr3.address)).to.equal(
          true
        );
      });
    });

    describe("Minting", function () {
      it("MINTER role is the only one that can mint a token", async function () {
        expect(
          await contract.connect(addr1).mint(addr1.address, "1", "testing uri")
        ).to.be.an("object");
        expect(await contract.totalSupply()).to.be.equal(1);
      });
      it("Deployer cannot mint", async function () {
        await expect(
          contract.connect(deployer).mint(addr1.address, "1", "testing uri")
        ).to.be.revertedWith("x");
      });
      it("Non-minter role cannot mint", async function () {
        await expect(
          contract.connect(addr2).mint(addr1.address, "1", "testing uri")
        ).to.be.revertedWith("x");
      });
      it("Can mint passing parameters", async function () {
        const mint = await contract
          .connect(addr1)
          .mint(addr2.address, "1", "testing uri for addr2");

        await mint.wait();
        let bal = await contract.balanceOf(addr2.address);
        bal = (parseInt(bal.toString()) - 1).toString();
        const res = await contract.tokenOfOwnerByIndex(addr2.address, bal);

        expect(await contract.tokenURI(res.toString())).to.be.equal(
          "testing uri for addr2"
        );
        expect(await contract.balanceOf(addr2.address)).to.be.equal("1");
        expect(await contract.totalSupply()).to.be.equal(2);
      });
    });

    describe("Asset functions", function () {
      it("Existing asset is transferrable by owner", async function () {
        await contract
          .connect(addr2)
          .transferFrom(addr2.address, addr1.address, "2");
        expect(await contract.balanceOf(addr1.address)).to.be.equal("2");
        expect(await contract.totalSupply()).to.be.equal(2);
      });
      it("Only owned assets can be transferred", async function () {
        await expect(
          contract
            .connect(addr3)
            .transferFrom(addr2.address, addr1.address, "2")
        ).to.be.revertedWith(
          "ERC721: transfer caller is not owner nor approved"
        );
      });
      it("Non-existant assets cannot be transferred", async function () {
        await expect(
          contract
            .connect(addr2)
            .transferFrom(addr2.address, addr1.address, "5")
        ).to.be.reverted;
      });
      it("Existing asset can be bridged back and burned only by owner", async function () {
        expect(await contract.connect(addr1).bridgeBack("1")).to.be.an(
          "object"
        );
        expect(await contract.totalSupply()).to.be.equal(1);
      });
      it("Existing asset cannot be bridged back and burned by non-owner", async function () {
        await expect(
          contract.connect(addr2).bridgeBack("2")
        ).to.be.revertedWith("non owner");
      });
      it("Non-existing asset cannot be bridged back and burned by non-owner", async function () {
        await expect(contract.connect(addr1).bridgeBack("5")).to.be.reverted;
      });
      it("After burn, totalSupply should decrease", async function () {
        expect(await contract.totalSupply()).to.be.equal(1);
      });
    });

    describe("Renting", function () {});
  });
});
