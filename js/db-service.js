import { db } from './firebase-config.js';
import { 
    collection, doc, writeBatch, serverTimestamp, setDoc, getDoc, query, where, getDocs, orderBy 
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

    saveMasterfile: async (jsonData) => {
        const operations = jsonData.map(item => {
            const itemCode = String(item['Itemcode']).split('.')[0];
            if (!itemCode || itemCode === 'undefined') return null;

            const docRef = doc(db, 'products', itemCode);
            return {
                type: 'set',
                ref: docRef,
                data: {
                    itemCode: itemCode,
                    description: item['Description'] || '',
                    brand: item['Brand'] || 'Unknown',
                    price: dbService.cleanNumber(item['Reg. Price']),
                    department: item['Dept'] || '',
                    class: item['Class'] || '',
                    updatedAt: serverTimestamp()
                },
                options: { merge: true }
            };
        }).filter(op => op !== null);

        await dbService.commitBatch(operations);
        return operations.length;
    },

    saveDailyKPI: async (storeCode, dateStr, kpiData) => {
        const docId = `${dateStr}_${storeCode}`;
        const docRef = doc(db, 'kpi_daily', docId);

        await setDoc(docRef, {
            storeCode: storeCode,
            date: dateStr,
            uploadDate: serverTimestamp(),
            metrics: kpiData 
        });
    },

    saveWeeklyKPI: async (storeCode, weekStr, yearStr, kpiData) => {
        const docId = `${yearStr}_${weekStr}_${storeCode}`;
        const docRef = doc(db, 'kpi_weekly', docId);

        await setDoc(docRef, {
            storeCode: storeCode,
            week: weekStr,
            year: yearStr,
            uploadDate: serverTimestamp(),
            metrics: kpiData
        });
    },

    saveStoreRecap: async (storeCode, dateStr, recapData) => {
        const docId = `${dateStr}_${storeCode}`;
        const docRef = doc(db, 'store_recap', docId);

        await setDoc(docRef, {
            storeCode: storeCode,
            date: dateStr,
            ...recapData,
            timestamp: serverTimestamp()
        }, { merge: true });
    },

    saveItemSales: async (storeCode, dateStr, salesData) => {
        const operations = salesData.map(row => {
            const itemCode = String(row['Itemcode']).split('.')[0];
            if (!itemCode) return null;

            const docId = `${dateStr}_${storeCode}_${itemCode}`;
            const docRef = doc(db, 'item_sales', docId);

            return {
                type: 'set',
                ref: docRef,
                data: {
                    storeCode: storeCode,
                    date: dateStr,
                    itemCode: itemCode,
                    description: row['Description'],
                    netQty: dbService.cleanNumber(row['Net Qty']),
                    netSalesAmt: dbService.cleanNumber(row['Net Sales Amt.']),
                    brand: row['Brand'] || 'N/A' 
                },
                options: { merge: true }
            };
        }).filter(op => op !== null);

        await dbService.commitBatch(operations);
    },

    getUserRole: async (uid) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            return userDoc.exists() ? userDoc.data().role : 'Store';
        } catch (e) {
            console.error("Error fetching role:", e);
            return 'Store';
        }
    },

    createUser: async (uid, email, role) => {
        await setDoc(doc(db, 'users', uid), {
            email: email,
            role: role,
            createdAt: serverTimestamp()
        });
    },

    getDailyKPIReport: async (storeCode, startDate, endDate) => {
        try {
            const q = query(
                collection(db, 'kpi_daily'),
                where('storeCode', '==', storeCode),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            
            const snapshot = await getDocs(q);
            const data = {};
            
            snapshot.forEach(doc => {
                const kpi = doc.data();
                let totalTESP = 0;
                let totalQty = 0;
                
                if (kpi.metrics && Array.isArray(kpi.metrics)) {
                    kpi.metrics.forEach(m => {
                        totalTESP += (m.tesp || 0);
                        totalQty += (m.qty || 0);
                    });
                }
                
                data[kpi.date] = {
                    tesp: totalTESP,
                    tx: totalQty,
                    atv: totalQty > 0 ? (totalTESP / totalQty) : 0
                };
            });
            
            return { success: true, data: data };
        } catch (e) {
            // Catch Index Error Specifically
            if (e.code === 'failed-precondition') {
                console.error("MISSING INDEX:", e.message);
                return { success: false, error: 'missing_index', message: e.message };
            }
            console.error("Error fetching KPI report:", e);
            return { success: false, error: 'unknown', message: e.message };
        }
    }
};