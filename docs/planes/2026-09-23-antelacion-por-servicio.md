# Antelación por servicio: Neumáticos en Rik and Roll

> **Estado (23-sep-2026)**: pedido de Miguel por la mañana, el día de la instalación en los dos
> talleres. Hecho en la rama `reestructuracion` y probado con el taller e2e; **producción pendiente
> del "publica" de Miguel** (merge a `main` + `bloques_antelacion = 1` en Neumáticos de Rik and Roll).
> Seguimiento con casillas en `docs/plan.md`, "Pedidos del 23-sep".

## Lo que pidió Miguel

"Cuando en el taller de Rik and Roll seleccionan neumáticos […] si es hoy por la noche, pues toda la
mañana del día siguiente no se puede reservar, porque en ese rato es cuando al taller le llegan los
neumáticos para tenerlos por la tarde; es decir, sería a partir de las tres y media, que es su
horario en la primera apertura de la tarde. Y si la solicitud es por la tarde, hasta la mañana
siguiente no podrías escoger la hora."

## La regla, tal como se ha implementado

El taller necesita **un bloque de apertura entero** (una mañana o una tarde) entre la solicitud y la
cita para pedir y recibir los neumáticos:

1. Los bloques (día + mañana/tarde) se numeran en orden desde el día de la solicitud, saltando
   festivos y días sin horario.
2. El bloque en que el taller atiende la solicitud es el que está **abierto en ese momento** (entre su
   primera y su última hora reservable) o, si está cerrado, **el siguiente que abre**.
3. La cita solo puede ser **desde la primera hora del bloque de después**.

Con el horario de Rik and Roll (8:30-12:30 y 15:30-18:30; viernes hasta las 17:00):

| Solicitud | Bloque para recibirlos | Primera hora posible |
|---|---|---|
| Lunes 22:00 (cerrado) | martes por la mañana | **martes 15:30** |
| Lunes 10:00 (mañana abierta) | lunes por la mañana | lunes 15:30 |
| Lunes 16:00 (tarde abierta) | lunes por la tarde | martes 8:30 |
| Lunes 13:00 (entre bloques) | lunes por la tarde | martes 8:30 |
| Viernes 16:30 | viernes por la tarde | lunes 8:30 |
| Sábado o domingo | lunes por la mañana | lunes 15:30 |

Solo afecta a las solicitudes de clientes. **Desde el panel ("Nueva cita") no hay límite**: el taller
sabe si tiene el material. El resto de servicios de Rik and Roll y todos los de Speedbikes siguen
igual (antelación 0).

## Dónde vive cada cosa

- **Base de datos** (migración `20260923090000_antelacion_por_servicio`, aplicada tras backup y
  revisión independiente):
  - `horarios_taller.bloque` (1 = mañana, 2 = tarde): a qué bloque pertenece cada hora. Relleno
    inicial: las horas desde las 14:00 son de tarde (vale para los tres talleres).
  - `servicios_taller.bloques_antelacion` (0 = sin antelación) y `antelacion_texto`.
  - `antelacion_minima_en(taller, servicio, instante)`: la regla, en un solo sitio. Interna.
  - `antelacion_minima(taller, servicio)`: RPC pública que llama la web, siempre con la hora del
    servidor (nunca con la del móvil).
  - `validar_datos_reserva`: rechaza con **CT021** la solicitud de un cliente anterior a esa hora.
- **Web** (`src/features/reservar`): al entrar en "Elige fecha y hora" con un servicio con antelación,
  pide la primera hora posible, la anuncia ("Los neumáticos se piden al proveedor… Primera hora
  disponible: jueves, 24 de septiembre a las 15:30"), deshabilita los días anteriores y esconde las
  horas anteriores. Se vuelve a pedir cada 30 s (al terminar un bloque cambia). Si aun así llega
  tarde, la base de datos responde CT021 y la web dice "vuelve atrás y elige otra hora".
- **Seeds**: Rik and Roll (Neumáticos = 1 bloque + texto; bloques de su horario), e2e (lo mismo en
  Neumáticos, y horario con dos bloques: 9-12 y 16-17), plantilla (columnas nuevas documentadas).
- **Pruebas**: `disponibilidad.test.ts` (mínimo, días y horas), `rls-test.sql` #77-#91 (permisos y
  seis casos con fecha fija sobre e2e, incluido uno con festivo por medio), `probar-cadena` sección J
  (la RPC coincide con la regla recalculada aparte; CT021 antes de la hora; entra justo en la hora;
  la cita a mano entra igual; la función interna no es pública), Playwright "Antelación por servicio".

## Producción (pendiente del OK)

1. Merge a `main` (Vercel despliega) y Playwright contra `citaller.es`.
2. Aplicar el seed de Rik and Roll (`bloques_antelacion = 1` en Neumáticos y su texto): hasta ese
   momento, en producción Neumáticos se reserva como siempre.
3. Comprobación a mano en `citaller.es/rikandroll`: con Neumáticos, la pantalla de fecha anuncia la
   primera hora posible.
