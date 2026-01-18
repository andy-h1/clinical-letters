ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view letters"
  ON letters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert letters"
  ON letters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can update own letters"
  ON letters FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by);