-- Tablas propias del panel (las de login las crea Floot al provisionar "auth").
CREATE TABLE app_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_by integer REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_state_history (
  id serial PRIMARY KEY,
  version integer NOT NULL,
  data jsonb NOT NULL,
  created_by integer REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_state_history_created_at_idx ON app_state_history (created_at DESC);
