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
 await updateDoc(doc(administrator.fs,'users',volunteer.uid),{role:'Volunteer',approvalStatus:'Not requested'})
 await assert.rejects(volunteer.call('save',{data:base}),{code:'functions/permission-denied'});check('role revocation is enforced immediately by the server')
 await signOut(second.auth)
 await assert.rejects(second.call('book',{activityId:future}),{code:'functions/unauthenticated'});check('signed-out callers are rejected')
 console.log(`${passed} integration checks passed`)
} finally { await Promise.all(apps.map(deleteApp)); await deleteAdmin(adminApp) }
