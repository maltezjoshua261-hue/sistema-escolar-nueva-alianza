// V11.4 - Configuración de conexión, autenticación y recuperación de contraseña Supabase
// Publishable Key: apta para uso en el navegador.
// NO colocar aquí una secret key ni una service_role key.

window.NUEVA_ALIANZA_SUPABASE = {
  url: "https://qgorjwwhludvzwvrgecz.supabase.co",
  publishableKey: "sb_publishable_pcK1oUF6hSjngE2zHePKuQ_H81RtQHL"
};

window.addEventListener("load", function(){
  const userInput = document.getElementById("loginUser");
  const passInput = document.getElementById("loginPass");
  const errorBox = document.getElementById("loginError");
  let recoveryMode = false;

  if(userInput){ userInput.type="email"; userInput.placeholder="Correo electrónico"; }

  if(typeof window.supabase === "undefined"){
    if(errorBox) errorBox.textContent="No se pudo cargar el servicio de autenticación.";
    return;
  }

  function obtenerCliente(){ return window.NUEVA_ALIANZA_SUPABASE_CLIENT || null; }

  // V11.27.4 - Sincronización segura de producción.
  // Si Supabase está completamente vacío, se pueden retirar copias antiguas del navegador.
  // Si ya existen datos reales en Supabase, nunca se borran datos locales por esta rutina.
  async function sincronizarProduccionSegura(cliente){
    try{
      const tablas=["estudiantes","docentes","asistencias","calificaciones"];
      const resultados=await Promise.all(tablas.map(t=>cliente.from(t).select("id",{count:"exact",head:true})));
      const error=resultados.find(r=>r.error);
      if(error?.error) throw error.error;
      const todoVacio=resultados.every(r=>Number(r.count||0)===0);
      if(todoVacio){
        ["estudiantesNuevaAlianza","docentesNuevaAlianza","asistenciasNuevaAlianza","calificacionesNuevaAlianza","auditoriaNuevaAlianza"].forEach(k=>localStorage.removeItem(k));
        localStorage.setItem("NA_produccion_limpia_v11274","1");
      }
      for(let i=0;i<50;i++){
        if(typeof window.NA_syncTodo==="function"){
          await window.NA_syncTodo();
          localStorage.removeItem("auditoriaNuevaAlianza");
          return;
        }
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      console.warn("V11.27.4 - NA_syncTodo aún no está disponible.");
    }catch(error){
      console.error("V11.27.4 - Error en sincronización segura:",error);
    }
  }

  async function esperarCliente(intentos=50){
    for(let i=0;i<intentos;i++){
      const cliente=obtenerCliente();
      if(cliente) return cliente;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    return null;
  }

  function mostrarRecuperacion(cliente){
    if(document.getElementById("centralRecoveryBox")) return;
    recoveryMode=true;
    const box=document.createElement("div");
    box.id="centralRecoveryBox";
    box.style.cssText="position:fixed;inset:0;background:rgba(18,59,109,.88);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;";
    box.innerHTML=`
      <div style="background:#fff;width:390px;max-width:95%;padding:30px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.25);">
        <h2 style="color:#123b6d;text-align:center;margin-bottom:8px;">Nueva Alianza</h2>
        <p style="text-align:center;color:#666;margin-bottom:20px;">Restablecer contraseña</p>
        <label style="font-weight:bold;font-size:13px;">Nueva contraseña</label>
        <input id="recoveryPassword1" type="password" placeholder="Nueva contraseña" style="width:100%;padding:11px;margin:6px 0 12px;border:1px solid #d1d5db;border-radius:8px;">
        <label style="font-weight:bold;font-size:13px;">Confirmar contraseña</label>
        <input id="recoveryPassword2" type="password" placeholder="Repita la contraseña" style="width:100%;padding:11px;margin:6px 0 12px;border:1px solid #d1d5db;border-radius:8px;">
        <div id="recoveryMessage" style="min-height:20px;color:#dc3545;font-size:13px;margin-bottom:10px;"></div>
        <button id="recoverySave" style="width:100%;background:#0d6efd;color:#fff;padding:11px;border:0;border-radius:8px;font-weight:bold;">Guardar nueva contraseña</button>
      </div>`;
    document.body.appendChild(box);

    document.getElementById("recoverySave").onclick=async function(){
      const p1=document.getElementById("recoveryPassword1").value;
      const p2=document.getElementById("recoveryPassword2").value;
      const msg=document.getElementById("recoveryMessage");
      if(p1.length<6){ msg.textContent="La contraseña debe tener al menos 6 caracteres."; return; }
      if(p1!==p2){ msg.textContent="Las contraseñas no coinciden."; return; }
      this.disabled=true; this.textContent="Guardando..."; msg.textContent="";
      const {error}=await cliente.auth.updateUser({password:p1});
      if(error){
        console.error("V11.4 - Error al actualizar contraseña:",error);
        msg.textContent="No se pudo cambiar la contraseña. Solicite un nuevo enlace de recuperación.";
        this.disabled=false; this.textContent="Guardar nueva contraseña"; return;
      }
      alert("Contraseña actualizada correctamente. Ahora puede ingresar al sistema.");
      await cliente.auth.signOut();
      window.location.href=window.location.origin+window.location.pathname;
    };
  }

  async function cargarPerfilSesion(cliente,user){
    const {data:perfil,error:errorPerfil}=await cliente.from("perfiles")
      .select("id,nombre_completo,usuario,rol,activo,docente_id,codigo_centro")
      .eq("id",user.id).single();

    if(errorPerfil || !perfil || !perfil.activo){
      console.error("V11.4 - Perfil no encontrado o inactivo:",errorPerfil);
      return null;
    }

    if(!["Director","Docente"].includes(String(perfil.rol))) return null;

    const sesion={
      usuario:perfil.usuario || user.email,
      rol:perfil.rol,
      docenteId:String(perfil.docente_id||""),
      codigoCentro:String(perfil.codigo_centro||""),
      authUserId:user.id,
      nombreCompleto:perfil.nombre_completo || ""
    };

    sessionStorage.setItem("sesionNuevaAlianza",JSON.stringify(sesion));
    window.NUEVA_ALIANZA_SESION=sesion;
    return sesion;
  }

  window.iniciarSesion = async function(){
    const email=String(userInput?.value||"").trim();
    const password=String(passInput?.value||"").trim();
    if(!email || !password){ if(errorBox) errorBox.textContent="Ingrese el correo y la contraseña."; return; }
    if(!email.includes("@")){ if(errorBox) errorBox.textContent="Para V11.4 debe ingresar el correo usado en Supabase."; return; }
    if(errorBox) errorBox.textContent="Verificando acceso...";
    try{
      const cliente=await esperarCliente();
      if(!cliente){ if(errorBox) errorBox.textContent="No se pudo conectar con Supabase. Recargue la página e intente nuevamente."; return; }
      const {data,error}=await cliente.auth.signInWithPassword({email,password});
      if(error){ console.error("V11.4 - Error de autenticación:",error); if(errorBox) errorBox.textContent="Correo o contraseña incorrectos."; return; }
      const user=data?.user;
      if(!user){ if(errorBox) errorBox.textContent="No se recibió la cuenta autenticada."; return; }

      const sesion=await cargarPerfilSesion(cliente,user);
      if(!sesion){
        await cliente.auth.signOut();
        if(errorBox) errorBox.textContent="La cuenta no tiene un perfil escolar activo o autorizado.";
        return;
      }

      if(errorBox) errorBox.textContent="";
      await sincronizarProduccionSegura(cliente);
      document.getElementById("loginScreen").style.display="none";
      document.getElementById("app").style.display="flex";
      try{ cargarTodo(); aplicarPermisos(); }catch(errorCarga){ console.error("V11.4 - Error al cargar el panel:",errorCarga); aplicarPermisos(); }
    }catch(error){ console.error("V11.4 - Error inesperado en login:",error); if(errorBox) errorBox.textContent="No fue posible iniciar sesión. Intente nuevamente."; }
  };

  window.cerrarSesion = async function(){
    try{ const cliente=obtenerCliente(); if(cliente) await cliente.auth.signOut(); }catch(error){ console.error("V11.4 - Error al cerrar sesión:",error); }
    sessionStorage.removeItem("sesionNuevaAlianza");
    const app=document.getElementById("app"), login=document.getElementById("loginScreen");
    if(app) app.style.display="none"; if(login) login.style.display="flex";
    if(userInput) userInput.value=""; if(passInput) passInput.value=""; if(errorBox) errorBox.textContent="";
  };

  (async function iniciarCentral(){
    try{
      const cliente=await esperarCliente();
      if(!cliente) return;
      cliente.auth.onAuthStateChange((event)=>{ if(event==="PASSWORD_RECOVERY") mostrarRecuperacion(cliente); });
      const {data,error}=await cliente.auth.getSession();
      if(error || !data?.session) return;
      if(recoveryMode) return;
      const user=data.session.user;
      const sesion=await cargarPerfilSesion(cliente,user);
      if(!sesion) return;
      await sincronizarProduccionSegura(cliente);
      document.getElementById("loginScreen").style.display="none";
      document.getElementById("app").style.display="flex";
      try{ cargarTodo(); aplicarPermisos(); }catch(errorCarga){ console.error("V11.4 - Error al restaurar sesión central:",errorCarga); aplicarPermisos(); }
    }catch(error){ console.error("V11.4 - Error al iniciar autenticación central:",error); }
  })();
});