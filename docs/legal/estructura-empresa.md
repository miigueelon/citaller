# Estructura legal de CiTaller: hoja de ruta

> Borrador del 25-sep-2026, preparado para llevarlo a la gestoría y al abogado. Es orientación
> general, no asesoramiento legal: las cifras son aproximadas y hay que confirmarlas con ellos.

## Resumen

CiTaller crece en **tres etapas**. Cada una se activa con un hecho concreto, no con una fecha.

| Etapa | Cuándo | Forma | Coste aproximado |
|---|---|---|---|
| **0. Prueba** | Ahora: talleres gratis | Tú, como persona, sin alta | 0 € |
| **1. Autónomo** | El día antes de la **primera factura** | Autónomo (persona física) | ~130 €/mes (cuota + gestoría) + ~600–950 € una vez |
| **2. SL** | Beneficio de unos 40.000 €/año, un socio o inversor, o un contrato grande | Sociedad limitada | ~400–900 € de constitución + ~150–250 €/mes de gestoría |

## Autónomo o SL: la comparación

| | Autónomo | SL |
|---|---|---|
| Darse de alta | Gratis, en un día | 400–900 € (notaría, registro, gestoría), 1–3 semanas |
| Cuota mensual | Unos 80 €/mes el primer año (tarifa plana); después, según lo que ganes | Igual: el administrador también paga como autónomo |
| Gestoría | 40–60 €/mes | 150–250 €/mes (contabilidad completa, cuentas anuales) |
| Impuestos sobre el beneficio | IRPF por tramos: bajo con poco beneficio y alto con mucho | Impuesto de sociedades (en torno al 23 %; menos los primeros años) |
| **Si algo sale mal** | Respondes con **todo tu patrimonio personal** | Responde la empresa con lo suyo. Tú solo si actúas con negligencia grave |
| Lo que sale publicado | Tu DNI y un domicilio | El CIF y el domicilio de la empresa |
| Socios o inversores | No se puede | Sí, con participaciones |
| Imagen ante clientes | Buena | Algo más "seria" ante empresas grandes |

**Cuándo compensa la SL:** como referencia, a partir de unos 40.000–50.000 € al año de beneficio. Con
30 € al mes por taller, 10 talleres son unos 3.600 € al año y 50 talleres, unos 18.000 €. Hasta
entonces, el autónomo es mucho más barato y más sencillo.

**El riesgo de responder con tu patrimonio**, mientras seas autónomo, se cubre así:
1. **Contratos con límite de responsabilidad**, por ejemplo hasta lo que el taller haya pagado en
   los últimos 12 meses. Lo revisa el abogado.
2. **Seguro de responsabilidad civil profesional + ciberriesgos**: unos 150–400 € al año. Cubre
   reclamaciones por fallos del servicio o filtraciones de datos.
3. **Buenas medidas de seguridad**, que ya hay y están documentadas en `registro-tratamientos.md`.
   Si un día pasa algo, poder demostrar que se hizo lo razonable es lo que más protege.

## Etapa 0: prueba gratuita (ahora)

**Cuánto dura:** hasta que un taller vaya a pagar, o hasta el fin de la prueba que marca el acuerdo.

- [ ] Firmar `acuerdo-piloto.md` (con su anexo de datos) con Speed Bikes y con Rik and Roll.
- [ ] Publicar la nueva política de privacidad (`privacidad-propuesta.md`) con tu nombre y el correo.
- [ ] Cifrar el disco del ordenador (BitLocker) y activar la verificación en dos pasos en Supabase,
      Vercel, GitHub, Google, Hostinger y Meta.
- [ ] Borrar las copias de más de 90 días en `backups/`.
- [ ] **No cobrar nada**, ni en dinero ni en especie (nada de "me haces un descuento en el taller").
- [ ] Guardar a tu nombre todos los activos (lista abajo): así ya está, y es lo correcto.

## Etapa 1: autónomo (cuando vayas a cobrar)

**Antes de la primera factura:**
- [ ] Gestoría online. Preguntarle, con tu situación real:
  - si trabajas por cuenta ajena (pluriactividad: la cuota puede ser menor);
  - si cobras el paro (se puede compatibilizar o capitalizar, pero hay que pedirlo **antes** del alta);
  - el epígrafe del IAE (servicios informáticos / programación);
  - el IVA (21 %) y cómo facturar a los talleres.
- [ ] Alta en Hacienda y en la Seguridad Social, con tarifa plana.
- [ ] Programa de facturación compatible con Verifactu (la gestoría suele darlo).
- [ ] Cuenta bancaria separada solo para CiTaller (no es obligatorio, pero lo simplifica todo).

**Legal:**
- [ ] El abogado tecnológico revisa y convierte el acuerdo de prueba en **condiciones del servicio**
      (precio, pagos, bajas, límite de responsabilidad) con el **anexo de encargado** (400–800 €).
- [ ] **Aviso legal** en la web (`/aviso-legal`) con nombre, NIF (tu DNI), domicilio y correo. Si no
      quieres publicar tu casa: domiciliación u oficina virtual (10–30 €/mes).
- [ ] Seguro de responsabilidad civil profesional + ciberriesgos.
- [ ] Registrar la marca "CiTaller" en la OEPM (~130 €, clase 42 de software; se puede añadir la 35).
- [ ] Cada taller nuevo firma las condiciones antes de empezar.

## Etapa 2: SL (cuando se cumpla alguno de los motivos)

**Motivos:** beneficio de unos 40.000 €/año o más · entra un socio o un inversor · un cliente grande
(cadena de talleres, franquicia) que exige contratar con una empresa · el riesgo crece mucho (muchos
datos, muchos talleres).

**El paso:**
- [ ] Constituir la SL (gestoría + notaría), con tu nombre como administrador único.
- [ ] **Pasar los activos a la SL:** la marca (cesión en la OEPM), el dominio, las cuentas de
      Supabase, Vercel, GitHub, Google Cloud y Meta (cambiar el titular de la facturación), y un
      documento de **cesión del código** de ti a la SL.
- [ ] Ceder los contratos con los talleres a la SL: se les avisa y firman un anexo breve.
- [ ] Actualizar el aviso legal, la política de privacidad y los datos de facturación.
- [ ] Baja como autónomo persona física y alta como autónomo societario (la gestoría lo hace).

## Lista de activos de CiTaller (hoy, todos a tu nombre)

| Activo | Dónde | Notas |
|---|---|---|
| Dominio `citaller.es` | Hostinger | Renovación anual: tener la renovación automática activada |
| Correo `hola@citaller.es` | Hostinger | La prueba gratis vence el **21-oct-2026** |
| Código | GitHub | Es el principal activo |
| Base de datos y funciones | Supabase (proyecto CiTaller, París) | Aquí están los datos de los clientes |
| Web | Vercel | |
| App de Google Calendar | Google Cloud (`citaller-508917`) | |
| WhatsApp Business | Meta | Cuando algún taller pase a envío automático |
| Marca "CiTaller" | Sin registrar | Registrarla en la etapa 1 |

## Qué NO hacer en ninguna etapa

- Cobrar sin estar dado de alta (ni "poquito" ni a través de cooperativas de facturación).
- Firmar con un taller sin el anexo de datos.
- Hacer pruebas con datos reales de clientes (se hacen solo con el taller `e2e`).
- Usar los datos de los clientes de los talleres para algo propio (publicidad, estadísticas para
  vender, etc.).
