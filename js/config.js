// ====== CONFIGURAÇÕES DO PROJETO ======

// MODO LOCAL (localStorage) por padrão.
// Para usar Firebase, mude para true e cole sua configuração.
export const SETTINGS = {
  useFirebase: false,

  // Admin local (quando useFirebase=false)
  // Troque depois: login local via PIN.
  localAdminPin: "1234",

  // Cole aqui a sua config do Firebase (do Console)
  firebaseConfig: {
    apiKey: "AIzaSyBOzFDUSP3_zVLQZ2jqCKY5kudYf6_sj_k",
    authDomain: "lojamonica01.firebaseapp.com",
    projectId: "lojamonica01",
    storageBucket: "lojamonica01.firebasestorage.app",
    messagingSenderId: "469910299006",
    appId: "1:469910299006:web:62c0594ded7aebe9da132f"
  },

  // Email(s) permitidos como admin (quando useFirebase=true)
  adminEmails: ["admin@monica.com"],

  currency: "BRL",
};
