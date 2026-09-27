# Anatomy Atlas — versão educacional

Código e arquivos anatômicos derivados de um atlas interativo em português. O projeto reúne modelo 3D, cortes axial/coronal/sagital sincronizados, seis regiões, busca de estruturas, estudo guiado e quiz. Esta edição usa identidade visual própria e não inclui o nome, emblema ou arquivos de marca da aplicação original.

## Abra o projeto

Requer Node.js 22 ou superior. Os arquivos processados em `web/public/data/` já estão incluídos: não é necessário baixar os exames brutos para experimentar o app.

```sh
git clone https://github.com/juliooandradee/anatomy-atlas-educacional.git
cd anatomy-atlas-educacional/web
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. Para distribuição, use `npm run build` e `npm start`. Ao publicar em Vercel, configure **Root Directory** como `web`; não há variáveis de ambiente obrigatórias. O repositório completo tem cerca de 136 MB porque inclui os arquivos processados para o navegador.

## O que já funciona

- Neuroanatomia com atlas médio de RM T1/T2 ICBM152/CerebrA, grade de 1 mm e 95 estruturas selecionáveis.
- Cabeça e pescoço (`s0591`) e abdômen (`s0720`) do TotalSegmentator.
- Pelve, coxas/pernas, tornozelos/pés do mesmo caso BoneHub `002` / VSD `006`.
- Seleção de estruturas no 3D e nos cortes, mira sincronizada, janela de TC, camadas de segmentação, ampliação de corte, busca e filtros.
- Roteiros e quiz, com progresso no armazenamento local do navegador.

As regiões pertencem a **três fontes/casos diferentes**. Os módulos inferiores derivam de um exame cadavérico. O app é educacional; não é ferramenta de diagnóstico ou medição clínica. As fichas de estudo não têm revisão médica independente registrada.

## Leve o código para o Codex

**No computador:** [baixe o ZIP com o projeto completo](https://github.com/juliooandradee/anatomy-atlas-educacional/archive/refs/heads/main.zip), extraia e abra a pasta como projeto no Codex. Você também pode usar o `git clone` acima. Cole o texto de [PROMPT.md](PROMPT.md) na tarefa. O texto inclui o endereço deste repositório, mas o Codex deve trabalhar na pasta que você abriu. [Guia oficial de projetos locais do Codex](https://learn.chatgpt.com/docs/projects).

**No Codex pelo navegador:** [faça um fork deste repositório](https://github.com/juliooandradee/anatomy-atlas-educacional/fork), conecte sua conta GitHub ao Codex, selecione o fork para criar um ambiente e cole o mesmo prompt. [Guia oficial do Codex na nuvem](https://learn.chatgpt.com/docs/cloud).

Depois você pode pedir mudanças simples em outra mensagem, por exemplo: “Troque o nome para Atlas da Minha Escola e a cor principal para azul, mantendo a anatomia e as funções.”

## Personalize com um agente de programação

Copie o [prompt pronto](PROMPT.md) para um agente como Codex. Ele parte deste código e dos arquivos processados, então preserva a lógica e a anatomia da aplicação com muito mais fidelidade que uma instrução para criar tudo do zero. Troque título, ícone, paleta e conteúdo conforme sua identidade. Não use marcas ou emblemas de terceiros.

## Reproduza os arquivos anatômicos

O código dos pipelines e os manifestos fixados estão em `pipeline/`. Para reconstruir do zero, use Python 3.14 e espaço livre para os exames brutos (o espelho ZIP do TotalSegmentator tem 3,2 GB; BoneHub inclui uma TC de aproximadamente 346 MB). Downloads e saídas temporárias ficam fora do Git.

```sh
python3 -m venv pipeline/.venv
pipeline/.venv/bin/python -m pip install -r pipeline/requirements.lock.txt

# Abdômen: ranqueia os casos e reconstrói o caso selecionado
pipeline/.venv/bin/python pipeline/fetch_selected.py
pipeline/.venv/bin/python pipeline/pick_subject.py --select-only
pipeline/.venv/bin/python pipeline/fetch_selected.py --subject
pipeline/.venv/bin/python pipeline/build_assets.py --spacing 2.0

# Cabeça/pescoço e membros inferiores
pipeline/.venv/bin/python pipeline/fetch_regions.py --subjects s0591
pipeline/.venv/bin/python pipeline/fetch_regions.py --subjects s0591 --ct
pipeline/.venv/bin/python pipeline/fetch_regions.py --bonehub --case 002
pipeline/.venv/bin/python pipeline/build_regions.py

# Neuroanatomia
pipeline/.venv/bin/python pipeline/fetch_neuro.py
pipeline/.venv/bin/python pipeline/build_neuro.py

# Compara os resultados aos exames de origem
pipeline/.venv/bin/python pipeline/verify_assets.py
pipeline/.venv/bin/python pipeline/verify_regions.py
pipeline/.venv/bin/python pipeline/verify_neuro.py
```

`pipeline/neuro-source.json` e `pipeline/bonehub-source.json` fixam revisões e SHA-256. O pipeline TotalSegmentator lê trechos do espelho ZIP indicado no registro Zenodo e confere CRC32 de cada entrada extraída; o MD5 do ZIP integral não foi verificado. Caso o espelho mude, adapte o endereço em `fetch_selected.py` e `fetch_regions.py` ao arquivo oficial. Os arquivos processados incluídos nesta edição dispensam essa reconstrução para uso normal.

## Testes

```sh
cd web
npm test
npm run typecheck
npm run build
```

Os testes de navegador em `web/tests/verify-*.mjs` exigem servidor ativo, Chrome em macOS e WebKit do Playwright. Eles conferem seleção real, sincronização das vistas, quiz, troca de regiões, responsividade e recuperação de erros. Ajuste o caminho do Chrome se usar outro sistema.

## Licenças e créditos

O **código** (exceto dependências e dados de terceiros) é distribuído sob [PolyForm Noncommercial 1.0.0](LICENSE-CODE.md): permite usar, modificar e redistribuir para fins não comerciais. Os **arquivos anatômicos** em `web/public/data/` seguem as licenças das respectivas fontes, detalhadas em [LICENSE-DATA.md](LICENSE-DATA.md):

| Fonte | Regiões | Licença dos dados |
| --- | --- | --- |
| TotalSegmentator v2.0.1, casos s0591/s0720 | Cabeça/pescoço, abdômen | CC BY 4.0 |
| BoneHub/VSD, caso 002 | Pelve até os pés | CC BY-NC-SA 4.0 |
| CerebrA e ICBM152/TemplateFlow | Neuroanatomia | CerebrA CC0; imagens ICBM152 sob licença McGill, aviso em `web/public/data/neuro/LICENSE-McGill.txt` |

Preserve os créditos e avisos ao redistribuir os arquivos. Os derivados BoneHub permanecem sujeitos a atribuição, uso não comercial e compartilhamento sob CC BY-NC-SA 4.0. A licença do código não altera essas condições.
