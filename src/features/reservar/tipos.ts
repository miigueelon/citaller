/** Datos que va rellenando el cliente a lo largo de los pasos de la reserva. */
export interface ReservaEnCurso {
  taller_id: number;
  matricula: string;
  nombre: string;
  telefono: string;
  vehiculo: string;
  servicio: string;
  descripcion: string;
  kilometros: string;
  cantidad_neumaticos: string;
  dia: string;
  hora: string;
}

export function reservaVacia(tallerId: number): ReservaEnCurso {
  return {
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
  };
}
