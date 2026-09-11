const fs=require('fs'),path=require('path');const{JWT}=require('google-auth-library');
const PKG='com.micorlov.videopoker';
const API='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PKG;
const KEY=path.join(process.env.HOME,'.config/mcp/google-play-service-account.json');
const L=JSON.parse(fs.readFileSync('play-store-assets/listings.json','utf8'));
(async()=>{
 const k=JSON.parse(fs.readFileSync(KEY,'utf8'));
 const jwt=new JWT({email:k.client_email,key:k.private_key,scopes:['https://www.googleapis.com/auth/androidpublisher']});
 const {token}=await jwt.getAccessToken();
 const g=async(u)=>{const r=await fetch(u,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw new Error(r.status+' '+u);return r.json();};
 const edit=await (await fetch(`${API}/edits`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'})).json();
 let bad=0;
 const track=await g(`${API}/edits/${edit.id}/tracks/production`);
 const notes=new Set((track.releases[0].releaseNotes||[]).map(n=>n.language));
 console.log('locale   title short full  phone tab7 tab10 feat  notes');
 for(const [lang,want] of Object.entries(L)){
   const live=await g(`${API}/edits/${edit.id}/listings/${lang}`);
   const imgs={};
   for(const t of ['phoneScreenshots','sevenInchScreenshots','tenInchScreenshots','featureGraphic']){
     const r=await g(`${API}/edits/${edit.id}/listings/${lang}/${t}`);
     imgs[t]=(r.images||[]).length;
   }
   const ok=(a,b)=>a===b?'ok':'DIFF';
   const t=ok(live.title,want.title),s=ok(live.shortDescription,want.shortDescription),f=ok(live.fullDescription,want.fullDescription);
   if([t,s,f].includes('DIFF'))bad++;
   console.log(`${lang.padEnd(8)}${t.padEnd(6)}${s.padEnd(6)}${f.padEnd(6)}${String(imgs.phoneScreenshots).padEnd(6)}${String(imgs.sevenInchScreenshots).padEnd(5)}${String(imgs.tenInchScreenshots).padEnd(6)}${String(imgs.featureGraphic).padEnd(6)}${notes.has(lang)?'yes':'NO'}`);
 }
 await fetch(`${API}/edits/${edit.id}`,{method:'DELETE',headers:{Authorization:'Bearer '+token}});
 console.log('\ntrack production versionCodes', track.releases[0].versionCodes.join(','), '| status', track.releases[0].status, '| release-note locales', notes.size);
 console.log(bad? `MISMATCHES: ${bad}` : 'All 16 locales match play-store-assets/listings.json');
})().catch(e=>{console.error(e.message);process.exit(1);});
