alter table mail_boxes add column if not exists auth_kind text not null default 'password';
