class Menu {
    constructor() {
        this.saveData = new SaveData();
        this.setupMenuElements();
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupMenuElements() {
        // 创建背景层
        this.menuBackground = document.createElement('div');
        this.menuBackground.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: url('image/Menu.png') no-repeat center center fixed;
            background-size: cover;
            z-index: 999;
        `;
        
        // 创建主菜单容器
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'mainMenu';
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 30px;
            border-radius: 15px;
            color: white;
            text-align: center;
            min-width: 400px;
            z-index: 1000;
        `;

        // 创建菜单内容
        this.menuContainer.innerHTML = `
            <h1 style="color: #ffd700; margin-bottom: 20px; font-size: 2.5em;">凡人修仙模拟器</h1>
            <div id="goldDisplay" style="color: #ffd700; margin-bottom: 20px; font-size: 1.2em;">金币: 0</div>
            <div id="menuButtons">
                <button id="startGame" class="menuButton">开始游戏</button>
                <button id="openUpgrades" class="menuButton">角色升级</button>
                <button id="openPets" class="menuButton">购买宠物</button>
                <button id="openAuras" class="menuButton">购买光环</button>
            </div>
            <div id="upgradeMenu" style="display: none;">
                <h2>角色升级</h2>
                <div id="upgradeOptions"></div>
                <button id="backFromUpgrades" class="menuButton">返回</button>
            </div>
            <div id="petMenu" style="display: none;">
                <h2>宠物商店</h2>
                <div id="petOptions"></div>
                <button id="backFromPets" class="menuButton">返回</button>
            </div>
            <div id="auraMenu" style="display: none;">
                <h2>光环商店</h2>
                <div id="auraOptions"></div>
                <button id="backFromAuras" class="menuButton">返回</button>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .menuButton {
                background: #4a4a4a;
                color: white;
                border: none;
                padding: 10px 20px;
                margin: 5px;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
                width: 200px;
            }
            .menuButton:hover {
                background: #666;
            }
            .menuButton:disabled {
                background: #333;
                cursor: not-allowed;
            }
            .upgradeItem, .shopItem {
                background: rgba(255, 255, 255, 0.1);
                padding: 10px;
                margin: 5px;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .shopItem.owned {
                background: rgba(0, 255, 0, 0.1);
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.menuBackground);
        document.body.appendChild(this.menuContainer);
    }

    setupEventListeners() {
        // 主菜单按钮
        document.getElementById('startGame').onclick = () => this.startGame();
        document.getElementById('openUpgrades').onclick = () => this.showUpgradeMenu();
        document.getElementById('openPets').onclick = () => this.showPetMenu();
        document.getElementById('openAuras').onclick = () => this.showAuraMenu();

        // 返回按钮
        document.getElementById('backFromUpgrades').onclick = () => this.showMainMenu();
        document.getElementById('backFromPets').onclick = () => this.showMainMenu();
        document.getElementById('backFromAuras').onclick = () => this.showMainMenu();
    }

    updateDisplay() {
        document.getElementById('goldDisplay').textContent = `金币: ${this.saveData.gold}`;
    }

    showMainMenu() {
        document.getElementById('menuButtons').style.display = 'block';
        document.getElementById('upgradeMenu').style.display = 'none';
        document.getElementById('petMenu').style.display = 'none';
        document.getElementById('auraMenu').style.display = 'none';
        this.updateDisplay();
    }

    showUpgradeMenu() {
        document.getElementById('menuButtons').style.display = 'none';
        document.getElementById('upgradeMenu').style.display = 'block';

        const upgradeOptions = document.getElementById('upgradeOptions');
        upgradeOptions.innerHTML = '';

        const upgrades = {
            hp: { name: '生命值', base: 100 },
            attack: { name: '攻击力', base: 150 },
            lifeSteal: { name: '吸血', base: 200 },
            defense: { name: '防御力', base: 150 }
        };

        for (const [key, data] of Object.entries(upgrades)) {
            const cost = data.base * (this.saveData.upgrades[key] + 1);
            const div = document.createElement('div');
            div.className = 'upgradeItem';
            div.innerHTML = `
                <span>${data.name} (等级 ${this.saveData.upgrades[key]})</span>
                <button class="menuButton" ${this.saveData.gold < cost ? 'disabled' : ''}>
                    升级 (${cost} 金币)
                </button>
            `;
            div.querySelector('button').onclick = () => {
                if (this.saveData.upgradeAttribute(key)) {
                    this.showUpgradeMenu();
                }
            };
            upgradeOptions.appendChild(div);
        }
    }

    showPetMenu() {
        document.getElementById('menuButtons').style.display = 'none';
        document.getElementById('petMenu').style.display = 'block';

        const petOptions = document.getElementById('petOptions');
        petOptions.innerHTML = '';

        const pets = {
            1: { name: "哮天犬", cost: 10000, description: "近战宠物，持续对敌人造成伤害" },
            2: { name: "金猪", cost: 15000, description: "每4秒发射冰冻弹，使敌人暂时停止移动" },
            3: { name: "神龙", cost: 20000, description: "每4秒发射火球，对敌人造成大量伤害" }
        };

        for (const [id, pet] of Object.entries(pets)) {
            const owned = this.saveData.pets.includes(Number(id));
            const div = document.createElement('div');
            div.className = `shopItem ${owned ? 'owned' : ''}`;
            div.innerHTML = `
                <div>
                    <div>${pet.name}</div>
                    <div style="font-size: 0.8em; color: #aaa;">${pet.description}</div>
                </div>
                ${owned ? `
                    <button class="menuButton" data-pet-id="${id}">
                        ${this.saveData.selectedPet === Number(id) ? '取消选择' : '选择'}
                    </button>
                ` : `
                    <button class="menuButton" ${this.saveData.gold < pet.cost ? 'disabled' : ''}>
                        购买 (${pet.cost} 金币)
                    </button>
                `}
            `;
            
            if (owned) {
                div.querySelector('button').onclick = () => {
                    const petId = Number(div.querySelector('button').dataset.petId);
                    if (this.saveData.selectedPet === petId) {
                        this.saveData.selectedPet = null;
                    } else {
                        this.saveData.selectedPet = petId;
                    }
                    this.saveData.save();
                    this.showPetMenu(); // 刷新显示
                };
            } else {
                div.querySelector('button').onclick = () => {
                    if (this.saveData.buyPet(Number(id))) {
                        this.showPetMenu();
                    }
                };
            }
            petOptions.appendChild(div);
        }
    }

    showAuraMenu() {
        document.getElementById('menuButtons').style.display = 'none';
        document.getElementById('auraMenu').style.display = 'block';

        const auraOptions = document.getElementById('auraOptions');
        auraOptions.innerHTML = '';

        const auras = {
            1: { name: "伤害光环", cost: 20000, description: "减少周围敌人生命值" },
            2: { name: "减速光环", cost: 25000, description: "降低敌人移动速度" },
            3: { name: "削弱光环", cost: 30000, description: "降低移速且减少防御" }
        };

        for (const [id, aura] of Object.entries(auras)) {
            const owned = this.saveData.auras.includes(Number(id));
            const div = document.createElement('div');
            div.className = `shopItem ${owned ? 'owned' : ''}`;
            div.innerHTML = `
                <div>
                    <div>${aura.name}</div>
                    <div style="font-size: 0.8em; color: #aaa;">${aura.description}</div>
                </div>
                ${owned ? `
                    <button class="menuButton" data-aura-id="${id}">
                        ${this.saveData.selectedAura === Number(id) ? '取消选择' : '选择'}
                    </button>
                ` : `
                    <button class="menuButton" ${this.saveData.gold < aura.cost ? 'disabled' : ''}>
                        购买 (${aura.cost} 金币)
                    </button>
                `}
            `;
            
            if (owned) {
                div.querySelector('button').onclick = () => {
                    const auraId = Number(div.querySelector('button').dataset.auraId);
                    if (this.saveData.selectedAura === auraId) {
                        this.saveData.selectedAura = null;
                    } else {
                        this.saveData.selectedAura = auraId;
                    }
                    this.saveData.save();
                    this.showAuraMenu(); // 刷新显示
                };
            } else {
                div.querySelector('button').onclick = () => {
                    if (this.saveData.buyAura(Number(id))) {
                        this.showAuraMenu();
                    }
                };
            }
            auraOptions.appendChild(div);
        }
    }

    startGame() {
        // 显示游戏画布
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.display = 'block';
        }

        // 隐藏菜单
        this.menuBackground.style.display = 'none';
        this.menuContainer.style.display = 'none';

        // 创建新的游戏实例
        window.game = new Game(this.saveData);
    }

    static showMenu() {
        // 如果已经有游戏实例，销毁它
        if (window.game) {
            window.game = null;
        }
        
        // 隐藏游戏画布
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.display = 'none';
        }

        // 创建新的菜单实例
        if (!window.menu) {
            window.menu = new Menu();
        }
        
        // 显示菜单
        window.menu.menuBackground.style.display = 'block';
        window.menu.menuContainer.style.display = 'block';
        window.menu.showMainMenu();
        
        return window.menu;
    }
}
