import styles from "./FirmaCiTaller.module.css";

/** Firma discreta al pie de las pantallas del cliente: el protagonista es el taller, no CiTaller. */
export function FirmaCiTaller() {
  return (
    <p className={styles.firma}>
      Reservas gestionadas con{" "}
      <strong>
        Ci<span>Taller</span>
      </strong>
    </p>
  );
}
