create table if not exists mail_accounts (
  user_id text primary key,
  email text not null,
  name text not null default '',
  provider text not null default 'imap',
  imap_host text not null,
  imap_port integer not null default 993,
  smtp_host text not null,
  smtp_port integer not null default 587,
  username text not null,
  password_cipher text not null,
  last_sync timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists mail_threads (
  id text not null,
  user_id text not null,
  subject text not null,
  folder text not null,
  unread boolean not null default true,
  starred boolean not null default false,
  focused boolean not null default true,
  labels text not null default '[]',
  snooze_until timestamptz,
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists mail_threads_user_id_idx on mail_threads (user_id);
