import { GAME_MODES, SPEEDS, MINI_MODIFIERS } from '../physics/GameModePhysics.js';

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(false);
        this.sprite.setBounce(0);

        // Game state
        this.gameMode = 'CUBE';
        this.speedMode = 'NORMAL';
        this.gravityDirection = 1; // 1 = down, -1 = up
        this.isMini = false;
        this.isOnGround = false;
        this.isOnCeiling = false;
        this.isDead = false;

        // Input state
        this.inputHeld = false;
        this.inputJustPressed = false;
        this.jumpHoldTime = 0;
        this.robotJumping = false;

        // Physics state
        this.currentRotation = 0;
        this.targetRotation = 0;

        // Ball input buffer (ms remaining to trigger flip on land)
        this.ballBufferTime = 0;
        this.ballBufferWindow = 100; // 100ms buffer window

        // Wave trail graphics
        this.trail = [];
        this.maxTrailLength = 20;
        this.trailGraphics = [];

        // Ship fire emitter
        this.fireEmitter = null;
        // Wave trail emitter
        this.waveEmitter = null;
        // Spider teleport trail
        this.spiderTrail = null;

        // Texture map per gamemode
        this.textureMap = {
            CUBE: 'player',
            SHIP: 'player_ship',
            BALL: 'player_ball',
            UFO: 'player_ufo',
            WAVE: 'player_wave',
            SPIDER: 'player_spider',
            ROBOT: 'player_robot'
        };

        // Apply initial physics
        this.applyGameMode();
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    get body() { return this.sprite.body; }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
    }

    setVelocity(x, y) {
        this.sprite.setVelocity(x, y);
    }

    setVelocityX(x) {
        this.sprite.setVelocityX(x);
    }

    setVelocityY(y) {
        this.sprite.setVelocityY(y);
    }

    setTint(color) {
        this.sprite.setTint(color);
    }

    applyGameMode() {
        const mode = GAME_MODES[this.gameMode];

        // Set gravity based on mode
        if (mode.gravity) {
            let gravity = mode.gravity * this.gravityDirection;
            if (this.isMini) {
                gravity *= MINI_MODIFIERS.gravityMultiplier;
            }
            this.sprite.body.setGravityY(gravity);
        } else if (this.gameMode === 'WAVE') {
            // Wave has no gravity - direct diagonal control
            this.sprite.body.setGravityY(0);
        }

        // Set hitbox
        let width = 50 * mode.hitboxWidth;
        let height = 50 * mode.hitboxHeight;
        if (this.isMini) {
            width *= MINI_MODIFIERS.hitboxScale;
            height *= MINI_MODIFIERS.hitboxScale;
            this.sprite.setScale(0.6);
        } else {
            this.sprite.setScale(1);
        }
        this.sprite.setSize(width, height);
    }

    setGameMode(modeName) {
        this.gameMode = modeName;

        // Swap texture
        const texKey = this.textureMap[modeName] || 'player';
        this.sprite.setTexture(texKey);

        // Manage ship fire particles
        if (modeName === 'SHIP') {
            this.createFireEmitter();
        } else {
            this.destroyFireEmitter();
        }

        // Manage wave trail
        if (modeName === 'WAVE') {
            this.createWaveEmitter();
        } else {
            this.destroyWaveEmitter();
        }


        this.applyGameMode();
    }

    createFireEmitter() {
        if (this.fireEmitter) return;
        this.fireEmitter = this.scene.add.particles(0, 0, 'fire_particle', {
            follow: this.sprite,
            followOffset: { x: -25, y: 0 },
            speed: { min: 30, max: 80 },
            angle: { min: 160, max: 200 },
            scale: { start: 1.2, end: 0 },
            lifespan: { min: 150, max: 350 },
            frequency: 20,
            tint: [0xff6600, 0xff3300, 0xffaa00, 0xff0000],
            blendMode: 'ADD',
            quantity: 2
        });
        this.fireEmitter.setDepth(-1);
    }

    destroyFireEmitter() {
        if (this.fireEmitter) {
            this.fireEmitter.destroy();
            this.fireEmitter = null;
        }
    }

    createWaveEmitter() {
        if (this.waveEmitter) return;
        // Use a Graphics object for a solid persistent trail
        this.waveEmitter = this.scene.add.graphics();
        this.waveEmitter.setDepth(-1);
        this.trail = [];
    }

    destroyWaveEmitter() {
        if (this.waveEmitter) {
            this.waveEmitter.destroy();
            this.waveEmitter = null;
        }
        this.trail = [];
    }

    setSpeedMode(speedName) {
        this.speedMode = speedName;
    }

    flipGravity() {
        this.gravityDirection *= -1;
        this.applyGameMode();
        this.sprite.setFlipY(this.gravityDirection === -1);
    }

    getHorizontalSpeed() {
        return SPEEDS[this.speedMode];
    }

    update(delta, inputHeld, inputJustPressed) {
        if (this.isDead) return;

        this.inputHeld = inputHeld;
        this.inputJustPressed = inputJustPressed;

        // Check ground/ceiling state
        this.isOnGround = this.gravityDirection === 1
            ? (this.sprite.body.touching.down || this.sprite.body.blocked.down)
            : (this.sprite.body.touching.up || this.sprite.body.blocked.up);

        this.isOnCeiling = this.gravityDirection === 1
            ? (this.sprite.body.touching.up || this.sprite.body.blocked.up)
            : (this.sprite.body.touching.down || this.sprite.body.blocked.down);

        // Update based on game mode
        switch (this.gameMode) {
            case 'CUBE':
                this.updateCube(delta);
                break;
            case 'SHIP':
                this.updateShip(delta);
                break;
            case 'BALL':
                this.updateBall(delta);
                break;
            case 'UFO':
                this.updateUFO(delta);
                break;
            case 'WAVE':
                this.updateWave(delta);
                break;
            case 'SPIDER':
                this.updateSpider(delta);
                break;
            case 'ROBOT':
                this.updateRobot(delta);
                break;
        }

        // Apply horizontal movement (constant speed, no momentum)
        this.sprite.setVelocityX(this.getHorizontalSpeed());

        // Clamp velocities
        this.clampVelocity();
    }

    clampVelocity() {
        const mode = GAME_MODES[this.gameMode];

        // Clamp fall speed
        if (mode.maxFallSpeed) {
            if (this.gravityDirection === 1) {
                if (this.sprite.body.velocity.y > mode.maxFallSpeed) {
                    this.sprite.setVelocityY(mode.maxFallSpeed);
                }
            } else {
                if (this.sprite.body.velocity.y < -mode.maxFallSpeed) {
                    this.sprite.setVelocityY(-mode.maxFallSpeed);
                }
            }
        }

        // Clamp rise speed for ship/ufo
        if (mode.maxRiseSpeed) {
            if (this.gravityDirection === 1) {
                if (this.sprite.body.velocity.y < mode.maxRiseSpeed) {
                    this.sprite.setVelocityY(mode.maxRiseSpeed);
                }
            } else {
                if (this.sprite.body.velocity.y > -mode.maxRiseSpeed) {
                    this.sprite.setVelocityY(-mode.maxRiseSpeed);
                }
            }
        }
    }

    updateCube(delta) {
        const mode = GAME_MODES.CUBE;

        const wasInAir = this._cubeWasInAir || false;
        this._cubeWasInAir = !this.isOnGround;

        // Jump when on ground
        let justJumped = false;
        if ((this.inputJustPressed || this.inputHeld) && this.isOnGround) {
            let jumpVel = mode.jumpVelocity * this.gravityDirection;
            if (this.isMini) jumpVel *= MINI_MODIFIERS.jumpMultiplier;
            this.sprite.setVelocityY(jumpVel);
            this.targetRotation += 180 * this.gravityDirection;
            justJumped = true;
        }

        if (!this.isOnGround && mode.rotatesOnJump) {
            // Rotate at constant speed toward target
            const rotSpeed = 360 * (delta / 1000);
            const diff = this.targetRotation - this.currentRotation;
            if (Math.abs(diff) <= rotSpeed) {
                this.currentRotation = this.targetRotation;
            } else {
                this.currentRotation += Math.sign(diff) * rotSpeed;
            }
            this.sprite.setAngle(this.currentRotation);
        } else if (this.isOnGround && wasInAir && !justJumped) {
            // Just landed and not immediately jumping again — snap to nearest 90
            this.currentRotation = Math.round(this.currentRotation / 90) * 90;
            this.targetRotation = this.currentRotation;
            this.sprite.setAngle(this.currentRotation);
        }
    }

    updateShip(delta) {
        const mode = GAME_MODES.SHIP;

        // Continuous flight - hold to rise smoothly, release to fall smoothly
        // Gravity is already applied by Phaser physics engine via applyGameMode()
        // We just add upward thrust when holding
        if (this.inputHeld) {
            const currentVel = this.sprite.body.velocity.y;
            const thrustForce = mode.thrustAcceleration * (delta / 1000);
            // Apply thrust opposite to gravity direction
            const newVel = this.gravityDirection === 1
                ? currentVel - thrustForce
                : currentVel + thrustForce;
            // Clamp to max rise speed
            if (this.gravityDirection === 1) {
                this.sprite.setVelocityY(Math.max(mode.maxRiseSpeed, newVel));
            } else {
                this.sprite.setVelocityY(Math.min(-mode.maxRiseSpeed, newVel));
            }
        }
        // When not holding, gravity naturally pulls down smoothly (set in applyGameMode)

        // Rotation follows velocity smoothly
        if (mode.rotationFollowsVelocity) {
            const velY = this.sprite.body.velocity.y;
            const targetAngle = (velY / 15) * this.gravityDirection;
            const clampedAngle = Math.max(-mode.maxRotation, Math.min(mode.maxRotation, targetAngle));
            const currentAngle = this.sprite.angle;
            this.sprite.setAngle(currentAngle + (clampedAngle - currentAngle) * mode.rotationSmoothing);
        }
    }

    updateBall(delta) {
        const mode = GAME_MODES.BALL;

        // Buffer input: if player taps while in air, remember it
        if (this.inputJustPressed) {
            this.ballBufferTime = this.ballBufferWindow;
        }
        if (this.ballBufferTime > 0) {
            this.ballBufferTime -= delta;
        }

        // Flip gravity when on ground — either from direct tap or buffered input
        if (this.isOnGround && (this.inputJustPressed || this.ballBufferTime > 0)) {
            this.ballBufferTime = 0;
            this.flipGravity();
            this.sprite.setVelocityY(mode.jumpVelocity * this.gravityDirection);
        }

        // Constant rolling rotation
        this.currentRotation += mode.rotationSpeed * (delta / 1000) * this.gravityDirection;
        this.sprite.setAngle(this.currentRotation);
    }

    updateUFO(_delta) {
        const mode = GAME_MODES.UFO;

        // Each tap = single jump boost, can chain taps for height (multi-jump)
        if (this.inputJustPressed) {
            let jumpVel = mode.jumpVelocity * this.gravityDirection;
            if (this.isMini) {
                jumpVel *= MINI_MODIFIERS.jumpMultiplier;
            }
            this.sprite.setVelocityY(jumpVel);
        }

        // Rotation follows velocity
        if (mode.rotationFollowsVelocity) {
            const velY = this.sprite.body.velocity.y;
            const targetAngle = (velY / 18) * this.gravityDirection;
            const clampedAngle = Math.max(-mode.maxRotation, Math.min(mode.maxRotation, targetAngle));
            const currentAngle = this.sprite.angle;
            this.sprite.setAngle(currentAngle + (clampedAngle - currentAngle) * mode.rotationSmoothing);
        }
    }

    updateWave() {
        const mode = GAME_MODES.WAVE;

        if (this.inputHeld) {
            this.sprite.setVelocityY(-mode.diagonalSpeed * this.gravityDirection);
            this.sprite.setAngle(-45 * this.gravityDirection);
        } else {
            this.sprite.setVelocityY(mode.diagonalSpeed * this.gravityDirection);
            this.sprite.setAngle(45 * this.gravityDirection);
        }

        // Add current position to persistent trail
        this.trail.push({ x: this.sprite.x, y: this.sprite.y });

        // Draw solid white trail through all recorded points
        if (this.waveEmitter && this.trail.length > 1) {
            this.waveEmitter.clear();
            this.waveEmitter.lineStyle(2, 0xffffff, 0.9);
            this.waveEmitter.beginPath();
            this.waveEmitter.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                this.waveEmitter.lineTo(this.trail[i].x, this.trail[i].y);
            }
            this.waveEmitter.strokePath();
        }
    }

    updateSpider(_delta) {
        if (this.inputJustPressed && (this.isOnGround || this.isOnCeiling)) {
            const fromX = this.sprite.x;
            const fromY = this.sprite.y;

            // Ground surface y, ceiling surface y (player center)
            // Ground tile top edge = 650-32=618. Player half-height=20. Center = 618-20=598
            // Ceiling tile bottom edge = 70+32=102. Player half-height=20. Center = 102+20=122
            const groundY = 598;
            const ceilingY = 122;

            // Determine destination before flipping gravity
            const destY = this.gravityDirection === 1 ? ceilingY : groundY;

            // Teleport instantly — set position first
            this.sprite.setY(destY);
            this.sprite.setVelocityY(0);

            // Then flip gravity
            this.flipGravity();

            // Draw zap flash from old position to new position
            this._drawZapFlash(fromX, fromY, fromX, destY);
        }
    }

    _drawZapFlash(x1, y1, x2, y2) {
        const g = this.scene.add.graphics();
        g.setDepth(10);

        // Build a jagged zap path between (x1,y1) and (x2,y2)
        const dy = y2 - y1;
        const steps = 8;
        const jitter = 10; // max horizontal wobble
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const offset = (Math.random() - 0.5) * 2 * jitter;
            points.push({ x: x1 + offset, y: y1 + dy * t });
        }
        points.push({ x: x2, y: y2 });

        // Outer glow — thick, semi-transparent cyan
        g.lineStyle(8, 0x00ffff, 0.35);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
        g.strokePath();

        // Inner core — thinner, bright white
        g.lineStyle(3, 0xffffff, 1.0);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
        g.strokePath();

        // Fade out quickly
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 180,
            ease: 'Power2',
            onComplete: () => g.destroy()
        });
    }

    updateRobot(delta) {
        const mode = GAME_MODES.ROBOT;

        if (this.isOnGround) {
            if (this.inputJustPressed || this.inputHeld) {
                // Start jump
                this.jumpHoldTime = 0;
                this.robotJumping = true;
                // Apply full boost velocity immediately
                this.sprite.setVelocityY(mode.maxJumpVelocity * this.gravityDirection);
            }
        } else if (this.robotJumping && this.inputHeld && this.jumpHoldTime < mode.jumpHoldTime) {
            // Still within hold window — keep overriding velocity with constant boost
            this.jumpHoldTime += delta / 1000;
            this.sprite.setVelocityY(mode.maxJumpVelocity * this.gravityDirection);
        } else if (!this.inputHeld || this.jumpHoldTime >= mode.jumpHoldTime) {
            // Released or hold expired — stop boosting, let gravity take over
            this.robotJumping = false;
        }

        // Rotation while in air
        if (!this.isOnGround && mode.rotatesOnJump) {
            this.currentRotation += mode.rotationSpeed * (delta / 1000) * this.gravityDirection;
            this.sprite.setAngle(this.currentRotation);
        } else if (this.isOnGround) {
            this.currentRotation = Math.round(this.currentRotation / 90) * 90;
            this.sprite.setAngle(this.currentRotation);
        }
    }

    die() {
        this.isDead = true;
        this.sprite.setVelocity(0, 0);
        this.sprite.setTint(0xff0000);
        this.destroyFireEmitter();
        this.destroyWaveEmitter();
        if (this.spiderTrail) { this.spiderTrail.destroy(); this.spiderTrail = null; }
    }

    reset(x, y) {
        this.isDead = false;
        this.sprite.setPosition(x, y);
        this.sprite.setVelocity(0, 0);
        this.sprite.clearTint();
        this.sprite.setTexture('player');
        this.gameMode = 'CUBE';
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.sprite.setAngle(0);
        this.gravityDirection = 1;
        this.sprite.setFlipY(false);
        this.trail = [];
        this.jumpHoldTime = 0;
        this.robotJumping = false;
        this.destroyFireEmitter();
        this.destroyWaveEmitter();
        if (this.spiderTrail) { this.spiderTrail.destroy(); this.spiderTrail = null; }
        this.applyGameMode();
    }
}
