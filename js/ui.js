import { authService } from './auth.js';
import { fileProcessor } from './file-processor.js';
import { dbService } from './db-service.js';

export const ui = {
    state: { viewDate: new Date('2025-11-01'), reportType: 'daily', uploadMode: 'single' },
    
    init: () => {
        // Bind navigation clicks
        document.getElementById('nav-upload').onclick = () => ui.nav('upload');
        document.getElementById('nav-report').onclick = () => ui.nav('report');
        document.getElementById('logout-btn').onclick = () => authService.logout();
    },

    nav: (page) => {
        const area = document.getElementById('content-area');
        area.innerHTML = '';
        
        ['upload', 'report'].forEach(p => {
            const btn = document.getElementById('nav-' + p);
            if(p === page) { btn.classList.add('bg-blue-600','text-white'); btn.classList.remove('text-slate-500'); }
            else { btn.classList.remove('bg-blue-600','text-white'); btn.classList.add('text-slate-500'); }
        });

        if(page === 'upload') ui.renderUpload(area);
        if(page === 'report') ui.renderReport(area);
    },

    renderUpload: (area) => {
        const { reportType, uploadMode } = ui.state;
        const btnCls = (t) => `w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${reportType===t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`;

        area.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto animate-fade">
            <div class="w-full md:w-1/4 flex flex-col gap-1">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">Report Type</h3>
                <button class="${btnCls('daily')}" id="btn-daily">Daily Sale KPI</button>
                <button class="${btnCls('weekly')}" id="btn-weekly">Weekly Sale KPI</button>
                <button class="${btnCls('storeRecap')}" id="btn-recap">Store Recap</button>
                <button class="${btnCls('saleByDept')}" id="btn-dept">Sale By Dept</button>
                <div class="h-px bg-slate-200 my-2"></div>
                <button class="${btnCls('storeMaster')}" id="btn-master">Store Master</button>
            </div>
            <div class="w-full md:w-3/4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                <h2 class="text-2xl font-bold text-slate-800 mb-6">Upload ${reportType.replace(/([A-Z])/g, ' $1')}</h2>
                
                ${reportType !== 'storeMaster' ? `
                <div class="flex bg-slate-100 p-1 rounded-lg w-fit mb-6">
                    <button id="mode-single" class="px-3 py-1 rounded text-xs font-bold transition ${uploadMode==='single'?'bg-white shadow text-blue-600':'text-slate-500'}">Single</button>
                    <button id="mode-folder" class="px-3 py-1 rounded text-xs font-bold transition ${uploadMode==='folder'?'bg-white shadow text-blue-600':'text-slate-500'}">Folder</button>
                </div>` : ''}
                
                <div id="drop-zone" class="border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition">
                    <span class="text-sm font-medium">Click to select files</span>
                </div>
                <input type="file" id="fIn" class="hidden" ${uploadMode==='folder'?'webkitdirectory directory multiple':''} multiple>
            </div>
        </div>`;

        // Bind events
        document.getElementById('btn-daily').onclick = () => ui.setType('daily');
        document.getElementById('btn-weekly').onclick = () => ui.setType('weekly');
        document.getElementById('btn-recap').onclick = () => ui.setType('storeRecap');
        document.getElementById('btn-dept').onclick = () => ui.setType('saleByDept');
        document.getElementById('btn-master').onclick = () => ui.setType('storeMaster');
        
        if(reportType !== 'storeMaster') {
            document.getElementById('mode-single').onclick = () => ui.setMode('single');
            document.getElementById('mode-folder').onclick = () => ui.setMode('folder');
        }

        const fIn = document.getElementById('fIn');
        document.getElementById('drop-zone').onclick = () => fIn.click();
        fIn.onchange = () => fileProcessor.process(fIn.files, reportType);
    },

    setType: (t) => { ui.state.reportType = t; ui.nav('upload'); },
    setMode: (m) => { ui.state.uploadMode = m; ui.nav('upload'); },

    renderReport: async (area) => {
        const d = ui.state.viewDate;
        const y = d.getFullYear();
        const m = d.getMonth();
        const startStr = `${y}-${String(m+1).padStart(2,'0')}-01`;
        const lastDay = new Date(y, m+1, 0).getDate();
        const endStr = `${y}-${String(m+1).padStart(2,'0')}-${lastDay}`;

        area.innerHTML = `
        <div class="max-w-6xl mx-auto animate-fade">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-slate-800">${d.toLocaleString('default',{month:'long'})} ${y}</h2>
                <div class="flex gap-2">
                    <button id="prev-month" class="px-3 py-1 border rounded bg-white hover:bg-slate-50 text-sm">Prev</button>
                    <button id="next-month" class="px-3 py-1 border rounded bg-white hover:bg-slate-50 text-sm">Next</button>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 border-b"><tr><th class="p-4">Date</th><th class="p-4 text-right">TESP</th><th class="p-4 text-right">Tx</th><th class="p-4 text-right">ATV</th><th class="p-4 text-right">BB</th><th class="p-4 text-right">NewMem</th></tr></thead>
                    <tbody id="tb"><tr><td colspan="6" class="p-10 text-center text-slate-400">Loading...</td></tr></tbody>
                </table>
            </div>
        </div>`;

        document.getElementById('prev-month').onclick = () => ui.chgMonth(-1);
        document.getElementById('next-month').onclick = () => ui.chgMonth(1);

        const res = await dbService.getReport('4340', startStr, endStr);
        if(!res.ok) { document.getElementById('tb').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">${res.msg}</td></tr>`; return; }

        let h = '';
        for(let i=1; i<=lastDay; i++) {
            const dayStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const r = res.data[dayStr];
            if(r) {
                h += `<tr class="border-b hover:bg-slate-50"><td class="p-4 font-medium">${i}</td><td class="p-4 text-right font-bold">${r.tesp.toLocaleString()}</td><td class="p-4 text-right">${r.tx}</td><td class="p-4 text-right text-blue-600">${r.atv.toFixed(0)}</td><td class="p-4 text-right">${r.bb.toLocaleString()}</td><td class="p-4 text-right text-green-600">${r.newMem}</td></tr>`;
            } else {
                h += `<tr class="border-b hover:bg-slate-50"><td class="p-4 text-slate-400">${i}</td><td colspan="5" class="p-4 text-center text-xs text-slate-300">No Data</td></tr>`;
            }
        }
        document.getElementById('tb').innerHTML = h;
    },

    chgMonth: (o) => { ui.state.viewDate.setMonth(ui.state.viewDate.getMonth() + o); ui.nav('report'); },
    loading: (s,t) => {
        const el = document.getElementById('loading-screen');
        if(s) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }
};