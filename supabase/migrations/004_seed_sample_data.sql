-- =====================================================
-- Inmobiliaria Platform - Sample Data for Testing
-- Creates sample buildings, units, and amenities
-- =====================================================

-- =====================================================
-- BUILDINGS
-- =====================================================

INSERT INTO buildings (id, name, address, welcome_message_es, welcome_message_en) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Edificio Los Robles',
    'Av. Principal 123, Santiago Centro',
    'Bienvenido a Edificio Los Robles. Tu hogar, tu comunidad.',
    'Welcome to Edificio Los Robles. Your home, your community.'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Condominio Vista Mar',
    'Av. Costanera 456, Viña del Mar',
    'Bienvenido a Condominio Vista Mar. Vive con vista al océano.',
    'Welcome to Condominio Vista Mar. Live with ocean views.'
  );

-- =====================================================
-- UNITS
-- =====================================================

-- Edificio Los Robles units
INSERT INTO units (id, building_id, unit_number, floor, area_sqm) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'A-101', 1, 65.50),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'A-102', 1, 72.00),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'A-201', 2, 65.50),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'A-202', 2, 72.00),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'B-301', 3, 85.00),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 'B-302', 3, 85.00);

-- Condominio Vista Mar units
INSERT INTO units (id, building_id, unit_number, floor, area_sqm) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002', '1A', 1, 95.00),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002', '1B', 1, 95.00),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000002', '2A', 2, 110.00),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000002', '2B', 2, 110.00);

-- =====================================================
-- AMENITIES
-- =====================================================

-- Edificio Los Robles amenities
INSERT INTO amenities (
  id,
  building_id,
  name,
  type,
  display_name_es,
  display_name_en,
  rules_es,
  rules_en,
  max_capacity,
  is_active,
  requires_deposit,
  deposit_amount,
  price_per_hour
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'quincho_norte',
    'quincho',
    'Quincho Norte',
    'North BBQ Area',
    'Horario: 10:00 - 22:00. Capacidad máxima: 15 personas. Se debe limpiar y dejar en orden después del uso. Prohibido fumar en áreas cerradas.',
    'Hours: 10:00 AM - 10:00 PM. Maximum capacity: 15 people. Must clean and leave in order after use. No smoking in closed areas.',
    15,
    true,
    false,
    null,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'quincho_sur',
    'quincho',
    'Quincho Sur',
    'South BBQ Area',
    'Horario: 10:00 - 22:00. Capacidad máxima: 20 personas. Se debe limpiar y dejar en orden después del uso. Prohibido fumar en áreas cerradas.',
    'Hours: 10:00 AM - 10:00 PM. Maximum capacity: 20 people. Must clean and leave in order after use. No smoking in closed areas.',
    20,
    true,
    false,
    null,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'piscina',
    'piscina',
    'Piscina',
    'Swimming Pool',
    'Horario de verano: 08:00 - 21:00. Horario de invierno: 09:00 - 19:00. Uso exclusivo para residentes y acompañantes autorizados. Prohibido correr alrededor de la piscina. Niños menores de 12 años deben estar acompañados por un adulto.',
    'Summer hours: 08:00 AM - 09:00 PM. Winter hours: 09:00 AM - 07:00 PM. For residents and authorized guests only. No running around the pool. Children under 12 must be accompanied by an adult.',
    50,
    true,
    false,
    null,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'gym',
    'gym',
    'Gimnasio',
    'Gym',
    'Horario: 06:00 - 23:00. Uso de implementos es personal e intransferible. Se debe limpiar los equipos después del uso. Uso de toalla obligatorio. Menores de 16 años no pueden usar equipos sin supervisión.',
    'Hours: 06:00 AM - 11:00 PM. Equipment use is personal and non-transferable. Must clean equipment after use. Towel required. Minors under 16 cannot use equipment without supervision.',
    25,
    true,
    false,
    null,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'sum',
    'sum',
    'Salón de Eventos',
    'Event Hall',
    'Capacidad: 80 personas. Reserva con 7 días de anticipación. Se debe dejar limpio y ordenado. Prohibido fumar. Música permitida hasta las 00:00 hrs.',
    'Capacity: 80 people. Book 7 days in advance. Must leave clean and tidy. No smoking. Music allowed until 12:00 AM.',
    80,
    true,
    true,
    50000,
    null
  );

-- Condominio Vista Mar amenities
INSERT INTO amenities (
  id,
  building_id,
  name,
  type,
  display_name_es,
  display_name_en,
  rules_es,
  rules_en,
  max_capacity,
  is_active
) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'quincho_principal',
    'quincho',
    'Quincho Principal',
    'Main BBQ Area',
    'Horario: 09:00 - 23:00. Capacidad máxima: 30 personas. Limpieza obligatoria post-uso.',
    'Hours: 09:00 AM - 11:00 PM. Maximum capacity: 30 people. Mandatory cleaning after use.',
    30,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'piscina_adultos',
    'piscina',
    'Piscina Adultos',
    'Adult Pool',
    'Solo para mayores de 18 años. Horario: 07:00 - 22:00.',
    'Adults only (18+). Hours: 07:00 AM - 10:00 PM.',
    40,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'piscina_ninos',
    'piscina',
    'Piscina Niños',
    'Children Pool',
    'Para menores de 12 años con supervisión adulta. Horario: 08:00 - 20:00.',
    'For children under 12 with adult supervision. Hours: 08:00 AM - 08:00 PM.',
    25,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'cancha_tenis',
    'sports_court',
    'Cancha de Tenis',
    'Tennis Court',
    'Reserva máxima de 2 horas por día. Raquetas y pelotas no incluidas.',
    'Maximum 2-hour booking per day. Rackets and balls not included.',
    4,
    true
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE buildings IS 'Sample buildings for testing. In production, these would be created by admins.';
COMMENT ON TABLE units IS 'Sample units belonging to buildings. Unit numbers can be customized per building naming convention.';
COMMENT ON TABLE amenities IS 'Sample amenities showing HYBRID translation approach with _es and _en columns.';
