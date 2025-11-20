import { dbService } from './db-service.js';
import { ui } from './ui.js';

export const fileProcessor = {
    process: async (files, type) => {
        ui.loading(true, `Processing ${files.length} files...`);
        let success = 0, fail = 0, errs = [];
        
        for(const f of files) {
            try {
                const ext = f.name.split('.').pop().toLowerCase();
                if(ext === 'zip') {
                    const zip = new JSZip();
                    const content = await zip.loadAsync(f);
                    for(let name in content.files) {
                        if(!content.files[name].dir && name.match(/\.(xls|xlsx|csv)$/i)) {
                            if(type==='storeRecap' && !name.toLowerCase().startsWith('storerecap4340')) continue;
                            if(type==='saleByDept' && !name.toLowerCase().startsWith('salebydeptuk4340')) continue;
                            
                            const data = await content.files[name].async("arraybuffer");
                            await fileProcessor.excel(new File([data], name), type);
                        }
                    }
                } else {
                    await fileProcessor.excel(f, type);
                }
                success++;
            } catch(e) {
                fail++;
                errs.push(f.name + ": " + e.message);
                console.error(e);
            }
        }
        ui.loading(false);
        alert(`Completed: ${success}, Failed: ${fail}\n${errs.join('\n')}`);
        if(success > 0 && type !== 'storeMaster') ui.nav('report');
    },

    excel: async (file, type) => {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        if(type==='daily') await fileProcessor.parseDaily(ws);
        else if(type==='weekly') await fileProcessor.parseWeekly(ws);
        else if(type==='storeRecap') {
            const r = await fileProcessor.parseRecap(ws);
            await dbService.saveStoreRecap(r);
        }
        else if(type==='saleByDept') {
            const r = await fileProcessor.parseDept(ws);
            await dbService.saveSaleByDept(r);
        }
        else if(type==='storeMaster') {
            const json = XLSX.utils.sheet_to_json(ws);
            await dbService.saveMaster(json);
        }
    },

    parseDaily: async (ws) => {
        const rows = XLSX.utils.sheet_to_json(ws, {header:1});
        const hIdx = rows.findIndex(r => r && r[4] === 'Key KPI');
        if(hIdx < 0) throw new Error("Invalid Header");
        
        const store = String(rows[1]?.[1] || '0000').trim();
        const date = fileProcessor.fmtDate(rows[2]?.[1]);
        const data = [];
        
        for(let i=hIdx+1; i<rows.length; i++) {
            const r = rows[i];
            if(!r || !r[4]) continue;
            data.push({
                kpiName: r[4],
                bb: dbService.cleanNum(r[3]),
                tesp: dbService.cleanNum(r[8]),
                newMember: dbService.cleanNum(r[11]),
                tx: dbService.cleanNum(r[13])
            });
        }
        await dbService.saveDaily(store, date, data);
    },

    parseWeekly: async (ws) => { /* Simplified */ },

    parseRecap: async (ws) => {
        let store = '4340'; 
        const range = XLSX.utils.decode_range(ws['!ref']);
        // Scan row 2
        for(let c=4; c<=47; c++) {
            const cell = ws[XLSX.utils.encode_cell({r:1,c})];
            if(cell && String(cell.v).includes(':')) { store=String(cell.v).split(':')[0].trim(); break; }
        }
        // Scan date
        let dateTxt = "";
        for(let c=6; c<=20; c++) {
            const cell = ws[XLSX.utils.encode_cell({r:2,c})];
            if(cell && String(cell.v).includes('-')) { dateTxt=cell.v; break; }
        }
        if(!dateTxt) throw new Error("No Date");
        const [d1] = dateTxt.split('-').map(s=>s.trim());
        const parts = d1.split('/');
        const ymd = parts[2]+parts[1]+parts[0];

        const find = (k) => {
            for(let r=range.s.r; r<=range.e.r; r++) {
                for(let c=range.s.c; c<=range.e.c; c++) {
                    const cell = ws[XLSX.utils.encode_cell({r,c})];
                    if(cell && String(cell.v).trim() === k) {
                        for(let i=1; i<15; i++) {
                            const v = ws[XLSX.utils.encode_cell({r,c:c+i})];
                            if(v && !isNaN(parseFloat(String(v.v).replace(/,/g,'')))) return dbService.cleanNum(v.v);
                        }
                    }
                }
            }
            return 0;
        };

        const tesp = find('TESP');
        const tespAfter = find('TESP AFTER COUPON');
        const custCell = ws['AT17'] || ws['AU17'];
        const cust = custCell ? dbService.cleanNum(custCell.v) : 0;
        const atv = cust > 0 ? tespAfter/cust : 0;

        return [{ storeCode: store, saleDateKeyYmd: ymd, tesp, tespAfterCoupon: tespAfter, customer: cust, atv }];
    },

    parseDept: async (ws) => {
        let dateTxt = "";
        for(let r=0; r<5; r++) {
            for(let c=0; c<20; c++) {
                const cell = ws[XLSX.utils.encode_cell({r,c})];
                if(cell && String(cell.v).includes('/') && String(cell.v).includes('-')) { dateTxt=cell.v; break; }
            }
        }
        if(!dateTxt) throw new Error("No Date");
        const parts = dateTxt.split('-')[0].trim().split('/');
        const ymd = parts[2]+parts[1]+parts[0];
        return [{ storeCode: '4340', saleDateKeyYmd: ymd, departments: [] }];
    },

    fmtDate: (v) => {
        if(!v) return new Date().toISOString().split('T')[0];
        const d = new Date(v);
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }
};