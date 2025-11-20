import { authService } from './auth.js';
import { fileProcessor } from './file-processor.js';
import { dbService } from './db-service.js';

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
            
            ui.navigateTo('report'); // Default to report for demo
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

    // --- Render Pages ---

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

    // --- Updated Report Page for Calendar View ---
    renderReportPage: async () => {
        const today = new Date();
        // Calculate Start of Week (Monday)
        const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        const startOfWeek = new Date(today.setDate(diff));
        
        const startDateStr = startOfWeek.toISOString().split('T')[0];
        
        // Calculate End of Week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const endDateStr = endOfWeek.toISOString().split('T')[0];

        ui.elements.contentArea.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Weekly KPI Calendar</h2>
                    <div class="flex space-x-2">
                         <span class="px-3 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-100">No Data</span>
                         <span class="px-3 py-1 bg-green-50 text-green-600 text-xs rounded border border-green-100">Future</span>
                         <span class="px-3 py-1 bg-white text-gray-600 text-xs rounded border">Completed</span>
                    </div>
                </div>

                <!-- Calendar Grid -->
                <div id="calendar-grid" class="grid grid-cols-1 md:grid-cols-7 gap-4">
                    <!-- Loading State -->
                    <div class="col-span-7 text-center py-12 text-gray-400">Loading Calendar...</div>
                </div>
            </div>
        `;

        // Fetch Data
        const storeCode = '4340'; // Hardcoded for now, or get from user profile
        const reportData = await dbService.getDailyKPIReport(storeCode, startDateStr, endDateStr);
        
        ui.renderCalendar(startOfWeek, reportData);
    },

    renderCalendar: (startOfWeek, data) => {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const today = new Date();
        today.setHours(0,0,0,0);

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Format DD/MM/YYYY
            const displayDate = `${String(currentDay.getDate()).padStart(2,'0')}/${String(currentDay.getMonth()+1).padStart(2,'0')}/${currentDay.getFullYear()}`;
            
            const dayData = data[dateStr];
            const isFuture = currentDay > today;
            
            let cardClass = "bg-white border-gray-200";
            let contentHtml = "";

            if (dayData) {
                // Data Exists
                cardClass = "bg-white border-blue-200 shadow-md ring-1 ring-blue-100";
                contentHtml = `
                    <div class="space-y-3 mt-2">
                        <div>
                            <p class="text-xs text-gray-400 uppercase">Tesp. Actual</p>
                            <p class="text-lg font-bold text-blue-600">${dayData.tesp.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase">Tx</p>
                            <p class="text-sm font-semibold text-gray-700">${dayData.tx.toLocaleString()}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase">ATV</p>
                            <p class="text-sm font-semibold text-gray-700">${dayData.atv.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                        </div>
                    </div>
                `;
            } else {
                if (isFuture) {
                    // Future -> Green
                    cardClass = "bg-green-50 border-green-100 opacity-60";
                    contentHtml = `
                        <div class="h-32 flex items-center justify-center">
                           
                        </div>
                    `;
                } else {
                    // Missing Data (Past/Today) -> Red
                    cardClass = "bg-red-50 border-red-100";
                    contentHtml = `
                        <div class="h-32 flex flex-col items-center justify-center text-red-300">
                            <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="text-sm font-medium">No Data</span>
                        </div>
                    `;
                }
            }

            grid.innerHTML += `
                <div class="rounded-xl border p-4 flex flex-col ${cardClass} transition hover:shadow-lg">
                    <div class="text-sm font-semibold text-gray-500 mb-1">${days[i]}</div>
                    <div class="text-xs text-gray-400 mb-2">${displayDate}</div>
                    <div class="flex-1">
                        ${contentHtml}
                    </div>
                </div>
            `;
        }
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
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">admin@kpi.com</td>
                                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Admin</span></td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Active</td>
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