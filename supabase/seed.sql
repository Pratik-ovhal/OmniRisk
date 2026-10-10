-- ==============================================================================
-- OmniRisk: Seed Data
-- 10 Regional Hazard Benchmarks (World Bank Climate Knowledge & Flood Exposure)
-- 26 Synthetic MSME & Agricultural Borrowers (Explicitly labeled is_synthetic: true)
-- ==============================================================================

-- 1. REGIONAL HAZARDS
INSERT INTO public.regional_hazards (district, state, country, latitude, longitude, flood_hazard_index, drought_hazard_index, heat_stress_index, cyclone_storm_index)
VALUES
  ('Kolhapur', 'Maharashtra', 'India', 16.7050, 74.2433, 0.88, 0.18, 0.35, 0.22),
  ('Solapur', 'Maharashtra', 'India', 17.6599, 75.9064, 0.15, 0.82, 0.78, 0.10),
  ('Raigad', 'Maharashtra', 'India', 18.5158, 73.1822, 0.84, 0.12, 0.40, 0.72),
  ('Nashik', 'Maharashtra', 'India', 19.9975, 73.7898, 0.32, 0.38, 0.42, 0.15),
  ('Pune', 'Maharashtra', 'India', 18.5204, 73.8567, 0.35, 0.30, 0.38, 0.12),
  ('Nagpur', 'Maharashtra', 'India', 21.1458, 79.0882, 0.22, 0.55, 0.90, 0.15),
  ('Anantapur', 'Andhra Pradesh', 'India', 14.6819, 77.6006, 0.10, 0.89, 0.81, 0.18),
  ('Alappuzha', 'Kerala', 'India', 9.4981, 76.3388, 0.92, 0.08, 0.28, 0.65),
  ('Patna', 'Bihar', 'India', 25.5941, 85.1376, 0.85, 0.25, 0.72, 0.20),
  ('Coimbatore', 'Tamil Nadu', 'India', 11.0168, 76.9558, 0.20, 0.40, 0.35, 0.20)
ON CONFLICT (district, state) DO UPDATE 
SET flood_hazard_index = EXCLUDED.flood_hazard_index,
    drought_hazard_index = EXCLUDED.drought_hazard_index,
    heat_stress_index = EXCLUDED.heat_stress_index,
    cyclone_storm_index = EXCLUDED.cyclone_storm_index;
