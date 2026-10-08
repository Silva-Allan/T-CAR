#!/usr/bin/env bash
# ======================================================================
# T-CAR — Aplica as migrations pendentes de supabase/migrations/
# ======================================================================
# Todo SQL vai pelo stdin do comando em $PSQL_REMOTE, por exemplo:
#   ssh migrate@host 'docker exec -i supabase-db psql -U postgres -d postgres -X -q'
# Assim nada precisa ser instalado no servidor, e funciona mesmo com uma
# chave SSH restrita a um único comando (command="..." no authorized_keys).
#
# Controle: tabela supabase_migrations.schema_migrations (a mesma do
# Supabase CLI). Cada migration roda numa transação junto com o seu
# registro — se falhar, nada é aplicado e o deploy para.
#
# Regras para novos arquivos:
#   - Nome: AAAAMMDDHHMMSS_descricao.sql (ex.: 20261101090000_add_x.sql)
#   - Não usar BEGIN/COMMIT dentro do arquivo (o script já abre a transação)
#   - Preferir SQL idempotente (if not exists / drop ... if exists)
# ======================================================================
set -euo pipefail

: "${PSQL_REMOTE:?Defina PSQL_REMOTE com o comando que executa psql lendo do stdin}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

# Migrations aplicadas à mão antes desta automação existir — são marcadas
# como aplicadas sem rodar (o banco de produção já tem esse schema).
BASELINE_VERSION="${BASELINE_VERSION:-20260107051405}"

psql_remote() {
  bash -c "$PSQL_REMOTE"
}

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "Nenhuma migration em $MIGRATIONS_DIR."
  exit 0
fi

for f in "${files[@]}"; do
  if ! [[ "$(basename "$f")" =~ ^[0-9]{14}_[A-Za-z0-9_-]+\.sql$ ]]; then
    echo "::error::Nome de migration inválido: $(basename "$f") (esperado AAAAMMDDHHMMSS_descricao.sql)"
    exit 1
  fi
done

# 0. Testa o acesso antes de tudo, mostrando a saída completa se falhar
if ! preflight=$(echo "select 'tcar-migrate-ok' as status;" | psql_remote 2>&1) || ! grep -q 'tcar-migrate-ok' <<<"$preflight"; then
  echo "::error::Não foi possível executar o psql no servidor via SSH."
  echo "----- saída do servidor -----"
  echo "${preflight:-(nenhuma saída)}"
  echo "-----------------------------"
  cat <<'EOF'
Causas mais comuns (ver docs/MIGRATIONS.md):
  - Usuário criado com shell /usr/sbin/nologin ou /bin/false: o sshd roda o
    command="..." através desse shell, então ele nunca executa.
    Corrija com: sudo usermod -s /bin/bash migrate
  - Sem permissão no Docker: sudo usermod -aG docker migrate
  - Nome do container errado (confira com: docker ps)
  - Chave pública ausente/errada em /home/migrate/.ssh/authorized_keys
EOF
  exit 1
fi

version_of() { basename "$1" | cut -d_ -f1; }
name_of() { basename "$1" .sql | cut -d_ -f2-; }

# 1. Tabela de controle + baseline
{
  echo '\set ON_ERROR_STOP on'
  echo 'set client_min_messages = warning;'
  echo 'create schema if not exists supabase_migrations;'
  echo 'create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);'
  for f in "${files[@]}"; do
    v=$(version_of "$f")
    if [[ "$v" < "$BASELINE_VERSION" || "$v" == "$BASELINE_VERSION" ]]; then
      echo "insert into supabase_migrations.schema_migrations (version, name) values ('$v', '$(name_of "$f")') on conflict (version) do nothing;"
    fi
  done
} | psql_remote >/dev/null

# 2. O que já foi aplicado
applied=$(
  {
    echo '\set ON_ERROR_STOP on'
    echo 'set client_min_messages = warning;'
    echo '\pset tuples_only on'
    echo '\pset format unaligned'
    echo 'select version from supabase_migrations.schema_migrations;'
  } | psql_remote | grep -E '^[0-9]{14}$' || true
)

# 3. Aplica as pendentes, em ordem
count=0
for f in "${files[@]}"; do
  v=$(version_of "$f")
  if grep -qx "$v" <<<"$applied"; then
    continue
  fi
  echo "Aplicando $(basename "$f")..."
  {
    echo '\set ON_ERROR_STOP on'
    echo 'set client_min_messages = warning;'
    echo 'begin;'
    cat "$f"
    echo
    echo "insert into supabase_migrations.schema_migrations (version, name) values ('$v', '$(name_of "$f")');"
    echo 'commit;'
  } | psql_remote
  count=$((count + 1))
done

# 4. Faz a API (PostgREST) enxergar tabelas/colunas novas na hora
if [ "$count" -gt 0 ]; then
  echo "notify pgrst, 'reload schema';" | psql_remote >/dev/null
  echo "$count migration(s) aplicada(s)."
else
  echo "Banco já está atualizado."
fi
