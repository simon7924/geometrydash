// Geometry Dash Accurate Physics Configuration
// Based on provided physics table

// Frame rate constant (GD runs at 60fps)
const FRAME_RATE = 60;

// Convert per-frame values to per-second for Phaser
// Gravity: units per frame² → pixels per second²
// Jump: units → pixels (velocity)

// Base unit scale (1 GD unit ≈ 30 pixels)
const UNIT_SCALE = 30;

// Speed multipliers (blocks per second at 1x)
export const SPEEDS = {
    HALF: 251.16,      // 0.5x - Slow
    NORMAL: 311.58,    // 1x - Normal (default)
    DOUBLE: 387.42,    // 2x - Fast
    TRIPLE: 468.0,     // 3x - Faster
    QUADRUPLE: 576.0   // 4x - Fastest
};

export const GAME_MODES = {
    CUBE: {
        name: 'cube',
        // Jump ≈ 10 units; Gravity ≈ 0.5 per frame
        // Gravity per second² = 0.5 * 60² * UNIT_SCALE = 54000 → scaled down for playability
        gravity: 1800,                    // 0.5 per frame scaled
        jumpVelocity: -600,               // 10 units jump height
        canHoldJump: false,               // Tap to jump, no hold
        rotatesOnJump: true,              // Cube rotates 90° per jump
        rotationSpeed: 400,               // Degrees per second while airborne
        groundRotation: true,             // Snaps to 90° increments on ground
        maxFallSpeed: 1000,               // Terminal velocity
        hitboxWidth: 0.85,
        hitboxHeight: 0.85,
        // Standard baseline physics - momentum doesn't carry
    },

    SHIP: {
        name: 'ship',
        // Gravity ≈ 0.35; thrust ≈ 0.5
        gravity: 1260,                    // 0.35 per frame scaled (lighter than cube)
        thrustAcceleration: 3000,         // Strong thrust so rise speed matches fall speed
        canHoldJump: true,                // Hold to fly up
        rotatesOnJump: false,
        rotationFollowsVelocity: true,    // Ship tilts based on Y velocity
        maxRotation: 30,                  // Max tilt angle in degrees
        rotationSmoothing: 0.12,          // How quickly rotation follows velocity
        maxFallSpeed: 600,
        maxRiseSpeed: -600,               // Max upward speed
        hitboxWidth: 0.7,
        hitboxHeight: 0.5,
        // Continuous flight; gravity affects downward movement
        // Moves smoothly up/down; no jump
    },

    BALL: {
        name: 'ball',
        // Jump ≈ 8 (normal); Rolling acceleration ≈ 0.3
        gravity: 1800,                    // Same as cube when falling
        jumpVelocity: -480,               // 8 units (slightly less than cube)
        switchGravity: true,              // Tap switches gravity direction
        canHoldJump: false,
        rotatesOnJump: false,
        rotationSpeed: 450,               // Constant rotation while moving
        rollingAcceleration: 0.3,         // Momentum carries when rolling
        gravityDirection: 1,              // 1 = down, -1 = up
        hitboxWidth: 0.75,
        hitboxHeight: 0.75,
        maxFallSpeed: 900,
        // Flips gravity; momentum carries when rolling
    },

    UFO: {
        name: 'ufo',
        // Jump ≈ 8 (per tap); Gravity ≈ 0.45
        gravity: 1620,                    // 0.45 per frame scaled
        jumpVelocity: -480,               // Stronger boost per tap
        canHoldJump: false,               // Tap for boosts
        multiJump: true,                  // Can jump in air - chain taps for height
        rotatesOnJump: false,
        rotationFollowsVelocity: true,
        maxRotation: 25,
        rotationSmoothing: 0.15,
        maxFallSpeed: 700,
        maxRiseSpeed: -700,
        hitboxWidth: 0.7,
        hitboxHeight: 0.6,
        // Each tap = single jump; can chain taps for height
    },

    WAVE: {
        name: 'wave',
        // Jump ≈ 5; Gravity ≈ 0.4
        // Movement angle ±45°; tap to change direction
        gravity: 1440,                    // 0.4 per frame scaled (used for diagonal movement)
        diagonalSpeed: 450,               // Speed of diagonal movement
        canHoldJump: true,
        rotatesOnJump: false,
        diagonalMovement: true,           // Wave moves diagonally
        movementAngle: 45,                // ±45° movement
        trailEnabled: true,               // Wave leaves a trail
        hitboxWidth: 0.4,                 // Very small hitbox
        hitboxHeight: 0.4,
        // Moves diagonally; speed constant horizontally
        // Tap to change direction
    },

    SPIDER: {
        name: 'spider',
        // Jump ≈ 12; Gravity ≈ 0.5
        // Jump is double when on ceiling
        gravity: 1800,                    // 0.5 per frame scaled (same as cube)
        jumpVelocity: -720,               // 12 units (higher than cube)
        ceilingJumpMultiplier: 2.0,       // Double jump when on ceiling
        teleportToSurface: true,          // Tap teleports to opposite surface
        canHoldJump: false,
        rotatesOnJump: false,
        gravityDirection: 1,
        hitboxWidth: 0.8,
        hitboxHeight: 0.8,
        maxFallSpeed: 1000,
        teleportSpeed: 2500,              // How fast spider moves to surface
        // Bounces on ceiling; jump is double when on ceiling
    },

    ROBOT: {
        name: 'robot',
        // Similar to cube but with variable jump height
        gravity: 1800,
        minJumpVelocity: -280,            // Tap jump (short)
        maxJumpVelocity: -480,            // Hold jump (tall)
        jumpHoldTime: 0.35,               // Max seconds to hold for full jump
        jumpAcceleration: 1100,           // Velocity added per second while holding
        canHoldJump: true,                // Hold for higher jump
        rotatesOnJump: true,
        rotationSpeed: 350,
        hitboxWidth: 0.85,
        hitboxHeight: 0.9,
        maxFallSpeed: 950,
    }
};

// Orb physics (pads and orbs that modify player movement)
export const ORBS = {
    YELLOW: { jumpMultiplier: 1.0, gravityFlip: false },
    PINK: { jumpMultiplier: 0.6, gravityFlip: false },
    RED: { jumpMultiplier: 1.4, gravityFlip: false },
    BLUE: { jumpMultiplier: 1.0, gravityFlip: true },
    GREEN: { jumpMultiplier: 1.0, gravityFlip: true, doubleJump: true },
    BLACK: { jumpMultiplier: -1.0, gravityFlip: false }
};

// Pad physics (automatic triggers on ground)
export const PADS = {
    YELLOW: { boostVelocity: -750 },
    PINK: { boostVelocity: -500 },
    RED: { boostVelocity: -900 },
    BLUE: { gravityFlip: true, boostVelocity: -750 }
};

// Portal effects
export const PORTALS = {
    GRAVITY_NORMAL: { gravityDirection: 1 },
    GRAVITY_FLIP: { gravityDirection: -1 },
    CUBE: { gameMode: 'CUBE' },
    SHIP: { gameMode: 'SHIP' },
    BALL: { gameMode: 'BALL' },
    UFO: { gameMode: 'UFO' },
    WAVE: { gameMode: 'WAVE' },
    SPIDER: { gameMode: 'SPIDER' },
    ROBOT: { gameMode: 'ROBOT' },
    SPEED_HALF: { speed: 'HALF' },
    SPEED_NORMAL: { speed: 'NORMAL' },
    SPEED_DOUBLE: { speed: 'DOUBLE' },
    SPEED_TRIPLE: { speed: 'TRIPLE' },
    SPEED_QUADRUPLE: { speed: 'QUADRUPLE' },
    SIZE_MINI: { sizeMini: true },
    SIZE_NORMAL: { sizeMini: false }
};

// Mini mode modifiers
export const MINI_MODIFIERS = {
    gravityMultiplier: 1.3,
    jumpMultiplier: 0.8,
    hitboxScale: 0.6
};
