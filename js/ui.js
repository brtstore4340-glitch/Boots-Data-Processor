import { authService } from './auth.js';
import { fileProcessor } from './file-processor.js';
import { dbService } from './db-service.js';

export const ui = {
    // State tracking
    state: {
        currentViewDate: new Date('2025-11-01'),
        reportType: 'daily', // daily, weekly, storeRecap, saleByDept, storeMaster
        uploadMode: 'single', // single, folder
        isPasswordManual: false // สำหรับ daily/weekly
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

    // --- A. ปรับเมนู Report Type และ B. โครง UI หน้า Import ---
    renderUploadPage: () => {
        const { reportType, uploadMode } = ui.state;

        // Helper เพื่อเช็คว่าปุ่มไหน Active
        const btnClass = (type) => `text-left px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-between ${reportType === type ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`;

        ui.elements.contentArea.innerHTML = `
            <div class="max-w-6xl mx-auto mt-6 animate-fade-in">
                <div class="flex flex-col md:flex-row gap-6">
                    
                    <!-- 1. Sidebar Menu -->
                    <div class="w-full md:w-1/4 flex flex-col gap-2">
                        <h3 class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Report Type</h3>
                        <button class="${btnClass('daily')}" onclick="ui.setReportType('daily')">
                            <span>Daily Sale KPI</span>
                            ${reportType === 'daily' ? 'Create' : ''}
                        </button>
                        <button class="${btnClass('weekly')}" onclick="ui.setReportType('weekly')">
                            <span>Weekly Sale KPI</span>
                            ${reportType === 'weekly' ? 'Create' : ''}
                        </button>
                        <button class="${btnClass('storeRecap')}" onclick="ui.setReportType('storeRecap')">
                            <span>Store Recap</span>
                            ${reportType === 'storeRecap' ? 'Create' : ''}
                        </button>
                        <button class="${btnClass('saleByDept')}" onclick="ui.setReportType('saleByDept')">
                            <span>Sale By Dept</span>
                            ${reportType === 'saleByDept' ? 'Create' : ''}
                        </button>
                        
                        <div class="h-px bg-gray-200 my-2"></div>
                        
                        <button class="${btnClass('storeMaster')}" onclick="ui.setReportType('storeMaster')">
                            <span>Store Master Data</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                        </button>
                    </div>

                    <!-- 2. Upload Form Area -->
                    <div class="w-full md:w-3/4">
                        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                            
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-bold text-gray-800">${ui.getReportTitle(reportType)}</h2>
                                
                                <!-- Toggle Upload Mode (ซ่อนถ้าเป็น Store Master) -->
                                ${reportType !== 'storeMaster' ? `
                                <div class="flex bg-gray-100 p-1 rounded-lg">
                                    <button onclick="ui.setUploadMode('single')" class="px-3 py-1 rounded-md text-sm font-medium transition ${uploadMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}">Single File</button>
                                    <button onclick="ui.setUploadMode('folder')" class="px-3 py-1 rounded-md text-sm font-medium transition ${uploadMode === 'folder' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}">Folder</button>
                                </div>
                                ` : ''}
                            </div>

                            <!-- Dynamic Content Based on Report Type -->
                            <div id="upload-form-container" class="space-y-6">
                                ${ui.renderFormContent(reportType, uploadMode)}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        `;

        ui.attachFormListeners();
    },

    setReportType: (type) => {
        ui.state.reportType = type;
        ui.state.uploadMode = 'single'; // Reset mode when switching
        ui.renderUploadPage();
    },

    setUploadMode: (mode) => {
        ui.state.uploadMode = mode;
        ui.renderUploadPage();
    },

    getReportTitle: (type) => {
        const titles = {
            'daily': 'Daily Sales KPI Upload',
            'weekly': 'Weekly Sales KPI Upload',
            'storeRecap': 'Store Recap Upload',
            'saleByDept': 'Sale By Dept (UK4340)',
            'storeMaster': 'Store Master Data'
        };
        return titles[type] || 'Upload';
    },

    renderFormContent: (type, mode) => {
        let fileInputHtml = '';
        let passwordHtml = '';
        let buttonHtml = '';
        let hintHtml = '';

        // 1. File Inputs Config
        if (type === 'daily' || type === 'weekly') {
            const id = type === 'daily' ? 'daily-file' : 'weekly-file';
            if (mode === 'single') {
                fileInputHtml = `<input type="file" id="${id}" accept=".xls,.xlsx,.csv,.zip" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>`;
            } else {
                fileInputHtml = `<input type="file" id="${id}-folder" webkitdirectory directory multiple class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>`;
            }
            // Password for Daily/Weekly
            passwordHtml = `
                <div class="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="manual-password-check" class="rounded text-blue-600">
                    <label for="manual-password-check" class="text-sm text-gray-600">Zip Password Protected</label>
                </div>
                <div id="password-input-area" class="hidden">
                    <input type="text" id="zip-password" placeholder="Enter Zip Password" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            `;
        } 
        else if (type === 'storeRecap') {
            if (mode === 'single') {
                fileInputHtml = `<input type="file" id="store-recap-file" accept=".zip,.xlsx,.xls" class="block w-full..."/>`;
            } else {
                fileInputHtml = `<input type="file" id="store-recap-folder" webkitdirectory directory multiple class="block w-full..."/>`;
                hintHtml = `<p class="text-xs text-gray-400 mt-2">Auto-filter files starting with "storerecap4340"</p>`;
            }
        } 
        else if (type === 'saleByDept') {
            if (mode === 'single') {
                fileInputHtml = `<input type="file" id="sale-by-dept-file" accept=".zip,.xlsx,.xls" class="block w-full..."/>`;
            } else {
                fileInputHtml = `<input type="file" id="sale-by-dept-folder" webkitdirectory directory multiple class="block w-full..."/>`;
                hintHtml = `<p class="text-xs text-gray-400 mt-2">Auto-filter files starting with "salebydeptuk4340"</p>`;
            }
        } 
        else if (type === 'storeMaster') {
            fileInputHtml = `<input type="file" id="store-master-file" accept=".xls,.xlsx,.csv" class="block w-full..."/>`;
        }

        // 2. Action Button
        const btnId = type === 'storeMaster' ? 'btn-upload-master' : 'btn-process-upload';
        buttonHtml = `
            <div class="mt-6 pt-6 border-t border-gray-100">
                <button id="${btnId}" class="bg-chrome-blue text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2 w-full md:w-auto">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Process Upload
                </button>
            </div>
        `;

        // Combine
        return `
            <div class="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center md:text-left">
                ${fileInputHtml}
                ${hintHtml}
            </div>
            ${passwordHtml}
            ${buttonHtml}
        `;
    },

    attachFormListeners: () => {
        // Password Toggle for Daily/Weekly
        const passCheck = document.getElementById('manual-password-check');
        if (passCheck) {
            passCheck.onchange = (e) => {
                const area = document.getElementById('password-input-area');
                if (e.target.checked) area.classList.remove('hidden');
                else area.classList.add('hidden');
            };
        }

        // Process Button
        const btnProcess = document.getElementById('btn-process-upload');
        if (btnProcess) {
            btnProcess.onclick = ui.handleSubmitUpload;
        }

        // Master Button
        const btnMaster = document.getElementById('btn-upload-master');
        if (btnMaster) {
            btnMaster.onclick = ui.handleSubmitStoreMaster;
        }
    },

    // --- C. Logic handleSubmitUpload แยกตาม reportType ---
    handleSubmitUpload: async () => {
        const { reportType, uploadMode } = ui.state;
        let files = [];
        let password = null;

        // 1. Collect Files based on Type & Mode
        if (reportType === 'daily' || reportType === 'weekly') {
            const id = reportType === 'daily' ? 'daily-file' : 'weekly-file';
            const input = document.getElementById(uploadMode === 'single' ? id : `${id}-folder`);
            if(input.files.length === 0) return alert("Please select files first.");
            files = Array.from(input.files);

            // Check Password
            const isPassCheck = document.getElementById('manual-password-check')?.checked;
            if (isPassCheck) {
                password = document.getElementById('zip-password').value;
                if (!password) return alert("Please enter zip password.");
            } else {
                password = 'NewBI#2020'; // Default
            }
        } 
        else if (reportType === 'storeRecap') {
            const input = document.getElementById(uploadMode === 'single' ? 'store-recap-file' : 'store-recap-folder');
            if(input.files.length === 0) return alert("Please select Store Recap files.");
            
            files = Array.from(input.files);
            if (uploadMode === 'folder') {
                // Filter by name "storerecap4340"
                files = files.filter(f => f.name.toLowerCase().startsWith('storerecap4340') && f.name.match(/\.(xls|xlsx|zip)$/i));
                if(files.length === 0) return alert("No matching 'storerecap4340' files found in folder.");
            }
        }
        else if (reportType === 'saleByDept') {
            const input = document.getElementById(uploadMode === 'single' ? 'sale-by-dept-file' : 'sale-by-dept-folder');
            if(input.files.length === 0) return alert("Please select Sale By Dept files.");
            
            files = Array.from(input.files);
            if (uploadMode === 'folder') {
                // Filter by name "salebydeptuk4340"
                files = files.filter(f => f.name.toLowerCase().startsWith('salebydeptuk4340') && f.name.match(/\.(xls|xlsx|zip)$/i));
                if(files.length === 0) return alert("No matching 'salebydeptuk4340' files found in folder.");
            }
        }

        // 2. Process
        ui.showLoading(true, `Processing ${files.length} files for ${reportType}...`);
        
        try {
            await fileProcessor.processFiles(files, reportType, password);
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            ui.showLoading(false);
        }
    },

    handleSubmitStoreMaster: async () => {
        const input = document.getElementById('store-master-file');
        if (input.files.length === 0) return alert("Please select Master file.");
        
        ui.showLoading(true, "Updating Master Data...");
        try {
            await fileProcessor.processFiles(Array.from(input.files), 'storeMaster', null);
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            ui.showLoading(false);
        }
    },

    // (Existing render functions: renderReportPage, renderConfigPage, showLoading kept as is or simplified for brevity)
    renderReportPage: () => { /* ...Existing Code... */ },
    renderConfigPage: () => { /* ...Existing Code... */ },
    showLoading: (show, text) => {
        const el = ui.elements.loadingScreen;
        if(show) {
            el.classList.remove('hidden');
            el.querySelector('p').textContent = text || "Processing...";
        } else {
            el.classList.add('hidden');
        }
    }
};