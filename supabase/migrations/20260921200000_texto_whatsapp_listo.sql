-- "Vehículo listo" (pedido de Miguel, 21-sep-2026; era el 5D del plan): botón en la tarjeta de una
-- cita confirmada que abre WhatsApp con "tu vehículo ya está listo para recoger". Como los otros
-- mensajes del modo enlace, el texto por defecto vive en el frontend (textosWhatsapp.ts) y cada
-- taller puede tener el suyo: Speedbikes habla de "tu moto", Rik and Roll de "tu coche" (seeds).
-- Solo lo lee el panel del taller (authenticated ya tiene SELECT de tabla en talleres; anon no).
alter table public.talleres
  add column texto_whatsapp_listo text;

comment on column public.talleres.texto_whatsapp_listo is 'Modo enlace: plantilla de "vehículo listo para recoger". Mismos marcadores que texto_whatsapp_confirmacion. Null = texto por defecto.';
