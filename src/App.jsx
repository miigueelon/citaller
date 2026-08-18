import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import logo from "./assets/logo.png";

import ReservaForm from "./components/ReservaForm";
import FechaHora from "./components/FechaHora";
import Confirmacion from "./components/Confirmacion";
import PanelTaller from "./components/PanelTaller";

import "./App.css";

function App() {

  const [vista, setVista] = useState("inicio");
  const [pantallaCliente, setPantallaCliente] = useState(1);

  const [reserva, setReserva] = useState({
  matricula: "",
  nombre: "",
  telefono: "",
  vehiculo: "",
  servicio: "",
  descripcion: "",
  dia: "",
  hora: "",
});
  function limpiarReserva() {
  setReserva({
    matricula: "",
    nombre: "",
    telefono: "",
    vehiculo: "",
    servicio: "",
    dia: "",
    hora: "",
    descripcion: "",
  });
}
  async function guardarReserva() {

  const { error } = await supabase
    .from("reservas")
    .insert([
      {
        taller_id: 1,
        matricula: reserva.matricula,
        nombre: reserva.nombre,
        telefono: reserva.telefono,
        vehiculo: reserva.vehiculo,
        servicio: reserva.servicio,
descripcion: reserva.descripcion,
dia: reserva.dia,
        hora: reserva.hora,
        estado: "Pendiente",
      }
    ]);

  if (error) {
    console.error("Error guardando reserva:", error);
    alert("No se pudo guardar la reserva");
    return false;
  }

  return true;
}

  // ======================
  // MENÚ PRINCIPAL
  // ======================

  if (vista === "inicio") {
    return (
      <div className="inicio-demo">

        <div className="inicio-card">

          <img src={logo} alt="CiTaller" className="logo" />

          <h2 className="inicio-titulo">
            Bienvenido a CiTaller
          </h2>

          <p className="inicio-subtitulo">
            Selecciona cómo deseas acceder
          </p>

          <button
            onClick={() => {
              setVista("cliente");
              setPantallaCliente(1);
            }}
          >
            👤 Demo Cliente
          </button>

          <button
            onClick={() => setVista("taller")}
          >
            🔧 Panel del Taller
          </button>

        </div>

      </div>
    );
  }

  // ======================
  // PANEL TALLER
  // ======================

  if (vista === "taller") {
    return (
      <PanelTaller volver={() => setVista("inicio")} />
    );
  }

  // ======================
  // CLIENTE PASO 1
  // ======================

 if (pantallaCliente === 1) {
  return (
    <ReservaForm
      reserva={reserva}
      setReserva={setReserva}
      continuar={() => setPantallaCliente(2)}
      volver={() => setVista("inicio")}
    />
  );
}
  // ======================
  // CLIENTE PASO 2
  // ======================

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

  // ======================
  // CLIENTE PASO 3
  // ======================

  return (
  <Confirmacion
    reserva={reserva}
    guardarReserva={guardarReserva}
    volverMenu={() => {
      limpiarReserva();
      setVista("inicio");
      setPantallaCliente(1);
    }}
  />
);
}

export default App;