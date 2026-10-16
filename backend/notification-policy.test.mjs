import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {recipients} from './notification-policy.mjs';
const users={owner:{status:'approved',view:true,Fmanage:true},senior:{status:'approved',view:true,Fmanage:true},manager:{status:'approved',view:true,manage:true},viewer:{status:'approved',view:true},other:{status:'approved',view:true},pending:{status:'pending',view:false}};
test('registration only reaches senior managers and owner',()=>assert.deepEqual(recipients('registration',{},users,'owner'),['owner','senior']));
test('role change reaches the subject and staff at or above its old/new rank, never unrelated viewers',()=>{
 assert.deepEqual(recipients('role',{uid:'manager',previousRank:1},users,'owner'),['manager','owner','senior']);
 assert.deepEqual(recipients('role',{uid:'viewer',previousRank:0},users,'owner'),['viewer','owner','senior','manager']);
});
test('message only reaches recipient, title suggestion goes to management',()=>{
 assert.deepEqual(recipients('message',{to:'viewer'},users,'owner'),['viewer']);
 assert.deepEqual(recipients('titleRequest',{requestedBy:'viewer'},users,'owner'),['owner','senior','manager']);
});
test('broadcast excludes pending accounts',()=>assert.deepEqual(recipients('release',{},users,'owner'),['owner','senior','manager','viewer','other']));
