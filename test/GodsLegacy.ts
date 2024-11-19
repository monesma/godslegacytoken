import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
//Types généré automatiquement au niveau de hardhat
import { GodsLegacy } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";


describe("Gods Legacy Tests", function () {
  let contract: GodsLegacy;
  //proprio du contrat intelligent et deux addresses
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  //création d'une fixture
  async function deployContractFixture() {
    //attribut les comptes aux addresses
    const [owner, addr1, addr2] = await ethers.getSigners();

    //je deploy le contract avec sur l'address du proprio avec la racine de l'arbre de merkle
    const GodsLegacy = await ethers.getContractFactory("GodsLegacy");
    
    // Déploiement du contrat directement sans appeler deployed()
    const contract = await GodsLegacy.deploy();
    const tokenPriceInWei = 1 * 10 ** 18;
    //je retourne le contrat déployé, l'arbre de merkle le proprio du contract et l'addresse 1 et 2
    return {
      contract,
      owner,
      addr1,
      addr2,
      tokenPriceInWei
    };
  }

  //on vérifie si le contract est bien déployé
  describe("Deployment", function () {
    it("Should deploy the contract with correct initial values", async function () {
      const { contract, owner } = await deployContractFixture();
      
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.totalSupply()).to.equal(ethers.parseEther("1000000000"));
    });
  });

  it("should allow only owner to pause and unpause", async function () {
    const { contract, owner, addr1 } = await loadFixture(deployContractFixture);
  
    // Check initial state
    expect(await contract.paused()).to.be.false;
  
    // Non-owner should not be able to send tokens
    try {
      await expect(contract.connect(addr1).pause())
    } catch (error: any) {
      // Check if the error message contains the expected substring
      expect(error.message).to.match(/OwnableUnauthorizedAccount/);
    }
    // Owner pauses
    await contract.connect(owner).pause();

    expect(await contract.paused()).to.be.true;
    // Non-owner tries to unpause
    try {
      await expect(contract.connect(addr1).unpause())
    } catch (error: any) {
      // Check if the error message contains the expected substring
      expect(error.message).to.match(/OwnableUnauthorizedAccount/);
    }
  
    // Owner unpauses
    await contract.connect(owner).unpause();
    expect(await contract.paused()).to.be.false;
  });

  //on va vérifier si l'utilisateur peut modifier la racine de l'arbre de merkle
  describe("transfer", function () {
    it("should enable transferWithBurn function only for owner", async function () {
      const { contract, owner, addr1 } = await loadFixture(
        deployContractFixture
      );

      // Check that transferWithBurn is initially disabled
      expect(await contract.isTransferWithBurnEnabled()).to.equal(false);

      try {
        // Call enableTransferWithBurn as non-owner and expect revert
        await contract.connect(addr1).enableTransferWithBurn();
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/OwnableUnauthorizedAccount/);
      }

      // Call enableTransferWithBurn as owner and expect success
      await contract.connect(owner).enableTransferWithBurn();
      expect(await contract.isTransferWithBurnEnabled()).to.equal(true);
    });

    it("should disable transferWithBurn function only for owner", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(
        deployContractFixture
      );
      // Enable transferWithBurn initially
      await contract.enableTransferWithBurn();
      expect(await contract.isTransferWithBurnEnabled()).to.equal(true);

      // Call disableTransferWithBurn as non-owner and expect revert
      try {
        // Call enableTransferWithBurn as non-owner and expect revert
        await contract.connect(addr1).disableTransferWithBurn();
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/OwnableUnauthorizedAccount/);
      }
      await contract.connect(owner).disableTransferWithBurn();
      expect(await contract.isTransferWithBurnEnabled()).to.equal(false);
    });

    it("should allow only owner to set the burn rate", async function () {
      const { contract, owner, addr1 } = await loadFixture(
        deployContractFixture
      );

      // Check that the initial burn rate is zero
      expect(await contract.burnRate()).to.equal(0);

      // Call setBurnRate as non-owner and expect revert
      try {
        // Call enableTransferWithBurn as non-owner and expect revert
        await contract.connect(addr1).setBurnRate(500);
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/OwnableUnauthorizedAccount/);
      }

      // Owner sets a valid burn rate
      await contract.connect(owner).setBurnRate(500);
      expect(await contract.burnRate()).to.equal(500);

      // Owner sets an invalid burn rate (greater than 1000)
      await expect(
        contract.connect(owner).setBurnRate(1500)
      ).to.be.revertedWith("Burn rate must be less than or equal to 1000");

      // Burn rate should remain unchanged
      expect(await contract.burnRate()).to.equal(500);
    });

    it("should allow only owner to send tokens", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(
        deployContractFixture
      );
      // Initial token balances
      const initialBalanceOwner = await contract.balanceOf(owner.address);
      const initialBalanceAddr1 = await contract.balanceOf(addr1.address);
      const initialBalanceAddr2 = await contract.balanceOf(addr2.address);

      // Owner sends tokens to addr1
      const amountToSend: bigint = BigInt(100);
      await contract.connect(owner).send(addr1.address, amountToSend);

      // Check that tokens are transferred from contract to addr1
      const finalBalanceAddr1 = await contract.balanceOf(addr1.address);
      const finalBalanceAddr2 = await contract.balanceOf(addr2.address);
      expect(finalBalanceAddr1).to.equal(initialBalanceAddr1 + amountToSend);
      expect(initialBalanceAddr2).to.equal(finalBalanceAddr2);

      // Non-owner should not be able to send tokens
      try {
        // Call enableTransferWithBurn as non-owner and expect revert
        await contract.connect(addr1).send(addr2.address, amountToSend);
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/OwnableUnauthorizedAccount/);
      }

      // Balances should remain unchanged
      expect(await contract.balanceOf(addr2.address)).to.equal(
        finalBalanceAddr2
      );
    });

    it("should revert transfer when contract is paused", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployContractFixture);
    
      await contract.connect(owner).pause();
 
      try {
        await expect(contract.connect(addr1).transfer(
          ethers.ZeroAddress,
          100
        ))
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/Pausable: paused/);
      }
    });

    it("should revert transferFrom when contract is paused", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployContractFixture);
    
      await contract.connect(owner).pause();
 
      try {
        await expect(contract.connect(addr1).transferFrom(
          addr1.address,
          ethers.ZeroAddress,
          100
        ))
      } catch (error: any) {
        // Check if the error message contains the expected substring
        expect(error.message).to.match(/Pausable: paused/);
      }
    });

    it("should transfer tokens correctly with transfer function", async function() {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployContractFixture);

      // Activer le transfert avec brûlage
      await contract.enableTransferWithBurn();

      // Propriétaire définit un taux de brûlage valide
      await contract.connect(owner).setBurnRate(5);
      expect(await contract.burnRate()).to.equal(5);

      // Soldes initiaux
      const initialBalanceAddr1 = await contract.balanceOf(addr1.address);
      const initialBalanceAddr2 = await contract.balanceOf(addr2.address);
      expect(initialBalanceAddr1).to.equal(0);
      expect(initialBalanceAddr2).to.equal(0);

      // Transférer des jetons à addr1
      const mintAmount = ethers.parseUnits("1000", 18);
      await contract.connect(owner).send(addr1.address, mintAmount);

      // Autoriser le contrat à dépenser des jetons de addr1
      const amountToSend = ethers.parseUnits("50", 18);
      
      // addr1 envoie des jetons à addr2 en utilisant la fonction transferFrom
      await contract.connect(addr1).transfer(addr2.address, amountToSend);
      // Vérifier que les jetons sont transférés de addr1 à addr2, en tenant compte de la brûlure
      const finalBalanceAddr1 = await contract.balanceOf(addr1.address);
      const finalBalanceAddr2 = await contract.balanceOf(addr2.address);

      // Calculer le montant brûlé
      const burnRate = 5;
      const burnAmount = Number(amountToSend) * burnRate / 1000;
      const expectedFinalBalanceAddr1 = Number(mintAmount) - Number(amountToSend);
      const expectedFinalBalanceAddr2 = Number(amountToSend) - burnAmount;
      // Assertions
      expect(finalBalanceAddr1.toString()).to.equal(expectedFinalBalanceAddr1.toString());
      expect(finalBalanceAddr2.toString()).to.equal(expectedFinalBalanceAddr2.toString());
    })

    it("should transfer tokens correctly including burning on transferFrom function", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployContractFixture);
      // Activer le transfert avec brûlage
      await contract.enableTransferWithBurn();

      // Propriétaire définit un taux de brûlage valide
      await contract.connect(owner).setBurnRate(5);
      expect(await contract.burnRate()).to.equal(5);

      // Mint des tokens à addr1
      const mintAmount = ethers.parseUnits("1000", 18);
      await contract.connect(owner).send(addr1.address, mintAmount);
      await contract.connect(owner).send(owner.address, mintAmount);
      // Vérifier les soldes initiaux
      const initialBalanceAddr1 = await contract.balanceOf(addr1.address);
      const initialBalanceAddr2 = await contract.balanceOf(addr2.address);
      expect(initialBalanceAddr1).to.equal(mintAmount);
      expect(initialBalanceAddr2).to.equal(0);

      // Approver addr1 pour dépenser des jetons au nom de owner
      const amountToSend = ethers.parseUnits("50", 18);
      
      await contract.connect(owner).approve(addr1.address, amountToSend);

      // addr1 envoie des jetons à addr2 en utilisant la fonction transferFrom
      await contract.connect(addr1).transferFrom(owner.address, addr2.address, amountToSend);

      // Vérifier que les jetons sont transférés de owner à addr2, en tenant compte de la brûlure
      const finalBalanceAddr1 = await contract.balanceOf(addr1.address);
      const finalBalanceAddr2 = await contract.balanceOf(addr2.address);
      const finalBalanceOwner = await contract.balanceOf(owner.address);

      // Calculer le montant brûlé
      const burnRate = 5;
      const burnAmount = (Number(amountToSend) * burnRate) / 1000;
      const expectedFinalBalanceOwner = Number(mintAmount) - Number(amountToSend);
      const expectedFinalBalanceAddr2 = Number(amountToSend) - burnAmount;

      // Assertions
      expect(finalBalanceOwner.toString()).to.equal(expectedFinalBalanceOwner.toString());
      expect(finalBalanceAddr1.toString()).to.equal(initialBalanceAddr1.toString());
      expect(finalBalanceAddr2.toString()).to.equal(expectedFinalBalanceAddr2.toString());
  });
  });


  describe("mint tokens", function () {
    it("should allow only owner to mint tokens and update the contract's balance", async function () {
      // Charger le contrat et obtenir le propriétaire
      const { contract, owner } = await loadFixture(deployContractFixture);
    
      // Définir le montant de jetons à minter
      const tokenAmount = ethers.parseUnits("100", 18);
    
      // Obtenir l'approvisionnement initial
      const initialSupply = await contract.totalSupply();
    
      // Mint tokens
      await contract.connect(owner).mint(tokenAmount);
    
      // Obtenir le nouvel approvisionnement total
      const newSupply = await contract.totalSupply();
    
      // Calculer le total attendu après mint
      const expectedSupply = initialSupply + tokenAmount;
    
      // Vérifier que l'approvisionnement total est correct
      expect(newSupply).to.equal(expectedSupply);
    
      // Vérifier le solde du contrat
      expect(await contract.balanceOf(contract.getAddress())).to.equal(newSupply);
    });
  });


  describe("isOwner", function () {
    it("should return true if caller is the owner", async function () {
      const { contract, owner } = await loadFixture(
        deployContractFixture
      );
        // Appeler la fonction isOwner en utilisant le propriétaire du contrat comme caller
        const isOwner = await contract.connect(owner).isOwner();
        
        // Vérifier que le résultat est vrai
        expect(isOwner).to.equal(true);
    });

    it("should return false if caller is not the owner", async function () {
      const { contract, addr1 } = await loadFixture(
        deployContractFixture
      );
        // Appeler la fonction isOwner en utilisant le nouvel utilisateur comme caller
        const isOwner = await contract.connect(addr1).isOwner();
        
        // Vérifier que le résultat est faux
        expect(isOwner).to.equal(false);
    });
  })
});
