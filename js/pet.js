class Pet {
    constructor(type, player) {
        this.type = type;
        this.player = player;
        this.position = { ...player.position };
        this.size = 20;
        this.lastAttack = 0;
        this.lastSpecialAttack = 0;
        this.specialAttackCooldown = 4000; // 4秒
        this.damage = player.attack * 0.5; // 50% of player's attack per second
        this.range = 150; // 活动范围
        this.rotationAngle = 0; // 当前旋转角度
        this.rotationSpeed = 6; // 旋转速度（弧度/秒）
        this.target = null;

        // 加载宠物图片
        this.sprite = new Image();
        switch(type) {
            case 'celestialDog': // 哮天犬
                this.sprite.src = '/image/Pets/CelestialDog.png';
                break;
            case 'goldenPig': // 金猪
                this.sprite.src = '/image/Pets/GoldenPig.png';
                break;
            case 'dragon': // 神龙
                this.sprite.src = '/image/Pets/Dragon.png';
                break;
        }
        
        // 特殊攻击的图片
        this.specialAttackSprite = new Image();
        if (type === 'goldenPig') {
            this.specialAttackSprite.src = '/image/Effect/Freezeeffect.png';
        } else if (type === 'dragon') {
            this.specialAttackSprite.src = '/image/Effect/Fireball.png';
        }
    }

    update(deltaTime, monsters) {
        // 更新旋转角度
        this.rotationAngle += this.rotationSpeed * deltaTime;
        if (this.rotationAngle >= Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        }

        // 计算宠物在玩家周围的位置
        const orbitRadius = this.range * 0.5; // 轨道半径为活动范围的一半
        this.position.x = this.player.position.x + Math.cos(this.rotationAngle) * orbitRadius;
        this.position.y = this.player.position.y + Math.sin(this.rotationAngle) * orbitRadius;

        // 检查与所有怪物的碰撞并造成伤害
        monsters.forEach(monster => {
            if (!monster.isDead) {
                const monsterDx = monster.position.x - this.position.x;
                const monsterDy = monster.position.y - this.position.y;
                const monsterDistance = Math.sqrt(monsterDx * monsterDx + monsterDy * monsterDy);
                
                // 如果宠物与怪物接触，造成伤害
                if (monsterDistance <= this.size + monster.size) {
                    if (Date.now() - this.lastAttack >= 500) { // 每0.5秒造成一次伤害
                        monster.takeDamage(this.damage);
                        this.lastAttack = Date.now();
                    }
                }
            }
        });

        // 寻找最近的敌人（用于特殊攻击）
        let nearestDistance = Infinity;
        let nearestMonster = null;
        
        monsters.forEach(monster => {
            if (!monster.isDead) {
                const monsterDx = monster.position.x - this.position.x;
                const monsterDy = monster.position.y - this.position.y;
                const monsterDistance = Math.sqrt(monsterDx * monsterDx + monsterDy * monsterDy);
                
                if (monsterDistance < nearestDistance) {
                    nearestDistance = monsterDistance;
                    nearestMonster = monster;
                }
            }
        });

        this.target = nearestMonster;

        // 特殊攻击
        if (this.target && Date.now() - this.lastSpecialAttack >= this.specialAttackCooldown) {
            this.performSpecialAttack(monsters);
            this.lastSpecialAttack = Date.now();
        }
    }

    performSpecialAttack(monsters) {
        switch(this.type) {
            case 'goldenPig':
                this.shootIce();
                break;
            case 'dragon':
                this.shootFireball();
                break;
        }
    }

    shootIce() {
        if (!this.target) return;
        
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const angle = Math.atan2(dy, dx);
        
        const iceProjectile = {
            position: { ...this.position },
            velocity: {
                x: Math.cos(angle) * 300,
                y: Math.sin(angle) * 300
            },
            size: 15,
            damage: this.damage,
            update: function(deltaTime, monsters) {
                this.position.x += this.velocity.x * deltaTime;
                this.position.y += this.velocity.y * deltaTime;
                
                monsters.forEach(monster => {
                    if (!monster.isDead) {
                        const dx = monster.position.x - this.position.x;
                        const dy = monster.position.y - this.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < monster.size + this.size) {
                            monster.frozen = true;
                            setTimeout(() => { monster.frozen = false; }, 2000); // 冰冻效果持续2秒
                        }
                    }
                });
            }
        };
        
        game.projectiles.push(iceProjectile);
    }

    shootFireball() {
        if (!this.target || !window.game) return;
        
        // 创建多个火球环绕宠物
        const fireballCount = 8;  
        for (let i = 0; i < fireballCount; i++) {
            const angle = (Math.PI * 2 / fireballCount) * i;
            const fireball = {
                x: this.position.x + Math.cos(angle) * 40,  
                y: this.position.y + Math.sin(angle) * 40,
                angle: angle,  
                speed: 400,
                damage: this.damage * 2, // 火球伤害是宠物基础伤害的2倍
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

    draw(ctx) {
        // 绘制宠物
        ctx.drawImage(
            this.sprite,
            this.position.x - this.size,
            this.position.y - this.size,
            this.size * 2,
            this.size * 2
        );
    }
}
