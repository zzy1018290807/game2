class Monster {
    constructor(type, level, isBoss = false, isSuperBoss = false) {
        this.type = type;
        this.level = level;
        this.isBoss = isBoss;
        this.isSuperBoss = isSuperBoss;  
        this.position = this.getSpawnPosition();
        this.size = isSuperBoss ? 60 : (isBoss ? 40 : 20);  
        this.bullets = [];
        this.bulletTimer = 0;
        this.laserTimer = 0;  
        this.isChargingLaser = false;  
        this.laserChargeTime = 0;  
        this.laser = null;  
        this.superBossAttackPattern = 0;  
        this.superBossAttackTimer = 0;    
        this.frozen = false;  
        this.isExploding = false;  
        this.explosionTimer = 0;   
        this.explosionEffectTimer = 0;  // 添加爆炸特效持续时间计时器
        this.hasDealtExplosionDamage = false;  // 添加是否已造成爆炸伤害的标记

        // 添加闪光效果相关属性
        this.flashDuration = 0;
        this.knockbackDuration = 0;
        this.knockbackDirection = { x: 0, y: 0 };
        this.knockbackSpeed = 300;
        
        // 添加伤害数字显示相关属性
        this.damageNumbers = [];

        // 添加光环伤害计时器
        this.lastAuraDamageTime = 0;

        this.initStats();

        // 加载怪物图片
        this.sprite = new Image();
        if (this.isBoss) {
            this.sprite.src = '/image/Monster/boss.png';
        } else {
            // 确保类型名称的第一个字母小写
            const fileName = this.type.toLowerCase() + '.png';
            this.sprite.src = `/image/Monster/${fileName}`;
        }
        // 设置图片显示大小（保持碰撞体积不变）
        this.spriteWidth = this.size * 2;  // 图像宽度为碰撞体积的2倍
        this.spriteHeight = this.size * 2; // 图像高度为碰撞体积的2倍

        // 加载激光特效图片
        if (this.type === 'laser') {
            this.laserEffect = new Image();
            this.laserEffect.src = '/image/Effect/Lasereffect.png';
            this.laserWidth = 40; // 激光宽度
        }

        // 加载爆炸特效图片
        if (this.type === 'explosive') {
            this.explosionEffect = new Image();
            this.explosionEffect.src = '/image/Effect/Explosive.png';
        }
    }

    initStats() {
        let baseHp = 50 * this.level;
        let baseDamage = 10 * this.level;
        let baseSpeed = 100;
        let baseDefense = 5 * this.level;  // 添加基础防御值

        switch(this.type) {
            case 'normal':
                break;
            case 'tank':
                baseHp *= 3;
                baseDamage *= 0.5;
                baseSpeed *= 0.4;
                baseDefense *= 1.2;  // 坦克型怪物有更高的防御
                break;
            case 'explosive':
                baseHp *= 0.8;
                baseDamage *= 1.5;
                baseSpeed *= 0.7;
                baseDefense *= 0.5;  // 爆炸型怪物防御较低
                break;
            case 'laser':
                baseHp *= 0.9;
                baseDamage *= 1.5;
                baseSpeed *= 1.1;
                baseDefense *= 0.7;  // 激光型怪物防御较低
                break;
            case 'slow':
                baseHp *= 1.2;
                baseDamage *= 1;
                baseSpeed *= 0.9;
                baseDefense *= 1.5;  // 减速型怪物防御较高
                break;
        }

        if (this.isBoss) {
            baseHp *= 10;
            baseDamage *= 2;
            baseSpeed *= 0.7;
            baseDefense *= 3;  // Boss有更高的防御
        }

        if (this.isSuperBoss) {
            baseHp *= 20;      
            baseDamage *= 5;   
            baseSpeed *= 0.6;  
            baseDefense *= 5;  // 超级Boss有极高的防御
        }

        this.hp = this.maxHp = baseHp;
        this.damage = baseDamage;
        this.speed = baseSpeed;
        this.defense = baseDefense;  // 设置防御属性
    }

    getSpawnPosition() {
        const canvas = document.getElementById('gameCanvas');
        const margin = 100;  // 生成位置距离边缘的距离
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch(side) {
            case 0:  // 上方
                x = Math.random() * (canvas.width - 2 * margin) + margin;
                y = -margin;
                break;
            case 1:  // 右方
                x = canvas.width + margin;
                y = Math.random() * (canvas.height - 2 * margin) + margin;
                break;
            case 2:  // 下方
                x = Math.random() * (canvas.width - 2 * margin) + margin;
                y = canvas.height + margin;
                break;
            case 3:  // 左方
                x = -margin;
                y = Math.random() * (canvas.height - 2 * margin) + margin;
                break;
        }

        return { x, y };
    }

    update(dt, playerPosition) {
        if (this.hp <= 0) {
            // 如果是爆炸怪物且正在爆炸
            if (this.type === 'explosive' && this.isExploding) {
                this.explosionTimer -= dt;
                
                // 爆炸时间到，检查是否造成伤害
                if (this.explosionTimer <= 0 && !this.hasDealtExplosionDamage) {
                    const explosionRadius = 100;
                    const explosionDamage = this.damage * 2;
                    const player = window.game.player;
                    
                    const dx = player.position.x - this.position.x;
                    const dy = player.position.y - this.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 只有当玩家在爆炸范围内时才造成伤害
                    if (distance <= explosionRadius) {
                        player.takeDamage(explosionDamage);
                    }
                    
                    this.hasDealtExplosionDamage = true;  // 标记已造成伤害
                    this.explosionEffectTimer = 1;  // 设置特效持续1秒
                }
                
                // 如果爆炸特效计时器存在，更新它
                if (this.explosionEffectTimer > 0) {
                    this.explosionEffectTimer -= dt;
                }
            }
            return;
        }

        if (this.hp <= 0) return;

        const dx = playerPosition.x - this.position.x;
        const dy = playerPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 基础移动逻辑
        if (distance > this.size + 20) {  // 保持一定距离
            const moveSpeed = this.frozen ? this.speed * 0.3 : this.speed;  // 如果被冰冻则减速
            this.position.x += (dx / distance) * moveSpeed * dt;
            this.position.y += (dy / distance) * moveSpeed * dt;
        } else {
            // 当怪物接触到玩家时
            const player = window.game.player;
            
            // slow怪物使玩家减速
            if (this.type === 'slow') {
                player.applyStatus('slow', 2); // 使玩家减速2秒
            }
            
            // 造成接触伤害
            player.takeDamage(this.damage * dt);
        }

        // 更新激光计时器
        if (this.type === 'laser' || this.isSuperBoss) {
            this.laserTimer += dt;
        }

        if (this.isSuperBoss) {
            this.superBossAttackTimer += dt;
            
            if (this.superBossAttackTimer >= 3) {
                this.superBossAttackTimer = 0;
                this.superBossAttackPattern = (this.superBossAttackPattern + 1) % 3;
            }

            switch(this.superBossAttackPattern) {
                case 0: 
                    if (!this.isChargingLaser && this.laserTimer >= 1) {
                        this.isChargingLaser = true;
                        this.laserChargeTime = 0;
                    }
                    if (this.isChargingLaser) {
                        this.laserChargeTime += dt;
                        if (this.laserChargeTime >= 0.5) {  
                            this.shootLaser(playerPosition);
                            this.isChargingLaser = false;
                            this.laserTimer = 0;
                        }
                    }
                    break;
                    
                case 1: 
                    this.bulletTimer += dt;
                    if (this.bulletTimer >= 0.5) {  
                        this.bulletTimer = 0;
                        for (let i = 0; i < 8; i++) {
                            const angle = (Math.PI * 2 / 8) * i;
                            this.bullets.push({
                                x: this.position.x,
                                y: this.position.y,
                                dx: Math.cos(angle),
                                dy: Math.sin(angle)
                            });
                        }
                    }
                    break;
                    
                case 2: 
                    if (distance > this.size + 20) {
                        this.position.x += (dx / distance) * this.speed * 1.5 * dt;
                        this.position.y += (dy / distance) * this.speed * 1.5 * dt;
                    }
                    break;
            }

            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                bullet.x += bullet.dx * 400 * dt;  
                bullet.y += bullet.dy * 400 * dt;

                const canvas = document.getElementById('gameCanvas');
                if (bullet.x < 0 || bullet.x > canvas.width ||
                    bullet.y < 0 || bullet.y > canvas.height) {
                    this.bullets.splice(i, 1);
                }
            }
        } else {
            if (this.type === 'laser') {
                if (!this.isChargingLaser && this.laserTimer >= 3) {  
                    this.isChargingLaser = true;
                    this.laserChargeTime = 0;
                }

                if (this.isChargingLaser) {
                    this.laserChargeTime += dt;
                    if (this.laserChargeTime >= 1) {  
                        this.shootLaser(playerPosition);
                        this.isChargingLaser = false;
                        this.laserTimer = 0;
                    }
                }

                if (this.laser) {
                    this.laser.duration -= dt;
                    if (this.laser.duration <= 0) {
                        this.laser = null;
                    }
                }
            }

            if (this.isBoss) {
                this.bulletTimer += dt;
                if (this.bulletTimer >= 1) {
                    this.bulletTimer = 0;
                    this.shootBullet(playerPosition);
                }

                for (let i = this.bullets.length - 1; i >= 0; i--) {
                    const bullet = this.bullets[i];
                    bullet.x += bullet.dx * 300 * dt;
                    bullet.y += bullet.dy * 300 * dt;

                    const canvas = document.getElementById('gameCanvas');
                    if (bullet.x < 0 || bullet.x > canvas.width ||
                        bullet.y < 0 || bullet.y > canvas.height) {
                        this.bullets.splice(i, 1);
                    }
                }
            }
        }

        // 更新闪光效果
        if (this.flashDuration > 0) {
            this.flashDuration -= dt;
        }
        
        // 更新击退效果
        if (this.knockbackDuration > 0) {
            this.knockbackDuration -= dt;
            this.position.x += this.knockbackDirection.x * this.knockbackSpeed * dt;
            this.position.y += this.knockbackDirection.y * this.knockbackSpeed * dt;
        }
        
        // 更新伤害数字
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const number = this.damageNumbers[i];
            number.alpha -= dt * 0.5; // 淡出效果
            number.yOffset += dt * 50; // 向上飘动
            if (number.alpha <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    shootBullet(playerPosition) {
        const dx = playerPosition.x - this.position.x;
        const dy = playerPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.bullets.push({
            x: this.position.x,
            y: this.position.y,
            dx: dx / distance,
            dy: dy / distance
        });
    }

    shootLaser(playerPosition) {
        const angle = Math.atan2(
            playerPosition.y - this.position.y,
            playerPosition.x - this.position.x
        );
        
        this.laser = {
            startX: this.position.x,
            startY: this.position.y,
            angle: angle,
            length: 3000,
            duration: this.isSuperBoss ? 0.4 : 0.2,  
            damage: this.isSuperBoss ? this.damage * 4 : this.damage * 2,
            width: this.laserWidth  // 添加激光宽度属性
        };
    }

    draw(ctx) {
        if (this.hp <= 0) {
            // 如果是爆炸怪物且正在爆炸倒计时
            if (this.type === 'explosive' && this.isExploding && this.explosionTimer > 0) {
                // 绘制爆炸预警效果
                ctx.save();
                ctx.globalAlpha = 0.5 + Math.sin(this.explosionTimer * 10) * 0.5; // 闪烁效果
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.position.x, this.position.y, 100, 0, Math.PI * 2); // 爆炸范围提示
                ctx.fill();
                
                // 绘制怪物
                ctx.drawImage(
                    this.sprite,
                    this.position.x - this.spriteWidth / 2,
                    this.position.y - this.spriteHeight / 2,
                    this.spriteWidth,
                    this.spriteHeight
                );
                
                ctx.restore();
                return;
            } else if (this.type === 'explosive' && this.isExploding && this.explosionEffectTimer > 0) {
                // 只在特效计时器大于0时绘制爆炸特效
                if (this.explosionEffect && this.explosionEffect.complete) {
                    const explosionSize = 200; // 爆炸特效大小
                    ctx.drawImage(
                        this.explosionEffect,
                        this.position.x - explosionSize / 2,
                        this.position.y - explosionSize / 2,
                        explosionSize,
                        explosionSize
                    );
                }
                return;
            }
            return;
        }

        if (this.hp <= 0) return;

        ctx.save();
        
        // 应用闪光效果
        if (this.flashDuration > 0) {
            ctx.globalAlpha = 0.7;
            ctx.globalCompositeOperation = 'lighter';
        }
        
        // 计算朝向角色的角度
        const canvas = document.getElementById('gameCanvas');
        const player = window.game.player; // 获取玩家实例
        const angle = Math.atan2(
            player.position.y - this.position.y,
            player.position.x - this.position.x
        );

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(angle);

        // 绘制怪物图片
        ctx.drawImage(
            this.sprite,
            -this.spriteWidth / 2,
            -this.spriteHeight / 2,
            this.spriteWidth,
            this.spriteHeight
        );

        ctx.restore();

        // 绘制血条
        const hpBarWidth = this.size * 2;
        const hpBarHeight = 4;
        ctx.fillStyle = '#f00';
        ctx.fillRect(
            this.position.x - hpBarWidth / 2,
            this.position.y - this.size - 10,
            hpBarWidth * (this.hp / this.maxHp),
            hpBarHeight
        );

        // 绘制等级
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${this.level}`, this.position.x, this.position.y - this.size - 15);

        // 绘制激光
        if (this.laser && this.laserEffect && this.laserEffect.complete) {
            ctx.save();
            ctx.translate(this.laser.startX, this.laser.startY);
            ctx.rotate(this.laser.angle);
            
            // 绘制激光特效
            const pattern = ctx.createPattern(this.laserEffect, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                
                // 添加发光效果
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 20;
                
                // 绘制激光
                ctx.fillRect(0, -this.laser.width/2, this.laser.length, this.laser.width);
                
                // 在激光上方添加白色高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(0, -this.laser.width/4, this.laser.length, this.laser.width/8);
            }
            
            ctx.restore();
        }

        // 绘制子弹
        for (const bullet of this.bullets) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#f00';
            ctx.fill();
        }

        // 绘制冰冻效果
        if (this.frozen) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 绘制伤害数字
        for (const number of this.damageNumbers) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${number.alpha})`;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(number.value, number.x, number.y - number.yOffset);
            ctx.restore();
        }
    }

    takeDamage(amount, applyKnockback = true) {
        const actualDamage = Math.max(1, amount - (this.defense || 0));
        this.hp = Math.max(0, this.hp - actualDamage);
        
        // 添加闪光效果
        this.flashDuration = 0.1; // 闪光持续0.1秒
        
        // 添加击退效果（只有当applyKnockback为true且不是boss时）
        if (applyKnockback && !this.isBoss) {
            const player = window.game.player;
            const dx = this.position.x - player.position.x;
            const dy = this.position.y - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                this.knockbackDuration = 0.15; // 击退持续0.15秒
                this.knockbackDirection = {
                    x: dx / distance,
                    y: dy / distance
                };
            }
        }
        
        // 添加伤害数字
        this.damageNumbers.push({
            value: Math.round(actualDamage),
            x: this.position.x,
            y: this.position.y - this.size,
            alpha: 1,
            yOffset: 0
        });
        
        // 如果explosive怪物死亡，开始爆炸倒计时
        if (this.hp <= 0 && this.type === 'explosive' && !this.isExploding) {
            this.isExploding = true;
            this.explosionTimer = 1;
            this.hasDealtExplosionDamage = false;
            return false;
        }
        
        return this.hp <= 0 && (!this.isExploding || (this.explosionTimer <= 0 && this.explosionEffectTimer <= 0));
    }

    dropLoot() {
        const baseExp = this.isBoss ? 50 : 10;
        const baseGold = this.isBoss ? 100 : 20;
        
        const loot = {
            exp: baseExp * this.level,
            gold: baseGold * this.level,
            equipment: null
        };

        const dropChance = this.isBoss ? 0.7 : 0.3;
        const qualityChances = this.isBoss 
            ? {
                'white': 0.3,
                'blue': 0.3,
                'purple': 0.2,
                'orange': 0.15,
                'legendary': 0.05
            }
            : {
                'white': 0.7,
                'blue': 0.2,
                'purple': 0.08,
                'orange': 0.02,
                'legendary': 0
            };

        if (Math.random() < dropChance) {
            const types = ['chest', 'ring', 'boots', 'weapon'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let quality = 'white';
            const rand = Math.random();
            let cumulativeChance = 0;
            for (const [q, chance] of Object.entries(qualityChances)) {
                cumulativeChance += chance;
                if (rand < cumulativeChance) {
                    quality = q;
                    break;
                }
            }

            loot.equipment = {
                type: type,
                quality: quality,
                armor: type === 'chest' ? (
                    quality === 'white' ? 2 :
                    quality === 'blue' ? 4 :
                    quality === 'purple' ? 6 :
                    quality === 'orange' ? 8 : 10
                ) : 0,
                lifeSteal: type === 'ring' ? (
                    quality === 'white' ? 2 :
                    quality === 'blue' ? 5 :
                    quality === 'purple' ? 8 :
                    quality === 'orange' ? 12 : 15
                ) : 0,
                speed: type === 'boots' ? (
                    quality === 'white' ? 10 :
                    quality === 'blue' ? 20 :
                    quality === 'purple' ? 30 :
                    quality === 'orange' ? 40 : 50
                ) : 0,
                damage: type === 'weapon' ? (
                    quality === 'white' ? 10 :
                    quality === 'blue' ? 20 :
                    quality === 'purple' ? 30 :
                    quality === 'orange' ? 40 : 50
                ) : 0
            };
        }

        return loot;
    }

    adjustDifficulty(globalDifficulty) {
        this.hp *= (1 + globalDifficulty * 0.1);
        this.damage *= (1 + globalDifficulty * 0.1);
        this.speed *= (1 + globalDifficulty * 0.05);
    }

    applyStatus(statusType, duration) {
        switch(statusType) {
            case 'freeze':
                this.frozen = true;
                setTimeout(() => {
                    this.frozen = false;
                }, duration * 1000);
                break;
            case 'weaken':
                this.speed *= 0.7;
                this.defense *= 0.5;
                setTimeout(() => {
                    this.speed /= 0.7;
                    this.defense /= 0.5;
                }, duration * 15);
                break;
            case 'slow':
                this.speed *= 0.5;
                setTimeout(() => {
                    this.speed /= 0.5;
                }, duration * 15);
                break;
        }
    }
}
