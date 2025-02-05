class Game {
    constructor(saveData) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 初始化游戏对象
        this.saveData = saveData;
        this.player = new Player(saveData);
        this.monsters = [];
        this.fireballs = [];  // 新增：火球数组
        this.iceWaves = [];   // 新增：冰冲击波数组
        this.effects = [];    // 新增：特效数组
        this.projectiles = []; // 新增：宠物投射物数组
        this.gameTime = 0;
        this.lastMonsterSpawn = 0;
        this.lastBossSpawn = 0;
        this.bossKillCount = 0;  // 新增：记录击杀的Boss数量
        this.paused = false;
        this.quizActive = false;

        // 加载背景图片
        this.background = new Image();
        this.background.src = 'image/Background.png';
        
        // 鼠标位置
        this.mousePosition = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        
        // 创建确认对话框
        this.confirmDialog = document.createElement('div');
        this.confirmDialog.style.display = 'none';
        this.confirmDialog.style.position = 'absolute';
        this.confirmDialog.style.top = '50%';
        this.confirmDialog.style.left = '50%';
        this.confirmDialog.style.transform = 'translate(-50%, -50%)';
        this.confirmDialog.style.background = 'rgba(0,0,0,0.9)';
        this.confirmDialog.style.padding = '20px';
        this.confirmDialog.style.borderRadius = '10px';
        this.confirmDialog.style.color = 'white';
        this.confirmDialog.style.textAlign = 'center';
        this.confirmDialog.style.zIndex = '1000';
        document.body.appendChild(this.confirmDialog);
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 开始游戏循环
        this.lastTime = Date.now();
        this.gameLoop();
        
        // 新增：游戏难度系统
        this.difficulty = 1;  // 初始难度
        this.difficultyIncreaseInterval = 60;  // 每1分钟增加难度
        this.lastDifficultyIncrease = 0;
        
        // 新增：怪物生成间隔
        this.monsterSpawnInterval = 0.5;  // 每0.5秒生成一个怪物
        this.bossSpawnInterval = 40;   // 每40秒生成一个Boss
        
    }

    destroy() {
        // 停止游戏循环
        this.paused = true;
        // 移除事件监听器
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        document.removeEventListener('keydown', this.keyDownHandler);
    }

    gameOver() {
        // 保存金币
        this.saveData.addGold(this.player._gold);
        // 显示游戏结束对话框
        this.confirmDialog.innerHTML = `
            <h2>游戏结束</h2>
            <p>本局获得金币: ${this.player._gold}</p>
            <button onclick="Menu.showMenu()" style="padding: 10px 20px; margin: 10px; background: #4a4a4a; color: white; border: none; border-radius: 5px; cursor: pointer;">
                返回主菜单
            </button>
        `;
        this.confirmDialog.style.display = 'block';
    }

    setupEventListeners() {
        // 鼠标移动
        this.mouseMoveHandler = (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        };
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

        // 键盘事件
        this.keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                const shop = document.getElementById('shop');
                if (shop.style.display === 'block') {
                    shop.style.display = 'none';
                    if (!this.quizActive) {
                        this.paused = false;
                    }
                } else {
                    shop.style.display = 'block';
                    this.paused = true;
                    this.openShop();
                }
            }
        };
        document.addEventListener('keydown', this.keyDownHandler);

        // 添加秘籍输入框监听
        const shopInput = document.createElement('input');
        shopInput.type = 'text';
        shopInput.style.position = 'absolute';
        shopInput.style.left = '10px';
        shopInput.style.bottom = '10px';
        shopInput.style.width = '150px';
        shopInput.style.display = 'none';
        document.body.appendChild(shopInput);

        shopInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (shopInput.value.toLowerCase() === 'bigdaddy') {
                    this.giveRandomLegendaryItem();
                }
                shopInput.value = '';
            }
        });

        // 在商店打开时显示输入框
        const shop = document.getElementById('shop');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    shopInput.style.display = shop.style.display;
                }
            });
        });
        observer.observe(shop, { attributes: true });

        // 窗口大小改变
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }

    gameLoop() {
        if (this.paused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }

        const currentTime = Date.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);

        // 更新游戏时间
        this.gameTime += dt;
        
        // 动态调整游戏难度
        this.lastDifficultyIncrease += dt;
        if (this.lastDifficultyIncrease >= this.difficultyIncreaseInterval) {
            this.increaseDifficulty();
            this.lastDifficultyIncrease = 0;
        }
        
        // 更新玩家
        this.player.update(dt, this.mousePosition, this);
        
        // 更新宠物
        this.player.pets.forEach(pet => {
            pet.update(dt, this.monsters);
        });

        // 生成怪物
        this.lastMonsterSpawn += dt;
        if (this.lastMonsterSpawn >= this.monsterSpawnInterval / this.difficulty) {  // 随难度增加生成速度
            this.lastMonsterSpawn = 0;
            this.spawnMonster();
        }
        
        // 生成Boss
        this.lastBossSpawn += dt;
        if (this.lastBossSpawn >= this.bossSpawnInterval) {  // Boss生成间隔固定
            this.lastBossSpawn = 0;
            this.spawnBoss();
        }
        
        // 更新怪物
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            monster.update(dt, this.player.position);
            
            // 检查所有武器的碰撞
            const weaponCount = this.player.weapon.quality === 'white' ? 1 :
                              this.player.weapon.quality === 'blue' ? 2 :
                              this.player.weapon.quality === 'purple' ? 3 :
                              this.player.weapon.quality === 'orange' ? 4 :
                              this.player.weapon.quality === 'legendary' ? 5 : 1;

            let weaponHit = false;
            for (let w = 0; w < weaponCount; w++) {
                const angleOffset = (Math.PI * 2 / weaponCount) * w;
                const weaponX = this.player.position.x + 
                               Math.cos(this.player.weaponAngle + angleOffset) * this.player.weaponRange;
                const weaponY = this.player.position.y + 
                               Math.sin(this.player.weaponAngle + angleOffset) * this.player.weaponRange;
                
                const dx = weaponX - monster.position.x;
                const dy = weaponY - monster.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < monster.size + 10) {
                    weaponHit = true;
                    break;
                }
            }

            // 如果任何武器击中了怪物
            if (weaponHit) {
                const damage = this.player.dealDamage(this.player.weapon.damage || this.player.attack);  // 计算吸血
                const actualDamage = damage;  // 计算吸血
                if (monster.takeDamage(actualDamage)) {
                    // 如果击杀的是Boss，增加计数
                    if (monster.isBoss) {
                        this.bossKillCount++;
                    }
                    
                    const loot = this.generateLoot(monster);
                    this.player.gainExp(loot.exp);
                    this.player.gold += loot.gold;
                    
                    // 如果有装备掉落，直接尝试装备
                    if (loot.equipment) {
                        this.player.handleLoot(loot.equipment);
                    }
                    
                    this.monsters.splice(i, 1);
                    continue;
                }
            }

            // 检查激光碰撞
            if (monster.type === 'laser' && monster.laser) {
                // 计算玩家到激光的距离
                const laserEndX = monster.laser.startX + Math.cos(monster.laser.angle) * monster.laser.length;
                const laserEndY = monster.laser.startY + Math.sin(monster.laser.angle) * monster.laser.length;
                
                // 计算玩家到激光线段的距离
                const A = laserEndY - monster.laser.startY;
                const B = monster.laser.startX - laserEndX;
                const C = laserEndX * monster.laser.startY - monster.laser.startX * laserEndY;
                
                // 计算点到直线的距离
                const distance = Math.abs(A * this.player.position.x + B * this.player.position.y + C) / 
                               Math.sqrt(A * A + B * B);

                // 检查玩家是否在激光线段范围内
                const t = ((this.player.position.x - monster.laser.startX) * (laserEndX - monster.laser.startX) +
                          (this.player.position.y - monster.laser.startY) * (laserEndY - monster.laser.startY)) /
                         (monster.laser.length * monster.laser.length);

                if (distance < 20 && t >= 0 && t <= 1) {  // 激光碰撞范围为20像素
                    this.player.takeDamage(monster.laser.damage * 0.05);  
                }
            }

            // 检查子弹碰撞
            if (monster.bullets) {
                for (let j = monster.bullets.length - 1; j >= 0; j--) {
                    const bullet = monster.bullets[j];
                    const dx = bullet.x - this.player.position.x;
                    const dy = bullet.y - this.player.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.player.size) {
                        this.player.takeDamage(monster.damage);
                        monster.bullets.splice(j, 1);
                    }
                }
            }
            
            // 检查玩家碰撞
            const playerDx = this.player.position.x - monster.position.x;
            const playerDy = this.player.position.y - monster.position.y;
            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
            
            if (playerDistance < this.player.size + monster.size) {
                this.player.takeDamage(monster.damage * 0.1);
            }
        }
        
        // 更新火球
        if (this.fireballs) {
            for (let i = this.fireballs.length - 1; i >= 0; i--) {
                const fireball = this.fireballs[i];
                
                // 更新火球位置
                fireball.x += Math.cos(fireball.angle) * fireball.speed * dt;
                fireball.y += Math.sin(fireball.angle) * fireball.speed * dt;
                
                // 检查碰撞
                for (const monster of this.monsters) {
                    if (!monster.isDead) {
                        const dx = monster.position.x - fireball.x;
                        const dy = monster.position.y - fireball.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < monster.size + fireball.radius) {
                            monster.takeDamage(fireball.damage);
                            this.fireballs.splice(i, 1);
                            break;
                        }
                    }
                }
                
                // 移除超出屏幕的火球
                if (fireball.x < 0 || fireball.x > this.canvas.width ||
                    fireball.y < 0 || fireball.y > this.canvas.height) {
                    this.fireballs.splice(i, 1);
                }
            }
        }
        
        // 更新冰冲击波
        for (let i = this.iceWaves.length - 1; i >= 0; i--) {
            const wave = this.iceWaves[i];
            const moveX = Math.cos(wave.angle) * wave.speed * dt;
            const moveY = Math.sin(wave.angle) * wave.speed * dt;
            wave.x += moveX;
            wave.y += moveY;
            wave.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

            // 检查冲击波是否击中怪物
            for (let j = this.monsters.length - 1; j >= 0; j--) {
                const monster = this.monsters[j];
                // 计算怪物到冲击波中心线的距离
                const dx = monster.position.x - wave.x;
                const dy = monster.position.y - wave.y;
                // 计算怪物在冲击波方向上的投影距离
                const projectionDist = dx * Math.cos(wave.angle) + dy * Math.sin(wave.angle);
                // 计算怪物到冲击波中心线的垂直距离
                const perpDist = Math.abs(-dx * Math.sin(wave.angle) + dy * Math.cos(wave.angle));

                // 如果怪物在冲击波的范围内
                if (projectionDist > 0 && projectionDist < wave.width * 2 && perpDist < wave.width / 2) {
                    const damage = this.player.dealDamage(wave.damage);  // 计算吸血
                    if (monster.takeDamage(damage)) {
                        // 如果击杀的是Boss，增加计数
                        if (monster.isBoss) {
                            this.bossKillCount++;
                        }
                        
                        const loot = this.generateLoot(monster);
                        this.player.gainExp(loot.exp);
                        this.player.gold += loot.gold;
                        
                        // 如果有装备掉落，直接尝试装备
                        if (loot.equipment) {
                            this.player.handleLoot(loot.equipment);
                        }
                        
                        this.monsters.splice(j, 1);
                    } else {
                        // 冰冻效果
                        monster.frozen = this.player.skills.W.duration;
                    }
                }
            }

            // 移除超出范围的冲击波
            if (wave.distanceTraveled >= wave.range) {
                this.iceWaves.splice(i, 1);
            }
        }
        
        // 更新投射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(dt, this.monsters);
            
            // 检查投射物是否超出屏幕范围
            if (projectile.position.x < 0 || projectile.position.x > this.canvas.width ||
                projectile.position.y < 0 || projectile.position.y > this.canvas.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // 绘制玩家
        this.player.draw(this.ctx);

        // 绘制宠物
        this.player.pets.forEach(pet => {
            pet.draw(this.ctx);
        });

        // 绘制怪物
        this.monsters.forEach(monster => {
            monster.draw(this.ctx);
        });
        
        // 绘制火球
        if (this.fireballs) {
            this.fireballs.forEach(fireball => {
                this.ctx.fillStyle = '#FF4500';
                this.ctx.beginPath();
                this.ctx.arc(fireball.x, fireball.y, fireball.radius, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加火焰拖尾效果
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#FF8C00';
                this.ctx.fillStyle = '#FFA500';
                this.ctx.beginPath();
                this.ctx.arc(fireball.x, fireball.y, fireball.radius * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            });
        }

        // 绘制冰冲击波
        this.iceWaves.forEach(wave => {
            this.ctx.save();
            this.ctx.translate(wave.x, wave.y);
            this.ctx.rotate(wave.angle);
            
            // 绘制冲击波主体
            this.ctx.beginPath();
            this.ctx.moveTo(0, -wave.width / 2);
            this.ctx.lineTo(wave.width * 2, -wave.width / 4);
            this.ctx.lineTo(wave.width * 2, wave.width / 4);
            this.ctx.lineTo(0, wave.width / 2);
            this.ctx.closePath();
            
            // 创建渐变
            const gradient = this.ctx.createLinearGradient(0, 0, wave.width * 2, 0);
            gradient.addColorStop(0, 'rgba(135, 206, 235, 0.8)');   // 浅蓝色
            gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');     // 透明
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // 绘制投射物
        this.projectiles.forEach(projectile => {
            this.ctx.fillStyle = projectile.type === 'ice' ? '#87CEEB' : '#FF4500';
            this.ctx.beginPath();
            this.ctx.arc(projectile.position.x, projectile.position.y, projectile.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // 绘制特效
        this.effects = this.effects.filter(effect => {
            // 确保effect有有效的坐标
            if (!effect || typeof effect.x !== 'number' || typeof effect.y !== 'number' || 
                isNaN(effect.x) || isNaN(effect.y)) {
                return false;
            }

            if (effect.type === 'superSaiyan') {
                // 绘制超级赛亚人变身效果
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, 50 * (1 - effect.currentTime / effect.duration), 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 215, 0, ${1 - effect.currentTime / effect.duration})`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            } else if (effect.type === 'fireball') {
                // 绘制火球施法效果
                const progress = effect.currentTime / effect.duration;
                const radius = effect.radius * (1 + progress);
                
                // 确保半径是有效的数字
                if (typeof radius !== 'number' || isNaN(radius)) {
                    return false;
                }
                
                const gradient = this.ctx.createRadialGradient(
                    effect.x, effect.y, 0,
                    effect.x, effect.y, radius
                );
                gradient.addColorStop(0, `rgba(255, 68, 0, ${1 - progress})`);
                gradient.addColorStop(0.6, `rgba(255, 136, 0, ${0.5 - progress * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');

                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            } else if (effect.type === 'freeze') {
                // 绘制冰冻特效
                if (effect.image && effect.image.complete) {
                    this.ctx.save();
                    this.ctx.translate(effect.startX, effect.startY);
                    this.ctx.rotate(effect.angle);
                    
                    // 计算特效透明度（随时间渐变）
                    const alpha = 1 - (effect.currentTime / effect.duration);
                    this.ctx.globalAlpha = alpha;
                    
                    // 绘制特效图片
                    this.ctx.drawImage(
                        effect.image,
                        0, -effect.width/2,
                        effect.range, effect.width
                    );
                    
                    this.ctx.restore();
                }
            }
            
            effect.currentTime += dt;
            return effect.currentTime < effect.duration;
        });
        
        // 在绘制完所有内容后更新UI
        this.updateUI();
        
        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }

    updateUI() {
        // 更新等级和经验
        document.getElementById('level').textContent = this.player.level;
        document.getElementById('exp').textContent = Math.floor(this.player.exp);
        document.getElementById('nextExp').textContent = this.player.nextExp;
        
        // 更新生命值
        document.getElementById('hp').textContent = `${Math.floor(this.player.hp)}/${this.player.maxHp}`;
        
        // 更新攻击和防御
        document.getElementById('attack').textContent = Math.floor(this.player.attack);
        document.getElementById('defense').textContent = this.player.defense;
        
        // 更新金币
        document.getElementById('gold').textContent = this.player.gold;
    }

    spawnMonster() {
        const types = ['normal', 'tank', 'explosive', 'laser', 'slow'];
        
        // 根据难度调整怪物类型概率
        let typeWeights = {
            'normal': Math.max(0.3, 0.4 / this.difficulty),
            'tank': Math.min(0.3, 0.2 * this.difficulty),
            'explosive': Math.min(0.2, 0.15 * this.difficulty),
            'laser': Math.min(0.2, 0.15 * this.difficulty),
            'slow': Math.min(0.15, 0.1 * this.difficulty)
        };

        // 确保权重总和为1
        const totalWeight = Object.values(typeWeights).reduce((a, b) => a + b, 0);
        typeWeights = Object.fromEntries(
            Object.entries(typeWeights).map(([type, weight]) => [type, weight / totalWeight])
        );

        // 根据权重选择怪物类型
        const rand = Math.random();
        let cumulativeWeight = 0;
        let selectedType = 'normal';

        for (const [type, weight] of Object.entries(typeWeights)) {
            cumulativeWeight += weight;
            if (rand < cumulativeWeight) {
                selectedType = type;
                break;
            }
        }

        const level = Math.max(1, Math.floor(this.gameTime / 60 * this.difficulty));
        const monster = new Monster(selectedType, level, false, false);
        
        // 根据游戏难度调整怪物属性
        monster.adjustDifficulty(this.difficulty);
        
        this.monsters.push(monster);
    }

    spawnBoss() {
        const bossTypes = ['tank', 'explosive', 'laser', 'slow'];
        const randomType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        
        // 每3只Boss后生成一只超级Boss
        const isSuperBoss = this.bossKillCount > 0 && this.bossKillCount % 3 === 0;
        
        // 创建Boss实例
        const boss = new Monster(
            randomType,
            Math.max(1, Math.floor(this.difficulty)),
            true,
            isSuperBoss  // 新增参数：是否是超级Boss
        );
        
        this.monsters.push(boss);
    }

    handleLoot(equipment) {
        let shouldEquip = false;
        const qualityValue = {
            'white': 1,
            'blue': 2,
            'purple': 3,
            'red': 4,
            'mythic': 5
        };
        
        switch(equipment.type) {
            case 'weapon':
                if (qualityValue[equipment.quality] > qualityValue[this.player.weapon.quality]) {
                    this.player.weapon = { quality: equipment.quality, damage: 10 * qualityValue[equipment.quality] };
                    document.getElementById('weapon').textContent = equipment.quality + '武器';
                }
                break;
            case 'chest':
                if (!this.player.chest || qualityValue[equipment.quality] > qualityValue[this.player.chest.quality]) {
                    this.player.chest = equipment;
                    this.player.defense = 5 * qualityValue[equipment.quality];
                    document.getElementById('chest').textContent = equipment.quality + '胸甲';
                }
                break;
            case 'ring':
                if (!this.player.ring || qualityValue[equipment.quality] > qualityValue[this.player.ring.quality]) {
                    this.player.ring = equipment;
                    this.player.lifeSteal = 0.05 * qualityValue[equipment.quality];
                    document.getElementById('ring').textContent = equipment.quality + '戒指';
                }
                break;
            case 'boots':
                if (!this.player.boots || qualityValue[equipment.quality] > qualityValue[this.player.boots.quality]) {
                    this.player.boots = equipment;
                    this.player.speed = 200 * (1 + 0.1 * qualityValue[equipment.quality]);
                    document.getElementById('boots').textContent = equipment.quality + '鞋子';
                }
                break;
        }
    }

    openShop() {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';

        // 添加装备商店项
        this.generateEquipmentShopItems(shopItems);

        // 添加技能商店项
        this.generateSkillShopItems(shopItems);

        // 添加结束游戏按钮
        const endGameButton = document.createElement('div');
        endGameButton.className = 'shop-item';
        endGameButton.style.backgroundColor = '#ff4444';
        endGameButton.style.marginTop = '20px';
        endGameButton.innerHTML = `
            <h3>结束当前游戏</h3>
            <p>保存金币并返回主菜单</p>
            <p>当前金币: ${this.player.gold}</p>
        `;
        endGameButton.onclick = () => {
            // 保存金币到saveData
            this.saveData.addGold(this.player.gold);
            this.saveData.save();
            
            // 关闭商店
            const shop = document.getElementById('shop');
            shop.style.display = 'none';
            
             // 重置玩家状态
            this.player.resetAllStats();
        
             // 清空所有怪物
             this.monsters = [];
        
             // 清空所有技能效果
            this.fireballs = [];
            this.iceWaves = [];
            this.effects = [];
            this.projectiles = [];
        
            // 重置游戏时间和难度
            this.gameTime = 0;
            this.lastMonsterSpawn = 0;
            this.lastBossSpawn = 0;
            this.bossKillCount = 0;
            this.difficulty = 1;
            this.lastDifficultyIncrease = 0;
        
            // 重置游戏状态标志
            this.paused = false;
            this.quizActive = false;
            
            // 停止游戏循环
            this.destroy();
            
            // 返回主菜单
            Menu.showMenu();
        };
        
        shopItems.appendChild(endGameButton);
    }

    generateEquipmentShopItems(shopItems) {
        const qualities = ['white', 'blue'];  // 添加蓝色品质
        const types = ['chest', 'ring', 'boots'];
        
        types.forEach(type => {
            const quality = qualities[Math.floor(Math.random() * qualities.length)];
            const item = {
                type: type,
                quality: quality,
                armor: type === 'chest' ? (
                    quality === 'white' ? 5 : 10
                ) : 0,
                lifeSteal: type === 'ring' ? (
                    quality === 'white' ? 2 : 5
                ) : 0,
                speed: type === 'boots' ? (
                    quality === 'white' ? 10 : 20
                ) : 0,
                price: quality === 'white' ? 50 : 100
            };

            // 创建商店物品的 DOM 元素
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            
            const typeNames = {
                'chest': '胸甲',
                'ring': '戒指',
                'boots': '靴子'
            };

            itemElement.innerHTML = `
                <h3>${quality === 'white' ? '白色' : '蓝色'}${typeNames[type]}</h3>
                <p>${type === 'chest' ? `护甲: +${item.armor}` : 
                    type === 'ring' ? `吸血: +${item.lifeSteal}` : 
                    `移动速度: +${item.speed}`}</p>
                <p>价格: ${item.price} 金币</p>
            `;

            itemElement.onclick = () => {
                if (this.player.gold >= item.price) {
                    this.player.gold -= item.price;
                    this.player.handleLoot(item);
                    this.openShop(); // 刷新商店
                } else {
                    alert('金币不足！');
                }
            };
            
            shopItems.appendChild(itemElement);
        });
    }

    generateSkillShopItems(shopItems) {
        const skills = this.player.getSkillInfo();
        
        skills.forEach(skill => {
            const skillItem = document.createElement('div');
            skillItem.className = 'shop-item';
            
            if (!skill.learned) {
                skillItem.innerHTML = `
                    <h3>${skill.name} (${skill.key})</h3>
                    <p>${skill.description}</p>
                    <p>价格: ${skill.cost} 金币</p>
                `;
                skillItem.onclick = () => this.buySkill(skill.key);
            } else {
                skillItem.innerHTML = `
                    <h3>${skill.name} (${skill.key})</h3>
                    <p>${skill.description}</p>
                    <p>已学习</p>
                `;
                skillItem.style.opacity = '0.5';
            }
            
            shopItems.appendChild(skillItem);
        });
    }

    buySkill(skillKey) {
        if (this.player.buySkill(skillKey)) {
            this.openShop(); // 刷新商店显示
            // 更新技能UI
            const skillElement = document.getElementById(`skill-${skillKey}`);
            if (skillElement) {
                skillElement.classList.remove('locked');
            }
        } else {
            alert('金币不足或已学习此技能！');
        }
    }

    buyWeapon() {
        // 购买武器逻辑
    }

    // 新增：答题相关方法
    startQuiz() {
        this.quizActive = true;
        this.paused = true;
    }

    endQuiz() {
        this.quizActive = false;
        this.paused = false;
    }

    // 新增：给予一件暗金武器
    giveRandomLegendaryItem() {
        const items = [
            { type: 'weapon', name: '暗金之剑', quality: 'legendary', damage: 50 },
                   ];

        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        switch(randomItem.type) {
            case 'weapon':
                this.player.weapon = randomItem;
                break;
            
        }

        // 显示获得物品的提示
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
        message.textContent = `获得暗金装备：${randomItem.name}！`;
        document.body.appendChild(message);

        setTimeout(() => {
            document.body.removeChild(message);
        }, 3000);
    }

    generateLoot(monster) {
        const baseExp = monster.isBoss ? 50 : 10;
        const baseGold = monster.isBoss ? 100 : 20;
        
        const loot = {
            exp: baseExp * monster.level,
            gold: baseGold * monster.level,
            equipment: null
        };

        // 装备掉落概率
        let dropChance = monster.isBoss ? 0.7 : 0.3;
        let qualityChances;

        if (monster.isSuperBoss) {
            // 超级Boss 100%掉落橙色或暗金装备
            qualityChances = {
                'orange': 0.99,
                'legendary': 0.01
            };
            dropChance = 1;  // 100%掉落概率
        } else if (monster.isBoss) {
            qualityChances = {
                'blue': 0.6,
                'purple': 0.3,
                'orange': 0.1
          };
        } else {
            qualityChances = {
                'white': 0.6,
                'blue': 0.25,
                'purple': 0.1,
                'orange': 0.05
            };
        }

        // 根据权重选择装备品质
        const rand = Math.random();
        let cumulativeWeight = 0;
        let selectedQuality = 'white';

        for (const [quality, weight] of Object.entries(qualityChances)) {
            cumulativeWeight += weight;
            if (rand < cumulativeWeight) {
                selectedQuality = quality;
                break;
            }
        }

        // 根据品质生成装备
        if (Math.random() < dropChance) {
            const types = ['chest', 'ring', 'boots', 'weapon'];
            const type = types[Math.floor(Math.random() * types.length)];
            const item = {
                type: type,
                quality: selectedQuality,
                armor: type === 'chest' ? (
                    selectedQuality === 'white' ? 5 :
                    selectedQuality === 'blue' ? 10 :
                    selectedQuality === 'purple' ? 15 :
                    selectedQuality === 'orange' ? 20 : 25
                ) : 0,
                lifeSteal: type === 'ring' ? (
                    selectedQuality === 'white' ? 2 :
                    selectedQuality === 'blue' ? 5 :
                    selectedQuality === 'purple' ? 8 :
                    selectedQuality === 'orange' ? 12 : 15
                ) : 0,
                speed: type === 'boots' ? (
                    selectedQuality === 'white' ? 10 :
                    selectedQuality === 'blue' ? 20 :
                    selectedQuality === 'purple' ? 30 :
                    selectedQuality === 'orange' ? 40 : 50
                ) : 0,
                damage: type === 'weapon' ? (
                    selectedQuality === 'white' ? 10 :
                    selectedQuality === 'blue' ? 20 :
                    selectedQuality === 'purple' ? 30 :
                    selectedQuality === 'orange' ? 40 : 50
                ) : 0
            };

            loot.equipment = item;
        }

        return loot;
    }


    increaseDifficulty() {
        this.difficulty += 0.5;  // 每次增加50%难度
    }

    // 显示确认对话框
    showConfirmDialog(equipment, callback) {
        // 检查是否需要显示确认对话框
        const qualityOrder = {
            'white': 0,
            'blue': 1,
            'purple': 2,
            'orange': 3,
            'legendary': 4
        };

        const currentEquipment = this.player[equipment.type];
        const shouldAsk = !currentEquipment || 
            qualityOrder[equipment.quality] > qualityOrder[currentEquipment.quality];

        if (!shouldAsk) {
            callback(false);
            return;
        }

        this.paused = true;
        
        // 获取装备品质对应的颜色
        const qualityColors = {
            'white': '#ffffff',
            'blue': '#0000ff',
            'purple': '#800080',
            'orange': '#ffa500',
            'legendary': '#ffd700'
        };
        
        const equipmentType = {
            'chest': '护甲',
            'ring': '戒指',
            'boots': '靴子',
            'weapon': '武器'
        };
        
        // 设置对话框内容
        this.confirmDialog.innerHTML = `
            <h2>发现更好的装备</h2>
            <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;">
                <p style="margin: 5px 0;">当前装备:</p>
                ${currentEquipment ? `
                <p style="color: ${qualityColors[currentEquipment.quality]}">
                    ${currentEquipment.quality} ${equipmentType[currentEquipment.type]}
                    ${currentEquipment.armor ? `<br>护甲: +${currentEquipment.armor}` : ''}
                    ${currentEquipment.lifeSteal ? `<br>吸血: +${currentEquipment.lifeSteal}` : ''}
                    ${currentEquipment.speed ? `<br>移动速度: +${currentEquipment.speed}` : ''}
                    ${currentEquipment.damage ? `<br>伤害: +${currentEquipment.damage}` : ''}
                </p>
                ` : '<p>无</p>'}
            </div>
            <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;">
                <p style="margin: 5px 0;">新装备:</p>
                <p style="color: ${qualityColors[equipment.quality]}">
                    ${equipment.quality} ${equipmentType[equipment.type]}
                    ${equipment.armor ? `<br>护甲: +${equipment.armor}` : ''}
                    ${equipment.lifeSteal ? `<br>吸血: +${equipment.lifeSteal}` : ''}
                    ${equipment.speed ? `<br>移动速度: +${equipment.speed}` : ''}
                    ${equipment.damage ? `<br>伤害: +${equipment.damage}` : ''}
                </p>
            </div>
            <p>是否拾取？</p>
            <div>
                <button onclick="window.game.handleConfirmChoice(true)" style="margin-right: 10px">是</button>
                <button onclick="window.game.handleConfirmChoice(false)">否</button>
            </div>
        `;
        
        this.confirmDialog.style.display = 'block';
        this.confirmCallback = callback;
    }
    
    // 处理确认对话框的选择
    handleConfirmChoice(confirmed) {
        this.confirmDialog.style.display = 'none';
        this.paused = false;
        if (this.confirmCallback) {
            this.confirmCallback(confirmed);
            this.confirmCallback = null;
        }
    }
}

// 启动游戏
window.onload = () => {
    window.game = new Game(saveData);
};
