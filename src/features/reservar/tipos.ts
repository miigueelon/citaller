/** Datos que va rellenando el cliente a lo largo de los pasos de la reserva. */
export interface ReservaEnCurso {
  taller_id: number;
  matricula: string;
  nombre: string;
  telefono: string;
  vehiculo: string;
  servicio: string;
  descripcion: string;
  /** Valores de los campos extra del taller, por clave (`campos_formulario_taller.clave`). */
  datos_extra: Record<string, string>;
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
    datos_extra: {},
    dia: "",
    hora: "",
  };
}
