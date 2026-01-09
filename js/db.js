import { SETTINGS } from "./config.js";

const LS_KEYS = {
  products: "mhf_products_v1",
  orders: "mhf_orders_v1",
};

function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function money(n){
  return Number(n || 0);
}

function seedProducts(){
  return [
    { id: uid("p"), name:"Banana Prata", category:"Frutas", unit:"kg", price: 7.99, stock: 35, featured:true, desc:"Doce, firme e perfeita pro dia a dia." },
    { id: uid("p"), name:"Maçã Gala", category:"Frutas", unit:"kg", price: 11.90, stock: 22, featured:true, desc:"Crocante e suculenta." },
    { id: uid("p"), name:"Laranja Pera", category:"Frutas", unit:"kg", price: 6.49, stock: 40, featured:false, desc:"Ótima para sucos." },
    { id: uid("p"), name:"Alface Crespa", category:"Verduras", unit:"un", price: 4.50, stock: 28, featured:true, desc:"Fresquinha e crocante." },
    { id: uid("p"), name:"Rúcula", category:"Verduras", unit:"maço", price: 5.20, stock: 18, featured:false, desc:"Sabor marcante." },
    { id: uid("p"), name:"Tomate Italiano", category:"Legumes", unit:"kg", price: 9.80, stock: 26, featured:true, desc:"Ideal pra saladas e molhos." },
    { id: uid("p"), name:"Cenoura", category:"Legumes", unit:"kg", price: 6.90, stock: 30, featured:false, desc:"Versátil, doce e nutritiva." },
    { id: uid("p"), name:"Batata Inglesa", category:"Legumes", unit:"kg", price: 5.99, stock: 55, featured:false, desc:"Para cozinhar, assar ou fritar." },
    { id: uid("p"), name:"Cesta da Semana (Economia)", category:"Cestas", unit:"un", price: 49.90, stock: 12, featured:true, desc:"Seleção variada com preço especial." },
    { id: uid("p"), name:"Cheiro-Verde", category:"Temperos", unit:"maço", price: 3.90, stock: 40, featured:false, desc:"Sabor e aroma na medida." },
  ];
}

function readLS(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}
function writeLS(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export async function dbInit(){
  // Local seed
  if(!localStorage.getItem(LS_KEYS.products)){
    writeLS(LS_KEYS.products, seedProducts());
  }
  if(!localStorage.getItem(LS_KEYS.orders)){
    writeLS(LS_KEYS.orders, []);
  }
}

// ===== PRODUCTS =====
export async function getProducts(){
  if(SETTINGS.useFirebase){
    // Firebase (opcional) - implementado no fim do arquivo via lazy init
    return await fbGetProducts();
  }
  return readLS(LS_KEYS.products, []);
}

export async function saveProduct(product){
  if(SETTINGS.useFirebase){
    return await fbSaveProduct(product);
  }
  const list = readLS(LS_KEYS.products, []);
  const idx = list.findIndex(p => p.id === product.id);
  if(idx >= 0) list[idx] = { ...list[idx], ...product };
  else list.unshift(product);
  writeLS(LS_KEYS.products, list);
  return product;
}

export async function deleteProduct(productId){
  if(SETTINGS.useFirebase){
    return await fbDeleteProduct(productId);
  }
  const list = readLS(LS_KEYS.products, []).filter(p => p.id !== productId);
  writeLS(LS_KEYS.products, list);
}

export async function updateStock(productId, delta){
  if(SETTINGS.useFirebase){
    return await fbUpdateStock(productId, delta);
  }
  const list = readLS(LS_KEYS.products, []);
  const p = list.find(x => x.id === productId);
  if(!p) return;
  p.stock = Math.max(0, money(p.stock) + money(delta));
  writeLS(LS_KEYS.products, list);
}

// ===== ORDERS =====
export async function createOrder(order){
  if(SETTINGS.useFirebase){
    return await fbCreateOrder(order);
  }
  const orders = readLS(LS_KEYS.orders, []);
  orders.unshift(order);
  writeLS(LS_KEYS.orders, orders);
  return order;
}

export async function getOrders(){
  if(SETTINGS.useFirebase){
    return await fbGetOrders();
  }
  return readLS(LS_KEYS.orders, []);
}

export async function updateOrderStatus(orderId, status){
  if(SETTINGS.useFirebase){
    return await fbUpdateOrderStatus(orderId, status);
  }
  const orders = readLS(LS_KEYS.orders, []);
  const o = orders.find(x => x.id === orderId);
  if(!o) return;
  o.status = status;
  writeLS(LS_KEYS.orders, orders);
}

// ===== Helpers =====
export function makeId(prefix="o"){ return uid(prefix); }
export function nowISO(){ return new Date().toISOString(); }

// ===== Firebase (Opcional) =====
// Implementação com CDN modular (sem bundler) - carregada dinamicamente quando SETTINGS.useFirebase=true
let fb = null;

async function fbInit(){
  if(fb) return fb;

  const [
    { initializeApp },
    { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, increment },
    { getAuth },
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"),
  ]);

  const app = initializeApp(SETTINGS.firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  fb = { db, auth, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, increment };
  return fb;
}

async function fbGetProducts(){
  const { db, collection, getDocs } = await fbInit();
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function fbSaveProduct(product){
  const { db, doc, setDoc } = await fbInit();
  const id = product.id || makeId("p");
  await setDoc(doc(db, "products", id), { ...product, id }, { merge: true });
  return { ...product, id };
}
async function fbDeleteProduct(productId){
  const { db, doc, deleteDoc } = await fbInit();
  await deleteDoc(doc(db, "products", productId));
}
async function fbUpdateStock(productId, delta){
  const { db, doc, updateDoc, increment } = await fbInit();
  await updateDoc(doc(db, "products", productId), { stock: increment(delta) });
}

async function fbCreateOrder(order){
  const { db, doc, setDoc } = await fbInit();
  await setDoc(doc(db, "orders", order.id), order, { merge: true });
  return order;
}
async function fbGetOrders(){
  const { db, collection, getDocs } = await fbInit();
  const snap = await getDocs(collection(db, "orders"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b)=> (b.createdAt || "").localeCompare(a.createdAt || ""));
}
async function fbUpdateOrderStatus(orderId, status){
  const { db, doc, updateDoc } = await fbInit();
  await updateDoc(doc(db, "orders", orderId), { status });
}
