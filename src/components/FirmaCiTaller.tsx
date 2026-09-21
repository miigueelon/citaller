import { Link } from "react-router";
import styles from "./FirmaCiTaller.module.css";

/**
 * Firma discreta al pie de las pantallas del cliente: el protagonista es el taller, no CiTaller.
 * Lleva el enlace a la política de privacidad, que es donde el cliente deja sus datos.
 */
export function FirmaCiTaller() {
  return (
    <p className={styles.firma}>
      Reservas gestionadas con{" "}
      <strong>
        Ci<span>Taller</span>
      </strong>{" "}
      · <Link to="/privacidad">Privacidad</Link>
    </p>
  );
}
