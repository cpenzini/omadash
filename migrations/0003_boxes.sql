create table if not exists mail_boxes (
  id text not null,
  user_id text not null,
  slot integer not null,
  label text not null default 'Work',
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
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create unique index if not exists mail_boxes_user_slot on mail_boxes (user_id, slot);

alter table mail_threads add column if not exists box_id text not null default 'box-1';

create index if not exists mail_threads_box_idx on mail_threads (user_id, box_id);