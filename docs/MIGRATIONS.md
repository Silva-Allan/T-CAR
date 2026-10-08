# Migrations do banco

A cada push na `main`, o GitHub Actions aplica as migrations pendentes de
`supabase/migrations/` **antes** de publicar o frontend
([deploy.yml](../.github/workflows/deploy.yml) → [scripts/migrate.sh](../scripts/migrate.sh)).

- O SQL é enviado por SSH para o `psql` do servidor. A porta do Postgres não precisa ficar aberta.
- As migrations já aplicadas ficam registradas em `supabase_migrations.schema_migrations`.
- Cada migration roda numa transação. Se falhar, nada é aplicado e o deploy do frontend não acontece.
- Sem os secrets configurados, o job só emite um aviso e o deploy segue como antes.

## Como está configurado (produção)

- **Servidor:** VPS Hostinger. O Postgres roda no container `supabase-db` (Supabase self-hosted).
- **Usuário SSH:** `deploy`, o mesmo do deploy do site. No `~/.ssh/authorized_keys` dele, cada chave do GitHub tem um comando fixo:

  | Chave (comentário) | Só consegue... |
  | --- | --- |
  | `github-actions-deploy-tcar` | `rrsync` para `/home/deploy/frontend-dist` (publicar o site) |
  | `migrate-github-actions` | `docker exec -i supabase-db psql -U supabase_admin -d postgres -X -q` |

  Linha da chave de migrations:

  ```
  command="docker exec -i supabase-db psql -U supabase_admin -d postgres -X -q",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... migrate-github-actions
  ```

  Qualquer comando enviado com essa chave é ignorado: ela só abre o `psql`, que lê o SQL do stdin. Não dá shell.

  As migrations rodam como **`supabase_admin`**, porque é o dono de todas as tabelas e funções do schema (criadas pelo Studio). O papel `postgres` não é superusuário no Supabase self-hosted e não consegue alterar objetos de outro dono: falha com `must be owner of ...`.

- **Secrets no GitHub** (Settings → Secrets and variables → Actions):

  | Secret | Valor |
  | --- | --- |
  | `MIGRATE_SSH_KEY` | chave privada `migrate-github-actions` |
  | `MIGRATE_SSH_USER` | `deploy` |
  | `VPS_HOST` | já existia, reaproveitado |
  | `MIGRATE_PSQL_CMD` | opcional. Só necessário se a chave **não** tiver `command=` e o container não for `supabase-db` |

- Na primeira execução, a migration inicial (`20260107051405_…`) foi só marcada como aplicada, porque o banco de produção já tinha esse schema.
- Também dá para rodar o deploy e as migrations sem push: aba Actions → **Deploy frontend to VPS** → **Run workflow**.

### Trocar a chave de migrations

```bash
ssh-keygen -t ed25519 -N "" -C "migrate-github-actions" -f migrate_key
```

1. No servidor, substitua a linha `migrate-github-actions` em `/home/deploy/.ssh/authorized_keys` pela nova chave pública, **mantendo o `command=...` e as opções na frente**.
2. Cole o conteúdo de `migrate_key` (privada) no secret `MIGRATE_SSH_KEY`.
3. Apague os arquivos locais da chave.

### Se o job falhar

O script testa o acesso antes de aplicar qualquer coisa e mostra a saída do servidor e o código de saída. Causas comuns:

- **Saiu com 1 sem saída:** o shell do usuário é `/bin/false`/`nologin` (o sshd roda o `command=` através do shell), ou a chave está em outro usuário.
- **Saiu com 0 sem saída:** falta o `-i` em `docker exec -i`, então o SQL não chega ao `psql`.
- **`Permission denied (publickey)`:** a chave não está no `authorized_keys` do usuário do secret `MIGRATE_SSH_USER`.

## Criando uma nova migration

1. Crie `supabase/migrations/AAAAMMDDHHMMSS_descricao.sql` (ex.: `20261101090000_add_coluna_x.sql`).
2. **Não** use `BEGIN`/`COMMIT` no arquivo: o script já abre a transação.
3. Prefira SQL idempotente (`if not exists`, `drop policy if exists` antes de `create policy`).
4. Tabelas novas acessadas pelo app precisam de `grant ... to authenticated`.
5. Para testar localmente contra outro banco:
   ```bash
   PSQL_REMOTE="psql postgresql://usuario@host/banco -X -q" bash scripts/migrate.sh
   ```
