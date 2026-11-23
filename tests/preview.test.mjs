import test from 'node:test';
import assert from 'node:assert/strict';
import {permitsPreviewRequest as permits} from '../src/migration/readOnly.ts';
test('checkpoint permits public reads and the clock only',()=>{
 assert.ok(permits('/rest/v1/seeds','GET'));assert.ok(permits('/rest/v1/rpc/garden_clock','POST'));
 for(const [path,method] of [['/rest/v1/seeds','PATCH'],['/rest/v1/rpc/open_memory','POST'],['/rest/v1/rpc/purchase','GET'],['/storage/v1/object/memories','POST'],['/auth/v1/token','POST']])assert.equal(permits(path,method),false);
});
