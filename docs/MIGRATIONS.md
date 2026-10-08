# Migrations do banco

A cada push na `main`, o GitHub Actions aplica as migrations pendentes de
`supabase/migrations/` **antes** de publicar o frontend
([deploy.yml](../.github/workflows/deploy.yml) → [scripts/migrate.sh](../scripts/migrate.sh)).

- O SQL é enviado por SSH para o `psql` do servidor. A porta do Postgres não precisa ficar aberta.
- As migrations já aplicadas ficam registradas em `supabase_migrations.schema_migrations`.
- Cada migration roda numa transação. Se falhar, nada é aplicado e o deploy do frontend não acontece.
- Sem os secrets configurados, o job só emite um aviso e o deploy segue como antes.

## Configuração única no servidor

### 1. Gerar a chave (em qualquer máquina)

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-migrate" -f migrate_key
```

Isso gera `migrate_key` (privada, vai para o GitHub) e `migrate_key.pub` (pública, vai para o servidor).

### 2. Criar o usuário restrito na VPS

```bash
sudo adduser --disabled-password --gecos "" migrate
sudo usermod -aG docker migrate        # só se o Postgres roda em Docker
sudo mkdir -p /home/migrate/.ssh
sudo chmod 700 /home/migrate/.ssh
```

Em `/home/migrate/.ssh/authorized_keys`, coloque **uma linha** com a chave
pública precedida do comando fixo. Assim a chave só consegue rodar `psql`,
sem acesso ao shell:

```
command="docker exec -i supabase-db psql -U postgres -d postgres -X -q",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA...conteúdo de migrate_key.pub... github-actions-migrate
```

```bash
sudo chown -R migrate:migrate /home/migrate/.ssh
sudo chmod 600 /home/migrate/.ssh/authorized_keys
```

Ajuste o comando conforme o servidor:

| Postgres roda em... | `command="..."` |
| --- | --- |
| Docker do Supabase self-hosted | `docker exec -i supabase-db psql -U postgres -d postgres -X -q` (confira o nome do container com `docker ps`) |
| Outro container | `docker exec -i NOME_DO_CONTAINER psql -U postgres -d postgres -X -q` |
| Direto na VPS | `psql -h localhost -U postgres -d postgres -X -q` (senha em `/home/migrate/.pgpass`) |

### 3. Testar o acesso

```bash
echo "select current_user, version();" | ssh -i migrate_key migrate@SEU_HOST
```

Tem que imprimir o usuário e a versão do Postgres.

### 4. Cadastrar os secrets no GitHub

Repositório → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
| --- | --- |
| `MIGRATE_SSH_KEY` | conteúdo inteiro do arquivo `migrate_key` (privada) |
| `MIGRATE_SSH_USER` | `migrate` |
| `MIGRATE_PSQL_CMD` | opcional. Só se **não** usar `command=` no `authorized_keys` e o container não for `supabase-db` |

O `VPS_HOST` já existe e é reaproveitado.

Na primeira execução, a migration inicial (`20260107051405_…`) é só marcada
como aplicada, porque o banco de produção já tem esse schema. As seguintes
são executadas.

## Criando uma nova migration

1. Crie `supabase/migrations/AAAAMMDDHHMMSS_descricao.sql` (ex.: `20261101090000_add_coluna_x.sql`).
2. **Não** use `BEGIN`/`COMMIT` no arquivo: o script já abre a transação.
3. Prefira SQL idempotente (`if not exists`, `drop policy if exists` antes de `create policy`).
4. Tabelas novas acessadas pelo app precisam de `grant ... to authenticated`.
5. Para testar localmente contra outro banco:
   ```bash
   PSQL_REMOTE="psql postgresql://usuario@host/banco -X -q" bash scripts/migrate.sh
   ```
