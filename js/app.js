import { authService } from './auth.js';
import { ui } from './ui.js';
import { dbService } from './db-service.js';

const app = {
    init: () => {
        ui.init();

        authService.init(
            (user, role) => {
                ui.toggleLogin(true, user, role);
                console.log(`Logged in as ${user.email} (${role})`);
            },
            () => {
                ui.toggleLogin(false);
            }
        );

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = e.target.querySelector('button');

            btn.textContent = 'Logging in...';
            btn.disabled = true;

            const result = await authService.login(email, password);
            
            if (!result.success) {
                alert(result.message);
                btn.textContent = 'Login';
                btn.disabled = false;
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            authService.logout();
        });
    }
};

document.addEventListener('DOMContentLoaded', app.init);