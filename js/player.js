class Player {
    constructor(saveData) {
        this.position = { x: 400, y: 300 };
        this.size = 20;
        this.level = 1;
        this.exp = 0;
        this.nextExp = 100;
        this.hp = 100;
        this.maxHp = 100;
        this.attack = 10;
        this.defense = 0;
        this.lifeSteal = 0;
        this.speed = 200;
        this._gold = 0;  
        this.isDead = false;
        this.savedState = null;

        // 从存档加载基础属性
        if (saveData) {
            this.hp = 100 + (saveData.upgrades.hp * 20);
            this.maxHp = 100 + (saveData.upgrades.hp * 20);
            this.attack = 10 + (saveData.upgrades.attack * 5);
            this.defense = 0 + (saveData.upgrades.defense * 2);
            this.lifeSteal = 0 + (saveData.upgrades.lifeSteal * 0.05);
        }

        // 宠物系统
        this.pets = [];
        this.selectedPet = saveData ? saveData.selectedPet : null;  // 从存档加载选择的宠物
        if (saveData && saveData.pets.length > 0) {
            this.initializePets(saveData.pets);
        }

        // 光环系统
        this.auras = [];
        this.selectedAura = saveData ? saveData.selectedAura : null;  // 从存档加载选择的光环
        if (saveData && saveData.auras.length > 0) {
            this.initializeAuras(saveData.auras);
        }

        // 装备品质优先级
        this.qualityPriority = {
            'white': 1,
            'blue': 2,
            'purple': 3,
            'orange': 4,
            'legendary': 5
        };

        // 武器和装备
        this.weapon = { quality: 'white', damage: 10 };
        this.chest = null;
        this.ring = null;
        this.boots = null;
        this.weaponAngle = 0;
        this.weaponRotationSpeed = 5; 
        this.weaponRange = 60;

        // 加载武器图片
        this.weaponSprite = {
            white: new Image(),
            blue: new Image(),
            purple: new Image(),
            orange: new Image()
        };
        this.weaponSprite.white.src = '/image/White_knife.png';
        this.weaponSprite.blue.src = '/image/Blue_knife.png';
        this.weaponSprite.purple.src = '/image/Purple_knife.png';
        this.weaponSprite.orange.src = '/image/Orange_knife.png';
        this.weaponSize = { width: 20, height: 40 }; // 武器图片的显示大小

        // 技能系统
        this.skills = {
            Q: { 
                name: '火球术', 
                learned: false, 
                cooldown: 0,
                cost: 100,
                description: '发射一个火球，对敌人造成大量伤害',
                damage: 50
            },
            W: { 
                name: '寒冰冲击波', 
                learned: false, 
                cooldown: 0,
                cost: 150,
                description: '向鼠标方向发射冲击波，对沿途敌人造成伤害并使其停止移动2秒',
                damage: 30,
                duration: 2,
                width: 60,  // 冲击波宽度
                range: 400  // 冲击波射程
            },
            E: { 
                name: '超级赛亚人', 
                learned: false, 
                cooldown: 0,
                cost: 200,
                description: '暂时提升攻击力和生命值',
                duration: 10
            }
        };

        // 状态效果
        this.effects = {
            frozen: 0,
            slowed: 0,
            superSaiyan: 0
        };

        // 加载角色图像
        this.sprite = new Image();
        this.sprite.src = '/image/Charactor.png';
        // 加载超级赛亚人图像
        this.superSprite = new Image();
        this.superSprite.src = '/image/Superman.png';
        // 加载冰冻特效图像
        this.freezeEffect = new Image();
        this.freezeEffect.src = '/image/Effect/Freezeeffect.png';
        // 设置图像显示大小（保持碰撞体积不变）
        this.spriteWidth = this.size * 3;  // 图像宽度为碰撞体积的4倍
        this.spriteHeight = this.size * 3; // 图像高度为碰撞体积的4倍

        this.setupInput();
    }

    initializePets(petIds) {
        const petTypes = {
            1: 'celestialDog', // 哮天犬
            2: 'goldenPig',    // 金猪
            3: 'dragon'        // 神龙
        };

        // 清除现有的宠物
        this.pets = [];
        
        // 只初始化选中的宠物
        if (this.selectedPet && petIds.includes(this.selectedPet)) {
            const type = petTypes[this.selectedPet];
            if (type) {
                this.pets.push(new Pet(type, this));
            }
        }
    }

    initializeAuras(auraIds) {
        const auraData = {
            1: { damage: 0.05, range: 150 },
            2: { slow: 0.2, range: 180 },
            3: { weaken: 0.7, range: 200 }
        };

        // 清除现有的光环
        this.auras = [];
        
        // 只初始化选中的光环
        if (this.selectedAura && auraIds.includes(this.selectedAura)) {
            this.auras.push({
                id: this.selectedAura,
                ...auraData[this.selectedAura]
            });
        }
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (this.hp <= 0) return;

            const key = e.key.toUpperCase();
            if (this.skills[key] && this.skills[key].learned && this.skills[key].cooldown <= 0) {
                switch(key) {
                    case 'Q':
                        this.castFireball();
                        this.skills.Q.cooldown = 5; 
                        break;
                    case 'W':
                        this.castFreeze();
                        this.skills.W.cooldown = 8; 
                        break;
                    case 'E':
                        this.castSuperSaiyan();
                        this.skills.E.cooldown = 15; 
                        break;
                }
            }
        });
    }

    update(dt, mousePosition, game) {
        if (this.hp <= 0) return;

        // 重置临时属性
        this.tempAttack = this.attack;
        this.tempDefense = this.defense;
        this.tempLifeSteal = this.lifeSteal;
        this.tempSpeed = this.speed;

        // 应用装备属性
        if (this.chest) {
            this.tempDefense += this.chest.armor;
        }
        if (this.ring) {
            this.tempLifeSteal += this.ring.lifeSteal;
        }
        if (this.boots) {
            this.tempSpeed += this.boots.speed;
        }

        // 移动逻辑
        const dx = mousePosition.x - this.position.x;
        const dy = mousePosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            const speed = this.effects.slowed > 0 ? this.tempSpeed * 0.5 : this.tempSpeed;
            this.position.x += (dx / distance) * speed * dt;
            this.position.y += (dy / distance) * speed * dt;
        }

        // 更新武器角度
        this.weaponAngle += this.weaponRotationSpeed * dt;

        // 更新状态效果
        for (let effect in this.effects) {
            if (this.effects[effect] > 0) {
                this.effects[effect] -= dt;
                if (this.effects[effect] <= 0) {
                    // 状态效果结束时的处理
                    if (effect === 'superSaiyan') {
                        this.tempAttack = this.attack;
                        this.tempDefense = this.defense;
                        this.tempSpeed = this.speed;
                    }
                }
            }
        }

        // 应用状态效果
        if (this.effects.frozen > 0) {
            this.tempSpeed = 0;
        } else if (this.effects.slowed > 0) {
            this.tempSpeed *= 0.5;
        }

        if (this.effects.superSaiyan > 0) {
            this.tempAttack *= 2;
            this.tempDefense *= 1.5;
            this.tempSpeed *= 1.5;
        }

        // 更新技能冷却
        for (let skill in this.skills) {
            if (this.skills[skill].cooldown > 0) {
                this.skills[skill].cooldown -= dt;
            }
        }

        // 更新宠物攻击
        const currentTime = Date.now();
        this.pets.forEach(pet => {
            if (currentTime - pet.lastAttack >= pet.attackInterval) {
                // 寻找范围内的怪物
                const nearbyMonsters = game.monsters.filter(monster => {
                    const dx = monster.position.x - this.position.x;
                    const dy = monster.position.y - this.position.y;
                    return Math.sqrt(dx * dx + dy * dy) <= pet.range;
                });

                // 对最近的怪物造成伤害
                if (nearbyMonsters.length > 0) {
                    const target = nearbyMonsters[0];
                    const damage = Math.max(0, pet.damage - target.defense);
                    target.takeDamage(damage, false);  // 不应用击退效果
                    target.applyStatus('slow', 0.01); // 减速效果
                    pet.lastAttack = currentTime;
                }
            }
        });

        // 更新光环效果
        this.auras.forEach(aura => {
            game.monsters.forEach(monster => {
                const dx = monster.position.x - this.position.x;
                const dy = monster.position.y - this.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= aura.range) {
                    const currentTime = Date.now() / 1000;  // 转换为秒
                    if (aura.damage && currentTime - monster.lastAuraDamageTime >= 1) {
                        monster.takeDamage(monster.hp * aura.damage, false);
                        monster.lastAuraDamageTime = currentTime;
                    }
                    if (aura.slow) {
                        monster.applyStatus('slow', 0.01);
                    }
                    if (aura.weaken) {
                        monster.applyStatus('weaken', 0.01);
                    }
                }
            });
        });
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        // 绘制角色图片
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // 根据是否在超级赛亚人状态选择不同的图片
        const currentSprite = this.effects.superSaiyan > 0 ? this.superSprite : this.sprite;
        
        // 绘制角色
        if (currentSprite.complete) {
            ctx.drawImage(
                currentSprite,
                -this.spriteWidth / 2,
                -this.spriteHeight / 2,
                this.spriteWidth,
                this.spriteHeight
            );
        }

        // 绘制武器
        this.drawWeapon(ctx);
        
        ctx.restore();

        // 绘制血条
        this.drawHealthBar(ctx);
        
        // 绘制等级
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${this.level}`, this.position.x, this.position.y - 30);
        
        // 绘制技能冷却时间
        this.drawCooldowns(ctx);
        
        // 绘制状态效果
        this.drawEffects(ctx);

        // 绘制宠物和光环范围（调试用）
        ctx.save();
        ctx.globalAlpha = 0.1;
        
        // 绘制宠物范围
        this.pets.forEach(pet => {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, pet.range, 0, Math.PI * 2);
            ctx.fillStyle = 'blue';
            ctx.fill();
        });

        // 绘制光环范围
        this.auras.forEach(aura => {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, aura.range, 0, Math.PI * 2);
            ctx.fillStyle = 'purple';
            ctx.fill();
        });

        ctx.restore();
    }

    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.nextExp && !this.isDead) {
            this.levelUp();
        }
        // 更新UI
        document.getElementById('exp').textContent = this.exp;
        document.getElementById('nextExp').textContent = this.nextExp;
    }

    levelUp() {
        this.level++;
        this.exp = 0;  
        this.nextExp = Math.floor(this.nextExp * 1.5);
        this.maxHp += 20;
        this.hp = this.maxHp;
        this.attack += 5;
        
        // 更新UI
        this.updateUI();

        // 显示升级提示
        const message = document.createElement('div');
        message.style.position = 'absolute';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.padding = '20px';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        message.style.color = '#FFD700';
        message.style.borderRadius = '10px';
        message.style.fontSize = '20px';
        message.textContent = `升级了！当前等级：${this.level}`;
        document.body.appendChild(message);

        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.hp -= Math.max(0, amount - this.defense * 0.2);
        document.getElementById('hp').textContent = Math.max(0, Math.floor(this.hp));
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        if (!this.isDead) {
            this.isDead = true;
            
            // 保存当前状态
            this.savedState = {
                level: this.level,
                exp: this.exp,
                nextExp: this.nextExp,
                maxHp: this.maxHp,
                attack: this.attack,
                defense: this.defense,
                lifeSteal: this.lifeSteal,
                speed: this.speed,
                gold: this.gold,
                weapon: {...this.weapon},
                chest: this.chest,
                ring: this.ring,
                boots: this.boots,
                skills: JSON.parse(JSON.stringify(this.skills))  
            };

            // 显示数学题
            const mathQuestion = document.getElementById('mathQuestion');
            const question = document.getElementById('question');
            
            this.mathA = Math.floor(Math.random() * 100);
            this.mathB = Math.floor(Math.random() * 100);
            this.mathIsAdd = Math.random() < 0.5;
            
            this.mathAnswer = this.mathIsAdd ? this.mathA + this.mathB : this.mathA - this.mathB;
            question.textContent = `${this.mathA} ${this.mathIsAdd ? '+' : '-'} ${this.mathB} = ?`;
            mathQuestion.style.display = 'block';
            window.game.paused = true;  
        }
    }

    revive() {
        if (this.isDead && this.savedState) {
            this.isDead = false;
            
            // 恢复保存的状态
            this.level = this.savedState.level;
            this.exp = this.savedState.exp;
            this.nextExp = this.savedState.nextExp;
            this.maxHp = this.savedState.maxHp;
            this.hp = this.maxHp;  
            this.attack = this.savedState.attack;
            this.defense = this.savedState.defense;
            this.lifeSteal = this.savedState.lifeSteal;
            this.speed = this.savedState.speed;
            this.gold = this.savedState.gold;
            this.weapon = {...this.savedState.weapon};
            this.chest = this.savedState.chest;
            this.ring = this.savedState.ring;
            this.boots = this.savedState.boots;
            this.skills = JSON.parse(JSON.stringify(this.savedState.skills));

            // 检查是否需要升级
            if (this.exp >= this.nextExp) {
                this.levelUp();
            }

            // 更新UI
            this.updateUI();
            
            // 清除所有怪物，给玩家缓冲时间
            window.game.monsters = [];
        }
    }

    updateUI() {
        // 添加 null 检查的辅助函数
        const safeSetText = (elementId, text) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = text;
            }
        };

        const safeUpdateEquipment = (elementId, item) => {
            const element = document.getElementById(elementId);
            if (!element) return;

            if (!item) {
                element.textContent = '无';
                element.className = 'item';
                return;
            }

            let text = '';
            switch(item.type) {
                case 'chest':
                    text = `${item.quality}护甲 (防御+${item.armor})`;
                    break;
                case 'ring':
                    text = `${item.quality}戒指 (吸血+${item.lifeSteal})`;
                    break;
                case 'boots':
                    text = `${item.quality}靴子 (速度+${item.speed})`;
                    break;
                case 'weapon':
                    text = `${item.quality}武器 (伤害+${item.damage})`;
                    break;
            }
            element.textContent = text;
            element.className = `item ${item.quality}`;
        };

        safeSetText('level', this.level);
        safeSetText('hp', Math.floor(this.hp));
        safeSetText('maxHp', this.maxHp);
        safeSetText('attack', this.attack);
        safeSetText('defense', this.defense);
        safeSetText('speed', this.speed);
        safeSetText('lifeSteal', this.lifeSteal);
        safeSetText('gold', this.gold);

        // 更新装备显示
        safeUpdateEquipment('weapon', this.weapon);
        safeUpdateEquipment('chest', this.chest);
        safeUpdateEquipment('ring', this.ring);
        safeUpdateEquipment('boots', this.boots);
    }

    resetAllStats() {
        // 重置基础属性
        this.level = 1;
        this.exp = 0;
        this.nextExp = 100;
        this.hp = this.maxHp = 100;
        this.attack = 10;
        this.defense = 0;
        this.lifeSteal = 0;
        this.speed = 200;
        this.changeGold(-this._gold);  // 清空金币

        // 重置装备
        this.weapon = { quality: 'white', damage: 10 };
        this.chest = null;
        this.ring = null;
        this.boots = null;

        // 重置技能
        for (let key in this.skills) {
            this.skills[key].learned = false;
            this.skills[key].cooldown = 0;
        }

        // 更新UI
        this.updateUI();
    }

    equipItem(item) {
        // 检查装备品质是否更高
        const qualityOrder = ['white', 'blue', 'purple', 'orange', 'legendary'];
        const currentItem = this[item.type];
        
        const shouldReplace = !currentItem || 
            qualityOrder.indexOf(item.quality) > qualityOrder.indexOf(currentItem.quality);
        
        if (shouldReplace) {
            // 更新对应装备
            this[item.type] = item;
            
            // 根据装备类型更新属性
            switch(item.type) {
                case 'chest':
                    this.defense = item.armor;
                    break;
                case 'ring':
                    this.lifeSteal = item.lifeSteal;
                    break;
                case 'boots':
                    this.speed = 200 + item.speed;
                    break;
                case 'weapon':
                    this.weapon = item;
                    break;
            }
            
            // 更新UI
            this.updateUI();
            return true;
        }
        
        return false;
    }

    changeGold(amount) {
        this._gold = Math.max(0, this._gold + amount);
        
        // 更新UI
        const goldElement = document.getElementById('gold');
        if (goldElement) {
            goldElement.textContent = this._gold;
        }
        
        return this._gold;
    }

    buySkill(skillKey) {
        const skill = this.skills[skillKey];
        if (!skill) return false;

        // 检查是否已学习
        if (skill.learned) {
            return false;
        }

        // 检查金币是否足够
        if (this._gold < skill.cost) {
            return false;
        }

        // 扣除金币
        this.changeGold(-skill.cost);

        // 学习技能
        skill.learned = true;

        // 更新UI
        const skillElement = document.getElementById(`skill-${skillKey}`);
        if (skillElement) {
            skillElement.classList.remove('locked');
        }

        return true;
    }

    handleLoot(equipment) {
        if (!equipment) return false;

        // 获取当前装备的品质
        let currentQuality;
        if (equipment.type === 'weapon') {
            currentQuality = this.weapon ? this.weapon.quality : 'white';
        } else if (equipment.type === 'chest') {
            currentQuality = this.chest ? this.chest.quality : 'white';
        } else if (equipment.type === 'ring') {
            currentQuality = this.ring ? this.ring.quality : 'white';
        } else if (equipment.type === 'boots') {
            currentQuality = this.boots ? this.boots.quality : 'white';
        }

        // 判断是否需要装备
        if (this.qualityPriority[equipment.quality] <= this.qualityPriority[currentQuality]) {
            return false;
        }

        // 处理装备掉落
        if (equipment.type === 'chest') {
            this.chest = equipment;
            this.defense = equipment.armor || 0;
        } else if (equipment.type === 'ring') {
            this.ring = equipment;
            this.lifeSteal = equipment.lifeSteal || 0;
        } else if (equipment.type === 'boots') {
            this.boots = equipment;
            this.speed = 200 + (equipment.speed || 0);
        } else if (equipment.type === 'weapon') {
            this.weapon = equipment;
        }

        // 立即更新UI
        this.updateUI();

        // 添加浮动文字效果
        window.game.effects.push({
            text: `获得${equipment.quality}品质${this.getEquipmentTypeName(equipment.type)}！`,
            x: this.position.x,
            y: this.position.y,
            color: this.getQualityColor(equipment.quality),
            currentTime: 0,
            duration: 1,
            velocity: { x: 0, y: -50 }
        });

        return true;
    }

    // 获取装备品质对应的颜色
    getQualityColor(quality) {
        const colors = {
            'white': '#ffffff',
            'blue': '#0000ff',
            'purple': '#800080',
            'orange': '#ffa500',
            'legendary': '#ffd700'
        };
        return colors[quality] || '#ffffff';
    }

    // 获取装备类型的中文名称
    getEquipmentTypeName(type) {
        const names = {
            'chest': '护甲',
            'ring': '戒指',
            'boots': '靴子',
            'weapon': '武器'
        };
        return names[type] || type;
    }

    dealDamage(amount) {
        if (this.lifeSteal > 0) {
            const healAmount = amount * (this.lifeSteal / 100);  // lifeSteal是百分比
            this.heal(healAmount);
        }
        return amount;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    getEquipmentStats() {
        return {
            chest: this.chest ? `${this.chest.quality}胸甲 护甲:+${this.chest.armor}` : '无',
            ring: this.ring ? `${this.ring.quality}戒指 吸血:+${this.ring.lifeSteal}` : '无',
            boots: this.boots ? `${this.boots.quality}靴子 速度:+${this.boots.speed}` : '无'
        };
    }

    getSkillInfo() {
        return Object.entries(this.skills).map(([key, skill]) => ({
            key,
            ...skill
        }));
    }

    get gold() {
        return this._gold;
    }

    set gold(value) {
        this._gold = value;
        // 更新UI
        const goldElement = document.getElementById('gold');
        if (goldElement) {
            goldElement.textContent = this._gold;
        }
    }

    applyStatus(statusType, duration) {
        switch(statusType) {
            case 'slow':
                this.effects.slowed = duration;
                break;
            case 'frozen':
                this.effects.frozen = duration;
                break;
            case 'superSaiyan':
                this.effects.superSaiyan = duration;
                break;
        }
    }

    castFireball() {
        if (!window.game) return;
        
        // 创建多个火球环绕玩家
        const fireballCount = 8;  
        for (let i = 0; i < fireballCount; i++) {
            const angle = (Math.PI * 2 / fireballCount) * i;
            const fireball = {
                x: this.position.x + Math.cos(angle) * 40,  
                y: this.position.y + Math.sin(angle) * 40,
                angle: angle,  
                speed: 400,
                damage: this.skills.Q.damage + this.attack,
                radius: 15
            };
            
            if (!window.game.fireballs) {
                window.game.fireballs = [];
            }
            window.game.fireballs.push(fireball);
        }

        // 添加技能特效
        const effect = {
            x: this.position.x,
            y: this.position.y,
            type: 'fireball',
            radius: 40,
            duration: 0.3,
            currentTime: 0
        };

        if (!window.game.effects) {
            window.game.effects = [];
        }
        window.game.effects.push(effect);
    }

    castFreeze() {
        if (!window.game) return;
        
        const mousePos = window.game.mousePosition;
        const angle = Math.atan2(mousePos.y - this.position.y, mousePos.x - this.position.x);
        
        // 创建冰冻特效
        const freezeWidth = 60;  // 冲击波宽度
        const freezeRange = 400; // 冲击波射程
        
        // 检查冲击波路径上的怪物
        for (const monster of window.game.monsters) {
            // 计算怪物到玩家的向量
            const dx = monster.position.x - this.position.x;
            const dy = monster.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 如果怪物在射程内
            if (distance <= freezeRange) {
                // 计算怪物到冲击波中心线的距离
                const monsterAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(monsterAngle - angle);
                const perpDistance = Math.sin(angleDiff) * distance;
                
                // 如果怪物在冲击波宽度内
                if (perpDistance <= freezeWidth / 2) {
                    monster.applyStatus('freeze', this.skills.W.duration);
                }
            }
        }

        // 添加冰冻特效
        window.game.effects.push({
            type: 'freeze',
            startX: this.position.x,
            startY: this.position.y,
            angle: angle,
            width: freezeWidth,
            range: freezeRange,
            duration: 0.5,  // 特效持续时间
            currentTime: 0,
            image: this.freezeEffect
        });
    }

    castSuperSaiyan() {
        if (this.effects.superSaiyan > 0) return;

        this.effects.superSaiyan = this.skills.E.duration;
        const oldAttack = this.attack;
        const oldMaxHp = this.maxHp;
        
        this.attack *= 2;
        this.maxHp *= 1.5;
        this.hp = this.maxHp;
        
        // 添加变身效果动画
        const effect = {
            x: this.position.x,
            y: this.position.y,
            type: 'superSaiyan',
            duration: 1,
            currentTime: 0
        };

        if (!window.game.effects) {
            window.game.effects = [];
        }
        window.game.effects.push(effect);
        
        // 技能结束后恢复状态
        setTimeout(() => {
            if (this.effects.superSaiyan <= 0) {
                this.attack = oldAttack;
                this.maxHp = oldMaxHp;
                this.hp = Math.min(this.hp, this.maxHp);
            }
        }, this.skills.E.duration * 1000);
    }

    drawWeapon(ctx) {
        // 根据武器品质决定环绕武器数量
        const weaponCount = this.weapon.quality === 'white' ? 1 :
                          this.weapon.quality === 'blue' ? 2 :
                          this.weapon.quality === 'purple' ? 3 :
                          this.weapon.quality === 'orange' ? 4 :
                          this.weapon.quality === 'legendary' ? 5 : 1;

        // 绘制多个环绕武器
        for (let i = 0; i < weaponCount; i++) {
            const angleOffset = (Math.PI * 2 / weaponCount) * i;
            const angle = this.weaponAngle + angleOffset;
            const weaponX = Math.cos(angle) * this.weaponRange;
            const weaponY = Math.sin(angle) * this.weaponRange;
            
            ctx.save();
            ctx.translate(weaponX, weaponY);
            // 旋转角度加上90度，使刀锋朝外
            ctx.rotate(angle + Math.PI/2);
            
            // 绘制武器图片
            const weaponQuality = this.weapon.quality === 'legendary' ? 'orange' : this.weapon.quality;
            if (this.weaponSprite[weaponQuality]) {
                ctx.drawImage(
                    this.weaponSprite[weaponQuality],
                    -this.weaponSize.width/2,
                    -this.weaponSize.height/2,
                    this.weaponSize.width,
                    this.weaponSize.height
                );
            } else {
                // 如果没有对应品质的图片，使用默认的圆形
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fillStyle = this.weapon.quality === 'white' ? '#fff' :
                               this.weapon.quality === 'blue' ? '#00f' :
                               this.weapon.quality === 'purple' ? '#800080' :
                               this.weapon.quality === 'orange' ? '#ffa500' :
                               this.weapon.quality === 'legendary' ? '#ffd700' : '#fff';
                ctx.fill();
            }
            ctx.restore();
        }
    }

    drawHealthBar(ctx) {
        const hpBarWidth = 40;
        const hpBarHeight = 5;
        ctx.fillStyle = '#f00';
        ctx.fillRect(
            this.position.x - hpBarWidth / 2,
            this.position.y - 30,
            hpBarWidth * (this.hp / this.maxHp),
            hpBarHeight
        );
    }

    drawCooldowns(ctx) {
        for (let key in this.skills) {
            const skill = this.skills[key];
            if (skill.cooldown > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`CD: ${Math.floor(skill.cooldown)}`, this.position.x, this.position.y - 50 - (parseInt(key) - 1) * 20);
            }
        }
    }

    drawEffects(ctx) {
        // 绘制技能特效
        if (window.game && window.game.effects) {
            for (let i = window.game.effects.length - 1; i >= 0; i--) {
                const effect = window.game.effects[i];
                
                // 更新特效时间
                effect.currentTime += window.game.deltaTime;
                if (effect.currentTime >= effect.duration) {
                    window.game.effects.splice(i, 1);
                    continue;
                }

                // 绘制冰冻特效
                if (effect.type === 'freeze' && effect.image && effect.image.complete) {
                    ctx.save();
                    ctx.translate(effect.startX, effect.startY);
                    ctx.rotate(effect.angle);
                    
                    // 计算特效透明度（随时间渐变）
                    const alpha = 1 - (effect.currentTime / effect.duration);
                    ctx.globalAlpha = alpha;
                    
                    // 绘制特效图片，拉伸到指定范围
                    ctx.drawImage(
                        effect.image,
                        0, -effect.width/2,
                        effect.range, effect.width
                    );
                    
                    ctx.restore();
                }
            }
        }
    }
}
