import { useEffect, useMemo, useState } from "react";

import {
  crearSupabaseTaller,
  supabasePublic,
} from "./lib/supabaseClient";

import ReservaForm from "./components/ReservaForm";
import FechaHora from "./components/FechaHora";
import Confirmacion from "./components/Confirmacion";
import PanelTaller from "./components/PanelTaller";
import LoginTaller from "./components/LoginTaller";

import "./App.css";

function App() {
  const params = new URLSearchParams(window.location.search);

  const tallerId = Number(params.get("taller")) || 1;
  const modo = params.get("modo");

  const esModoTaller = modo === "taller";

  // Cada taller utiliza su propio cliente de Supabase
  // y por tanto su propia sesión.
  const supabaseTaller = useMemo(
    () => crearSupabaseTaller(tallerId),
    [tallerId]
  );

  const [pantallaCliente, setPantallaCliente] = useState(1);

  const [usuarioTaller, setUsuarioTaller] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const [reserva, setReserva] = useState({
    taller_id: tallerId,
    matricula: "",
    nombre: "",
    telefono: "",
    vehiculo: "",
    servicio: "",
    descripcion: "",
    kilometros: "",
    cantidad_neumaticos: "",
    dia: "",
    hora: "",
  });

  // ========================================
  // COMPROBAR SESIÓN DEL TALLER
  // ========================================

  useEffect(() => {
    setUsuarioTaller(null);
    setCargandoSesion(true);

    async function comprobarSesion() {
      const {
        data: { session },
      } = await supabaseTaller.auth.getSession();

      setUsuarioTaller(session?.user || null);
      setCargandoSesion(false);
    }

    comprobarSesion();

    const {
      data: { subscription },
    } = supabaseTaller.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          setUsuarioTaller(null);
        }

        if (
          event === "TOKEN_REFRESHED" &&
          session?.user
        ) {
          setUsuarioTaller(session.user);
        }

        setCargandoSesion(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseTaller]);

  // ========================================
  // REINICIAR RESERVA SI CAMBIA DE TALLER
  // ========================================

  useEffect(() => {
    setReserva({
      taller_id: tallerId,
      matricula: "",
      nombre: "",
      telefono: "",
      vehiculo: "",
      servicio: "",
      descripcion: "",
      kilometros: "",
      dia: "",
      hora: "",
    });

    setPantallaCliente(1);
  }, [tallerId]);

  // ========================================
  // LIMPIAR RESERVA
  // ========================================

  function limpiarReserva() {
    setReserva({
      taller_id: tallerId,
      matricula: "",
      nombre: "",
      telefono: "",
      vehiculo: "",
      servicio: "",
      descripcion: "",
      kilometros: "",
      dia: "",
      hora: "",
    });
  }

  // ========================================
  // GUARDAR RESERVA
  // ========================================

  async function guardarReserva() {
    const kilometrosNormalizados =
      Number(reserva.taller_id) === 1 &&
      String(reserva.kilometros ?? "").trim() !== ""
        ? Number(reserva.kilometros)
        : null;

    const descripcionFinal =
      Number(reserva.taller_id) === 2 &&
      reserva.servicio === "Neumáticos"
        ? `${reserva.cantidad_neumaticos || ""} neumático${
            String(reserva.cantidad_neumaticos) === "1" ? "" : "s"
          } · Medidas: ${
            reserva.descripcion?.trim() || "No indicadas"
          }`
        : reserva.descripcion || null;

    const { error } = await supabasePublic.rpc(
      "crear_reserva_publica",
      {
        p_taller_id: reserva.taller_id,
        p_matricula: reserva.matricula,
        p_nombre: reserva.nombre,
        p_telefono: reserva.telefono,
        p_vehiculo: reserva.vehiculo,
        p_servicio: reserva.servicio,
        p_descripcion: descripcionFinal,
        p_dia: reserva.dia,
        p_hora: reserva.hora,
        p_kilometros: kilometrosNormalizados,
      }
    );

    if (error) {
      console.error("Error guardando reserva:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      alert(error.message);
      return false;
    }

    return true;
  }

  // ========================================
  // MODO TALLER
  // ========================================

  if (esModoTaller) {
    if (cargandoSesion) {
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
          }}
        >
          Cargando...
        </div>
      );
    }

    if (!usuarioTaller) {
      return (
        <LoginTaller
          supabaseClient={supabaseTaller}
          tallerId={tallerId}
          onLogin={setUsuarioTaller}
        />
      );
    }

    return (
  <PanelTaller
    supabaseClient={supabaseTaller}
    tallerId={tallerId}
  />
);
  }

  // ========================================
  // CLIENTE - PASO 1
  // ========================================

  if (pantallaCliente === 1) {
    return (
      <ReservaForm
        reserva={reserva}
        setReserva={setReserva}
        continuar={() => setPantallaCliente(2)}
      />
    );
  }

  // ========================================
  // CLIENTE - PASO 2
  // ========================================

  if (pantallaCliente === 2) {
    return (
      <FechaHora
        reserva={reserva}
        setReserva={setReserva}
        volver={() => setPantallaCliente(1)}
        continuar={() => setPantallaCliente(3)}
      />
    );
  }

  // ========================================
  // CLIENTE - PASO 3
  // ========================================

  return (
    <Confirmacion
      reserva={reserva}
      guardarReserva={guardarReserva}
      volverMenu={() => {
        limpiarReserva();
        setPantallaCliente(1);
      }}
    />
  );
}

export default App;
