import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099') throw new Error('Local emulators required')
const app=initializeApp({projectId:'demo-greenlink'})
for(const [uid,name,email,role] of [['workflow-member','Taylor Volunteer','workflow-member@example.com','Volunteer'],['workflow-admin','Casey Administrator','workflow-admin@example.com','Administrator']]) {
 await getAuth().createUser({uid,email,password:'DemoTest123!',displayName:name})
 await getFirestore().doc(`users/${uid}`).set({name,email,role,requestedRole:'Volunteer',approvalStatus:'Not requested'})
}
console.log('Local UI accounts seeded')
await deleteApp(app)
