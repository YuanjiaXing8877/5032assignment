import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { buildSampleActivities } from '../../scripts/sampleActivities.js'
import { melbourneDateKey, shiftDate } from '../../src/utils/calendar.js'
import { parseActivityTime } from '../../src/utils/activityTime.js'
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
if (process.argv.includes('--exports')) {
 const {id:unused,...activity}=buildSampleActivities()[0]
 for(let index=0;index<27;index++) {
  const id=`export-check-${index+1}`
  await getFirestore().doc(`activities/${id}`).create({...activity,title:index===0?'河岸植树活动 - Export check':`Export planting ${String(index+1).padStart(2,'0')}`,address:index===0?'河岸集合点, "公园入口"\nFootscray Park':activity.address,suburb:index%2?'Footscray':'Albion',coordinatorId:'workflow-admin',coordinatorName:'Casey Administrator',status:'Published',bookedCount:1,version:1,startAt:activity.startAt+index*3600000,endAt:activity.endAt+index*3600000})
  await getFirestore().doc(`users/workflow-member/bookings/${id}`).set({activityId:id,status:'Booked',attended:false})
 }
 console.log('27 local export fixtures ready for multi-page, filtered and bilingual download checks')
}
if (process.argv.includes('--calendar')) {
 const day=shiftDate(melbourneDateKey(Date.now()),1)
 const {id:unused,...activity}=buildSampleActivities()[0]
 for(const [id,title,start,end,capacity,bookedCount] of [
  ['calendar-morning','Morning park care','09:00','11:00',12,0],
  ['calendar-overlap','Riverside cleanup','10:00','12:00',10,0],
  ['calendar-adjacent','Afternoon garden care','11:00','13:00',8,0],
  ['calendar-full','Seedling workshop','14:00','15:00',1,1]
 ]) {
  await getFirestore().doc(`activities/${id}`).create({...activity,title,startAt:parseActivityTime(`${day}T${start}`),endAt:parseActivityTime(`${day}T${end}`),coordinatorId:accessibility?'workflow-coordinator':'workflow-admin',coordinatorName:accessibility?'Riley Coordinator':'Casey Administrator',status:'Published',capacity,bookedCount,version:1})
  if(bookedCount) {
   await getFirestore().doc(`activities/${id}/registrations/workflow-admin`).set({uid:'workflow-admin',name:'Casey Administrator',email:'workflow-admin@example.com',status:'Booked',attended:false})
   await getFirestore().doc(`users/workflow-admin/bookings/${id}`).set({activityId:id,status:'Booked',attended:false})
  }
 }
 console.log(`Local calendar fixtures ready for ${day}: overlap, adjacent slot and full activity`)
}
await deleteApp(app)
