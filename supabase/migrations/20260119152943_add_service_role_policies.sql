CREATE POLICY "Service role full access to letters"
  ON letters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to patients"
  ON patients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
