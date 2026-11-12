import { describe,it,expect } from 'vitest'
import { contains,polygon,region,clampPosition,SIZE } from '../src/shared/geometry'
describe('native geometry',()=>{
 it('includes paper and excludes all distant transparent corners for both rotations',()=>{for(const a of [-2,1.7]){const p=polygon(a),r=region(a,10);expect(contains({x:180,y:180},p)).toBe(true);for(const [x,y] of [[0,0],[359,0],[0,359],[359,359]])expect(r.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height)).toBe(false);expect(r.every(b=>b.x>=0&&b.y>=0&&b.x+b.width<=SIZE&&b.y+b.height<=SIZE)).toBe(true)}})
 it('covers polygon interior samples with tight scanlines',()=>{for(const a of [-2,1.7]){const p=polygon(a),r=region(a);for(let y=0;y<SIZE;y+=3)for(let x=0;x<SIZE;x+=3)if(contains({x:x+.5,y:y+.5},p))expect(r.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height)).toBe(true)}})
 it('recovers negative-monitor and oversized positions',()=>{expect(clampPosition({x:4000,y:-2000},{x:-1920,y:0,width:1920,height:1040})).toEqual({x:-360,y:0});expect(clampPosition({x:99,y:99},{x:0,y:0,width:200,height:200})).toEqual({x:0,y:0})})
})
