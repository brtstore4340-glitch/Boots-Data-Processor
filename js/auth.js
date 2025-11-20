import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

export const authService = {
    init: () => {
        onAuthStateChanged(auth, user => {
            document.getElementById('loading-screen').classList.add('hidden');
            if(user) {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app-screen').classList.remove('hidden');
                // Could load role here if needed
                import('./ui.js').then(module => module.ui.nav('upload'));
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
                document.getElementById('app-screen').classList.add('hidden');
            }
        });

        const form = document.getElementById('login-form');
        if(form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                try {
                    await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
                } catch(e) { alert(e.message); }
            };
        }
    },
    logout: () => signOut(auth).then(() => window.location.reload())
};