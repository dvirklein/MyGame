class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        this.load.image('startButton', 'assets/start.png');
    }

    create() {
        let startButton = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'startButton')
            .setInteractive()
            .setScale(0.5);

        startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('mushroom', 'assets/mushroom.png');
        this.load.image('powerup', 'assets/powerup.png');
    }

    create() {
        this.player = this.physics.add.sprite(400, 500, 'player').setScale(0.7);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.isShooting = false;

        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 10
        });

        this.mushrooms = this.physics.add.group();
        for (let i = 0; i < 5; i++) {
            this.mushrooms.create(Phaser.Math.Between(100, 700), Phaser.Math.Between(50, 300), 'mushroom').setScale(0.6);
        }

        this.powerups = this.physics.add.group();
        for (let i = 0; i < 3; i++) {
            this.powerups.create(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 400), 'powerup').setScale(0.4);
        }

        this.shootTimer = this.time.addEvent({
            delay: 300,
            callback: this.shootBullet,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.spaceKey.isDown) {
            if (!this.isShooting) {
                this.isShooting = true;
                this.shootBullet();
            }
        } else {
            this.isShooting = false;
        }
    }

    shootBullet() {
        if (!this.isShooting) return;

        let bullet = this.bullets.get(this.player.x, this.player.y - 20);
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.setVelocityY(-300);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [StartScene, GameScene]
};

const game = new Phaser.Game(config);
