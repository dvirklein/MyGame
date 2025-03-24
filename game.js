// Updated Phaser game with improved UI and continuous shooting

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
            .setScale(1.2);

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
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('powerup', 'assets/powerup.png');
        this.load.image('mushroom', 'assets/mushroom.png');
    }

    create() {
        this.player = this.physics.add.sprite(200, 500, 'player').setScale(0.7);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shootButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shooting = false;

        this.shootButton.on('down', () => {
            this.shooting = true;
            this.shootBullet();
        });
        
        this.shootButton.on('up', () => {
            this.shooting = false;
        });

        this.time.addEvent({
            delay: 200,
            loop: true,
            callback: () => {
                if (this.shooting) {
                    this.shootBullet();
                }
            }
        });

        this.mushroom = this.physics.add.sprite(300, 400, 'mushroom').setScale(1.1);
        this.powerup = this.physics.add.sprite(100, 200, 'powerup').setScale(0.8);
    }

    shootBullet() {
        let bullet = this.physics.add.sprite(this.player.x, this.player.y - 20, 'bullet');
        bullet.setVelocityY(-300);
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [StartScene, GameScene]
};

const game = new Phaser.Game(config);
