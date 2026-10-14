import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromLocal,firstMerge,changes,overlay,removeAcknowledged,cleanDoc} from './sync-core.mjs';
const items=[{id:'m1',episodes:1},{id:'m2',episodes:10},{id:'m3',episodes:1}];
test('a returning account restores watch progress, lists and settings',()=>{
 const local=fromLocal(null,{},[],null,items);
 const remote=cleanDoc({progress:{m1:1,m2:4},favorites:{m1:true},skipped:{m3:true},lists:{0:{name:'Team',ids:['m1','m2']}},activeList:0,settings:{theme:'light'},name:'My journey'},items);
 assert.deepEqual(firstMerge(local,remote),remote);
});
test('an existing device joins account data without losing unrelated edits',()=>{
 const local=fromLocal({p:[1,0,0],f:['m1'],s:[],name:'Hero'}, {theme:'dark'},[{slot:0,name:'Phone',ids:['m2']}],0,items);
 const cloud=cleanDoc({progress:{m2:5},favorites:{},skipped:{},lists:{0:{name:'Cloud',ids:['m3']}},settings:{theme:'light'},activeList:0},items);
 const merged=firstMerge(local,cloud);
 assert.equal(merged.progress.m1,1);assert.equal(merged.progress.m2,5);
 assert.equal(merged.lists[0].name,'Cloud');assert.equal(merged.lists[1].name,'Phone');
});
test('field patches preserve independent device edits and removals',()=>{
 const before=cleanDoc({progress:{m1:1},favorites:{m1:true},skipped:{},lists:{0:{name:'Old',ids:['m1']}}},items);
 const after=cleanDoc({progress:{m2:3},favorites:{},skipped:{m3:true},lists:{0:{deleted:true}}},items);
 const patch=changes(before,after);
 assert.equal(patch.progress.m1,0);assert.equal(patch.favorites.m1,false);assert.deepEqual(patch.lists[0],{deleted:true});
 assert.equal(overlay(before,patch).progress.m2,3);
 assert.deepEqual(removeAcknowledged(patch,patch),{});
 assert.deepEqual(changes(overlay(before,patch),after),{});
});
test('invalid remote titles and episode counts cannot enter the local cache',()=>{
 const clean=cleanDoc({progress:{m2:99,evil:1},favorites:{evil:true},lists:{0:{name:'A',ids:['evil','m1']}}},items);
 assert.deepEqual(clean.progress,{});assert.deepEqual(clean.favorites,{});assert.deepEqual(clean.lists[0].ids,['m1']);
});
