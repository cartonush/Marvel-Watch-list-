import test from 'node:test';
import assert from 'node:assert/strict';
import {domain,allowedUrl,cleanSites,searchQuery,filterResults} from './search-core.mjs';

test('only validated domains are used for site searches',()=>{
  assert.deepEqual(cleanSites(['f-movies.org','https://www.f-movies.org/','http://localhost:8080','example.com/path','evil.test@f-movies.org']),['f-movies.org']);
  assert.equal(domain('cinehype.sc'),'cinehype.sc');
  assert.match(searchQuery('Iron Man',['f-movies.org','cinehype.sc']),/site:f-movies\.org OR site:cinehype\.sc/);
  assert.throws(()=>searchQuery('x',['f-movies.org']));
});
test('results never include unconfigured hosts, HTTP links or duplicates',()=>{
  assert.equal(allowedUrl('https://sub.f-movies.org/movie/1',['f-movies.org']),'https://sub.f-movies.org/movie/1');
  assert.equal(allowedUrl('https://f-movies.org.evil.test/movie/1',['f-movies.org']),null);
  assert.equal(allowedUrl('http://f-movies.org/movie/1',['f-movies.org']),null);
  const rows=filterResults([{title:'Iron Man',url:'https://f-movies.org/movie/1',description:'<b>Movie</b>'},{title:'duplicate',url:'https://f-movies.org/movie/1'},{title:'other',url:'https://evil.test/'}],['f-movies.org']);
  assert.deepEqual(rows,[{title:'Iron Man',url:'https://f-movies.org/movie/1',description:'Movie'}]);
});
