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
            
            ui.navigateTo('report'); // Default to report page
        } else {
            ui.elements.loginScreen.classList.remove('hidden');
            ui.elements.appScreen.classList.add('hidden');
        }
    },

    navigateTo: (page) => {
        ui.elements.contentArea.innerHTML = '';
        
        // Reset Active State
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-blue-600', 'bg-blue-50');
            btn.classList.add('text-gray-600');
            
            if(btn.dataset.page === page) {
                btn.classList.add('text-blue-600', 'bg-blue-50');
                btn.classList.remove('text-gray-600');
            }
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
            <div class="max-w-3xl mx-auto mt-10 animate-fade-in">
                <div class="bg-white p-10 rounded-3xl shadow-xl border border-blue-50 text-center">
                    <div class="mb-8">
                        <div class="mx-auto h-20 w-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                            <svg class="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mt-6 tracking-tight">Upload KPI Files</h2>
                        <p class="text-gray-500 mt-2">Support .xls, .xlsx, .zip (Single or Batch)</p>
                        <p class="text-xs text-gray-400 mt-1">Password Protected Zip: NewBI#2020</p>
                    </div>
                    
                    <input type="file" id="fileInput" multiple accept=".xls,.xlsx,.csv,.zip" class="hidden">
                    
                    <div class="flex justify-center gap-4">
                        <button id="btn-select" class="border-2 border-blue-200 text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition hover:border-blue-300">
                            Select Files
                        </button>
                        <button id="btn-process" class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
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
                        <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div class="flex items-center">
                                <div class="w-2 h-2 bg-green-400 rounded-full mr-3 shadow-sm"></div>
                                <span class="font-medium text-gray-700">${f.name}</span>
                            </div>
                            <span class="text-xs text-gray-400 font-mono">${(f.size/1024).toFixed(1)} KB</span>
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

    // --- Updated Report Page: Sunday Start & Gemini Blue Theme ---
    renderReportPage: async () => {
        const today = new Date();
        
        // --- Logic: Start Week on SUNDAY ---
        // dayOfWeek: 0 (Sun) to 6 (Sat)
        const dayOfWeek = today.getDay(); 
        
        // Calculate Sunday date (Start of the current week view)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        
        const startDateStr = startOfWeek.toISOString().split('T')[0];
        
        // Calculate Saturday (End of week)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const endDateStr = endOfWeek.toISOString().split('T')[0];

        ui.elements.contentArea.innerHTML = `
            <div class="max-w-7xl mx-auto animate-fade-in">
                <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
                            Weekly KPI Calendar
                        </h2>
                        <p class="text-sm text-gray-500 mt-1">
                            ${startOfWeek.toLocaleDateString('en-GB')} - ${endOfWeek.toLocaleDateString('en-GB')}
                        </p>
                    </div>
                    
                    <div class="flex space-x-3 bg-white p-2 rounded-full shadow-sm border border-gray-100">
                         <div class="flex items-center px-3 py-1">
                            <span class="w-3 h-3 rounded-full bg-red-100 border border-red-200 mr-2"></span>
                            <span class="text-xs text-gray-600">No Data</span>
                         </div>
                         <div class="flex items-center px-3 py-1">
                            <span class="w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
                            <span class="text-xs text-gray-600">Completed</span>
                         </div>
                         <div class="flex items-center px-3 py-1">
                            <span class="w-3 h-3 rounded-full bg-gray-100 border border-gray-200 mr-2"></span>
                            <span class="text-xs text-gray-600">Future</span>
                         </div>
                    </div>
                </div>

                <!-- Calendar Grid -->
                <div id="calendar-grid" class="grid grid-cols-1 md:grid-cols-7 gap-4">
                    <!-- Loading State -->
                    <div class="col-span-7 h-64 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                        <span class="text-gray-400 font-medium">Syncing data...</span>
                    </div>
                </div>
            </div>
        `;

        // Fetch Data
        const storeCode = '4340'; // To be dynamic later
        const reportData = await dbService.getDailyKPIReport(storeCode, startDateStr, endDateStr);
        
        ui.renderCalendar(startOfWeek, reportData);
    },

    renderCalendar: (startOfWeek, data) => {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const today = new Date();
        today.setHours(0,0,0,0);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];
            
            // Display format: 15/11
            const displayDate = `${String(currentDay.getDate()).padStart(2,'0')}/${String(currentDay.getMonth()+1).padStart(2,'0')}`;
            const fullYear = currentDay.getFullYear();
            
            const dayData = data[dateStr];
            const isFuture = currentDay > today;
            const isToday = currentDay.getTime() === today.getTime();
            
            let cardClass = "";
            let contentHtml = "";
            let headerClass = "text-gray-500";

            if (dayData) {
                // --- Data Exists (Gemini Blue Style) ---
                cardClass = "bg-white border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transform hover:-translate-y-1";
                headerClass = "text-blue-700 font-bold";
                contentHtml = `
                    <div class="space-y-3 mt-3">
                        <div class="flex justify-between items-end border-b border-gray-50 pb-2">
                            <span class="text-[10px] text-gray-400 uppercase tracking-wider">Tesp. Actual</span>
                            <span class="text-lg font-bold text-gray-800">${dayData.tesp.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                        </div>
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] text-gray-400 uppercase tracking-wider">Tx</span>
                            <span class="text-sm font-semibold text-gray-600">${dayData.tx.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] text-gray-400 uppercase tracking-wider">ATV</span>
                            <span class="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${dayData.atv.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                        </div>
                    </div>
                `;
            } else {
                if (isFuture) {
                    // --- Future (Clean Gray) ---
                    cardClass = "bg-gray-50 border border-gray-100 opacity-70";
                    contentHtml = `
                        <div class="h-32 flex items-center justify-center">
                           <span class="text-xs text-gray-300 font-light tracking-widest">FUTURE</span>
                        </div>
                    `;
                } else {
                    // --- Missing Data (Soft Red Alert) ---
                    cardClass = "bg-red-50 border border-red-100 ring-2 ring-red-50";
                    headerClass = "text-red-500";
                    contentHtml = `
                        <div class="h-32 flex flex-col items-center justify-center text-red-300">
                            <div class="bg-white p-2 rounded-full shadow-sm mb-2">
                                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <span class="text-xs font-bold text-red-400 uppercase tracking-wide">No Data</span>
                        </div>
                    `;
                }
            }

            // Apply Today Highlighting
            if(isToday) {
                cardClass += " ring-2 ring-indigo-400 ring-offset-2";
            }

            grid.innerHTML += `
                <div class="rounded-2xl p-4 flex flex-col transition-all duration-300 ${cardClass}">
                    <div class="flex justify-between items-start mb-1">
                        <div class="text-sm font-medium ${headerClass}">${days[i]}</div>
                        <div class="text-[10px] text-gray-400 bg-white/50 px-1.5 rounded">${fullYear}</div>
                    </div>
                    <div class="text-xs text-gray-400 font-mono mb-2">${displayDate}</div>
                    <div class="flex-1">
                        ${contentHtml}
                    </div>
                </div>
            `;
        }
    },

    renderConfigPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-4xl mx-auto animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">System Configuration</h2>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-md transition">Add New User</button>
                </div>
                
                <div class="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr class="hover:bg-blue-50 transition">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">admin@kpi.com</td>
                                <td class="px-6 py-4 whitespace-nowrap"><span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Admin</span></td>
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