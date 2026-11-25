/* =========================================================
   PADRES Y TUTORES — SINCRONIZACIÓN CENTRAL SUPABASE
   Rama de prueba modernizacion-visual.
   Conserva intacta la clave local antigua:
   padresTutoresNuevaAlianza.
========================================================= */
(function () {
  "use strict";

  const KEY_PADRES_TUTORES_CENTRAL = "padresTutoresSupabaseNuevaAlianza";

  function ptSesion() {
    try { return JSON.parse(sessionStorage.getItem("sesionNuevaAlianza") || "null"); }
    catch (_) { return null; }
  }

  function ptCache() {
    return typeof obtenerDatos === "function"
      ? obtenerDatos(KEY_PADRES_TUTORES_CENTRAL)
      : [];
  }

  function ptEstudianteLocal(id) {
    return obtenerDatos(KEY_ESTUDIANTES).find(function (e) {
      return String(e.id) === String(id);
    });
  }

  function ptNormalizar(v) {
    return String(v || "").trim().toLocaleLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  }

  function ptMapRow(row) {
    const estudiante = obtenerDatos(KEY_ESTUDIANTES).find(function (e) {
      return String(e.supabaseId || "") === String(row.estudiante_id || "");
    });
    return {
      id: row.id,
      supabaseId: row.id,
      anio: String(row.anio),
      estudianteId: estudiante ? String(estudiante.id) : "",
      estudianteSupabaseId: row.estudiante_id,
      estudianteNombre: row.estudiante_nombre || estudiante?.nombre || "Estudiante",
      codigoCentro: row.codigo_centro,
      parentesco: row.parentesco || "Madre",
      nombre: row.nombre || "",
      cedula: row.cedula || "",
      telefono: row.telefono || "",
      correo: row.correo || "",
      ocupacion: row.ocupacion || "",
      direccion: row.direccion || "",
      emergencia: row.emergencia || "",
      telefonoEmergencia: row.telefono_emergencia || "",
      principal: row.principal || "No",
      estado: row.estado || "Activo",
      observacion: row.observacion || "",
      actualizado: row.updated_at || row.created_at || ""
    };
  }

  async function NA_syncPadresTutores() {
    const client = await window.NA_init();
    const ses = ptSesion();
    if (!ses || !ses.authUserId) throw new Error("Debe iniciar sesión para sincronizar Padres y tutores.");

    const { data, error } = await client.from("padres_tutores")
      .select("*")
      .order("anio", { ascending: false })
      .order("nombre", { ascending: true });

    if (error) throw error;

    const rows = (data || []).map(ptMapRow);
    guardarDatos(KEY_PADRES_TUTORES_CENTRAL, rows);
    return rows;
  }
  window.NA_syncPadresTutores = NA_syncPadresTutores;

  // El módulo consulta exclusivamente la copia sincronizada. La clave local
  // histórica permanece intacta y no se importa automáticamente.
  window.obtenerPadresTutoresVisibles = function () {
    const ses = ptSesion();
    const rows = ptCache();
    if (!ses || ses.rol === "Director") return rows;
    if (ses.rol !== "Docente") return [];
    const codigo = String(ses.codigoCentro || "").trim().replace(/\.0$/, "");
    return rows.filter(function (x) {
      return String(x.codigoCentro || "").trim().replace(/\.0$/, "") === codigo;
    });
  };

  window.editarPadreTutor = function (id) {
    const x = ptCache().find(function (a) { return String(a.id) === String(id); });
    if (!x) return;
    const estudiante = ptEstudianteLocal(x.estudianteId);
    if (!puedeGestionarPadreTutor(estudiante)) {
      alert("Solo puede editar registros de familias de estudiantes de su propio centro educativo.");
      return;
    }
    document.getElementById("padreId").value = x.id;
    document.getElementById("padreAnio").value = x.anio;
    document.getElementById("padreNombre").value = x.nombre || "";
    document.getElementById("padreParentesco").value = x.parentesco || "Madre";
    document.getElementById("padreCedula").value = x.cedula || "";
    document.getElementById("padreTelefono").value = x.telefono || "";
    document.getElementById("padreCorreo").value = x.correo || "";
    document.getElementById("padreOcupacion").value = x.ocupacion || "";
    document.getElementById("padreDireccion").value = x.direccion || "";
    document.getElementById("padreEmergencia").value = x.emergencia || "";
    document.getElementById("padreTelefonoEmergencia").value = x.telefonoEmergencia || "";
    document.getElementById("padrePrincipal").value = x.principal || "No";
    document.getElementById("padreEstado").value = x.estado || "Activo";
    document.getElementById("padreObservacion").value = x.observacion || "";
    cargarEstudiantesPadresTutores();
    document.getElementById("padreEstudiante").value = x.estudianteId;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.guardarPadreTutor = async function () {
    const id = document.getElementById("padreId")?.value || "";
    const anioTexto = document.getElementById("padreAnio")?.value || new Date().getFullYear();
    const anio = Number(anioTexto);
    const estudianteId = document.getElementById("padreEstudiante")?.value || "";
    const estudiante = ptEstudianteLocal(estudianteId);
    const nombre = limpiarTexto(document.getElementById("padreNombre")?.value || "");

    if (!estudianteId || !estudiante) { alert("Seleccione un estudiante."); return; }
    if (!puedeGestionarPadreTutor(estudiante)) {
      alert("Solo puede registrar o actualizar familias de estudiantes de su propio centro educativo.");
      return;
    }
    if (!estudiante.supabaseId) {
      alert("No se pudo identificar el estudiante en la base central. Actualice el módulo e inténtelo nuevamente.");
      return;
    }
    if (!nombre) { alert("Ingrese el nombre del padre o tutor."); return; }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      alert("Seleccione un año válido."); return;
    }

    const client = await window.NA_init();
    const parentesco = document.getElementById("padreParentesco")?.value || "Madre";
    const principal = document.getElementById("padrePrincipal")?.value || "No";
    let registroId = id;
    const cache = ptCache();

    if (registroId) {
      const existente = cache.find(function (x) { return String(x.id) === String(registroId); });
      const estudianteAnterior = existente && ptEstudianteLocal(existente.estudianteId);
      if (!existente || !puedeGestionarPadreTutor(estudianteAnterior)) {
        alert("No tiene permiso para modificar este registro.");
        return;
      }
    } else {
      const coincidencias = cache.filter(function (x) {
        return String(x.estudianteId) === String(estudianteId) &&
          String(x.anio) === String(anio) &&
          ptNormalizar(x.nombre) === ptNormalizar(nombre) &&
          ptNormalizar(x.parentesco || "Madre") === ptNormalizar(parentesco);
      });
      if (coincidencias.length) {
        const existente = coincidencias.find(function (x) { return String(x.principal).toLowerCase() === "sí"; }) || coincidencias[0];
        registroId = existente.id;
      }
    }

    const row = {
      estudiante_id: estudiante.supabaseId,
      estudiante_nombre: estudiante.nombre || estudiante.nombre_completo || "",
      codigo_centro: String(estudiante.codigo_centro || estudiante.codigoCentro || "").trim().replace(/\.0$/, ""),
      anio: anio,
      parentesco: parentesco,
      nombre: nombre,
      cedula: limpiarTexto(document.getElementById("padreCedula")?.value || ""),
      telefono: limpiarTexto(document.getElementById("padreTelefono")?.value || ""),
      correo: limpiarTexto(document.getElementById("padreCorreo")?.value || ""),
      ocupacion: limpiarTexto(document.getElementById("padreOcupacion")?.value || ""),
      direccion: limpiarTexto(document.getElementById("padreDireccion")?.value || ""),
      emergencia: limpiarTexto(document.getElementById("padreEmergencia")?.value || ""),
      telefono_emergencia: limpiarTexto(document.getElementById("padreTelefonoEmergencia")?.value || ""),
      principal: principal,
      estado: document.getElementById("padreEstado")?.value || "Activo",
      observacion: limpiarTexto(document.getElementById("padreObservacion")?.value || ""),
      updated_at: new Date().toISOString()
    };

    try {
      if (principal === "Sí") {
        let q = client.from("padres_tutores").update({
          principal: "No", updated_at: new Date().toISOString()
        }).eq("estudiante_id", estudiante.supabaseId).eq("anio", anio);
        if (registroId) q = q.neq("id", registroId);
        const { error: principalError } = await q;
        if (principalError) throw principalError;
      }

      let result;
      if (registroId) {
        result = await client.from("padres_tutores").update(row)
          .eq("id", registroId).select("*").single();
      } else {
        result = await client.from("padres_tutores").insert(row).select("*").single();
      }
      if (result.error) throw result.error;

      registrarAuditoria(registroId ? "Editar" : "Crear", "Padres/Tutores",
        registroId ? "Actualización central de padre/tutor" : "Nuevo padre/tutor central",
        result.data?.id || registroId, { anio: anio });
      await NA_syncPadresTutores();
      limpiarPadreTutor();
      cargarPadresTutores();
      alert(registroId ? "Registro actualizado correctamente en la base central." : "Registro guardado correctamente en la base central.");
    } catch (error) {
      console.error("Padres y tutores - guardar:", error);
      alert("No se pudo guardar el registro central. " + (error?.message || "Revise la conexión y los permisos."));
      try { await NA_syncPadresTutores(); cargarPadresTutores(); } catch (_) {}
    }
  };

  window.eliminarPadreTutor = async function (id) {
    if (!exigirDirector()) return;
    const x = ptCache().find(function (a) { return String(a.id) === String(id); });
    if (!x) return;
    if (!confirm("¿Eliminar el registro de padre/tutor de " + x.estudianteNombre + "?")) return;
    try {
      const client = await window.NA_init();
      const { error } = await client.from("padres_tutores").delete().eq("id", id);
      if (error) throw error;
      registrarAuditoria("Eliminar", "Padres/Tutores", "Eliminación central de padre/tutor", id, { anio: x.anio });
      await NA_syncPadresTutores();
      cargarPadresTutores();
    } catch (error) {
      console.error("Padres y tutores - eliminar:", error);
      alert("No se pudo eliminar el registro central. " + (error?.message || ""));
    }
  };

  window.depurarDuplicadosPadresTutores = async function () {
    if (!exigirDirector()) return;
    const rows = ptCache();
    const grupos = new Map();
    rows.forEach(function (x) {
      const key = [x.estudianteId, x.anio, ptNormalizar(x.nombre), ptNormalizar(x.parentesco)].join("|");
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(x);
    });
    const duplicados = [];
    grupos.forEach(function (grupo) {
      if (grupo.length < 2) return;
      grupo.sort(function (a, b) {
        return (String(b.principal).toLowerCase() === "sí" ? 1 : 0) -
          (String(a.principal).toLowerCase() === "sí" ? 1 : 0);
      });
      const conservar = grupo[0];
      grupo.slice(1).forEach(function (d) { duplicados.push({ conservar: conservar, duplicado: d }); });
    });
    if (!duplicados.length) {
      alert("No se encontraron duplicados exactos en la base central.");
      return;
    }
    if (!confirm("Se encontraron " + duplicados.length + " duplicado(s) exacto(s). Se conservará un registro por estudiante, año, nombre y parentesco, completando los campos vacíos. ¿Desea continuar?")) return;

    try {
      const client = await window.NA_init();
      for (const item of duplicados) {
        const keep = item.conservar;
        const dup = item.duplicado;
        const merged = {};
        ["cedula", "telefono", "correo", "ocupacion", "direccion", "emergencia", "telefonoEmergencia", "observacion"].forEach(function (field) {
          if (!keep[field] && dup[field]) merged[field === "telefonoEmergencia" ? "telefono_emergencia" : field] = dup[field];
        });
        if (String(dup.principal).toLowerCase() === "sí") merged.principal = "Sí";
        if (Object.keys(merged).length) {
          merged.updated_at = new Date().toISOString();
          const { error: updateError } = await client.from("padres_tutores").update(merged).eq("id", keep.id);
          if (updateError) throw updateError;
        }
        const { error: deleteError } = await client.from("padres_tutores").delete().eq("id", dup.id);
        if (deleteError) throw deleteError;
      }
      registrarAuditoria("Editar", "Padres/Tutores", "Depuración central de " + duplicados.length + " duplicado(s)", "depuracion-duplicados", { eliminados: duplicados.length });
      await NA_syncPadresTutores();
      cargarPadresTutores();
      alert("Corrección terminada. Se consolidaron " + duplicados.length + " duplicado(s) exacto(s) en la base central.");
    } catch (error) {
      console.error("Padres y tutores - depurar:", error);
      alert("La depuración no se completó. " + (error?.message || ""));
      try { await NA_syncPadresTutores(); cargarPadresTutores(); } catch (_) {}
    }
  };

  // Refresca al entrar al módulo y después de iniciar sesión, sin afectar el login
  // si el endpoint está temporalmente indisponible.
  const oldLogin = window.iniciarSesion;
  if (typeof oldLogin === "function") {
    window.iniciarSesion = async function () {
      await oldLogin.apply(this, arguments);
      const ses = ptSesion();
      if (!ses?.authUserId) return;
      try {
        await NA_syncPadresTutores();
        if (typeof cargarPadresTutores === "function") cargarPadresTutores();
      } catch (error) {
        console.error("No se pudo sincronizar Padres y tutores al iniciar sesión:", error);
      }
    };
  }

  const oldMostrarSeccion = window.mostrarSeccion;
  if (typeof oldMostrarSeccion === "function") {
    window.mostrarSeccion = function (id, boton) {
      const result = oldMostrarSeccion.apply(this, arguments);
      if (id === "padresTutores" && ptSesion()?.authUserId) {
        NA_syncPadresTutores().then(function () {
          if (document.getElementById("padresTutores")?.classList.contains("active")) {
            cargarEstudiantesPadresTutores();
            cargarPadresTutores();
          }
        }).catch(function (error) {
          console.error("No se pudo actualizar Padres y tutores:", error);
          alert("No se pudo actualizar Padres y tutores desde la base central. " + (error?.message || ""));
        });
      }
      return result;
    };
  }
})();
