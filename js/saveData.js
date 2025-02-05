class SaveData {
    constructor() {
        this.load();
    }

    load() {
        const data = localStorage.getItem('gameData');
        if (data) {
            const savedData = JSON.parse(data);
            this.gold = savedData.gold || 0;
            this.upgrades = savedData.upgrades || {
                hp: 0,
                attack: 0,
                lifeSteal: 0,
                defense: 0
            };
            this.pets = savedData.pets || [];
            this.auras = savedData.auras || [];
            this.selectedPet = savedData.selectedPet || null;
            this.selectedAura = savedData.selectedAura || null;
        } else {
            this.gold = 0;
            this.upgrades = {
                hp: 0,
                attack: 0,
                lifeSteal: 0,
                defense: 0
            };
            this.pets = [];
            this.auras = [];
            this.selectedPet = null;
            this.selectedAura = null;
        }
    }

    save() {
        const data = {
            gold: this.gold,
            upgrades: this.upgrades,
            pets: this.pets,
            auras: this.auras,
            selectedPet: this.selectedPet,
            selectedAura: this.selectedAura
        };
        localStorage.setItem('gameData', JSON.stringify(data));
    }

    addGold(amount) {
        this.gold += amount;
        this.save();
    }

    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            this.save();
            return true;
        }
        return false;
    }

    upgradeAttribute(attribute) {
        const costs = {
            hp: 100 * (this.upgrades.hp + 1),
            attack: 150 * (this.upgrades.attack + 1),
            lifeSteal: 200 * (this.upgrades.lifeSteal + 1),
            defense: 150 * (this.upgrades.defense + 1)
        };

        if (this.spendGold(costs[attribute])) {
            this.upgrades[attribute]++;
            this.save();
            return true;
        }
        return false;
    }

    buyPet(petId) {
        const pets = {
            1: { id: 1, name: "哮天犬", cost: 1000, description: "近战宠物，持续对敌人造成伤害" },
            2: { id: 2, name: "金猪", cost: 1500, description: "每4秒发射冰冻弹，使敌人暂时停止移动" },
            3: { id: 3, name: "神龙", cost: 2000, description: "每4秒发射火球，对敌人造成大量伤害" }
        };

        const pet = pets[petId];
        if (pet && !this.pets.includes(petId) && this.spendGold(pet.cost)) {
            this.pets.push(petId);
            this.save();
            return true;
        }
        return false;
    }

    buyAura(auraId) {
        const auras = {
            1: { id: 1, name: "伤害光环", cost: 2000, range: 150 },
            2: { id: 2, name: "减速光环", cost: 2500, range: 180 },
            3: { id: 3, name: "削弱光环", cost: 3000, range: 200 }
        };

        const aura = auras[auraId];
        if (aura && !this.auras.includes(auraId) && this.spendGold(aura.cost)) {
            this.auras.push(auraId);
            this.save();
            return true;
        }
        return false;
    }
}
