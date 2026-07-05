-- Add policy to allow all active staff members within the business to update products (specifically stock quantities)
CREATE POLICY "business members can update products"
  ON products FOR UPDATE
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- Add notification summary_time column to businesses table, default to '21:00' (9pm)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS summary_time text DEFAULT '21:00';
