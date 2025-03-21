const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
};

let game = new Phaser.Game(config);

// רפרנס לסצנה
let mainScene;

/* ========== נשקים אפשריים ========== */
// העלינו נזק לרקטה ולייזר
const weapons = {
    normal: { key: 'normal', bulletTexture: 'bullet', speed: 300, damage: 1 },
    rocket: { key: 'rocket', bulletTexture: 'rocketBullet', speed: 200, damage: 4 },
    laser:  { key: 'laser',  bulletTexture: 'laserBeam',    speed: 500, damage: 3 }
};
let currentWeapon = weapons.normal;

/* משתנים גלובליים */
let player, cursors, bullets, mushrooms, powerups, bgMusic;
let score = 0, lives = 3;
let scoreText, livesText, waveText, bestScoreText;
let canShoot = true;
let shootDelay = 300;
let weaponTimer = null;
let doubleShotTimer = null;
let mushroomSpeed = 100;
let wave = 1;
let waveInProgress = false;
let doubleShot = false;
let gameEnded = false; // כדי לעצור זימונים אחרי סיום

/* למובייל */
let movingLeft = false, movingRight = false;

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('rocketBullet', 'assets/rocketBullet.png');
    this.load.image('laserBeam', 'assets/laserBeam.png');
    this.load.image('mushroom', 'assets/mushroom.png');
    this.load.image('bossMushroom', 'assets/bossMushroom.png');
    this.load.image('powerupRocket', 'assets/powerupRocket.png');
    this.load.image('powerupLaser', 'assets/powerupLaser.png');
    this.load.image('powerupDouble', 'assets/powerupDouble.png');

    this.load.spritesheet('explosion', 'assets/explosion.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // קולות
    this.load.audio('startGame', 'assets/startGame.wav');
    this.load.audio('bgMusic', 'assets/bgMusic.mp3');
    this.load.audio('shoot', 'assets/shoot.wav');
    this.load.audio('playerHit', 'assets/playerHit.wav');
    this.load.audio('gameOver', 'assets/gameOver.wav');
}

function create() {
    mainScene = this;
    gameEnded = false;

    this.sound.play('startGame', { volume: 0.5 });

    this.bg = this.add.tileSprite(400, 300, 800, 600, 'background');
    bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
    bgMusic.play();

    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 23 }),
        frameRate: 20,
        hideOnComplete: true
    });

    player = this.physics.add.sprite(400, 550, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(0.4);

    bullets = this.physics.add.group({ maxSize: 30 });
    mushrooms = this.physics.add.group();
    powerups = this.physics.add.group();

    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => shootBullet());

    setupTouchControls();

    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
    livesText = this.add.text(10, 40, 'Lives: 3', { fontSize: '20px', fill: '#fff' });
    waveText = this.add.text(400, 300, '', { fontSize: '40px', fill: '#fff' }).setOrigin(0.5);

    let bestScore = localStorage.getItem('bestScore') || 0;
    bestScoreText = this.add.text(600, 10, `Best: ${bestScore}`, { fontSize: '20px', fill: '#fff' });

    // התנגשות
    this.physics.add.overlap(bullets, mushrooms, hitMushroom, null, this);
    this.physics.add.overlap(player, mushrooms, mushroomHitsPlayer, null, this);
    this.physics.add.overlap(player, powerups, takePowerup, null, this);

    startWave();

    // זימון Power-Ups כל 6 שניות
    this.time.addEvent({
        delay: 6000,
        callback: () => {
            if (!gameEnded) spawnPowerup();
        },
        loop: true
    });
}

function update() {
    this.bg.tilePositionY -= 2;

    if (cursors.left.isDown || movingLeft) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown || movingRight) {
        player.setVelocityX(200);
    } else {
        player.setVelocityX(0);
    }

    bullets.children.each(bullet => {
        if (bullet.active && bullet.y < -10) {
            bullet.disableBody(true, true);
            bullet.setActive(false).setVisible(false);
        }
    });

    mushrooms.children.each(mush => {
        if (mush.active && mush.y > 610) {
            mush.destroy();
        }
    });
}

/* ========== גלים (Wave) ========== */
function startWave() {
    if (gameEnded) return;
    waveInProgress = true;
    waveText.setText(`Wave ${wave}`);
    waveText.setDepth(10);

    mainScene.time.delayedCall(1500, () => {
        waveText.setText('');
        spawnWave(wave);
        waveInProgress = false;
    });
}

function spawnWave(waveNumber) {
    if (gameEnded) return;

    mushroomSpeed = 100 + (waveNumber - 1) * 10;
    let mushroomsToSpawn = 5 + waveNumber * 2;

    for (let i = 0; i < mushroomsToSpawn; i++) {
        mainScene.time.delayedCall(i * 500, () => {
            if (!gameEnded) spawnMushroom();
        });
    }

    if (waveNumber % 3 === 0) {
        mainScene.time.delayedCall(3000, () => {
            if (!gameEnded) spawnBossMushroom();
        });
    }

    mainScene.time.delayedCall(8000 + mushroomsToSpawn * 500, () => {
        checkWaveEnd();
    });
}

function spawnMushroom() {
    let x = Phaser.Math.Between(50, 750);
    let mush = mushrooms.create(x, 0, 'mushroom');
    mush.setVelocityY(mushroomSpeed);
    mush.setScale(0.7);
    mush.body.setSize(mush.width * 0.9, mush.height * 0.9);
    mush.hp = 2;
}

function spawnBossMushroom() {
    let x = Phaser.Math.Between(100, 700);
    let boss = mushrooms.create(x, 0, 'bossMushroom');
    boss.setScale(0.9);
    boss.body.setSize(boss.width * 0.9, boss.height * 0.9);
    boss.setVelocityY(mushroomSpeed * 1.2);
    boss.hp = 10;
}

function checkWaveEnd() {
    if (mushrooms.countActive(true) > 0) {
        mainScene.time.delayedCall(2000, () => {
            checkWaveEnd();
        });
        return;
    }
    if (!gameEnded) {
        wave++;
        startWave();
    }
}

/* ========== ירי ========== */
function shootBullet() {
    if (!canShoot || gameEnded) return;
    canShoot = false;

    // debug: איזו ירייה נורה
    console.log(`Shooting with weapon: ${currentWeapon.key}`);

    mainScene.sound.play('shoot', { volume: 0.5 });

    if (doubleShot) {
        shootOneBullet(-10);
        shootOneBullet(10);
    } else {
        shootOneBullet(0);
    }

    mainScene.time.delayedCall(shootDelay, () => {
        canShoot = true;
    });
}

function shootOneBullet(offsetX) {
    let bullet = bullets.get(player.x + offsetX, player.y - 30, currentWeapon.bulletTexture);
    if (bullet) {
        bullet.setActive(true).setVisible(true);
        bullet.body.enable = true;

        // גודל כדור לפי סוג הנשק
        let bulletScale = 1.0; // ברירת מחדל - רגיל
        if (currentWeapon.key === 'rocket') {
            bulletScale = 0.6; // טיל קטן יותר
        } else if (currentWeapon.key === 'laser') {
            bulletScale = 0.8; // לייזר בינוני
        }
        bullet.setScale(bulletScale);
        bullet.body.setSize(bullet.width * 0.9, bullet.height * 0.9);

        bullet.setVelocityY(-currentWeapon.speed);
        bullet.damage = currentWeapon.damage;
    }
}

/* ========== פגיעה כדור-פטריה ========== */
function hitMushroom(bullet, mushroom) {
    mushroom.hp -= bullet.damage;

    bullet.disableBody(true, true);
    bullet.setActive(false).setVisible(false);

    if (mushroom.hp <= 0) {
        let explosion = mainScene.add.sprite(mushroom.x, mushroom.y, 'explosion');
        explosion.play('explode');
        mushroom.destroy();
        score += 10;
        scoreText.setText('Score: ' + score);
    }
}

/* ========== פגיעה בשחקן ========== */
function mushroomHitsPlayer(player, mushroom) {
    if (gameEnded) return;

    mainScene.sound.play('playerHit', { volume: 0.5 });
    mushroom.destroy();

    lives--;
    livesText.setText('Lives: ' + lives);

    player.setTint(0xff0000);
    mainScene.time.delayedCall(200, () => player.clearTint());

    if (lives <= 0) {
        gameOver();
    }
}

/* ========== סוף משחק ========== */
function gameOver() {
    if (gameEnded) return;
    gameEnded = true;

    mainScene.physics.pause();
    player.setTint(0xff0000);
    bgMusic.stop();

    mainScene.sound.play('gameOver', { volume: 0.5 });

    mainScene.add.text(400, 300, 'Game Over', {
        fontSize: '50px',
        fill: '#ff0000'
    }).setOrigin(0.5);

    mainScene.add.text(400, 360, 'Press F5 to Restart', {
        fontSize: '20px',
        fill: '#fff'
    }).setOrigin(0.5);

    let bestScore = localStorage.getItem('bestScore') || 0;
    if (score > bestScore) {
        localStorage.setItem('bestScore', score);
    }
}

/* ========== בונוסים (Power-Ups) ========== */
function takePowerup(player, powerup) {
    if (gameEnded) return;
    console.log('Collected powerup:', powerup.texture.key);
    powerup.destroy();

    switch (powerup.texture.key) {
        case 'powerupRocket':
            pickUpWeapon('rocket');
            break;
        case 'powerupLaser':
            pickUpWeapon('laser');
            break;
        case 'powerupDouble':
            pickUpDoubleShot();
            break;
    }
}

/* מחליף נשק לנשק מסוים (rocket/laser) ל-5 שניות */
function pickUpWeapon(weaponKey) {
    // בטלים טיימר נשק קודם אם יש
    if (weaponTimer) {
        mainScene.time.removeEvent(weaponTimer);
    }
    // מחליפים נשק
    switchWeapon(weaponKey);
    weaponTimer = mainScene.time.addEvent({
        delay: 5000,
        callback: () => {
            switchWeapon('normal');
        }
    });
}

/* מפעיל כפל יריות ל-5 שניות */
function pickUpDoubleShot() {
    if (doubleShotTimer) {
        mainScene.time.removeEvent(doubleShotTimer);
    }
    doubleShot = true;
    doubleShotTimer = mainScene.time.addEvent({
        delay: 5000,
        callback: () => {
            doubleShot = false;
        }
    });
}

/* משנה את currentWeapon */
function switchWeapon(weaponKey) {
    currentWeapon = weapons[weaponKey];
    console.log(`Switched to weapon: ${weaponKey}`);
}

/* זימון Power-Ups */
function spawnPowerup() {
    if (gameEnded) return;
    console.log('Spawning powerup...');
    let x = Phaser.Math.Between(50, 750);
    let rand = Math.random();
    let texture;

    if (rand < 0.33) {
        texture = 'powerupRocket';
    } else if (rand < 0.66) {
        texture = 'powerupLaser';
    } else {
        texture = 'powerupDouble';
    }
    console.log('Powerup chosen:', texture);

    let p = powerups.create(x, 0, texture);
    p.setVelocityY(120);
    p.setScale(0.5);
    p.body.setSize(p.width * 0.9, p.height * 0.9);
}

/* שליטה במובייל */
function setupTouchControls() {
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const shootBtn = document.getElementById('shoot-btn');

    leftBtn.addEventListener('touchstart', () => movingLeft = true);
    leftBtn.addEventListener('touchend', () => movingLeft = false);

    rightBtn.addEventListener('touchstart', () => movingRight = true);
    rightBtn.addEventListener('touchend', () => movingRight = false);

    shootBtn.addEventListener('touchstart', () => {
        shootBullet();
    });
}
