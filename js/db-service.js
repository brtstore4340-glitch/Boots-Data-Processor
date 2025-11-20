import { db } from './firebase-config.js';
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDoc, query, where, getDocs } from "firebase/firestore";

export const dbService = {
    cleanNum: (v) => typeof v === 'number' ? v : parseFloat(String(v||0).replace(/,/g,'')) || 0,

    saveDaily: async (store, date, metrics) => {
        await setDoc(doc(db, 'kpi_daily', `${date}_${store}`), { storeCode: store, date, metrics }, { merge: true });
    },

    saveWeekly: async (store, week, year, metrics) => {
        await setDoc(doc(db, 'kpi_weekly', `${year}_${week}_${store}`), { storeCode: store, week, year, metrics }, { merge: true });
    },
    
    saveStoreRecap: async (records) => {
        const batch = writeBatch(db);
        records.forEach(r => {
            const ref = doc(db, 'store_recap', `${r.saleDateKeyYmd}_${r.storeCode}`);
            batch.set(ref, { ...r, uploadDate: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
    },

    saveSaleByDept: async (records) => {
        const batch = writeBatch(db);
        records.forEach(r => {
            const ref = doc(db, 'sale_by_dept', `${r.saleDateKeyYmd}_${r.storeCode}`);
            batch.set(ref, { ...r, uploadDate: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
    },

    saveMaster: async (items) => {
        const batch = writeBatch(db);
        let i = 0;
        for(const item of items) {
            const code = String(item['Itemcode']).split('.')[0];
            if(code) {
                const ref = doc(db, 'products', code);
                batch.set(ref, {
                    itemCode: code, 
                    desc: item['Description'], 
                    price: dbService.cleanNum(item['Reg. Price']), 
                    brand: item['Brand'],
                    dept: item['Dept']
                }, { merge: true });
                i++;
                if(i % 400 === 0) await batch.commit();
            }
        }
        await batch.commit();
    },

    getReport: async (store, start, end) => {
        try {
            const q = query(collection(db, 'kpi_daily'), where('storeCode','==',store), where('date','>=',start), where('date','<=',end));
            const snap = await getDocs(q);
            const data = {};
            snap.forEach(docRef => {
                const d = docRef.data();
                let tesp=0, tx=0, bb=0, newMem=0;
                if(d.metrics) d.metrics.forEach(m => {
                    tesp += (m.tesp||0); 
                    tx += (m.tx !== undefined ? m.tx : (m.qty||0));
                    bb += (m.bb||0); 
                    newMem += (m.newMember||0);
                });
                data[d.date] = { tesp, tx, bb, newMem, atv: tx > 0 ? tesp/tx : 0 };
            });
            return { ok: true, data };
        } catch(e) { return { ok: false, msg: e.message }; }
    },

    getUserRole: async (uid) => {
        try {
            const d = await getDoc(doc(db, 'users', uid));
            return d.exists() ? d.data().role : 'Store';
        } catch(e) { return 'Store'; }
    }
};