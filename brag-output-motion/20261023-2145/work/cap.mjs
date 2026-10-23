import {createRequire} from "module"; const puppeteer=createRequire("/Users/sid/.npm/_npx/702923228c2ce1e6/node_modules/")("puppeteer-core");
import {pathToFileURL} from "url";
const exe="/Users/sid/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const br=await puppeteer.launch({executablePath:exe,args:["--allow-file-access-from-files"]});
const p=await br.newPage(); await p.setViewport({width:1080,height:1920});
await p.goto(pathToFileURL(process.cwd()+"/index.html").href); await p.evaluate(()=>window.ready);
const arg=process.argv.slice(2);
if(arg[0]==="all"){for(let i=0;i<600;i++){await p.evaluate(t=>window.seek(t),i/30);await p.screenshot({path:`frames/f${String(i).padStart(4,"0")}.png`});}}
else for(const t of arg.map(Number)){await p.evaluate(t=>window.seek(t),t);await p.screenshot({path:`still_${t}.png`});}
await br.close();
