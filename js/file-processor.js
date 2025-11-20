import { dbService } from './db-service.js';
import { ui } from './ui.js';

export const fileProcessor = {

    // Main Entry
    processFiles: async (files, reportType, password) => {
        let processedCount = 0;
        const errors = [];
        const summary = { success: 0, fail: 0, details: [] };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            ui.updateLoadingText(`Processing ${i + 1}/${files.length}: ${file.name}`);
            
            try {
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'zip') {
                    await fileProcessor.handleZip(file, reportType, password);
                } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                    await fileProcessor.handleExcel(file, reportType);
                }
                processedCount++;
                summary.success++;
                summary.details.push({ name: file.name, status: 'Success' });
            } catch (e) {
                console.error(e);
                errors.push(`${file.name}: ${e.message}`);
                summary.fail++;
                summary.details.push({ name: file.name, status: 'Fail', reason: e.message });
            }
        }

        let msg = `Completed: ${summary.success}, Failed: ${summary.fail}`;
        if (errors.length > 0) msg += `\nErrors:\n${errors.join('\n')}`;
        alert(msg);
    },

    handleZip: async (file, reportType, password) => {
        const zip = new JSZip();
        try {
            const content = await zip.loadAsync(file);
            
            for (let filename in content.files) {
                const zipEntry = content.files[filename];
                if (!zipEntry.dir && filename.match(/\.(xls|xlsx|csv)$/i)) {
                    
                    if (reportType === 'storeRecap' && !filename.toLowerCase().startsWith('storerecap4340')) continue;
                    if (reportType === 'saleByDept' && !filename.toLowerCase().startsWith('salebydeptuk4340')) continue;

                    const fileData = await zipEntry.async("arraybuffer");
                    const extractedFile = new File([fileData], filename, {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    });
                    await fileProcessor.handleExcel(extractedFile, reportType);
                }
            }
        } catch (e) {
            throw new Error("Failed to process ZIP: " + e.message);
        }
    },

    handleExcel: async (file, reportType) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    if (reportType === 'daily') {
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        await fileProcessor.processDailyKPI(rawData, file.name);
                    } 
                    else if (reportType === 'weekly') {
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        await fileProcessor.processWeeklyKPI(rawData, file.name);
                    } 
                    else if (reportType === 'storeRecap') {
                        const records = await fileProcessor.parseStoreRecapSheet(worksheet, firstSheetName, file.name);
                        await dbService.saveStoreRecapToFirestore(records);
                    } 
                    else if (reportType === 'saleByDept') {
                        const records = await fileProcessor.parseSaleByDeptSheet(worksheet, firstSheetName, file.name);
                        await dbService.saveSaleByDeptToFirestore(records);
                    }
                    else if (reportType === 'storeMaster') {
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        await fileProcessor.processMasterfile(rawData);
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

    // --- 1. Daily KPI (Updated Indices) ---
    processDailyKPI: async (rows, filename) => {
        const headerIndex = fileProcessor.findHeaderRow(rows, 'Key KPI');
        if (headerIndex === -1) throw new Error("Invalid Daily KPI format");

        // Extract Metadata
        const storeCode = String(rows[1]?.[1] || '0000').trim();
        const rawDate = rows[2]?.[1];
        const dateStr = fileProcessor.formatDate(rawDate);

        // --- UPDATE INDICES HERE ---
        const idxName = 4;  // Key KPI Name
        const idxBB = 3;    // BB
        const idxTesp = 8;  // TESP Actual
        const idxNewMem = 11; // New Member
        const idxTx = 13;   // Tx (QTY)

        const data = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[idxName]) continue;
            
            const tesp = dbService.cleanNumber(row[idxTesp]);
            const tx = dbService.cleanNumber(row[idxTx]);
            
            // Calculate ATV = TESP / Tx
            let atv = 0;
            if (tx > 0) {
                atv = parseFloat((tesp / tx).toFixed(2));
            }

            const bb = dbService.cleanNumber(row[idxBB]);
            const newMember = dbService.cleanNumber(row[idxNewMem]);

            data.push({
                kpiName: row[idxName],
                tesp: tesp,
                tx: tx,
                atv: atv,
                bb: bb,
                newMember: newMember,
                
                // Map 'tx' to 'qty' for backward compatibility with Report Calendar
                qty: tx 
            });
        }
        await dbService.saveDailyKPI(storeCode, dateStr, data);
    },

    // --- 2. Weekly KPI ---
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

    // --- 3. Store Recap ---
    parseStoreRecapSheet: async (worksheet, sheetName, fileName) => {
        const getVal = (cellAddr) => worksheet[cellAddr] ? worksheet[cellAddr].v : undefined;
        const storeCode = fileProcessor.detectStoreCodeFromSheet(worksheet, '4340');

        let saleDateText = "";
        for (let c = 6; c <= 20; c++) {
            const cell = XLSX.utils.encode_cell({r: 2, c: c});
            const val = getVal(cell);
            if (val && String(val).includes('-')) {
                saleDateText = val;
                break;
            }
        }

        if (!saleDateText) throw new Error("Sale Date not found in row 3");
        const [d1, d2] = saleDateText.split('-').map(s => s.trim());
        if (d1 !== d2) throw new Error(`กรุณาอัพโหลดทีละวัน (${saleDateText})`);

        const dateParts = d1.split('/');
        const saleDateKeyDmy = `${dateParts[0]}${dateParts[1]}${dateParts[2]}`;
        const saleDateKeyYmd = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;

        const findValueByLabel = (label) => {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let r = range.s.r; r <= range.e.r; r++) {
                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cell = worksheet[XLSX.utils.encode_cell({r, c})];
                    if (cell && String(cell.v).trim() === label) {
                        for (let offset = 1; offset <= 15; offset++) {
                            const valCell = worksheet[XLSX.utils.encode_cell({r, c: c + offset})];
                            if (valCell && typeof valCell.v === 'number') return valCell.v;
                            if (valCell && typeof valCell.v === 'string' && valCell.v.match(/^[0-9,.]+$/)) {
                                return dbService.cleanNumber(valCell.v);
                            }
                        }
                    }
                }
            }
            return 0;
        };

        const tesp = findValueByLabel('TESP');
        const tespAfterCoupon = findValueByLabel('TESP AFTER COUPON');
        
        let customer = 0;
        const custCell = worksheet['AT17'] || worksheet['AU17'] || worksheet['AV17'];
        if (custCell) customer = dbService.cleanNumber(custCell.v);

        let atv = 0;
        if (customer > 0) {
            atv = parseFloat((tespAfterCoupon / customer).toFixed(2));
        }

        return [{
            storeCode,
            saleDateText,
            saleDateKeyDmy,
            saleDateKeyYmd,
            tesp,
            tespAfterCoupon,
            customer,
            atv,
            source: { fileName, sheetName }
        }];
    },

    // --- 4. Sale By Dept ---
    parseSaleByDeptSheet: async (worksheet, sheetName, fileName) => {
        const storeCode = fileProcessor.detectStoreCodeFromSheet(worksheet, '4340');
        
        let saleDateText = "";
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let r = 0; r <= 5; r++) { 
            for (let c = 0; c <= 20; c++) {
                const cell = worksheet[XLSX.utils.encode_cell({r, c})];
                if (cell && String(cell.v).includes('-') && String(cell.v).includes('/')) {
                    saleDateText = cell.v;
                    break;
                }
            }
            if (saleDateText) break;
        }
        if (!saleDateText) throw new Error("Sale Date not found");

        const [d1, d2] = saleDateText.split('-').map(s => s.trim());
        if (d1 !== d2) throw new Error(`กรุณาอัพโหลดทีละวัน (${saleDateText})`);

        const dateParts = d1.split('/');
        const saleDateKeyDmy = `${dateParts[0]}${dateParts[1]}${dateParts[2]}`;
        const saleDateKeyYmd = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerRowIdx = -1;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.some(cell => String(cell).toLowerCase().includes('itemcode') || String(cell).toLowerCase().includes('dept'))) {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) throw new Error("Header row not found in SaleByDept");

        const header = jsonData[headerRowIdx].map(h => String(h).toLowerCase());
        const idxDepName = header.findIndex(h => h.includes('description') || h.includes('dep name')); 
        const idxDepCode = header.findIndex(h => h.includes('dept') || h.includes('itemcode')); 
        const idxBrand = header.findIndex(h => h.includes('brand'));
        const idxTotal = header.findIndex(h => h.includes('net sales amt') || h.includes('total'));
        const idxUnit = header.findIndex(h => h.includes('net qty') || h.includes('unit'));

        const departments = [];
        for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const deptCodeStr = row[idxDepCode] || "Unknown";
            if (!deptCodeStr) continue;

            const brandStr = String(row[idxBrand] || "").toUpperCase();
            const salesVal = dbService.cleanNumber(row[idxTotal]);
            const unitVal = dbService.cleanNumber(row[idxUnit]);

            let brandType = 'propBrand';
            if (brandStr.includes('BOOTS')) brandType = 'bootsBrand';
            else if (brandStr.includes('EXCLUSIVE')) brandType = 'exclusiveBrand'; 
            
            let deptEntry = departments.find(d => d.depCode === deptCodeStr);
            if (!deptEntry) {
                deptEntry = {
                    depCode: deptCodeStr,
                    depName: row[idxDepName] || `Dept ${deptCodeStr}`,
                    bootsBrand: 0,
                    exclusiveBrand: 0,
                    propBrand: 0,
                    totalInDept: 0,
                    unit: 0,
                    tesp: 0,
                    tisp: 0
                };
                departments.push(deptEntry);
            }

            if (brandType === 'bootsBrand') deptEntry.bootsBrand += salesVal;
            else if (brandType === 'exclusiveBrand') deptEntry.exclusiveBrand += salesVal;
            else deptEntry.propBrand += salesVal;

            deptEntry.totalInDept += salesVal;
            deptEntry.tesp += salesVal; 
            deptEntry.unit += unitVal;
        }

        return [{
            storeCode,
            saleDateKeyDmy,
            saleDateKeyYmd,
            departments,
            reportType: 'saleByDept',
            source: { fileName, sheetName }
        }];
    },

    // --- 5. Masterfile ---
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

    // --- Helpers ---
    findHeaderRow: (rows, keyword) => {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            if (rows[i] && (rows[i].includes(keyword) || rows[i].some(c => String(c).includes(keyword)))) {
                return i;
            }
        }
        return -1;
    },

    detectStoreCodeFromSheet: (worksheet, defaultCode) => {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        if (range.e.r >= 1) {
            for (let c = 4; c <= 47; c++) { 
                const cell = worksheet[XLSX.utils.encode_cell({r: 1, c})];
                if (cell && typeof cell.v === 'string') {
                    const match = cell.v.match(/^(\d{4})\s*:/);
                    if (match) return match[1];
                }
            }
        }
        for (let r = 0; r <= 4; r++) {
            for (let c = 0; c <= 29; c++) {
                const cell = worksheet[XLSX.utils.encode_cell({r, c})];
                if (cell && typeof cell.v === 'string') {
                    const match = cell.v.match(/^(\d{4})\s*:/);
                    if (match) return match[1];
                }
            }
        }
        return defaultCode;
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