const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const DARK_NIGHT = '#0f0f19';
const MUDDY_GROUND = '#321f14';
const TREE_TRUNK = '#140a05';
const GLOW_BLUE = '#006496';
const PURPLE_SWORD = '#800080';
const EXPLOSION_COLOR = '#FFFF00';
const MIST_GRAY = 'rgba(60, 60, 70, 0.4)';
const HEALTH_BAR_GREEN = '#00ff00';
const HEALTH_BAR_RED = '#ff0000';
const HEALTH_BAR_BORDER = '#000';
const HEALTH_PICKUP_COLOR = '#ff4040';
const PURPLE_MOON = '#800080';
const RED_MOON = '#ff4040';
const FOREST_SILHOUETTE = '#1a1a1a';
const RED_SPEAR = '#ff4040';
const RED_FIREBALL = '#ff4040';

// Player object
const player = {
    width: 64,
    height: 64,
    x: 50,
    y: SCREEN_HEIGHT - 70 - 64,
    speed: 3,
    jumpPower: -10,
    gravity: 0.25,
    velocityY: 0,
    jumping: false,
    jumpCooldown: 0,
    JUMP_COOLDOWN: 1.25,
    health: 100,
    maxHealth: 100,
    airProjectileTimer: 0,
    AIR_COOLDOWN: 2.0,
    nukeTimer: 0,
    NUKE_COOLDOWN: 5.0,
    image: new Image(),
    transparentImage: null
};
player.image.src = 'player.gif';

// Enemy objects
const enemies = [
    { x: SCREEN_WIDTH / 3, y: SCREEN_HEIGHT - 70 - 64, width: 64, height: 64, health: 200, maxHealth: 200, fireTimer: 0, fireInterval: 2000, damage: 15, type: 'chase', image: new Image(), transparentImage: null, initialX: SCREEN_WIDTH / 3 },
    { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 70 - 64, width: 64, height: 64, health: 500, maxHealth: 500, fireTimer: 0, fireInterval: 2250, damage: 20, type: 'chase', image: new Image(), transparentImage: null, initialX: SCREEN_WIDTH / 2 },
    { x: SCREEN_WIDTH - 150, y: SCREEN_HEIGHT - 70 - 64, width: 64, height: 64, health: 1000, maxHealth: 1000, fireTimer: 0, fireInterval: 2500, damage: 25, type: 'chase', image: new Image(), transparentImage: null, initialX: SCREEN_WIDTH - 150 }
];
enemies[0].image.src = 'enemy1.gif';
enemies[1].image.src = 'enemy2.gif';
enemies[2].image.src = 'enemy3.gif';

let currentStage = 0;
const projectiles = [];
let collisionEffects = [];
let explosionParticles = [];
let storedNukes = [];
let healthPickups = [];
let forestElements = [
    { x: 0, y: SCREEN_HEIGHT - 100, width: 40, height: 60 },
    { x: 200, y: SCREEN_HEIGHT - 120, width: 50, height: 80 },
    { x: 400, y: SCREEN_HEIGHT - 110, width: 45, height: 70 },
    { x: 600, y: SCREEN_HEIGHT - 100, width: 40, height: 60 }
];
let lastTime = 0;
let gameState = 'start';
let eKeyPressed = false;
let gKeyPressed = false;
let healthSpawnTimer = 0;
const HEALTH_SPAWN_MIN = 5;
const HEALTH_SPAWN_MAX = 15;

// Create transparent image
function createTransparentImage(image, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);
    const transparentImage = new Image();
    transparentImage.src = tempCanvas.toDataURL();
    console.log("Created transparent image for", image.src);
    return transparentImage;
}

// Process images on load
player.image.onload = () => {
    player.transparentImage = createTransparentImage(player.image, player.width, player.height);
    enemies.forEach(enemy => {
        enemy.image.onload = () => {
            enemy.transparentImage = createTransparentImage(enemy.image, enemy.width, enemy.height);
            requestAnimationFrame(gameLoop);
        };
    });
};
enemies.forEach(enemy => enemy.image.src = enemy.image.src);

// Health bar drawing
function drawHealthBar(x, y, health, maxHealth, isPlayer = false) {
    const barX = isPlayer ? x + (player.width - 50) / 2 : x + (enemies[currentStage].width - 50) / 2;
    const barY = y - 20;
    ctx.fillStyle = HEALTH_BAR_RED;
    ctx.fillRect(barX, barY, 50, 8);
    ctx.fillStyle = HEALTH_BAR_GREEN;
    ctx.fillRect(barX, barY, (health / maxHealth) * 50, 8);
    ctx.strokeStyle = HEALTH_BAR_BORDER;
    ctx.strokeRect(barX, barY, 50, 8);
}

// Projectile creation
function createPlayerProjectile(startX, startY, targetX, targetY) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = 6;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    return { x: startX, y: startY, vx, vy, type: 'player', size: [20, 10], damage: 30 };
}

function createEnemyProjectile(startX, startY, targetX, targetY, enemyIndex) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = 7;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    return { x: startX, y: startY, vx, vy, type: 'enemy', size: [15, 30], damage: enemies[enemyIndex].damage, enemyIndex };
}

function createCollisionEffect(x, y) {
    return { x, y, life: 0.5, particles: 10 };
}

function createNuke(startX, startY) {
    console.log("Nuke created at x:", startX.toFixed(2), "y:", startY.toFixed(2));
    return { x: startX, y: startY, vx: 0, vy: -4, type: 'nuke', phase: 'up', initialX: startX };
}

function createHealthPickup() {
    const x = Math.random() * (SCREEN_WIDTH - 20);
    const y = SCREEN_HEIGHT - 70 - 20;
    const healthValue = Math.floor(Math.random() * 50) + 1;
    console.log("Health pickup spawned at x:", x.toFixed(2), "y:", y.toFixed(2), "value:", healthValue);
    return { x, y, width: 20, height: 20, type: 'health', value: healthValue };
}

// Background drawing
function drawBackground() {
    ctx.fillStyle = DARK_NIGHT;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = PURPLE_MOON;
    ctx.shadowBlur = 20;
    ctx.shadowColor = PURPLE_MOON;
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = RED_MOON;
    ctx.shadowBlur = 20;
    ctx.shadowColor = RED_MOON;
    ctx.beginPath();
    ctx.arc(SCREEN_WIDTH - 100, 100, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    forestElements.forEach(element => {
        console.log("Drawing forest element at x:", element.x.toFixed(2), "y:", element.y.toFixed(2));
        ctx.fillStyle = FOREST_SILHOUETTE;
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.x + element.width / 2, element.y - element.height);
        ctx.lineTo(element.x + element.width, element.y);
        ctx.closePath();
        ctx.fill();
    });

    ctx.fillStyle = MUDDY_GROUND;
    ctx.fillRect(0, SCREEN_HEIGHT - 70, SCREEN_WIDTH, 70);

    for (let i = 0; i < SCREEN_WIDTH; i += 100) {
        ctx.fillStyle = TREE_TRUNK;
        ctx.fillRect(i, SCREEN_HEIGHT - 130, 10, 60);
        ctx.beginPath();
        ctx.moveTo(i + 5, SCREEN_HEIGHT - 130);
        ctx.lineTo(i + 15, SCREEN_HEIGHT - 160);
        ctx.lineTo(i - 5, SCREEN_HEIGHT - 150);
        ctx.fill();
        ctx.fillStyle = GLOW_BLUE;
        ctx.beginPath();
        ctx.arc(i + 15, SCREEN_HEIGHT - 160, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = MIST_GRAY;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

// Update game logic
function update(deltaTime) {
    if (gameState === 'start' || gameState !== 'playing') return;

    forestElements.forEach(element => {
        element.x -= 1 * deltaTime * 60;
        if (element.x + element.width < 0) {
            element.x += SCREEN_WIDTH + element.width;
        }
    });

    if (keys['arrowleft']) player.x -= player.speed;
    if (keys['arrowright']) player.x += player.speed;
    if (player.x < 0) player.x = 0;
    if (player.x > SCREEN_WIDTH - player.width) player.x = SCREEN_WIDTH - player.width;

    if (keys[' '] && !player.jumping && player.y >= SCREEN_HEIGHT - 70 - player.height && player.jumpCooldown <= 0) {
        player.velocityY = player.jumpPower;
        player.jumping = true;
        player.jumpCooldown = player.JUMP_COOLDOWN;
    }
    player.velocityY += player.gravity;
    player.y += player.velocityY;
    if (player.y > SCREEN_HEIGHT - 70 - player.height) {
        player.y = SCREEN_HEIGHT - 70 - player.height;
        player.velocityY = 0;
        player.jumping = false;
    }
    if (player.jumpCooldown > 0) player.jumpCooldown -= deltaTime;

    const targetX = player.x + player.width / 2;
    const enemyCenterX = enemies[currentStage].x + enemies[currentStage].width / 2;
    const distance = Math.abs(targetX - enemyCenterX);
    if (distance > 50) {
        const speed = 2;
        if (targetX < enemyCenterX) enemies[currentStage].x -= speed * deltaTime * 60;
        else enemies[currentStage].x += speed * deltaTime * 60;
        enemies[currentStage].x = Math.max(0, Math.min(enemies[currentStage].x, SCREEN_WIDTH - enemies[currentStage].width));
    }

    enemies[currentStage].fireTimer += deltaTime;
    if (enemies[currentStage].fireTimer >= enemies[currentStage].fireInterval / 1000) {
        projectiles.push(createEnemyProjectile(enemies[currentStage].x + enemies[currentStage].width / 2, enemies[currentStage].y + enemies[currentStage].height / 2, player.x, player.y, currentStage));
        enemies[currentStage].fireTimer = 0;
    }
    if (keys['r'] && player.airProjectileTimer <= 0) {
        console.log("Launching $AIR at", enemies[currentStage].initialX, enemies[currentStage].y);
        player.airProjectileTimer = player.AIR_COOLDOWN;
        projectiles.push(createPlayerProjectile(player.x + player.width / 2, player.y + player.height / 2, enemies[currentStage].initialX, enemies[currentStage].y));
    }

    healthSpawnTimer += deltaTime;
    if (healthSpawnTimer >= HEALTH_SPAWN_MIN && healthPickups.length < 2) {
        const spawnInterval = Math.random() * (HEALTH_SPAWN_MAX - HEALTH_SPAWN_MIN) + HEALTH_SPAWN_MIN;
        if (healthSpawnTimer >= spawnInterval) {
            healthPickups.push(createHealthPickup());
            healthSpawnTimer = 0;
        }
    }

    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
    for (let i = healthPickups.length - 1; i >= 0; i--) {
        const pickup = healthPickups[i];
        const pickupRect = { x: pickup.x, y: pickup.y, width: pickup.width, height: pickup.height };
        if (playerRect.x < pickupRect.x + pickupRect.width && playerRect.x + playerRect.width > pickupRect.x &&
            playerRect.y < pickupRect.y + pickupRect.height && playerRect.y + playerRect.height > pickupRect.y) {
            player.health = Math.min(player.maxHealth, player.health + pickup.value);
            console.log("Health pickup collected, value:", pickup.value, "new player health:", player.health);
            healthPickups.splice(i, 1);
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (!proj || !proj.type) {
            console.error("Invalid projectile at index", i, proj);
            projectiles.splice(i, 1);
            continue;
        }
        if (proj.type === 'nuke') {
            if (proj.phase === 'up') {
                proj.y += proj.vy * deltaTime * 60;
                console.log("Nuke ascending at x:", proj.x.toFixed(2), "y:", proj.y.toFixed(2));
                if (proj.y <= 0) {
                    console.log("Nuke stored at x:", proj.x.toFixed(2), "y: -60, storedNukes count:", storedNukes.length + 1);
                    storedNukes.push({ ...proj, y: -60, phase: 'stored' });
                    projectiles.splice(i, 1);
                }
            } else if (proj.phase === 'down') {
                proj.y += proj.vy * deltaTime * 60;
                proj.x += proj.vx * deltaTime * 60;
                console.log("Nuke descending at x:", proj.x.toFixed(2), "y:", proj.y.toFixed(2), "targetX:", proj.targetX.toFixed(2), "vx:", proj.vx.toFixed(2));
                if (proj.y >= SCREEN_HEIGHT - 70 - 30) {
                    console.log("Nuke exploded at x:", proj.x.toFixed(2), "y:", proj.y.toFixed(2));
                    for (let k = 0; k < 20; k++) {
                        explosionParticles.push({
                            x: proj.x,
                            y: proj.y,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            life: 1.0,
                            size: Math.random() * 10 + 5
                        });
                    }
                    const explosionRadius = 75;
                    const explosionRect = {
                        x: proj.x - explosionRadius,
                        y: proj.y - explosionRadius,
                        width: explosionRadius * 2,
                        height: explosionRadius * 2
                    };
                    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
                    const enemyRect = { x: enemies[currentStage].x, y: enemies[currentStage].y, width: enemies[currentStage].width, height: enemies[currentStage].height };
                    if (explosionRect.x < playerRect.x + playerRect.width && explosionRect.x + explosionRect.width > playerRect.x &&
                        explosionRect.y < playerRect.y + playerRect.height && explosionRect.y + explosionRect.height > playerRect.y) {
                        player.health -= 50;
                    }
                    if (explosionRect.x < enemyRect.x + enemyRect.width && explosionRect.x + explosionRect.width > enemyRect.x &&
                        explosionRect.y < enemyRect.y + enemyRect.height && explosionRect.y + explosionRect.height > enemyRect.y) {
                        enemies[currentStage].health -= 50;
                    }
                    projectiles.splice(i, 1);
                }
            }
        } else {
            proj.x += proj.vx * deltaTime * 60;
            proj.y += proj.vy * deltaTime * 60;
        }

        const projRect = {
            x: proj.x - (proj.size ? proj.size[0] / 2 : 0),
            y: proj.y - (proj.size ? proj.size[1] / 2 : 0),
            width: proj.size ? proj.size[0] : 0,
            height: proj.size ? proj.size[1] : 0
        };
        const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
        const enemyRect = { x: enemies[currentStage].x, y: enemies[currentStage].y, width: enemies[currentStage].width, height: enemies[currentStage].height };

        if (proj.type === 'player' && projRect.x < enemyRect.x + enemyRect.width && projRect.x + projRect.width > enemyRect.x &&
            projRect.y < enemyRect.y + enemyRect.height && projRect.y + projRect.height > enemyRect.y) {
            enemies[currentStage].health -= proj.damage;
            projectiles.splice(i, 1);
        } else if (proj.type === 'enemy' && projRect.x < playerRect.x + playerRect.width && projRect.x + projRect.width > playerRect.x &&
                   projRect.y < playerRect.y + playerRect.height && projRect.y + projRect.height > playerRect.y) {
            player.health -= proj.damage;
            projectiles.splice(i, 1);
        } else if (projRect.x < -50 || projRect.x > SCREEN_WIDTH + 50 || projRect.y < -50 || projRect.y > SCREEN_HEIGHT + 50) {
            projectiles.splice(i, 1);
        }

        for (let j = projectiles.length - 1; j >= 0; j--) {
            if (i === j) continue;
            const otherProj = projectiles[j];
            const otherProjRect = {
                x: otherProj.x - (otherProj.size ? otherProj.size[0] / 2 : 0),
                y: otherProj.y - (otherProj.size ? otherProj.size[1] / 2 : 0),
                width: otherProj.size ? otherProj.size[0] : 0,
                height: otherProj.size ? otherProj.size[1] : 0
            };
            if (proj.type !== otherProj.type && projRect.x < otherProjRect.x + otherProjRect.width && projRect.x + projRect.width > otherProjRect.x &&
                projRect.y < otherProjRect.y + otherProjRect.height && projRect.y + projRect.height > otherProjRect.y) {
                collisionEffects.push(createCollisionEffect((proj.x + otherProj.x) / 2, (proj.y + otherProj.y) / 2));
                projectiles.splice(i, 1);
                projectiles.splice(j > i ? j - 1 : j, 1);
                break;
            }
        }
    }

    for (let i = collisionEffects.length - 1; i >= 0; i--) {
        const effect = collisionEffects[i];
        effect.life -= deltaTime;
        if (effect.life <= 0) {
            collisionEffects.splice(i, 1);
        }
    }

    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];
        particle.x += particle.vx * deltaTime * 60;
        particle.y += particle.vy * deltaTime * 60;
        particle.life -= deltaTime;
        if (particle.life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }

    document.getElementById('player-health-text').textContent = `${Math.max(0, player.health)}/100`;
    document.getElementById('enemy-health-text').textContent = `${Math.max(0, enemies[currentStage].health)}/${enemies[currentStage].maxHealth}`;
    if (player.health <= 0) gameState = 'game_over';
    if (enemies[currentStage].health <= 0) {
        currentStage++;
        if (currentStage >= enemies.length) gameState = 'victory';
        else {
            player.x = 50;
            player.y = SCREEN_HEIGHT - 70 - player.height;
            enemies[currentStage].x = enemies[currentStage].initialX;
            enemies[currentStage].y = SCREEN_HEIGHT - 70 - enemies[currentStage].height;
            projectiles.length = 0;
            explosionParticles.length = 0;
            storedNukes.length = 0;
            healthPickups.length = 0;
            player.jumpCooldown = 0;
            healthSpawnTimer = 0;
        }
    }

    if (player.airProjectileTimer > 0) player.airProjectileTimer -= deltaTime;
    if (player.nukeTimer > 0) player.nukeTimer -= deltaTime;
}

// Draw game elements
function draw() {
    drawBackground();
    if (player.transparentImage && player.transparentImage.complete) {
        console.log("Drawing player with transparent background at x:", player.x.toFixed(2), "y:", player.y.toFixed(2));
        ctx.drawImage(player.transparentImage, player.x, player.y, player.width, player.height);
    } else {
        console.log("Drawing player fallback at x:", player.x.toFixed(2), "y:", player.y.toFixed(2));
        ctx.fillStyle = '#0064c8';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    if (enemies[currentStage].transparentImage && enemies[currentStage].transparentImage.complete) {
        console.log("Drawing enemy with transparent background at x:", enemies[currentStage].x.toFixed(2), "y:", enemies[currentStage].y.toFixed(2));
        ctx.drawImage(enemies[currentStage].transparentImage, enemies[currentStage].x, enemies[currentStage].y, enemies[currentStage].width, enemies[currentStage].height);
    } else {
        console.log("Drawing enemy fallback at x:", enemies[currentStage].x.toFixed(2), "y:", enemies[currentStage].y.toFixed(2));
        ctx.fillStyle = '#500000';
        ctx.fillRect(enemies[currentStage].x, enemies[currentStage].y, enemies[currentStage].width, enemies[currentStage].height);
    }
    drawHealthBar(player.x, player.y, player.health, player.maxHealth, true);
    drawHealthBar(enemies[currentStage].x, enemies[currentStage].y, enemies[currentStage].health, enemies[currentStage].maxHealth);

    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    console.log("Drawing counter:", storedNukes.length);
    ctx.fillText(`Nukes: ${storedNukes.length}`, SCREEN_WIDTH - 10, 30);

    healthPickups.forEach(pickup => {
        console.log("Drawing health pickup at x:", pickup.x.toFixed(2), "y:", pickup.y.toFixed(2));
        ctx.fillStyle = HEALTH_PICKUP_COLOR;
        ctx.beginPath();
        ctx.moveTo(pickup.x + 10, pickup.y + 5);
        ctx.quadraticCurveTo(pickup.x + 10, pickup.y, pickup.x + 5, pickup.y);
        ctx.quadraticCurveTo(pickup.x, pickup.y, pickup.x, pickup.y + 10);
        ctx.quadraticCurveTo(pickup.x, pickup.y + 15, pickup.x + 10, pickup.y + 20);
        ctx.quadraticCurveTo(pickup.x + 20, pickup.y + 15, pickup.x + 20, pickup.y + 10);
        ctx.quadraticCurveTo(pickup.x + 20, pickup.y, pickup.x + 15, pickup.y);
        ctx.quadraticCurveTo(pickup.x + 10, pickup.y, pickup.x + 10, pickup.y + 5);
        ctx.fill();
    });

    projectiles.forEach(proj => {
        console.log("Drawing projectile at x:", proj.x.toFixed(2), "y:", proj.y.toFixed(2), "type:", proj.type, "phase:", proj.phase || 'none', "enemyIndex:", proj.enemyIndex || 'none');
        if (proj.type === 'player') {
            ctx.fillStyle = GLOW_BLUE;
            ctx.fillRect(proj.x - proj.size[0] / 2, proj.y - proj.size[1] / 2, proj.size[0], proj.size[1]);
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$AIR', proj.x, proj.y + 3);
            ctx.shadowBlur = 2;
            ctx.shadowColor = '#000';
            ctx.fillStyle = '#fff';
            ctx.fillText('$AIR', proj.x, proj.y + 3);
            ctx.shadowBlur = 0;
        } else if (proj.type === 'enemy') {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.rotate(Math.atan2(proj.vy, proj.vx) + Math.PI / 2);
            if (proj.enemyIndex === 0) {
                // Enemy 1: Purple sword
                ctx.fillStyle = PURPLE_SWORD;
                ctx.beginPath();
                ctx.moveTo(-5, -15);
                ctx.lineTo(5, -15);
                ctx.lineTo(0, 0);
                ctx.lineTo(-2, 10);
                ctx.lineTo(2, 10);
                ctx.closePath();
                ctx.fill();
            } else if (proj.enemyIndex === 1) {
                // Enemy 2: Red spear
                ctx.fillStyle = RED_SPEAR;
                ctx.beginPath();
                ctx.moveTo(-3, -20); // Narrower, longer tip
                ctx.lineTo(3, -20);
                ctx.lineTo(0, 15); // Extended shaft
                ctx.closePath();
                ctx.fill();
            } else if (proj.enemyIndex === 2) {
                // Enemy 3: Red fireball
                ctx.fillStyle = RED_FIREBALL;
                ctx.shadowBlur = 10;
                ctx.shadowColor = RED_FIREBALL;
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2); // Circular fireball
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        } else if (proj.type === 'nuke') {
            ctx.fillStyle = '#4a4a4a';
            ctx.beginPath();
            ctx.ellipse(proj.x, proj.y, 20, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#808080';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.ellipse(proj.x, proj.y - 10, 15, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ETHOS', proj.x, proj.y - 5);
            ctx.shadowBlur = 2;
            ctx.shadowColor = '#000';
            ctx.fillStyle = '#000';
            ctx.fillText('ETHOS', proj.x, proj.y - 5);
            ctx.shadowBlur = 0;
        }
    });

    collisionEffects.forEach(effect => {
        const progress = 1 - effect.life / 0.5;
        for (let p = 0; p < effect.particles; p++) {
            const angle = (p / effect.particles) * Math.PI * 2;
            const radius = 10 * progress;
            const x = effect.x + Math.cos(angle) * radius;
            const y = effect.y + Math.sin(angle) * radius;
            ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    explosionParticles.forEach(particle => {
        ctx.fillStyle = `rgba(255, 0, 0, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (gameState === 'start') {
        ctx.fillStyle = '#00ffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ETHOS ROYALE', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText('Press SPACE to start', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
    } else if (gameState === 'game_over') {
        ctx.fillStyle = '#ff0000';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ETHOS OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('Restart (R) / Quit (Q)', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50);
    } else if (gameState === 'victory') {
        ctx.fillStyle = '#00ff00';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ETHOS VICTORY', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('Restart (R) / Quit (Q)', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50);
    }
}

// Game loop
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Event listeners
let keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (gameState !== 'playing') {
        if (e.key === ' ' && gameState === 'start') {
            gameState = 'playing';
            player.x = 50;
            player.y = SCREEN_HEIGHT - 70 - player.height;
            player.health = player.maxHealth;
            enemies[currentStage].health = enemies[currentStage].maxHealth;
            enemies[currentStage].x = enemies[currentStage].initialX;
            enemies[currentStage].y = SCREEN_HEIGHT - 70 - enemies[currentStage].height;
            projectiles.length = 0;
            explosionParticles.length = 0;
            storedNukes.length = 0;
            healthPickups.length = 0;
            player.jumpCooldown = 0;
            player.airProjectileTimer = 0;
            player.nukeTimer = 0;
            healthSpawnTimer = 0;
        }
        if (e.key === 'r' && (gameState === 'game_over' || gameState === 'victory')) {
            gameState = 'playing';
            player.health = player.maxHealth;
            enemies.forEach((e, i) => e.health = e.maxHealth);
            player.x = 50;
            player.y = SCREEN_HEIGHT - 70 - player.height;
            currentStage = 0;
            enemies[currentStage].x = enemies[currentStage].initialX;
            enemies[currentStage].y = SCREEN_HEIGHT - 70 - enemies[currentStage].height;
            projectiles.length = 0;
            explosionParticles.length = 0;
            storedNukes.length = 0;
            healthPickups.length = 0;
            player.jumpCooldown = 0;
            player.airProjectileTimer = 0;
            player.nukeTimer = 0;
            healthSpawnTimer = 0;
        }
        if (e.key === 'q' && (gameState === 'game_over' || gameState === 'victory')) {
            window.close();
        }
        return;
    }

    if (e.key.toLowerCase() === 'e' && !eKeyPressed && player.nukeTimer <= 0) {
        eKeyPressed = true;
        console.log("E pressed, nukeTimer:", player.nukeTimer);
        player.nukeTimer = player.NUKE_COOLDOWN;
        const nuke = createNuke(player.x + player.width / 2, player.y + player.height / 2);
        projectiles.push(nuke);
        console.log("Nuke added to projectiles, count:", projectiles.length);
    }
    if (e.key.toLowerCase() === 'g' && !gKeyPressed && storedNukes.length > 0) {
        gKeyPressed = true;
        console.log("G pressed, dropping", storedNukes.length, "nukes");
        const nukesToDrop = [...storedNukes];
        nukesToDrop.forEach(nuke => {
            const targetX = Math.random() * (SCREEN_WIDTH - 60) + 30;
            const dx = targetX - nuke.x;
            const distance = Math.max(1, Math.abs(dx));
            const speedX = 5;
            const vx = (dx / distance) * speedX;
            projectiles.push({
                ...nuke,
                y: 0,
                phase: 'down',
                vy: 15,
                vx: vx,
                targetX: targetX
            });
            console.log("Nuke dropped at x:", nuke.x.toFixed(2), "y: 0, targetX:", targetX.toFixed(2));
        });
        storedNukes = [];
        console.log("Stored nukes cleared, projectiles count:", projectiles.length);
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === 'e') eKeyPressed = false;
    if (e.key.toLowerCase() === 'g') gKeyPressed = false;
});