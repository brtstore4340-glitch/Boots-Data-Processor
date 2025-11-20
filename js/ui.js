import { authService } from './auth.js';
import { fileProcessor } from './file-processor.js';
import { dbService } from './db-service.js';

export const ui = {
    // State tracking for report view
    state: {
        // Default to Nov 2025 based on your data
        currentViewDate: new Date('2025-11-01') 
    },

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
            
            ui.navigateTo('report'); 
        } else {
            ui.elements.loginScreen.classList.remove('hidden');
            ui.elements.appScreen.classList.add('hidden');
        }
    },

    navigateTo: (page) => {
        ui.elements.contentArea.innerHTML = '';
        
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

    renderUploadPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-3xl mx-auto mt-10 animate-fade-in">
                <div class="bg-white p-10 rounded-3xl shadow-xl border border-blue-50 text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
                    <div class="mb-8 relative z-10">
                        <div class="mx-auto h-20 w-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center shadow-inner mb-4">
                            <svg class="h-10 w-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 tracking-tight">Upload Data</h2>
                        <p class="text-gray-500 mt-2">Supported files: .xls, .xlsx, .zip</p>
                    </div>
                    
                    <input type="file" id="fileInput" multiple accept=".xls,.xlsx,.csv,.zip" class="hidden">
                    
                    <div class="flex justify-center gap-4 relative z-10">
                        <button id="btn-select" class="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition">
                            Select Files
                        </button>
                        <button id="btn-process" class="bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            Process
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
                                <div class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
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

    renderReportPage: async () => {
        const viewDate = ui.state.currentViewDate;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        // --- Calculate Month Grid (Full Weeks) ---
        // 1. Find First and Last day of the actual month
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // 2. Adjust to start on Sunday and end on Saturday
        const startGrid = new Date(firstDayOfMonth);
        startGrid.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

        const endGrid = new Date(lastDayOfMonth);
        endGrid.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));

        const startDateStr = startGrid.toISOString().split('T')[0];
        const endDateStr = endGrid.toISOString().split('T')[0];

        // Format Header: "November 2025"
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const headerTitle = `${monthNames[month]} ${year}`;
        
        // Value for Month Picker (YYYY-MM)
        const pickerValue = `${year}-${String(month + 1).padStart(2, '0')}`;

        ui.elements.contentArea.innerHTML = `
            <div class="max-w-full mx-auto animate-fade-in px-2">
                <!-- Header Controls -->
                <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div class="flex items-center gap-4">
                        <div class="bg-indigo-50 p-3 rounded-xl">
                            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-gray-800">${headerTitle}</h2>
                            <p class="text-xs text-gray-500">Monthly Performance Overview</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                         <input type="month" id="month-picker" value="${pickerValue}" 
                                class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600 cursor-pointer hover:bg-gray-50 transition">
                         
                         <div class="h-8 w-px bg-gray-200 mx-2"></div>

                         <div class="flex items-center bg-gray-100 rounded-lg p-1">
                            <button id="prev-month" class="p-2 rounded-md hover:bg-white shadow-sm hover:text-indigo-600 text-gray-500 transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <button id="next-month" class="p-2 rounded-md hover:bg-white shadow-sm hover:text-indigo-600 text-gray-500 transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Calendar Header (Days of Week) -->
                <div class="grid grid-cols-7 gap-4 mb-2 text-center">
                    <div class="text-xs font-bold text-gray-400 uppercase">Sun</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Mon</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Tue</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Wed</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Thu</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Fri</div>
                    <div class="text-xs font-bold text-gray-400 uppercase">Sat</div>
                </div>

                <!-- Calendar Grid -->
                <div id="calendar-grid" class="grid grid-cols-7 gap-3">
                    <div class="col-span-7 h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600 mb-3"></div>
                        <span class="text-gray-500 font-medium">Loading Monthly Data...</span>
                        <p class="text-xs text-gray-400 mt-2">Querying date range: ${startDateStr} to ${endDateStr}</p>
                    </div>
                </div>
                
                <!-- Legend -->
                <div class="flex justify-center mt-6 space-x-6">
                     <div class="flex items-center">
                        <span class="w-3 h-3 rounded-full bg-red-400 mr-2 shadow-sm"></span>
                        <span class="text-xs text-gray-500">Missing Data</span>
                     </div>
                     <div class="flex items-center">
                        <span class="w-3 h-3 rounded-full bg-indigo-500 mr-2 shadow-sm"></span>
                        <span class="text-xs text-gray-500">Completed</span>
                     </div>
                     <div class="flex items-center">
                        <span class="w-3 h-3 rounded-full bg-gray-200 mr-2 shadow-sm"></span>
                        <span class="text-xs text-gray-400">Next/Prev Month</span>
                     </div>
                </div>
            </div>
        `;

        // Bind Events
        const monthPicker = document.getElementById('month-picker');
        monthPicker.onchange = (e) => {
            const [y, m] = e.target.value.split('-');
            ui.state.currentViewDate = new Date(parseInt(y), parseInt(m) - 1, 1);
            ui.renderReportPage();
        };

        document.getElementById('prev-month').onclick = () => ui.changeMonth(-1);
        document.getElementById('next-month').onclick = () => ui.changeMonth(1);

        // Fetch Data
        const storeCode = '4340'; 
        const result = await dbService.getDailyKPIReport(storeCode, startDateStr, endDateStr);
        
        if (result.success) {
            ui.renderCalendar(startGrid, endGrid, result.data, month); // Pass 'month' to check if day belongs to current view
        } else if (result.error === 'missing_index') {
            ui.renderIndexError(result.message);
        } else {
            document.getElementById('calendar-grid').innerHTML = `<div class="col-span-7 text-center text-red-500 py-10 border rounded-lg bg-red-50">Error: ${result.message}</div>`;
        }
    },

    changeMonth: (offset) => {
        const current = ui.state.currentViewDate;
        current.setMonth(current.getMonth() + offset);
        ui.state.currentViewDate = new Date(current);
        ui.renderReportPage();
    },

    renderIndexError: (message) => {
        const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        const url = urlMatch ? urlMatch[0] : null;

        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = `
            <div class="col-span-7 bg-yellow-50 border border-yellow-200 rounded-2xl p-12 text-center">
                <svg class="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <h3 class="text-2xl font-bold text-yellow-800 mb-2">Optimization Required</h3>
                <p class="text-yellow-700 mb-6 max-w-lg mx-auto">To display the monthly report efficiently, Firebase needs a composite index.</p>
                ${url ? `<a href="${url}" target="_blank" class="bg-yellow-600 text-white px-8 py-3 rounded-full font-bold hover:bg-yellow-700 transition shadow-lg inline-flex items-center gap-2">
                            <span>Create Index (One-time)</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>` 
                      : `<div class="text-sm text-left bg-white p-4 rounded border border-yellow-200 font-mono overflow-auto max-w-xl mx-auto">${message}</div>`}
            </div>
        `;
    },

    renderCalendar: (startDate, endDate, data, currentMonthIndex) => {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const today = new Date();
        today.setHours(0,0,0,0);

        // Iterate day by day
        let loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            const dateStr = loopDate.toISOString().split('T')[0];
            const dayOfMonth = loopDate.getDate();
            const isCurrentMonth = loopDate.getMonth() === currentMonthIndex;
            
            const dayData = data[dateStr];
            const isFuture = loopDate > today;
            const isToday = loopDate.getTime() === today.getTime();

            // --- Card Styling ---
            let cardClass = "min-h-[130px] flex flex-col justify-between p-3 rounded-xl border transition-all duration-200";
            let contentHtml = "";
            let dateClass = "text-sm font-bold";

            if (!isCurrentMonth) {
                // Days from prev/next month
                cardClass += " bg-gray-50 border-gray-100 opacity-60 hover:opacity-100";
                dateClass += " text-gray-400";
            } else {
                cardClass += " bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200";
                dateClass += " text-gray-700";
            }

            if (isToday) {
                cardClass += " ring-2 ring-indigo-500 ring-offset-1";
                dateClass += " text-indigo-600";
            }

            if (dayData) {
                // Has Data
                if(isCurrentMonth) cardClass += " border-l-4 border-l-indigo-500";
                
                contentHtml = `
                    <div class="flex flex-col gap-1.5 mt-2">
                        <div class="flex justify-between items-baseline">
                            <span class="text-[9px] text-gray-400 font-bold uppercase">Tesp</span>
                            <span class="text-sm font-bold text-gray-800">${dayData.tesp.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        </div>
                        <div class="flex justify-between items-baseline">
                            <span class="text-[9px] text-gray-400 font-bold uppercase">Tx</span>
                            <span class="text-xs font-semibold text-gray-600">${dayData.tx.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-baseline">
                            <span class="text-[9px] text-gray-400 font-bold uppercase">ATV</span>
                            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                ${dayData.atv.toLocaleString(undefined, {maximumFractionDigits:0})}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                // No Data
                if (isFuture) {
                    contentHtml = `
                        <div class="flex-1 flex items-center justify-center">
                             <!-- Empty for future -->
                        </div>
                    `;
                } else {
                    // Missing Data Alert
                    if (isCurrentMonth) {
                        cardClass += " bg-red-50/30 border-red-100";
                        contentHtml = `
                            <div class="flex-1 flex flex-col items-center justify-center opacity-50">
                                <div class="w-6 h-6 rounded-full bg-red-50 text-red-300 flex items-center justify-center text-xs font-bold">!</div>
                            </div>
                        `;
                    }
                }
            }

            grid.innerHTML += `
                <div class="${cardClass}">
                    <div class="flex justify-between items-start">
                        <span class="${dateClass}">${dayOfMonth}</span>
                        ${isToday ? '<span class="text-[9px] font-bold bg-indigo-600 text-white px-1.5 rounded-full">TODAY</span>' : ''}
                    </div>
                    ${contentHtml}
                </div>
            `;

            // Next day
            loopDate.setDate(loopDate.getDate() + 1);
        }
    },

    renderConfigPage: () => {
        ui.elements.contentArea.innerHTML = `
            <div class="max-w-4xl mx-auto animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Configuration</h2>
                    <button class="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition">Add User</button>
                </div>
                
                <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-100">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">admin@kpi.com</td>
                                <td class="px-6 py-4 whitespace-nowrap"><span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Admin</span></td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">Active</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit</a>
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