import {seed} from '../lib/seed';
const KEY='misbah-saleh-store-v1';
export function readStore(){const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw);const s={...seed(),revision:0};localStorage.setItem(KEY,JSON.stringify(s));return s;}
function locked(fn:any){return navigator.locks?navigator.locks.request(KEY,fn):Promise.resolve().then(fn)}
export async function writeStore(b:any){return locked(()=>{const current=readStore();if(current.revision!==b.revision)throw Error('تغيرت البيانات في نافذة أخرى؛ حدّث الصفحة');const row={data:JSON.stringify(current),revision:current.revision};
 const s=JSON.parse(row.data); const id=crypto.randomUUID(),at=new Date().toISOString();
 const num=(v:any,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||(integer&&!Number.isInteger(v)))throw Error('قيمة رقمية غير صحيحة');return v};
 const txt=(v:any)=>{if(typeof v!=='string'||!v.trim()||v.length>250)throw Error('أكمل الحقول المطلوبة');return v.trim()};
 const money=(v:number)=>Math.round(v*100)/100;
 if(b.type==='product'){
 const p=b.product; const item={id:p.id||id,name:txt(p.name),category:txt(p.category),price:p.price===null?null:money(num(p.price)),min:num(p.min,true),stock:0};
 if(!s.categories.includes(item.category))throw Error('القسم غير موجود');
 if(p.id){const old=s.products.find((p:any)=>p.id===item.id);if(!old)throw Error('الصنف غير موجود');Object.assign(old,{...item,stock:old.stock});}else{s.products.push(item);}
 } else if(b.type==='category'){const name=txt(b.name);if(s.categories.includes(name))throw Error('القسم موجود مسبقًا');s.categories.push(name);
 } else if(b.type==='stock'){
 const p=s.products.find((p:any)=>p.id===b.id);if(!p)throw Error('الصنف غير موجود');const qty=num(b.qty,true),before=p.stock; const reason=txt(b.reason);
 p.stock=b.mode==='count'?qty:before+qty;s.movements.unshift({id,at,product:p.name,category:p.category,before,after:p.stock,delta:p.stock-before,reason,kind:b.mode==='count'?'جرد':'توريد'});
 } else if(b.type==='sale'){
 if(!Array.isArray(b.items)||!b.items.length)throw Error('السلة فارغة');let total=0;const seen=new Set();
 const items=b.items.map((i:any)=>{if(seen.has(i.id))throw Error('صنف مكرر');seen.add(i.id);const p=s.products.find((p:any)=>p.id===i.id);const qty=num(i.qty,true);if(!p||qty<1||p.stock<qty)throw Error('الكمية المتوفرة لا تكفي');if(p.price===null)throw Error('حدد سعر الصنف أولًا');const price=money(num(i.price));total+=money(qty*price);p.stock-=qty;return {id:p.id,name:p.name,category:p.category,qty,price};});
 const discount=money(num(b.discount));total=money(total);if(discount>total)throw Error('الخصم يتجاوز الإجمالي');
 s.sales.unshift({id,at,items,total,discount,net:money(total-discount),seller:txt(b.seller),customer:b.customer?txt(b.customer):'',payment:txt(b.payment)});
 } else if(b.type==='service'){
 const p=s.services.find((p:any)=>p.id===b.id);if(!p)throw Error('الخدمة غير موجودة');p.price=money(num(b.price));
 } else if(b.type==='repair'){
 const service=s.services.find((p:any)=>p.id===b.service);if(!service)throw Error('الخدمة غير موجودة');const price=money(num(b.price)),discount=money(num(b.discount));if(discount>price)throw Error('الخصم أكبر من السعر');
 s.repairs.unshift({id,at,service:service.name,customer:txt(b.customer),phone:b.phone?txt(b.phone):'',notes:b.notes?txt(b.notes):'',price,discount,net:money(price-discount),status:'جديد'});
 } else if(b.type==='repairStatus'){
 const p=s.repairs.find((p:any)=>p.id===b.id);if(!p||!['جديد','قيد التنفيذ','جاهز','تم التسليم'].includes(b.status))throw Error('حالة غير صحيحة');p.status=b.status;
 } else throw Error('عملية غير معروفة');

const result={...s,revision:row.revision+1};localStorage.setItem(KEY,JSON.stringify(result));return result;});}
export async function restoreStore(v:any){if(!v||!['products','categories','sales','services','repairs','movements'].every(k=>Array.isArray(v[k])))throw Error('ملف النسخة الاحتياطية غير صالح');if(!v.categories.every((x:any)=>typeof x==='string')||!v.products.every((x:any)=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.category==='string'&&Number.isInteger(x.stock)&&x.stock>=0&&(x.price===null||(typeof x.price==='number'&&Number.isFinite(x.price)&&x.price>=0))))throw Error('بيانات الأصناف غير صالحة');return locked(()=>{const current=readStore();localStorage.setItem(KEY+'-before-restore',JSON.stringify(current));const next={...v,revision:current.revision+1};localStorage.setItem(KEY,JSON.stringify(next));return next;});}
