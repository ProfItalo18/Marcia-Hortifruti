import { SETTINGS } from "./config.js";
import { toast } from "./ui.js";

const AUTH_KEY = "mhf_admin_local_v1";

export async function loginLocal(pin){
  if(pin === SETTINGS.localAdminPin){
    localStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}

export async function logout(){
  if(SETTINGS.useFirebase){
    const [{ getAuth, signOut }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js")
    ]);
    const { auth } = await import("./db.js").then(()=>({})).catch(()=>({}));
    // Se auth do db.js não estiver exposto, fazemos fallback:
    try{
      const a = getAuth();
      await signOut(a);
    }catch{}
  }
  localStorage.removeItem(AUTH_KEY);
}

export async function isAdmin(){
  if(SETTINGS.useFirebase){
    // Firebase Auth: valida email
    const [{ getAuth, onAuthStateChanged }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js")
    ]);

    const auth = getAuth();
    const user = await new Promise((resolve)=>{
      const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); resolve(u || null); });
    });
    if(!user) return false;
    return SETTINGS.adminEmails.includes(user.email || "");
  }
  return localStorage.getItem(AUTH_KEY) === "1";
}

export async function requireAdmin(){
  const ok = await isAdmin();
  if(!ok){
    toast("Acesso restrito (admin).");
    location.href = "login.html";
    throw new Error("Not admin");
  }
}

export async function loginFirebase(email, password){
  // Requer SETTINGS.useFirebase=true e config preenchida
  const [
    { initializeApp },
    { getAuth, signInWithEmailAndPassword },
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"),
  ]);

  initializeApp(SETTINGS.firebaseConfig);
  const auth = getAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);

  const isOk = SETTINGS.adminEmails.includes(cred.user.email || "");
  if(!isOk){
    toast("Este usuário não está autorizado como admin.");
  }
  return isOk;
}
