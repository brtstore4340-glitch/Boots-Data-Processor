import { authService } from './auth.js';
import { fileProcessor } from './file-processor.js';

export const ui = {
    elements: {
        appScreen: document.getElementById('app-screen'),
        loginScreen: document.getElementById('login-screen'),
        contentArea: document.getElementById('content-area'),
        loadingScreen: document.getElementById('loading-screen'),
        userName: document.getElementById('user-name'),
        userRole: document.getElementById('user-role'),
        navConfig: document.getElementById('nav-config')
    },

    init: () => {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                ui.navigateTo(page);
            });
        });
    },

    toggleLogin: (isLoggedIn, user, role) => {
        if (isLoggedIn) {
            ui.elements.loginScreen.classList.add('hidden');
            ui.elements.appScreen.classList.remove('hidden');
            ui.elements.userName.textContent = user.email;
            ui.elements.userRole.textContent = role;

            if (['Admin', 'Manager'].includes(role)) {
                ui.elements.navConfig.classList.remove('hidden');
            } else {
                ui.elements.navConfig.classList.add('hidden');
            }
            
            ui.navigateTo('upload'); 
        } else {
            ui.elements.loginScreen.classList.remove('hidden');
            ui.elements.appScreen.classList.add('hidden');
        }
    },

    navigateTo: (page) => {
        ui.elements.contentArea.innerHTML = '';
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.page === page) btn.classList.add('text-blue-600', 'bg-blue-50');
            else btn.classList.remove('text-blue-600', 'bg-blue-50');
        });

        switch(page) {
            case 'upload': ui.renderUploadPage(); break;
            case 'report': ui.renderReportPage(); break;
            case 'config': ui.renderConfigPage(); break;
        }
    },

    renderUploadPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-3xl mx-auto mt-6">
                <div class="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div class="mb-6">
                        <div class="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mt-4">Upload KPI Files</h2>
                        <p class="text-gray-500 mt-2">Support .xls, .xlsx, .zip (Single or Batch)</p>
                        <p class="text-xs text-gray-400 mt-1">Password Protected Zip: NewBI#2020</p>
                    </div>
                    
                    <input type="file" id="fileInput" multiple accept=".xls,.xlsx,.csv,.zip" class="hidden">
                    
                    <div class="flex justify-center gap-4">
                        <button id="btn-select" class="border-2 border-blue-500 text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition">
                            Select Files
                        </button>
                        <button id="btn-process" class="bg-chrome-blue text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            Process Data
                        </button>
                    </div>

                    <div id="file-list" class="mt-8 text-left text-sm text-gray-600 space-y-2 border-t pt-4"></div>
                </div>
            </div>
        `;

        const input = document.getElementById('fileInput');
        const list = document.getElementById('file-list');
        const btnProcess = document.getElementById('btn-process');

        document.getElementById('btn-select').onclick = () => input.click();

        input.onchange = () => {
            list.innerHTML = '';
            if (input.files.length > 0) {
                Array.from(input.files).forEach(f => {
                    list.innerHTML += `
                        <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div class="flex items-center">
                                <span class="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                                ${f.name}
                            </div>
                            <span class="text-xs text-gray-400">${(f.size/1024).toFixed(1)} KB</span>
                        </div>`;
                });
                btnProcess.disabled = false;
            } else {
                btnProcess.disabled = true;
            }
        };

        btnProcess.onclick = () => {
            if(input.files.length > 0) fileProcessor.processFiles(input.files);
        };
    },

    renderReportPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-5xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Performance Dashboard</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 class="text-gray-500 text-sm font-medium">Net Sales (Today)</h3>
                        <p class="text-3xl font-bold text-gray-800 mt-2">Loading...</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 class="text-gray-500 text-sm font-medium">Total Transactions</h3>
                        <p class="text-3xl font-bold text-gray-800 mt-2">Loading...</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 class="text-gray-500 text-sm font-medium">Boots vs Prop Brand</h3>
                        <p class="text-3xl font-bold text-blue-600 mt-2">Loading...</p>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex items-center justify-center">
                    <p class="text-gray-400">Chart Visualization will appear here...</p>
                </div>
            </div>
        `;
    },

    renderConfigPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">System Configuration</h2>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add New User</button>
                </div>
                
                <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Admin</td>
                                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Admin</span></td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Just now</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href="#" class="text-blue-600 hover:text-blue-900">Edit</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showLoading: (show, text = "Processing...") => {
        const el = ui.elements.loadingScreen;
        if (show) {
            el.classList.remove('hidden');
            el.querySelector('p').textContent = text;
        } else {
            el.classList.add('hidden');
        }
    },
    
    updateLoadingText: (text) => {
        ui.elements.loadingScreen.querySelector('p').textContent = text;
    }
};