const functions = require('firebase-functions');
const admin = require('firebase-admin');

const USERS = 'users';
const MONTHLY_SAVINGS = 'monthlySavings';
const SAVING = 'saving';
const SAVING_DATA = 'savingData';
const JOIN_REQUEST = 'joinRequest';

admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

exports.helloWorld = functions.https.onRequest((request, response) => {
	response.send("Hello from Firebase!");
});

exports.updateUser = functions.firestore
	.document(`${USERS}/{userId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if (previousValue[SAVING] === newValue[SAVING]) return null;
		let savingUserRef = db.doc(`${SAVING}/${previousValue[SAVING]}/${USERS}/${context.params.userId}`);
		if (!newValue[SAVING]) {
			return savingUserRef.delete();
		}
		let batch = db.batch();
		savingUserRef = db.doc(`${SAVING}/${newValue[SAVING]}/${USERS}/${context.params.userId}`);
		batch.set(savingUserRef, {
			moneyTotal: 0,
			lotteryTotal: 0,
			savingsTotal: 0,
			eventsTotal: 0,
			winTotal: 0
		})
		return batch.commit();
	});

exports.createSaving = functions.firestore
	.document(`${SAVING_DATA}/{savingId}`)
	.onCreate((snap, context) => {
		let savingRef = db.doc(`${SAVING}/${context.params.savingId}`);
		return savingRef.set({
			moneyTotal: 0,
			lotteryTotal: 0,
			savingsTotal: 0,
			eventsTotal: 0,
			winTotal: 0
		})
	});

exports.updateUserMoney = functions.firestore
	.document(`${SAVING}/{savingId}/${USERS}/{userId}/${MONTHLY_SAVINGS}/{monthId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		const monthRef = db.doc(`${SAVING}/${context.params.savingId}/${USERS}/${context.params.userId}`);
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
	.document(`${SAVING}/{savingId}/${USERS}/{userId}/${MONTHLY_SAVINGS}/{monthId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if (newValue.lottery === previousValue.lottery
			&& newValue.savings === previousValue.savings
			&& newValue.events === previousValue.events
			&& newValue.win === previousValue.win) return null;
		return snap.after.ref.set({
			money: newValue.lottery + newValue.savings + newValue.events + newValue.win
		}, { merge: true })
	});

exports.updateTotalMoney = functions.firestore
	.document(`${SAVING}/{savingId}/${USERS}/{userId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if (newValue.lotteryTotal === previousValue.lotteryTotal
			&& newValue.savingsTotal === previousValue.savingsTotal
			&& newValue.eventsTotal === previousValue.eventsTotal
			&& newValue.winTotal === previousValue.winTotal) return null;
		return snap.after.ref.set({
			moneyTotal: newValue.lotteryTotal + newValue.savingsTotal + newValue.eventsTotal + newValue.winTotal
		}, { merge: true })
	});

exports.updateRequest = functions.firestore
	.document(`${JOIN_REQUEST}/{requestId}`)
	.onUpdate((snap, context) => {
		const newValue = snap.after.data();
		const previousValue = snap.before.data();
		if(newValue.approved === previousValue.approved) return null;
		if(newValue.approved){
			let batch = db.batch();
			let requestRef = db.doc(`${JOIN_REQUEST}/${context.params.requestId}`);
			batch.delete(requestRef);
			let userRef = db.doc(`${USERS}/${newValue.userId}`);
			batch.update(userRef, {
				saving: newValue.savingId
			})
			return batch.commit();
		}
		return null;
	});

exports.createUserInSaving = functions.firestore
.document(`${SAVING}/{savingId}/${USERS}/{userId}`)
.onCreate((snap, context) => {
	let batch = db.batch();
	savingUserRef = db.doc(`${SAVING}/${context.params.savingId}/${USERS}/${context.params.userId}`);
	for (let i = 0; i < 12; i++) {
		const monthRef = savingUserRef.collection(MONTHLY_SAVINGS).doc(String(i));
		batch.set(monthRef, {
			money: 0,
			lottery: 0,
			savings: 0,
			events: 0,
			win: 0
		})
	}
	let savingDataRef = db.doc(`${SAVING_DATA}/${context.params.savingId}`);
	return savingDataRef.get().then(ref => {
		let data = ref.data();
		batch.update(savingDataRef, {
			userCount: data.userCount + 1
		})
		return batch.commit();
	}).catch(e => console.log(e))
});

exports.deleteUserInSaving = functions.firestore
.document(`${SAVING}/{savingId}/${USERS}/{userId}`)
.onDelete((snap, context) => {
	let batch = db.batch();
	savingUserRef = db.doc(`${SAVING}/${context.params.savingId}/${USERS}/${context.params.userId}`);
	for (let i = 0; i < 12; i++) {
		const monthRef = savingUserRef.collection(MONTHLY_SAVINGS).doc(String(i));
		batch.delete(monthRef);
	}
	let savingDataRef = db.doc(`${SAVING_DATA}/${context.params.savingId}`);
	return savingDataRef.get().then(ref => {
		let data = ref.data();
		batch.update(savingDataRef, {
			userCount: data.userCount - 1
		})
		return batch.commit();
	}).catch(e => console.log(e))
})