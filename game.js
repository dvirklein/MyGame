/*************************************************
 * 1) הגדרת המחלקות StartScene ו-MainScene
 *************************************************/

// מסך פתיחה
class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        // טעינת הנכסים הדרושים למסך הפתיחה (לוגו, רקע וכו')
        this.load.image('background', 'assets/background.png');
        // ניתן לטעון כאן עוד נכסים שרוצים להציג במסך הפתיחה
    }

    create() {
        // רקע
        this.add.tileSprite(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth,
            window.innerHeight,
            'background'
        );

        let titleText = this.add.text(
            window.innerWidth / 2,
            window.innerHeight / 2 - 50,
            'ברוכים הבאים!',
            {
                fontSize: window.innerWidth < 600 ? '30px' : '40px',
                fill: '#fff'
            }
        ).setOrigin(0.5);

        let instructionText = this.add.text(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'לחץ על Start כדי להתחיל',
            {
                fontSize: window.innerWidth < 600 ? '20px' : '30px',
                fill: '#fff'
            }
        ).setOrigin(0.5);

        let startButton = this.add.text(
            window.innerWidth / 2,
            window.innerHeight / 2 + 80,
            'Start',
            {
                fontSize: window.innerWidth < 600 ? '24px' : '36px',
                fill: '#fff',
                backgroundColor: '#000',
                padding: { x: 10, y: 10 }
            }
        ).setOrigin(0.5).setInteractive();

        // מעבר לסצנת המשחק בלחיצה
        startButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene');
            });
        });
    }
}

// סצנת המשחק
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // טעינת נכסים של המשחק
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

    create() {
        mainScene = this;         
        gameEnded = false;        
        score = 0;
        lives = 3;
        wave = 1;

        // מוזיקת רקע
        this.sound.play('startGame', { volume: 0.5 });
        this.bg = this.add.tileSprite(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth,
            window.innerHeight,
            'background'
        );
        bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
        bgMusic.play();

        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 23 }),
            frameRate: 20,
            hideOnComplete: true
        });

        // יצירת שחקן
        let playerScale = window.innerWidth < 600 ? 0.6 : 0.4;
        player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight - 50, 'player');
        player.setCollideWorldBounds(true);
        player.setScale(playerScale);

        // יצירת קבוצות
        bullets = this.physics.add.group({ maxSize: 30 });
        mushrooms = this.physics.add.group();
        powerups = this.physics.add.group();

        // שליטה במקלדת
        cursors = this.input.keyboard.createCursorKeys();

        // 1) במקום ירי חד-פעמי, נשתמש ב-isShooting:
        this.input.keyboard.on('keydown-SPACE', () => { isShooting = true; });
        this.input.keyboard.on('keyup-SPACE', () => { isShooting = false; });

        // כפתורי מובייל
        setupTouchControls();

        let fontSize = window.innerWidth < 600 ? '16px' : '20px';
        scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: fontSize, fill: '#fff' });
        livesText = this.add.text(10, 40, 'Lives: 3', { fontSize: fontSize, fill: '#fff' });
        waveText = this.add.text(
            window.innerWidth / 2,
            window.innerHeight / 2,
            '',
            { fontSize: window.innerWidth < 600 ? '30px' : '40px', fill: '#fff' }
        ).setOrigin(0.5);

        let bestScore = localStorage.getItem('bestScore') || 0;
        bestScoreText = this.add.text(
            window.innerWidth - 150,
            10,
            `Best: ${bestScore}`,
            { fontSize: fontSize, fill: '#fff' }
        );

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

    update() {
        this.bg.tilePositionY -= 2;
        const playerSpeed = window.innerWidth < 600 ? 300 : 200;

        if (cursors.left.isDown || movingLeft) {
            player.setVelocityX(-playerSpeed);
        } else if (cursors.right.isDown || movingRight) {
            player.setVelocityX(playerSpeed);
        } else {
            player.setVelocityX(0);
        }

        // 2) ירי מתמשך: אם המשתמש מחזיק את הכפתור, ותנאי הירי מאופשרים
        if (isShooting && canShoot && !gameEnded) {
            shootBullet();
        }

        bullets.children.each(bullet => {
            if (bullet.active && bullet.y < -10) {
                bullet.disableBody(true, true);
                bullet.setActive(false).setVisible(false);
            }
        });

        mushrooms.children.each(mush => {
            if (mush.active && mush.y > window.innerHeight + 10) {
                mush.destroy();
            }
        });
    }
}

/*************************************************
 * 2) הגדרת משתנים גלובליים
 *************************************************/
let mainScene;
let score = 0, lives = 3, wave = 1;
let scoreText, livesText, waveText, bestScoreText;
let canShoot = true, shootDelay = 300;
let weaponTimer = null, doubleShotTimer = null;
let mushroomSpeed = 100;
let waveInProgress = false;
let doubleShot = false, gameEnded = false;

let player, cursors, bullets, mushrooms, powerups, bgMusic;

// משתנה חדש שמייצג האם המשתמש מחזיק את הכפתור לירי מתמשך
let isShooting = false;

// לחצני תנועה במובייל
let movingLeft = false, movingRight = false;

/*************************************************
 * 3) נשקים
 *************************************************/
const weapons = {
    normal: { key: 'normal', bulletTexture: 'bullet', speed: 300, damage: 1 },
    rocket: { key: 'rocket', bulletTexture: 'rocketBullet', speed: 200, damage: 4 },
    laser:  { key: 'laser',  bulletTexture: 'laserBeam',    speed: 500, damage: 3 }
};
let currentWeapon = weapons.normal;

/*************************************************
 * 4) פונקציית isMobile() משופרת
 *************************************************/
function isMobile() {
    // בדיקה משופרת למכשירים ניידים
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscape = Math.abs(window.orientation) === 90;
    
    return isMobileDevice || hasTouchScreen || isLandscape || window.innerWidth < 1024;
}

/*************************************************
 * 5) הגדרת config, בדיקת מובייל, והקמת המשחק
 *************************************************/
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        resizeInterval: 100
    },
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [StartScene, MainScene]
};

// טעינת המשחק עם בדיקה משופרת
function initializeGame() {
    if (!isMobile() && window.innerWidth > 768) {
        document.getElementById('game-container').innerHTML = `
            <div style="color: white; text-align: center; padding: 20px;">
                <h1>משחק זה מותאם למובייל בלבד</h1>
                <p>אנא פתחו במכשיר נייד או בסימולטור</p>
            </div>
        `;
    } else {
        const game = new Phaser.Game(config);
        
        // טיפול בשינוי גודל חלון
        window.addEventListener('resize', () => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        });
    }
}

// הפעלת האתחול כאשר הדף נטען
window.addEventListener('load', initializeGame);

/*************************************************
 * פונקציות הלוגיקה של המשחק
 *************************************************/

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
    let x = Phaser.Math.Between(50, window.innerWidth - 50);
    let mush = mushrooms.create(x, 0, 'mushroom');
    mush.setVelocityY(mushroomSpeed);
    mush.setScale(0.8);
    mush.body.setSize(mush.width * 0.9, mush.height * 0.9);
    mush.hp = 2;
}

function spawnBossMushroom() {
    let x = Phaser.Math.Between(100, window.innerWidth - 100);
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

        let bulletScale = 1.0;
        if (currentWeapon.key === 'rocket') {
            bulletScale = 0.6;
        } else if (currentWeapon.key === 'laser') {
            bulletScale = 0.8;
        }
        bullet.setScale(bulletScale * 1.5);
        bullet.body.setSize(bullet.width * 0.9, bullet.height * 0.9);

        bullet.setVelocityY(-currentWeapon.speed);
        bullet.damage = currentWeapon.damage;
    }
}

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

    mainScene.add.text(
        window.innerWidth / 2,
        window.innerHeight / 2 - 20,
        'Game Over',
        {
            fontSize: window.innerWidth < 600 ? '40px' : '50px',
            fill: '#ff0000'
        }
    ).setOrigin(0.5);

    mainScene.add.text(
        window.innerWidth / 2,
        window.innerHeight / 2 + 20,
        'לחץ על Restart להתחיל מחדש',
        {
            fontSize: window.innerWidth < 600 ? '16px' : '20px',
            fill: '#fff'
        }
    ).setOrigin(0.5);

    let restartText = mainScene.add.text(
        window.innerWidth / 2,
        window.innerHeight / 2 + 80,
        'Restart',
        {
            fontSize: window.innerWidth < 600 ? '20px' : '30px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 10 }
        }
    ).setOrigin(0.5).setInteractive();

    restartText.on('pointerdown', () => {
        mainScene.tweens.add({
            targets: restartText,
            scale: 1.2,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                mainScene.scene.restart();
            }
        });
    });

    let bestScore = localStorage.getItem('bestScore') || 0;
    if (score > bestScore) {
        localStorage.setItem('bestScore', score);
    }
}

/* ========== בונוסים (Power-Ups) ========== */
function takePowerup(player, powerup) {
    if (gameEnded) return;
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

function pickUpWeapon(weaponKey) {
    if (weaponTimer) {
        mainScene.time.removeEvent(weaponTimer);
    }
    switchWeapon(weaponKey);
    weaponTimer = mainScene.time.addEvent({
        delay: 5000,
        callback: () => {
            switchWeapon('normal');
        }
    });
}

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

function switchWeapon(weaponKey) {
    currentWeapon = weapons[weaponKey];
}

function spawnPowerup() {
    if (gameEnded) return;

    let x = Phaser.Math.Between(50, window.innerWidth - 50);
    let rand = Math.random();
    let texture;

    if (rand < 0.33) {
        texture = 'powerupRocket';
    } else if (rand < 0.66) {
        texture = 'powerupLaser';
    } else {
        texture = 'powerupDouble';
    }

    let p = powerups.create(x, 0, texture);
    p.setVelocityY(120);
    p.setScale(0.4);
    p.body.setSize(p.width * 0.9, p.height * 0.9);
}

/* שליטה במובייל */
function setupTouchControls() {
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const shootBtn = document.getElementById('shoot-btn');

    if (leftBtn && rightBtn && shootBtn) {
        leftBtn.addEventListener('touchstart', () => movingLeft = true);
        leftBtn.addEventListener('touchend', () => movingLeft = false);

        rightBtn.addEventListener('touchstart', () => movingRight = true);
        rightBtn.addEventListener('touchend', () => movingRight = false);

        shootBtn.addEventListener('touchstart', () => {
            isShooting = true;
        });
        shootBtn.addEventListener('touchend', () => {
            isShooting = false;
        });
    }
}
