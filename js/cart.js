import { toast } from "./ui.js";

const CART_KEY = "mhf_cart_v1";

function read(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch{ return []; }
}
function write(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function cartGet(){
  return read();
}
export function cartClear(){
  write([]);
}
export function cartGetCount(){
  return read().reduce((sum, it)=> sum + Number(it.qty || 0), 0);
}
export function cartGetTotal(){
  return read().reduce((sum, it)=> sum + Number(it.qty||0) * Number(it.price||0), 0);
}
export function cartAdd(product, qty=1){
  const items = read();
  const idx = items.findIndex(x => x.id === product.id);
  if(idx >= 0){
    items[idx].qty += qty;
  }else{
    items.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      category: product.category,
      qty: qty,
    });
  }
  write(items);
}
export function cartSetQty(id, qty){
  const items = read();
  const it = items.find(x => x.id === id);
  if(!it) return;
  it.qty = Math.max(1, Math.floor(Number(qty || 1)));
  write(items);
}
export function cartRemove(id){
  const items = read().filter(x => x.id !== id);
  write(items);
  toast("Item removido.");
}
