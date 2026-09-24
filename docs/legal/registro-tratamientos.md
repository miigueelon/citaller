# Registro de tratamientos y procedimientos internos

> **Documento interno** (art. 30 del RGPD). No se publica. Borrador del 25-sep-2026: revisar cuando
> cambie algo del producto (datos nuevos, proveedor nuevo, taller nuevo) y, en todo caso, cada año.

**Titular de CiTaller:** Miguel Ángel Rodríguez Sevilla, [DNI cuando haya alta], hola@citaller.es.

## 1. Tratamientos

### A. Citas de los clientes de los talleres. CiTaller es **encargado**

| | |
|---|---|
| Responsables (por cuenta de quién) | Cada taller con acuerdo firmado: Speed Bikes, Rik and Roll (ver `acuerdo-piloto.md`) |
| Finalidad | Gestionar las citas del taller y conservar su historial |
| Personas | Clientes de los talleres; personal del taller que apunta citas |
| Datos | Nombre, teléfono, matrícula, vehículo, servicio, día y hora, descripción, datos extra del formulario, estado y avisos (tabla `reservas`); nombre de mecánicos (`miembros_taller`) |
| Categorías especiales | Ninguna |
| Proveedores | Supabase (UE, París), Vercel, Meta WhatsApp Business (solo talleres en modo `api`), Hostinger y Gmail (correo de derechos) |
| Envío por instrucción del taller | Google Calendar del propio taller |
| Transferencias fuera de la UE | Vercel, Meta y el soporte de Supabase, con DPF o cláusulas contractuales tipo |
| Conservación | Mientras el taller use CiTaller; al terminar, entrega y borrado en 30 días; copias de seguridad en 90 días |
| Medidas | Apartado 2 |

### B. Cuentas de los talleres. CiTaller es **responsable**

| | |
|---|---|
| Finalidad | Dar acceso al panel y relación con el taller (soporte, avisos del servicio) |
| Base legal | Ejecución del acuerdo con el taller (art. 6.1.b) |
| Datos | Correo, contraseña cifrada, datos públicos del taller (nombre, dirección, teléfono, horarios, logo), datos de quien firma el acuerdo |
| Proveedores | Supabase, Vercel, Hostinger y Gmail |
| Conservación | Mientras dure el acuerdo; después, lo que obligue la ley (por ejemplo, facturas: 6 años cuando haya cobros) |

### C. Consultas y peticiones que llegan a hola@citaller.es. CiTaller es **responsable**

| | |
|---|---|
| Finalidad | Contestar consultas de talleres interesados y tramitar peticiones de derechos |
| Base legal | Interés legítimo en contestar (art. 6.1.f) y obligación legal para los derechos (art. 6.1.c) |
| Datos | Nombre, correo y lo que la persona escriba |
| Conservación | 1 año desde la última respuesta; las peticiones de derechos, 3 años (para poder demostrar que se atendieron) |

## 2. Medidas de seguridad (lo que ya hay)

- HTTPS en todo; cabeceras de seguridad en `vercel.json`.
- RLS en todas las tablas; `scripts/rls-test.sql` comprueba que un taller no ve lo de otro, y se pasa
  antes de cada migración.
- Contraseñas con el sistema de Supabase Auth; `refresh_token` de Google en Vault (cifrado).
- Secretos en Supabase Secrets y Vercel, nunca en el repositorio; `.env.local` y `backups/` en
  `.gitignore`.
- El enlace de cada cita lleva un `token_publico` aleatorio.
- Límite de citas activas y de solicitudes diarias por teléfono en la reserva pública (CT006).
- Pruebas solo con el taller `e2e`; los talleres reales solo se leen.
- Copias con `npm run backup` (sin tokens de Google) en `backups/`, en el ordenador de Miguel.

**Por hacer:**
- [ ] Cifrado del disco del ordenador donde están las copias (BitLocker en Windows) y contraseña de
      inicio de sesión.
- [ ] Borrar las copias de más de 90 días en `backups/`.
- [ ] Verificación en dos pasos en las cuentas de Supabase, Vercel, GitHub, Google y Hostinger.
- [ ] Confirmar que las autorizaciones de Google de Speed Bikes y Rik and Roll están en Vault y no en
      claro (tras reconectarlas el 23-sep).

## 3. Si un cliente pide sus datos o que los borren

1. Anotar la petición (fecha, quién, qué pide, por dónde llegó) en la tabla del apartado 5.
2. Si llega a CiTaller, avisar al taller **en 5 días** (lo dice el acuerdo). Si el taller está de
   acuerdo, o si lo pide el propio taller:
   - **Acceso:** sacar sus citas buscando por teléfono dentro de ese taller y mandárselas.
   - **Corrección:** el taller puede corregir desde el panel; si no puede, se corrige por SQL.
   - **Borrado:** `npm run backup` antes; borrar sus filas de `reservas` de ese taller (y el evento de
     Google si lo hay). Lo hace Miguel pegando el SQL en el SQL Editor.
3. Contestar a la persona **antes de un mes** desde que lo pidió.
4. Anotar la fecha de respuesta.

## 4. Si hay un fallo de seguridad (brecha)

Ejemplos: alguien entra en un panel que no es suyo, se filtra una copia de seguridad, una regla de
acceso deja ver citas de otro taller, se pierde un ordenador con copias.

1. **Cortar:** cambiar contraseñas o secretos, quitar el acceso, parar lo que falle.
2. **Entender:** qué datos, de qué taller, cuántas personas, desde cuándo.
3. **Avisar a los talleres afectados en 48 horas como máximo**, por escrito, con lo que se sepa.
4. El taller decide si avisar a la AEPD (72 horas desde que se supo) y a sus clientes. CiTaller le
   ayuda.
5. Anotarlo en la tabla del apartado 5, aunque al final no haya que avisar a nadie.

## 5. Anotaciones

| Fecha | Tipo (derecho / brecha) | Taller | Qué pasó | Qué se hizo | Cerrado |
|---|---|---|---|---|---|
| | | | | | |
