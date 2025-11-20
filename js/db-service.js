import { db } from './firebase-config.js';
import { 
    collection, doc, writeBatch, serverTimestamp, setDoc, getDoc, query, where, getDocs 
} from "firebase/firestore";

export const dbService = {
    
    cleanNumber: (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    },

    commitBatch: async (operations) => {
        const BATCH_SIZE = 450; 
        const chunks = [];
        for (let i = 0; i < operations.length; i += BATCH_SIZE) {
            chunks.push(operations.slice(i, i + BATCH_SIZE));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(op => {
                if (op.type === 'set') batch.set(op.ref, op.data, op.options);
                else if (op.type === 'update') batch.update(op.ref, op.data);
                else if (op.type === 'delete') batch.delete(op.ref);
            });
            await batch.commit();
        }
        console.log(`Committed ${operations.length} operations.`);
    },

    // ฟังก์ชันเดิม (Daily/Weekly/Master)
    saveMasterfile: async (jsonData) => { /* ...Copy existing code... */ },
    saveDailyKPI: async (storeCode, dateStr, kpiData) => { /* ...Copy existing code... */ },
    saveWeeklyKPI: async (storeCode, weekStr, yearStr, kpiData) => { /* ...Copy existing code... */ },
    saveItemSales: async (storeCode, dateStr, salesData) => { /* ...Copy existing code... */ },

    // --- D. saveStoreRecapToFirestore ---
    saveStoreRecapToFirestore: async (records) => {
        const batch = writeBatch(db);
        
        records.forEach(record => {
            if (!record.saleDateKeyYmd || !record.storeCode) {
                throw new Error("Invalid Record: Missing Date or Store Code");
            }
            
            const docId = `${record.saleDateKeyYmd}_${record.storeCode}`;
            const docRef = doc(db, 'store_recap', docId);
            
            batch.set(docRef, {
                ...record,
                uploadDate: serverTimestamp()
            }, { merge: true });
        });

        await batch.commit();
        console.log(`Saved ${records.length} Store Recap records.`);
    },

    // --- E. saveSaleByDeptToFirestore ---
    saveSaleByDeptToFirestore: async (records) => {
        const batch = writeBatch(db);
        
        records.forEach(record => {
            // Grouping logic is already done in parser (one record per file/day)
            // But if multiple files for same day, we overwrite/merge.
            
            if (!record.saleDateKeyYmd || !record.storeCode) {
                throw new Error("Invalid Record: Missing Date or Store Code");
            }
            
            const docId = `${record.saleDateKeyYmd}_${record.storeCode}`;
            const docRef = doc(db, 'sale_by_dept', docId);
            
            batch.set(docRef, {
                ...record,
                uploadDate: serverTimestamp()
            }, { merge: true });
        });

        await batch.commit();
        console.log(`Saved ${records.length} Sale By Dept records.`);
    },
    
    getDailyKPIReport: async (storeCode, startDate, endDate) => { /* ...Copy existing code... */ },
    getUserRole: async (uid) => { /* ...Copy existing code... */ },
    createUser: async (uid, email, role) => { /* ...Copy existing code... */ }
};