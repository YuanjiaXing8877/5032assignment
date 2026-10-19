import assert from 'node:assert/strict'
import { initializeApp as initAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore as clientFirestore, connectFirestoreEmulator, doc, collection, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'

assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Only run against local emulators')
const projectId='demo-greenlink'
const adminApp=initAdmin({projectId})
const db=getFirestore(adminApp)
const apps=[]
let passed=0
const check=(message)=>{passed++;console.log(`PASS ${message}`)}
async function member(name,role='Volunteer') {
 const app=initializeApp({projectId,apiKey:'demo-key',authDomain:'demo-greenlink.firebaseapp.com'},name);apps.push(app)
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
 const fs=clientFirestore(app);connectFirestoreEmulator(fs,'127.0.0.1',8080)
 const fn=getFunctions(app,'australia-southeast2');connectFunctionsEmulator(fn,'127.0.0.1',5001)
 const user=(await createUserWithEmailAndPassword(auth,`${name}@example.com`,'Testpass123!')).user
 await db.doc(`users/${user.uid}`).set({name,email:user.email,role,requestedRole:'Volunteer',approvalStatus:'Not requested'})
 return {uid:user.uid,fs,auth,call:async(action,payload={})=>(await httpsCallable(fn,'manageActivity')({action,...payload})).data}
}
try {
 const volunteer=await member('workflow-volunteer')
 const second=await member('second-volunteer')
 const outsider=await member('other-coordinator','Coordinator')
 const administrator=await member('administrator','Administrator')
 const base={title:'Emulator cleanup',description:'A local integration test activity.',suburb:'Footscray',address:'Footscray VIC 3011',location:{lat:-37.8,lng:144.9},startAt:Date.now()+86400000,endAt:Date.now()+90000000,capacity:1}
 await assert.rejects(volunteer.call('save',{data:base}),{code:'functions/permission-denied'});check('pending/unapproved volunteers cannot publish')
 await assert.rejects(updateDoc(doc(volunteer.fs,'users',volunteer.uid),{role:'Coordinator'}));check('volunteers cannot grant themselves staff roles')
 await updateDoc(doc(volunteer.fs,'users',volunteer.uid),{requestedRole:'Coordinator',approvalStatus:'Pending',requestedAt:serverTimestamp()})
 assert.equal((await getDoc(doc(volunteer.fs,'users',volunteer.uid))).data().role,'Volunteer');check('existing volunteer application remains Volunteer and Pending')
 await assert.rejects(updateDoc(doc(volunteer.fs,'users',volunteer.uid),{approvalStatus:'Approved',role:'Coordinator'}));check('applicants cannot approve their own application')
 await updateDoc(doc(administrator.fs,'users',volunteer.uid),{approvalStatus:'Approved',role:'Coordinator'})
 const created=await volunteer.call('save',{data:base})
 const activityId=created.id
 assert.equal((await getDoc(doc(second.fs,'activities',activityId))).data().title,base.title);check('administrator approval unlocks publishing and volunteers see published data')
 await assert.rejects(outsider.call('save',{activityId,version:1,data:base}),{code:'functions/permission-denied'})
 await assert.rejects(outsider.call('cancel',{activityId}),{code:'functions/permission-denied'});check('coordinators cannot edit or cancel another coordinator activity')
 await assert.rejects(setDoc(doc(second.fs,'activities','forged-event'),base));check('client cannot bypass callable validation with direct activity writes')
 const race=await Promise.allSettled([volunteer.call('book',{activityId}),second.call('book',{activityId})])
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1)
 assert.equal((await db.doc(`activities/${activityId}`).get()).data().bookedCount,1);check('concurrent bookings cannot exceed capacity')
 const winner=race[0].status==='fulfilled'?volunteer:second
 const loser=winner===volunteer?second:volunteer
 await winner.call('book',{activityId})
 assert.equal((await db.doc(`activities/${activityId}`).get()).data().bookedCount,1);check('repeat booking does not consume an extra place')
 await assert.rejects(outsider.call('attendance',{activityId,participantId:winner.uid,attended:true}),{code:'functions/permission-denied'})
 await assert.rejects(getDocs(collection(outsider.fs,'activities',activityId,'registrations')));check('other coordinators cannot read participants or change attendance')
 assert.equal((await getDocs(collection(volunteer.fs,'activities',activityId,'registrations'))).size,1);check('owner can view participant roster')
 await assert.rejects(volunteer.call('attendance',{activityId,participantId:winner.uid,attended:true}));check('check-in is unavailable before activity starts')
 const event=(await db.doc(`activities/${activityId}`).get()).data()
 await assert.rejects(volunteer.call('save',{activityId,version:1,data:base}),{code:'functions/aborted'});check('stale activity edits are rejected')
 await winner.call('withdraw',{activityId})
 await loser.call('book',{activityId})
 assert.equal((await db.doc(`activities/${activityId}`).get()).data().bookedCount,1);check('withdrawing releases a place for another volunteer')
 await db.doc(`activities/${activityId}`).update({startAt:Date.now()-7200000,endAt:Date.now()-3600000})
 await volunteer.call('attendance',{activityId,participantId:loser.uid,attended:true})
 assert.equal((await db.doc(`users/${loser.uid}/bookings/${activityId}`).get()).data().attended,true);check('check-in persists to roster and volunteer history')
 const rating={activityId,activityTitle:base.title,userId:loser.uid,score:5,updatedAt:serverTimestamp()}
 await setDoc(doc(loser.fs,'ratings',`${activityId}_${loser.uid}`),rating)
 await assert.rejects(setDoc(doc(winner.fs,'ratings',`${activityId}_${winner.uid}`),{...rating,userId:winner.uid}));check('only actual attendees can rate a finished activity')
 const future=(await volunteer.call('save',{data:{...base,title:'Cancellation check'}})).id
 await second.call('book',{activityId:future})
 await volunteer.call('cancel',{activityId:future})
 assert.equal((await getDoc(doc(second.fs,'activities',future))).data().status,'Cancelled')
 await assert.rejects(second.call('book',{activityId:future}));check('cancellation is visible and closes bookings')
 const scheduler=await member('schedule-volunteer')
 const slot={...base,title:'Calendar morning',capacity:5,startAt:Date.now()+2*86400000,endAt:Date.now()+2*86400000+2*3600000}
 const slotA=(await volunteer.call('save',{data:slot})).id
 const overlap={...slot,title:'Calendar overlap',startAt:slot.startAt+3600000,endAt:slot.endAt+3600000}
 const slotB=(await volunteer.call('save',{data:overlap})).id
 const scheduleRace=await Promise.allSettled([scheduler.call('book',{activityId:slotA}),scheduler.call('book',{activityId:slotB})])
 assert.equal(scheduleRace.filter(result=>result.status==='fulfilled').length,1)
 const rejected=scheduleRace.find(result=>result.status==='rejected').reason
 assert.equal(rejected.code,'functions/failed-precondition')
 assert.equal(rejected.details.reason,'booking-conflict')
 const winningId=scheduleRace[0].status==='fulfilled'?slotA:slotB
 const blockedId=winningId===slotA?slotB:slotA
 const winningData=(await db.doc(`activities/${winningId}`).get()).data()
 assert.equal((await db.doc(`activities/${blockedId}`).get()).data().bookedCount,0)
 check('same member cannot concurrently book two different overlapping activities; rejected booking consumes no place')
 await scheduler.call('book',{activityId:winningId})
 assert.equal((await db.doc(`activities/${winningId}`).get()).data().bookedCount,1)
 check('idempotent repeat booking remains valid with conflict protection')
 await outsider.call('book',{activityId:blockedId});check('time conflicts are per member and do not block other volunteers')
 await assert.rejects(setDoc(doc(scheduler.fs,'bookingLocks',scheduler.uid),{revision:0}));check('clients cannot overwrite private schedule serialisation records')
 const adjacent=(await volunteer.call('save',{data:{...slot,title:'Adjacent calendar slot',startAt:winningData.endAt,endAt:winningData.endAt+3600000}})).id
 await scheduler.call('book',{activityId:adjacent});check('exact end-to-start adjacent bookings are allowed')
 await assert.rejects(volunteer.call('save',{activityId:winningId,version:winningData.version,data:{...winningData,startAt:winningData.startAt+60000,endAt:winningData.endAt+60000}}),{code:'functions/failed-precondition'});check('coordinators cannot reschedule an activity with existing participants')
 await volunteer.call('save',{activityId:winningId,version:winningData.version,data:{...winningData,description:'Updated instructions with the same booked schedule.'}});check('non-schedule edits remain available after booking')
 const duplicate=(await volunteer.call('save',{data:{...slot,title:'Replacement calendar slot',startAt:winningData.startAt,endAt:winningData.endAt}})).id
 await assert.rejects(scheduler.call('book',{activityId:duplicate}),{code:'functions/failed-precondition'})
 await volunteer.call('cancel',{activityId:winningId})
 await scheduler.call('book',{activityId:duplicate});check('cancelled activities release their time even before the member withdraws')
 const replacement=(await volunteer.call('save',{data:{...slot,title:'Withdraw and rebook slot',startAt:winningData.startAt,endAt:winningData.endAt}})).id
 await scheduler.call('withdraw',{activityId:duplicate})
 await scheduler.call('book',{activityId:replacement});check('withdrawing releases the time for another activity')
 const legacyData={...slot,title:'Legacy booking calendar check',startAt:slot.startAt+3*86400000,endAt:slot.endAt+3*86400000}
 const legacyId=(await volunteer.call('save',{data:legacyData})).id
 await db.doc(`activities/${legacyId}`).update({bookedCount:1})
 await db.doc(`activities/${legacyId}/registrations/${scheduler.uid}`).set({uid:scheduler.uid,status:'Booked',attended:false})
 await db.doc(`users/${scheduler.uid}/bookings/${legacyId}`).set({activityId:legacyId,status:'Booked',attended:false})
 const legacyOverlap=(await volunteer.call('save',{data:{...legacyData,title:'Overlaps legacy booking'}})).id
 await assert.rejects(scheduler.call('book',{activityId:legacyOverlap}),{code:'functions/failed-precondition'});check('legacy mirrors without start/end timestamps are checked against the real activity')
 await scheduler.call('withdraw',{activityId:legacyId})
 await scheduler.call('book',{activityId:legacyOverlap});check('legacy withdrawal correctly releases its schedule')
 await updateDoc(doc(administrator.fs,'users',volunteer.uid),{role:'Volunteer',approvalStatus:'Not requested'})
 await assert.rejects(volunteer.call('save',{data:base}),{code:'functions/permission-denied'});check('role revocation is enforced immediately by the server')
 await signOut(second.auth)
 await assert.rejects(second.call('book',{activityId:future}),{code:'functions/unauthenticated'});check('signed-out callers are rejected')
 console.log(`${passed} integration checks passed`)
} finally { await Promise.all(apps.map(deleteApp)); await deleteAdmin(adminApp) }
