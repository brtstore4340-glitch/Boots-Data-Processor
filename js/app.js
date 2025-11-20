import { authService } from './auth.js';
import { ui } from './ui.js';

// Main Entry
document.addEventListener('DOMContentLoaded', () => {
    // Init Auth Service
    authService.init();
    // Init UI
    ui.init();
});