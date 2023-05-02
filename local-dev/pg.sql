create table logo
(
    id varchar not null primary key,
    created_by varchar,
    is_public  boolean default true not null
);
