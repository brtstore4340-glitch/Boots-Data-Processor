import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { dbService } from './db-service.js';

export const authService = {
    currentUser: null,
    currentRole: null,
    timeoutTimer: null,
    TIMEOUT_LIMIT: 10 * 60 * 1000, 

    init: (onLoginSuccess, onLogout) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                authService.currentUser = user;
                authService.currentRole = await dbService.getUserRole(user.uid);
                
                authService.startSessionTimer();
                authService.setupActivityListeners();
                
                onLoginSuccess(user, authService.currentRole);
            } else {
                authService.currentUser = null;
                authService.currentRole = null;
                authService.clearSessionTimer();
                onLogout();
            }
        });
    },

    login: async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout: async () => {
        await signOut(auth);
        window.location.reload();
    },

    startSessionTimer: () => {
        clearTimeout(authService.timeoutTimer);
        authService.timeoutTimer = setTimeout(() => {
            alert("Session expired due to inactivity (10 mins).");
            authService.logout();
        }, authService.TIMEOUT_LIMIT);
    },

    resetSessionTimer: () => {
        if (authService.currentUser) {
            clearTimeout(authService.timeoutTimer);
            authService.startSessionTimer();
        }
    },
    
    clearSessionTimer: () => {
        clearTimeout(authService.timeoutTimer);
    },

    setupActivityListeners: () => {
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, () => authService.resetSessionTimer());
        });
    }
};