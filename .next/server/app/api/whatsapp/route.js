"use strict";(()=>{var e={};e.id=332,e.ids=[332],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4804:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>L,patchFetch:()=>M,requestAsyncStorage:()=>A,routeModule:()=>O,serverHooks:()=>x,staticGenerationAsyncStorage:()=>E});var o={};a.r(o),a.d(o,{GET:()=>D,POST:()=>N});var r=a(9303),n=a(8716),i=a(670),s=a(7070),d=a(5662);function c(e){let t=parseFloat(e.replace(/naira|₦|#/gi,"").replace(/,/g,"").trim());return isNaN(t)?null:t}function u(e){let{cleaned:t,time:a}=function(e){let t=e.match(/@(\S+)$/);return t?{cleaned:e.replace(/@\S+$/,"").trim(),time:t[1]}:{cleaned:e}}(e.toLowerCase().trim().replace(/\s+/g," ")),o=t.match(/^sell\s+(.+?)\s+(\d+)\s+(.+)$/);if(o){let e=o[1].trim(),t=parseInt(o[2],10),r=c(o[3]);if(t>0&&null!==r&&r>0)return{type:"sell",product:e,qty:t,price:r,time:a}}let r=t.match(/^debt\s+(.+?)\s+([#₦\d].*)$/);if(r){let e=r[1].trim(),t=c(r[2]);if(e&&null!==t&&t>0)return{type:"debt",name:e,amount:t}}let n=t.match(/^paid\s+(.+?)\s+([#₦\d].*)$/);if(n){let e=n[1].trim(),t=c(n[2]);if(e&&null!==t&&t>0)return{type:"paid",name:e,amount:t}}let i=t.match(/^stock\s+add\s+(.+?)\s+(\d+)$/);if(i){let e=i[1].trim(),t=parseInt(i[2],10);if(e&&t>0)return{type:"stock_add",product:e,qty:t}}if("stock"===t)return{type:"stock_check"};let s=t.match(/^stock\s+check(?:\s+(.+))?$/);if(s)return{type:"stock_check",product:s[1]?.trim()};if("undo"===t)return{type:"undo"};if("summary"===t||"report"===t)return{type:"summary"};if("debts"===t||"debt list"===t||"owing"===t)return{type:"debts"};if("history"===t||"log"===t)return{type:"history"};if("help"===t||"menu"===t||"commands"===t)return{type:"help"};let d=t.match(/^add\s+(.+?)\s+(\S+)\s+(\d+)$/);if(d){let e=d[1].trim(),t=c(d[2]),a=parseInt(d[3],10);if(e&&null!==t&&t>0&&a>=0)return{type:"add_product",name:e,price:t,qty:a}}return"done"===t||"finish"===t||"complete"===t?{type:"done"}:{type:"unknown",raw:e}}async function l(e,t){let a=process.env.META_PHONE_NUMBER_ID||"placeholder-phone-number-id",o=`https://graph.facebook.com/v19.0/${a}/messages`,r=await fetch(o,{method:"POST",headers:{Authorization:`Bearer ${process.env.META_WHATSAPP_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:e,type:"text",text:{body:t,preview_url:!1}})});if(!r.ok){let e=await r.json();throw console.error("WhatsApp send failed:",e),Error(`WhatsApp API error: ${JSON.stringify(e)}`)}}function p(e){return`₦${e.toLocaleString("en-NG")}`}async function m(e,t,a,o){if(!e){await d.p.from("merchants").insert({phone:t,onboarding_step:"naming"}),await l(t,`👋 Welcome to MyDailySales!

I help you track sales, stock, and customer debts — all from WhatsApp.

Let's set you up in 2 minutes.

*What is your business name?*`);return}if("naming"===e.onboarding_step){let o=a.trim();if(o.length<2){await l(t,'Please send your business name (e.g., "FreshMart" or "Mama Chisom Stores")');return}await d.p.from("merchants").update({business_name:o,onboarding_step:"adding_products"}).eq("id",e.id),await l(t,`Great! *${o}* is set up.

Now add your first products. Format:
\`add <name> <price> <qty>\`

Example: \`add garri 500 20\`

Add at least 1 product, then type *done* when finished.`);return}if("adding_products"===e.onboarding_step){if("add_product"===o.type){let{data:a}=await d.p.from("products").select("id").eq("merchant_id",e.id).ilike("name",o.name).maybeSingle();if(a){await l(t,`⚠️ You already have a product called "${o.name}". Try a different name or type *done* to finish.`);return}await d.p.from("products").insert({merchant_id:e.id,name:o.name,price:o.price,stock_qty:o.qty}),await l(t,`✅ *${o.name}* added.
Price: ₦${o.price.toLocaleString()} | Stock: ${o.qty}

Add another product or type *done* to finish.`);return}if("done"===o.type){let{count:a}=await d.p.from("products").select("id",{count:"exact",head:!0}).eq("merchant_id",e.id);if(!a||0===a){await l(t,"Please add at least 1 product before finishing.\n\nFormat: `add garri 500 20`");return}await d.p.from("merchants").update({onboarding_step:"complete"}).eq("id",e.id),await l(t,`🎉 *${e.business_name}* is ready!

Try logging your first sale now:
\`sell <product> <qty> <price>\`

Example: \`sell garri 2 500\`

Type *help* anytime to see all commands.`);return}await l(t,"To add a product: `add <name> <price> <qty>`\nExample: `add garri 500 20`\n\nType *done* when you've added all your products.");return}}function y(e,t){let a=e.toLowerCase().trim(),o=t.find(e=>e.name.toLowerCase()===a);if(o)return o;let r=null,n=1/0;for(let e of t){let t=function(e,t){let a=e.length,o=t.length,r=Array.from({length:a+1},(e,t)=>Array.from({length:o+1},(e,a)=>0===t?a:0===a?t:0));for(let n=1;n<=a;n++)for(let a=1;a<=o;a++)r[n][a]=e[n-1]===t[a-1]?r[n-1][a-1]:1+Math.min(r[n-1][a],r[n][a-1],r[n-1][a-1]);return r[a][o]}(a,e.name.toLowerCase());t<n&&(n=t,r=e)}return n<=Math.max(1,Math.min(2,Math.floor(a.length/3)))?r:null}async function h(e,t,a,o){let r=e.phone,{data:n}=await d.p.from("products").select("id, name, stock_qty, price, low_stock_threshold").eq("merchant_id",e.id);if(!n||0===n.length){await l(r,`❓ You haven't added any products yet.

Add one first: \`add ${t} ${o} 10\``);return}let i=y(t,n);if(!i){let e=n.slice(0,5).map(e=>e.name).join(", ");await l(r,`❓ I don't have *"${t}"* in your products.

Your products: ${e}

Did you mean one of these? Or type \`add ${t} ${o} 0\` to create it.`);return}let s=n.find(e=>e.id===i.id);if(null!==s.stock_qty&&a>s.stock_qty&&s.stock_qty>=0){await l(r,`⚠️ You only have *${s.stock_qty}* ${s.name} in stock.

Log ${s.stock_qty} sold, or reply:
\`sell ${s.name} ${s.stock_qty} ${o}\``);return}await d.p.from("sales_log").insert({merchant_id:e.id,product_id:s.id,product_name:s.name,qty_sold:a,price_each:o});let c=Math.max(0,(s.stock_qty||0)-a);await d.p.from("products").update({stock_qty:c}).eq("id",s.id);let u=new Date;u.setHours(0,0,0,0);let{data:m}=await d.p.from("sales_log").select("total").eq("merchant_id",e.id).eq("undone",!1).gte("logged_at",u.toISOString()),h=(m||[]).reduce((e,t)=>e+(t.total||0),0),_=a*o,w=`✅ Sold *${a} ${s.name}* @ ${p(o)} each = *${p(_)}*
`;w+=`Stock left: ${c} ${c<=0?"— *OUT OF STOCK* ⚠️":""}
Today total: *${p(h)}*`,c>0&&c<=(s.low_stock_threshold||5)&&(w+=`

⚠️ *Low stock warning:* Only ${c} ${s.name} left. Restock soon.`),await l(r,w)}async function _(e,t,a){let o=e.phone;await d.p.from("credit_book").insert({merchant_id:e.id,customer_name:t,amount_owed:a,status:"unpaid"});let{data:r}=await d.p.from("credit_book").select("amount_owed").eq("merchant_id",e.id).eq("status","unpaid"),n=(r||[]).reduce((e,t)=>e+Number(t.amount_owed),0);await l(o,`📝 *${t}* owes ${p(a)}.
Total owed to you: *${p(n)}*

When they pay, type: \`paid ${t} ${a}\``)}async function w(e,t,a){let o=e.phone,{data:r}=await d.p.from("credit_book").select("id, customer_name, amount_owed").eq("merchant_id",e.id).eq("status","unpaid");if(!r||0===r.length){await l(o,`✅ You have no outstanding debts recorded.`);return}let n=y(t,[...new Map(r.map(e=>[e.customer_name,{id:e.id,name:e.customer_name}])).values()]);if(!n){let e=r.slice(0,5).map(e=>e.customer_name).join(", ");await l(o,`❓ I don't have a debt for *"${t}"*.

People who owe you: ${e}

Type *debts* to see the full list.`);return}let i=r.filter(e=>e.customer_name.toLowerCase()===n.name.toLowerCase()).reduce((e,t)=>e+Number(t.amount_owed),0);await d.p.from("credit_book").update({status:"paid",paid_at:new Date().toISOString()}).eq("merchant_id",e.id).eq("status","unpaid").ilike("customer_name",n.name);let{data:s}=await d.p.from("credit_book").select("amount_owed").eq("merchant_id",e.id).eq("status","unpaid"),c=(s||[]).reduce((e,t)=>e+Number(t.amount_owed),0);await l(o,`✅ *${n.name}* has paid ${p(i)}. Debt cleared.

Total still owed to you: *${p(c)}*`)}async function f(e,t,a){let o=e.phone,{data:r}=await d.p.from("products").select("id, name, stock_qty").eq("merchant_id",e.id),n=y(t,r||[]);if(!n){await l(o,`❓ Product *"${t}"* not found.

To create it: \`add ${t} <price> ${a}\``);return}let i=(r||[]).find(e=>e.id===n.id),s=(i.stock_qty||0)+a;await d.p.from("products").update({stock_qty:s}).eq("id",i.id),await l(o,`✅ Added *${a}* ${i.name}.
New stock: *${s}*`)}async function g(e,t){let a=e.phone,{data:o}=await d.p.from("products").select("name, stock_qty, price, low_stock_threshold").eq("merchant_id",e.id).order("name");if(!o||0===o.length){await l(a,"You haven't added any products yet.\n\nAdd one: `add garri 500 20`");return}if(t){let e=y(t,o.map(e=>({id:e.name,name:e.name}))),r=o.find(t=>t.name.toLowerCase()===e?.name?.toLowerCase());if(!r){await l(a,`❓ Product *"${t}"* not found.`);return}let n=r.stock_qty<=0?"\uD83D\uDD34 OUT":r.stock_qty<=(r.low_stock_threshold||5)?"\uD83D\uDFE1 LOW":"\uD83D\uDFE2";await l(a,`📦 *${r.name}*
Stock: ${r.stock_qty} ${n}
Price: ${p(Number(r.price))}`);return}let r=o.map(e=>{let t=e.stock_qty<=0?"\uD83D\uDD34 OUT":e.stock_qty<=(e.low_stock_threshold||5)?"\uD83D\uDFE1":"\uD83D\uDFE2";return`${t} *${e.name}*: ${e.stock_qty} left`});await l(a,`📦 *Your Stock*

${r.join("\n")}`)}async function k(e){let t=e.phone,{data:a}=await d.p.from("sales_log").select("*").eq("merchant_id",e.id).eq("undone",!1).order("logged_at",{ascending:!1}).limit(1).maybeSingle();if(!a){await l(t,`↩ Nothing to undo. No sales logged yet today.`);return}await d.p.from("sales_log").update({undone:!0}).eq("id",a.id);let{data:o}=await d.p.from("products").select("stock_qty").eq("id",a.product_id).maybeSingle();o&&await d.p.from("products").update({stock_qty:(o.stock_qty||0)+a.qty_sold}).eq("id",a.product_id);let r=new Date;r.setHours(0,0,0,0);let{data:n}=await d.p.from("sales_log").select("total").eq("merchant_id",e.id).eq("undone",!1).gte("logged_at",r.toISOString()),i=(n||[]).reduce((e,t)=>e+Number(t.total||0),0),s=new Date(a.logged_at).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});await l(t,`↩ *Done. Last entry reversed.*

Removed: Sold ${a.qty_sold} ${a.product_name} @ ${p(Number(a.price_each))} (logged ${s})

Today total: *${p(i)}*`)}async function $(e){let t=e.phone,a=new Date;a.setHours(0,0,0,0);let{data:o}=await d.p.from("sales_log").select("total, product_name, qty_sold").eq("merchant_id",e.id).eq("undone",!1).gte("logged_at",a.toISOString()),r=(o||[]).reduce((e,t)=>e+Number(t.total||0),0),n=(o||[]).length,{data:i}=await d.p.from("credit_book").select("amount_owed").eq("merchant_id",e.id).eq("status","unpaid"),s=(i||[]).reduce((e,t)=>e+Number(t.amount_owed),0),{data:c}=await d.p.from("products").select("name").eq("merchant_id",e.id).eq("stock_qty",0),u=`📊 *${e.business_name} — Today's Summary*
`;if(u+=`─────────────────────
💰 Sales: *${p(r)}* (${n} transactions)
📋 Debts owed to you: *${p(s)}*
`,c&&c.length>0){let e=c.map(e=>e.name).join(", ");u+=`🔴 Out of stock: ${e}
`}0===r&&0===n&&(u+=`
_No sales logged today yet._`),u+=`
Type *history* to see recent entries.`,await l(t,u)}async function b(e){let t=e.phone,{data:a}=await d.p.from("sales_log").select("product_name, qty_sold, price_each, total, logged_at, undone").eq("merchant_id",e.id).order("logged_at",{ascending:!1}).limit(5);if(!a||0===a.length){await l(t,"No sales logged yet. Type `sell <product> <qty> <price>` to start.");return}let o=a.map(e=>{let t=new Date(e.logged_at).toLocaleString("en-NG",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Lagos"}),a=e.undone?" _(undone)_":"";return`• ${e.qty_sold}x ${e.product_name} @ ${p(Number(e.price_each))} = *${p(Number(e.total))}*${a}
  _${t}_`});await l(t,`🕐 *Last ${a.length} entries:*

${o.join("\n\n")}`)}async function q(e){let t=e.phone,{data:a}=await d.p.from("credit_book").select("customer_name, amount_owed, created_at").eq("merchant_id",e.id).eq("status","unpaid").order("amount_owed",{ascending:!1});if(!a||0===a.length){await l(t,`✅ No outstanding debts. Everyone has paid up!`);return}let o=a.reduce((e,t)=>e+Number(t.amount_owed),0),r=a.map(e=>`• *${e.customer_name}*: ${p(Number(e.amount_owed))}`);await l(t,`📋 *Outstanding Debts*

${r.join("\n")}

Total owed to you: *${p(o)}*

To mark paid: \`paid <name> <amount>\``)}async function S(e){let t=e.phone,a=`📖 *MyDailySales Commands*

*Log a sale:*
\`sell <product> <qty> <price>\`
_sell garri 5 500_

*Record a debt:*
\`debt <name> <amount>\`
_debt Emeka 3000_

*Mark debt paid:*
\`paid <name> <amount>\`
_paid Emeka 3000_

*Add stock:*
\`stock add <product> <qty>\`
_stock add garri 20_

*Check stock:*
\`stock check\` or \`stock check garri\`

*Today's summary:*
\`summary\`

*All debts:*
\`debts\`

*Recent entries:*
\`history\`

*Undo last sale:*
\`undo\`

─────────────────────
Need help? Type your question and we'll guide you.`;await l(t,a)}async function D(e){let{searchParams:t}=new URL(e.url),a=t.get("hub.mode"),o=t.get("hub.verify_token"),r=t.get("hub.challenge");return"subscribe"===a&&o===process.env.META_WEBHOOK_VERIFY_TOKEN?(console.log("Webhook verified"),new s.NextResponse(r,{status:200})):new s.NextResponse("Forbidden",{status:403})}async function N(e){try{let t=await e.json();return T(t).catch(e=>console.error("Message processing error:",e)),new s.NextResponse("OK",{status:200})}catch(e){return console.error("Webhook payload error:",e),new s.NextResponse("Invalid JSON",{status:400})}}async function T(e){try{let t=e?.entry?.[0],a=t?.changes?.[0],o=a?.value;if(!o?.messages||0===o.messages.length||o.statuses)return;let r=o.messages[0];if("text"!==r.type){let e=r.from;await l(e,`Hi! I can only read text messages for now.

Type *help* to see what I can do.`);return}let n=r.from,i=r.text.body,{data:s}=await d.p.from("merchants").select("*").eq("phone",n).maybeSingle();if(!s||"complete"!==s.onboarding_step){let e=u(i);await m(s,n,i,e);return}let c=u(i);switch(c.type){case"sell":await h(s,c.product,c.qty,c.price);break;case"debt":await _(s,c.name,c.amount);break;case"paid":await w(s,c.name,c.amount);break;case"stock_add":await f(s,c.product,c.qty);break;case"stock_check":await g(s,c.product);break;case"undo":await k(s);break;case"summary":await $(s);break;case"debts":await q(s);break;case"history":await b(s);break;case"help":await S(s);break;default:await v(s.phone,i)}}catch(e){console.error("processMessage error:",e)}}async function v(e,t){let a=t.toLowerCase().trim(),o="";a.includes("sell")||a.includes("sold")?o="\nDid you mean: `sell <product> <qty> <price>`?":a.includes("debt")||a.includes("owe")?o="\nDid you mean: `debt <name> <amount>`?":(a.includes("stock")||a.includes("inventory"))&&(o="\nDid you mean: `stock check` or `stock add <product> <qty>`?"),await l(e,`❓ I didn't understand: _"${t.substring(0,50)}"_${o}

Type *help* to see all commands with examples.`)}let O=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/whatsapp/route",pathname:"/api/whatsapp",filename:"route",bundlePath:"app/api/whatsapp/route"},resolvedPagePath:"C:\\Users\\HP\\Desktop\\react\\Mydailysales App\\MyDailySales\\app\\api\\whatsapp\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:A,staticGenerationAsyncStorage:E,serverHooks:x}=O,L="/api/whatsapp/route";function M(){return(0,i.patchFetch)({serverHooks:x,staticGenerationAsyncStorage:E})}},5662:(e,t,a)=>{a.d(t,{p:()=>r});var o=a(7933);let r=(0,o.eI)("https://your-project.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-service-role-key");(0,o.eI)("https://your-project.supabase.co","your-anon-key")}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),o=t.X(0,[948,890],()=>a(4804));module.exports=o})();