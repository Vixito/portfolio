-- Tabla de intentos de login del Admin Panel (rate limiting 5 fallidos/15 min por IP).
create table if not exists admin_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  username text,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_time_idx
  on admin_login_attempts (ip, created_at desc);