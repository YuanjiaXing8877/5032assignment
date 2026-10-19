import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { buildSampleActivities } from '../../scripts/sampleActivities.js'
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099') throw new Error('Local emulators required')
const app=initializeApp({projectId:'demo-greenlink'})
for(const [uid,name,email,role] of [['workflow-member','Taylor Volunteer','workflow-member@example.com','Volunteer'],['workflow-admin','Casey Administrator','workflow-admin@example.com','Administrator']]) {
 await getAuth().createUser({uid,email,password:'DemoTest123!',displayName:name})
 await getFirestore().doc(`users/${uid}`).set({name,email,role,requestedRole:'Volunteer',approvalStatus:'Not requested'})
}
console.log('Local UI accounts seeded')
const accessibility = process.argv.includes('--accessibility')
if (accessibility) {
 await getAuth().createUser({uid:'workflow-coordinator',email:'workflow-coordinator@example.com',password:'DemoTest123!',displayName:'Riley Coordinator'})
 await getFirestore().doc('users/workflow-coordinator').set({name:'Riley Coordinator',email:'workflow-coordinator@example.com',role:'Coordinator',requestedRole:'Coordinator',approvalStatus:'Approved'})
}
if (process.argv.includes('--activities')) {
 for (const {id,...activity} of buildSampleActivities()) {
  await getFirestore().doc(`activities/${id}`).create({...activity,coordinatorId:accessibility?'workflow-coordinator':'workflow-admin',coordinatorName:accessibility?'Riley Coordinator':'Casey Administrator',status:'Published',bookedCount:0,version:1})
 }
 console.log('Six sample activities seeded in local emulators')
}
if (accessibility) {
 const id='completed-accessibility-session'
 const {id:unused,...activity}=buildSampleActivities()[0]
 await getFirestore().doc(`activities/${id}`).create({...activity,title:'Completed neighbourhood planting',startAt:Date.now()-10800000,endAt:Date.now()-3600000,coordinatorId:'workflow-coordinator',coordinatorName:'Riley Coordinator',status:'Published',bookedCount:1,version:1})
 await getFirestore().doc(`activities/${id}/registrations/workflow-member`).set({uid:'workflow-member',name:'Taylor Volunteer',email:'workflow-member@example.com',status:'Booked',attended:true})
 await getFirestore().doc(`users/workflow-member/bookings/${id}`).set({activityId:id,status:'Booked',attended:true})
 console.log('Local completed attendance fixture ready for keyboard rating checks')
}
await deleteApp(app)
