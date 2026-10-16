// Per-call CDP client: a loopback relay (lives only during this command) to Brave's abstract socket + Node's built-in WebSocket.
// Attaches ONLY to the tab whose URL contains 127.0.0.1:8765.
const net=require("net"),http=require("http"),fs=require("fs");
function targets(){return new Promise((res,rej)=>http.get({socketPath:"\0chrome_devtools_remote",path:"/json"},r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>res(JSON.parse(d)))}).on("error",rej));}
async function connect(){
  const t=(await targets()).find(t=>t.type==="page"&&/127\.0\.0\.1:876[56]/.test(t.url)); if(!t) throw new Error("no evolve tab");
  const srv=net.createServer(c=>{const u=net.connect({path:"\0chrome_devtools_remote"});c.pipe(u);u.pipe(c);c.on("error",()=>u.destroy());u.on("error",()=>c.destroy());});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const port=srv.address().port; const ws=new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${t.id}`);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=e=>rej(new Error("ws error "+(e.message||"")));});
  let id=0;const pend=new Map();
  ws.onmessage=m=>{const msg=JSON.parse(m.data);if(msg.id&&pend.has(msg.id)){const p=pend.get(msg.id);pend.delete(msg.id);msg.error?p.rej(new Error(JSON.stringify(msg.error))):p.res(msg.result);}};
  const send=(method,params={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}));});
  return {send,close:()=>{try{ws.close()}catch(e){}srv.close();}};
}
module.exports={connect};
if(require.main===module){(async()=>{const c=await connect();const cmd=process.argv[2];
  const ev=async e=>{const r=await c.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true});console.log(JSON.stringify(r.result?.value??r.exceptionDetails??r,null,1));};
  if(cmd==="evalfile")await ev(fs.readFileSync(process.argv[3],"utf8"));
  else if(cmd==="eval")await ev(process.argv[3]);
  else if(cmd==="shot"){const r=await c.send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(process.argv[3],Buffer.from(r.data,"base64"));console.log("saved");}
  else if(cmd==="reload"){await c.send("Page.reload",{ignoreCache:true});console.log("reloaded");}
  c.close();process.exit(0);})().catch(e=>{console.log("ERR",e.message);process.exit(1);});}
