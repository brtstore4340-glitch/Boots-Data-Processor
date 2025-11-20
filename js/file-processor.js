import { dbService } from './db-service.js';
import { ui } from './ui.js';

export const fileProcessor = {

    processFiles: async (files) => {
        let processedCount = 0;
        const errors = [];

        ui.showLoading(true, `Preparing to process ${files.length} files...`);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                ui.updateLoadingText(`Processing ${i + 1}/${files.length}: ${file.name}`);
                const ext = file.name.split('.').pop().toLowerCase();

                if (ext === 'zip') {
                    await fileProcessor.handleZip(file);
                } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                    await fileProcessor.handleExcel(file);
                }
                processedCount++;
            } catch (e) {
                console.error(e);
                errors.push(`${file.name}: ${e.message}`);
            }
        }
        
        ui.showLoading(false);
        
        if (errors.length > 0) {
            alert(`Processing complete with some errors:\n${errors.join('\n')}`);
        } else {
            alert("All files processed successfully!");
        }
    },

    handleZip: async (file) => {
        const zip = new JSZip();
        try {
            const content = await zip.loadAsync(file);
            
            for (let filename in content.files) {
                const zipEntry = content.files[filename];
                if (!zipEntry.dir && filename.match(/\.(xls|xlsx|csv)$/i)) {
                    const fileData = await zipEntry.async("arraybuffer");
                    const extractedFile = new File([fileData], filename, {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    });
                    await fileProcessor.handleExcel(extractedFile);
                }
            }
        } catch (e) {
            throw new Error("Failed to process ZIP. Ensure it is a standard zip format.");
        }
    },

    handleExcel: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    const filename = file.name.toLowerCase();

                    if (filename.includes('daily sales kpi')) {
                        await fileProcessor.processDailyKPI(rawData, filename);
                    } else if (filename.includes('weekly sales kpi')) {
                        await fileProcessor.processWeeklyKPI(rawData, filename);
                    } else if (filename.includes('storerecap')) {
                        await fileProcessor.processStoreRecap(rawData, filename);
                    } else if (filename.includes('soldmovement') || filename.includes('item sale')) {
                        await fileProcessor.processItemSales(rawData, filename);
                    } else if (filename.includes('itemmaster') || filename.includes('printonclass')) {
                        await fileProcessor.processMasterfile(rawData);
                    } else {
                        console.warn(`Skipping unknown file type: ${file.name}`);
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    processDailyKPI: async (rows, filename) => {
        const headerIndex = fileProcessor.findHeaderRow(rows, 'Key KPI');
        if (headerIndex === -1) throw new Error("Invalid Daily KPI format");

        const storeCode = String(rows[1]?.[1] || '0000').trim();
        const rawDate = rows[2]?.[1];
        const dateStr = fileProcessor.formatDate(rawDate);

        const idxKPI = 4; 
        const idxQty = 5;
        const idxTESP = 6;
        const idxNetSales = 9;

        const data = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[idxKPI]) continue;
            
            data.push({
                kpiName: row[idxKPI],
                qty: dbService.cleanNumber(row[idxQty]),
                tesp: dbService.cleanNumber(row[idxTESP]),
                netSales: dbService.cleanNumber(row[idxNetSales])
            });
        }
        await dbService.saveDailyKPI(storeCode, dateStr, data);
    },

    processWeeklyKPI: async (rows, filename) => {
        const headerIndex = fileProcessor.findHeaderRow(rows, 'KEY KPI');
        if (headerIndex === -1) throw new Error("Invalid Weekly KPI format");

        const storeRaw = String(rows[2]?.[1] || '');
        const storeCode = storeRaw.split(' ')[0] || '0000';
        
        const weekRaw = String(rows[3]?.[1] || '');
        const yearStr = weekRaw.split(' ')[0] || new Date().getFullYear();
        const weekStr = weekRaw.includes('Week') ? weekRaw.split('Week')[1].trim() : weekRaw;

        const data = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[4]) continue;

            data.push({
                kpiName: row[4],
                qty: dbService.cleanNumber(row[5]),
                tesp: dbService.cleanNumber(row[6]),
                netSales: dbService.cleanNumber(row[9])
            });
        }
        await dbService.saveWeeklyKPI(storeCode, weekStr, String(yearStr), data);
    },

    processStoreRecap: async (rows, filename) => {
        const findValue = (keyword) => {
            for (let r = 0; r < rows.length; r++) {
                if (!rows[r]) continue;
                for (let c = 0; c < rows[r].length; c++) {
                    if (String(rows[r][c]).includes(keyword)) {
                        for (let k = c + 1; k < rows[r].length; k++) {
                            if (rows[r][k] && !isNaN(parseFloat(String(rows[r][k]).replace(/,/g,'')))) {
                                return dbService.cleanNumber(rows[r][k]);
                            }
                        }
                    }
                }
            }
            return 0;
        };

        const storeRow = rows.find(r => r && String(r).includes('Store'));
        const storeCode = storeRow ? String(storeRow[2] || storeRow[1]).split(':')[0].trim() : '4340';

        const dateRow = rows.find(r => r && String(r).includes('Sale Date'));
        let dateStr = new Date().toISOString().split('T')[0];
        if (dateRow) {
            const dateTxt = String(dateRow[1] || dateRow[2] || '').split('-')[0].trim();
            dateStr = fileProcessor.formatDate(dateTxt);
        }

        const recapData = {
            grossPlus: findValue('GROSS  +'),
            netCash: findValue('NET CASH'),
            shortOver: findValue('SHORT+/OVER -'),
            tenderTotal: findValue('TENDER TOTAL :')
        };

        await dbService.saveStoreRecap(storeCode, dateStr, recapData);
    },

    processItemSales: async (rows, filename) => {
        const headerIndex = fileProcessor.findHeaderRow(rows, 'Itemcode');
        if (headerIndex === -1) throw new Error("Invalid Item Sales format");

        const storeCode = filename.match(/(\d{4})/)?.[0] || '4340';
        const dateRow = rows.find(r => r && String(r).includes('Sale Date'));
        let dateStr = new Date().toISOString().split('T')[0];
        if(dateRow) {
             const parts = String(dateRow[1] || dateRow[4] || '').split('-')[0].trim();
             dateStr = fileProcessor.formatDate(parts);
        }

        const header = rows[headerIndex];
        const idxCode = header.indexOf('Itemcode');
        const idxDesc = header.indexOf('Description');
        const idxQty = header.indexOf('Net Qty');
        const idxAmt = header.indexOf('Net Sales Amt.');

        const salesData = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[idxCode]) continue;

            salesData.push({
                'Itemcode': row[idxCode],
                'Description': row[idxDesc],
                'Net Qty': row[idxQty],
                'Net Sales Amt.': row[idxAmt]
            });
        }
        await dbService.saveItemSales(storeCode, dateStr, salesData);
    },

    processMasterfile: async (rows) => {
        const headerIndex = fileProcessor.findHeaderRow(rows, 'Itemcode');
        if (headerIndex === -1) throw new Error("Invalid Masterfile format");

        const header = rows[headerIndex];
        const idxCode = header.indexOf('Itemcode');
        const idxDesc = header.indexOf('Description');
        const idxPrice = header.indexOf('Reg. Price');
        const idxBrand = header.indexOf('Brand');
        const idxDept = header.indexOf('Dept');

        const products = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[idxCode]) continue;

            products.push({
                'Itemcode': row[idxCode],
                'Description': row[idxDesc],
                'Reg. Price': row[idxPrice],
                'Brand': row[idxBrand],
                'Dept': row[idxDept]
            });
        }
        await dbService.saveMasterfile(products);
    },

    findHeaderRow: (rows, keyword) => {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            if (rows[i] && (rows[i].includes(keyword) || rows[i].some(c => String(c).includes(keyword)))) {
                return i;
            }
        }
        return -1;
    },

    formatDate: (val) => {
        if (!val) return new Date().toISOString().split('T')[0];
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        const parts = String(val).split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return new Date().toISOString().split('T')[0];
    }
};