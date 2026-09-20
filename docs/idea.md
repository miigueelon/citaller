# CiTaller — Idea de producto

## Qué es
Plataforma SaaS para que talleres de vehículos (coches, motos) reciban reservas de cita online sin llamadas, las gestionen desde un panel sencillo y automaticen la comunicación con el cliente (WhatsApp) y su agenda (Google Calendar).

## Problema
Los talleres pequeños gestionan citas por teléfono y a mano: llamadas perdidas, agendas en papel o en la cabeza del jefe de taller, clientes que no saben si pueden llevar el vehículo hoy. El taller pierde tiempo y reservas; el cliente pierde paciencia.

## Para quién
- **Cliente final**: el conductor. No tiene cuenta. Reserva en menos de un minuto desde un enlace del taller (`citaller.vercel.app/<slug>`) y se le reconoce por su número de teléfono.
- **Taller**: uno o varios empleados con acceso al panel del taller (`/<slug>/panel`). Confirman o cancelan citas, ven el día, buscan por matrícula o nombre, consultan el historial.
- **Plataforma (Miguel)**: da de alta talleres, configura servicios, horarios, festivos e integraciones.

## Cómo funciona (flujos; los marcados con ➜ se construyen en el plan v3, fase 3)
1. **Reservar**: el cliente llega por el enlace del taller (botón "Reservar" de Google Business Profile o QR del mostrador ➜), rellena datos del vehículo y del cliente → servicio, con campos propios del servicio (en neumáticos, la medida obligatoria con imagen de ayuda; en motos, los kilómetros) → fecha y hora según horarios, festivos, capacidad por franja (elevadores o mecánicos disponibles) y huecos ya ocupados → resumen → solicitud creada en estado *Pendiente* → pantalla final con el **enlace de su cita** ➜.
2. **Gestionar**: el taller entra con email y contraseña, ve las citas agrupadas por día, filtra (pendientes / confirmadas / canceladas; hoy / mañana / 7 días), busca, confirma o cancela, y **apunta a mano** las citas de quien viene en persona (nacen confirmadas, teléfono opcional) ➜.
3. **Automatizar**: al confirmar, el cliente recibe un WhatsApp con los datos y la cita se crea en el Google Calendar del taller; al cancelar (una confirmada o una pendiente), el cliente recibe un WhatsApp de aviso ➜ y el evento se borra; cada mañana se envían recordatorios de las citas del día siguiente. Cada taller elige su **modo de WhatsApp** ➜: `api` (Meta, automático), `enlace` (el panel abre WhatsApp con el mensaje escrito y el taller lo envía desde su móvil) o `ninguno`.
4. **El cliente cancela por su cuenta** ➜ desde el enlace de su cita, hasta 24 horas antes: se libera el hueco, se borra el evento y el taller lo ve en el panel como "cancelada por el cliente".

## Talleres actuales
| Slug | Nombre | Particularidades |
|---|---|---|
| `speedbikes` | Speedbikes Moto | Taller de motos. Pide kilómetros. Capacidad **por día** (6 citas/día). Usa Outlook (integración futura). |
| `rikandroll` | Rik and Roll | Neumáticos: pide cantidad y medidas, con imagen de ayuda. Capacidad **por hora** (2). Google Calendar conectado. |

## Principios de producto
- **Alta de un taller sin tocar código**: toda la variación por taller (servicios, campos extra, capacidad, textos, integraciones) vive en la base de datos; en el repo solo su seed, sus assets y sus notas (`clientes/<slug>/`).
- **Simple para el taller**: pocas pantallas, acciones grandes, sin formación.
- **Cada flujo debe funcionar de extremo a extremo y poder verificarse** (ver `docs/plan.md`, sección 4).

## Modelo de negocio (borrador)
Cuota mensual por taller. Servicios opcionales: WhatsApp (coste por mensaje de Meta), calendario, recordatorios.

## Hoja de ruta (prioridad orientativa)
1. Reestructuración técnica y seguridad (plan actual, fases 0-4).
2. **Recordatorios automáticos por WhatsApp** (existe, hay que arreglarlo) y aviso al taller de nuevas reservas.
3. **El cliente puede cancelar o cambiar su cita** desde un enlace en el WhatsApp de confirmación.
4. **Ficha de cliente e historial por matrícula** (los datos ya se preparan en la fase 4).
5. **Panel de administración de la plataforma**: alta de talleres, servicios, horarios y festivos con interfaz.
6. **Facturación** a partir de los datos de cliente, vehículo y servicio.
7. Integración con Outlook/Microsoft 365 (Speedbikes), anti-abuso (Turnstile), entorno de staging, Supabase Storage para assets de clientes.
