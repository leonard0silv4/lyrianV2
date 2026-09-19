# Deploy do V2

## Onde roda

O V2 vive sob `/v2` no mesmo domínio do legado (`app.lyriaflores.com.br`), no mesmo container de produção (CloudClusters), coexistindo com `crawler-backend`/`new-crawler` sem compartilhar processo, porta ou banco:

- Código em `/cloudclusters/lyria-v2-src` (clone git deste repo).
- Backend roda via `supervisor`, programa `v2-api`, porta `8083`, Node gerenciado por `nvm` no servidor.
- Frontend buildado (`frontend/dist`) e servido como estático via nginx.
- nginx: locations `/v2` (frontend), `/v2/api/` (proxy pro backend). Configs em `/cloudclusters/config/nginx/api.conf` e `/cloudclusters/config/supervisor/v2-api.conf` — editados manualmente no servidor, o pipeline de CI **nunca** toca neles.
- Legado (`crawler-backend`, porta `8082`, e o resto do supervisor: `api`, `demo`, `filebrowser`, `nginx`) segue intocado por qualquer deploy do V2.

## Pipeline (GitHub Actions)

Workflow: `.github/workflows/deploy-v2.yml`.

- Dispara em push em `main` que toque `backend/**`, `frontend/**` ou o próprio workflow, e também manualmente (`workflow_dispatch`, aba Actions → "Run workflow").
- Roda num **self-hosted runner registrado só neste repositório**, que vive dentro do próprio container de produção (`gha-runner` no supervisor). Ele só abre conexões de saída pro GitHub — não existe SSH público exposto pelo provedor de hospedagem, então esse runner é o único jeito de automatizar deploy nessa infra.
- Atualiza o código com `git fetch` + `git reset --hard origin/main` direto em `/cloudclusters/lyria-v2-src` — nunca um checkout novo, nunca `rsync`. `.env`, `node_modules` e `dist` não são versionados, então o `reset --hard` nunca os apaga.
- Detecta o que mudou (`backend/**` vs `frontend/**`) e só reinstala/builda/reinicia o que precisa. `v2-api` só reinicia se `backend/**` mudou.
- Nunca reinicia nginx nem mexe no legado.

## Variáveis de ambiente

Local: `.env` normal (ver `backend/.env.example`, `frontend/.env.example`), como sempre.

Produção: **não é mais editado à mão no servidor.** O workflow escreve `backend/.env` a partir do secret do repositório `BACKEND_ENV` (GitHub → Settings → Secrets and variables → Actions → Repository secrets) antes de cada deploy que toque o backend.

Pra atualizar uma credencial de produção:
1. Editar o secret `BACKEND_ENV` com o `.env` completo e correto (conteúdo idêntico ao que um `backend/.env` de produção precisa — **atenção ao `PORT`, tem que ser o da produção, não o de dev**).
2. Rodar `workflow_dispatch` (ou fazer um push tocando `backend/**`).

Frontend não usa secret: `VITE_API_BASE_URL=/v2/api` não é sensível e já está fixo em `frontend/.env.production.local` direto no servidor.

## Superfície de risco e mitigações (não mexer sem entender o motivo)

- **Runner roda como root, no mesmo host do legado real.** Por isso o workflow só escuta `push` em `main` e `workflow_dispatch` — **nunca** adicionar gatilho de `pull_request`/`pull_request_target`. Um PR de fork não deve conseguir rodar nada nesse runner.
- Proteger a branch `main` (exigir review, bloquear push direto de quem não for owner) é a principal barreira contra código malicioso chegar no runner.
- O secret `BACKEND_ENV` só é lido dentro do job, nunca logado (GitHub mascara automaticamente qualquer secret que aparecer em stdout/stderr do workflow).
- Configs de nginx/supervisor ficam fora do diretório do repo (`/cloudclusters/config/...`), então estruturalmente fora do alcance do `git reset --hard` do deploy — mudança nelas é sempre manual, deliberada, feita direto no servidor.
- O acesso administrativo ao servidor (painel do provedor) não é documentado aqui de propósito — é credencial de acesso, não parte do funcionamento do sistema.

## Debug rápido

- `curl https://app.lyriaflores.com.br/v2/api/health` → `{"ok":true}` esperado.
- Se der 502: backend caiu. Causa mais comum já vista: `PORT` errado no secret `BACKEND_ENV` (nginx só sabe falar com `8083`).
- `gh run list --repo <org>/<repo>` / `gh run view <id> --log` pra ver o log do último deploy.
- Restart manual do backend (sem redeploy completo): só possível com acesso ao shell do servidor — `supervisorctl restart v2-api`.
