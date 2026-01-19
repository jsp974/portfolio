/**
 * Main Entry Point
 */
import { Game } from './game.js';

window.onload = () => {
    const game = new Game();
    game.start();

    window.addEventListener('resize', () => {
        game.renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Initial resize
    game.renderer.resize(window.innerWidth, window.innerHeight);
};
