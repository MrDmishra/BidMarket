-- Launch categories chosen by the owner (PRD D-6). Replaces unused placeholders, as no products exist yet.
delete from public.spec_definitions;
delete from public.categories;

insert into public.categories (name, slug, description, sort_order) values
  ('Machinery and tools', 'machinery', 'Machines, equipment and hand or power tools', 10),
  ('Electrical and electronics', 'electrical', 'Cables, wiring, switchgear, lighting and audio-visual equipment', 20),
  ('Furniture and furnishing', 'furniture', 'Seating, desks, storage and soft furnishing', 30),
  ('Office and stationery', 'office', 'Files, boards, paper and everyday office supplies', 40),
  ('Sanitary and hardware', 'hardware', 'Plumbing, bathroom fittings, fasteners and general hardware', 50),
  ('Road and fire safety', 'safety', 'Fire protection, alarms, detection and road safety equipment', 60),
  ('Agriculture and farming', 'agriculture', 'Farm supplies, tools, machinery and biomass products', 70),
  ('Raw materials', 'raw-materials', 'Metals, cement, building materials and industrial inputs', 80),
  ('Automobile', 'automobile', 'Vehicles, spare parts, tyres and accessories', 90),
  ('Waste and cleaning', 'cleaning', 'Cleaning supplies, equipment and waste handling', 100),
  ('Musical instruments', 'musical-instruments', 'Instruments and accessories for schools and performers', 110),
  ('Cosmetics and garments', 'garments', 'Clothing, uniforms, textiles and personal care', 120),
  ('Food and beverages', 'food', 'Packaged food, drinks and catering supplies', 130),
  ('Education and training', 'education', 'Teaching aids, books and training equipment', 140),
  ('Hospital and chemicals', 'hospital', 'Medical supplies, laboratory items and chemicals', 150),
  ('Sports', 'sports', 'Sports goods, fitness equipment and accessories', 160);

insert into public.spec_definitions (category_id, key, label, kind, unit, is_key, is_required)
select c.id, s.key, s.label, s.kind::public.spec_kind, s.unit, s.is_key, s.is_required
from public.categories c
join (values
  ('machinery', 'power', 'Power', 'number', 'W', true, false),
  ('electrical', 'rated_voltage', 'Rated voltage', 'text', null, true, false),
  ('electrical', 'conductor', 'Conductor', 'text', null, false, false),
  ('furniture', 'material', 'Material', 'text', null, true, true),
  ('hardware', 'material', 'Material', 'text', null, true, true),
  ('hardware', 'nominal_size', 'Nominal size', 'number', 'mm', true, false),
  ('safety', 'standard', 'Standard', 'text', null, true, false),
  ('raw-materials', 'grade', 'Grade', 'text', null, true, true),
  ('automobile', 'vehicle_type', 'Vehicle type', 'text', null, true, false),
  ('garments', 'material', 'Material', 'text', null, true, false),
  ('food', 'pack_size', 'Pack size', 'text', null, true, false),
  ('hospital', 'standard', 'Standard', 'text', null, true, false)
) as s (slug, key, label, kind, unit, is_key, is_required) on s.slug = c.slug;
