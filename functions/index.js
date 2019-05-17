const functions = require('firebase-functions');
const admin = require('firebase-admin');

const USERS = 'users';
const SAVINGS = 'savings';
const CUSTSAV = 'custsav';
const CUSTSAV_DATA = 'custsavData';

admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

exports.helloWorld = functions.https.onRequest((request, response) => {
	response.send("Hello from Firebase!");
});

exports.createUser = functions.firestore
	.document(`${USERS}/{userId}`)
	.onCreate(snap => {
		return snap.ref.set({
			prueba: "Success!!!"
		}, { merge: true });
	});

exports.updateUser = functions.firestore
	.document(`${USERS}/{userId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();

		if (previousValue[CUSTSAV] === newValue[CUSTSAV]) return null;

		let batch = db.batch();

		let custsavUserRef = db.doc(`${CUSTSAV}/${previousValue[CUSTSAV]}/${USERS}/${context.params.userId}`);
		if (!newValue[CUSTSAV]) {
			batch.delete(custsavUserRef);
			for (let i = 0; i < 12; i++) {
				const monthRef = custsavUserRef.collection(SAVINGS).doc(String(i));
				batch.delete(monthRef);
			}
			return batch.commit();
		}
		custsavUserRef = db.doc(`${CUSTSAV}/${newValue[CUSTSAV]}/${USERS}/${context.params.userId}`);
		batch.set(custsavUserRef, {
			moneyTotal: 0,
			lotteryTotal: 0,
			savingsTotal: 0,
			eventsTotal: 0,
			winTotal: 0
		})
		for (let i = 0; i < 12; i++) {
			const monthRef = custsavUserRef.collection(SAVINGS).doc(String(i));
			batch.set(monthRef, {
				money: 0,
				lottery: 0,
				savings: 0,
				events: 0,
				win: 0
			})
		}
		return batch.commit();
	});

exports.createCustsav = functions.firestore
	.document(`${CUSTSAV_DATA}/{custsavId}`)
	.onCreate((snap, context) => {
		let custsavRef = db.doc(`${CUSTSAV}/${context.params.custsavId}`);
		return custsavRef.set({
			moneyTotal: 0,
			lotteryTotal: 0,
			savingsTotal: 0,
			eventsTotal: 0,
			winTotal: 0
		})
	});

exports.updateUserMoney = functions.firestore
	.document(`${CUSTSAV}/{custsavId}/${USERS}/{userId}/${SAVINGS}/{monthId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		const monthRef = db.doc(`${CUSTSAV}/${context.params.custsavId}/${USERS}/${context.params.userId}`);
		return monthRef.get().then((ref) => {
			let data = ref.data();
			return monthRef.set({
				lotteryTotal: data.lotteryTotal - previousValue.lottery + newValue.lottery,
				savingsTotal: data.savingsTotal - previousValue.savings + newValue.savings,
				eventsTotal: data.eventsTotal - previousValue.events + newValue.events,
				winTotal: data.winTotal - previousValue.win + newValue.win
			}, { merge: true })
		});
	});

exports.updateMonthTotal = functions.firestore
	.document(`${CUSTSAV}/{custsavId}/${USERS}/{userId}/${SAVINGS}/{monthId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if (previousValue.money === newValue.money) return null; //El dinero sigue siendo el mismo, revisar la condicion
		return snap.ref.set({
			money: newValue.lottery + newValue.savings + newValue.events + newValue.win
		}, { merge: true })
	});

exports.updateTotalMoney = functions.firestore
	.document(`${CUSTSAV}/{custsavId}/${USERS}/{userId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if (previousValue.moneyTotal === newValue.moneyTotal) return null;
		return snap.after.ref.set({
			moneyTotal: newValue.lotteryTotal + newValue.savingsTotal + newValue.eventsTotal + newValue.winTotal
		}, { merge: true })
	});