import test from 'node:test'
import assert from 'node:assert/strict'
import { validateActivity } from './activities.js'
import { activityTimeInput, parseActivityTime } from '../src/utils/activityTime.js'
const now=Date.parse('2026-10-18T00:00:00Z')
const valid=()=>({title:'Creek cleanup',description:'Help clean our local creek.',suburb:'Footscray',address:'Footscray VIC',startAt:now+3600000,endAt:now+7200000,capacity:5,location:{lat:-37.8,lng:144.9}})
test('validates future schedules, capacity, required details and location',()=>{
 assert.equal(validateActivity(valid(),now).capacity,5)
 for(const change of [{startAt:now},{endAt:now},{endAt:now+30*3600000},{capacity:0},{capacity:2.5},{capacity:501},{location:{lat:0,lng:0}},{title:'x'}]) assert.throws(()=>validateActivity({...valid(),...change},now))
 assert.equal(validateActivity({...valid(),coordinatorId:'forged',bookedCount:200},now).coordinatorId,undefined)
})
test('Melbourne datetime conversion handles standard time, daylight saving and invalid clock times',()=>{
 for(const epoch of ['2026-07-18T00:30:00Z','2026-12-18T00:30:00Z']) assert.equal(parseActivityTime(activityTimeInput(Date.parse(epoch))),Date.parse(epoch))
 assert.equal(new Date(parseActivityTime('2026-12-18T11:30')).toISOString(),'2026-12-18T00:30:00.000Z')
 assert.throws(()=>parseActivityTime('2026-10-04T02:30'))
})
