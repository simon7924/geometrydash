import { BootScene } from './scenes/BootScene.js';
import { AuthScene } from './scenes/AuthScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { EndlessScene } from './scenes/EndlessScene.js';
import { StatsScene } from './scenes/StatsScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { LevelEditorScene } from './scenes/LevelEditorScene.js';
import { CommunityScene } from './scenes/CommunityScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2000 },
            debug: false
        }
    },
    scene: [BootScene, AuthScene, MenuScene, LevelSelectScene, GameScene, EndlessScene, StatsScene, LeaderboardScene, LevelEditorScene, CommunityScene]
};

const game = new Phaser.Game(config);
