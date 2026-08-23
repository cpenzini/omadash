create table if not exists cal_accounts (
  id text not null,
  user_id text not null,
  provider text not null,
  label text not null default '',
  username text not null default '',
  caldav_url text not null default '',
  ics_url text not null default '',
  password_cipher text not null default '',
  refresh_cipher text not null default '',
  color text not null default 'unread',
  last_sync timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists cal_accounts_user_idx on cal_accounts (user_id);

create table if not exists cal_events (
  id text not null,
  user_id text not null,
  account_id text not null,
  calendar_id text not null default '',
  calendar_name text not null default '',
  remote_uid text not null default '',
  etag text not null default '',
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text not null default '',
  description text not null default '',
  rrule text not null default '',
  read_only boolean not null default false,
  payload text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists cal_events_user_start_idx on cal_events (user_id, start_at);
create index if not exists cal_events_account_idx on cal_events (user_id, account_id);
