# Prompt completo para criar seu Atlas

Copie o texto abaixo e cole em um agente de programação com acesso ao GitHub, ao terminal e ao navegador. Você pode trocar os três campos entre chaves; os valores sugeridos já permitem começar.

```text
Aja como uma equipe de engenharia de software, visualização médica 3D, design de interfaces e controle de qualidade. Quero que você CRIE e ENTREGUE uma aplicação executável, com código-fonte completo, a partir do projeto abaixo. Faça as alterações no projeto e teste o resultado; não responda apenas com um plano ou trechos de código.

Meu projeto:
- Nome: {NOME DO PROJETO: Atlas Anatômico Interativo}
- Público: {PÚBLICO: estudantes e profissionais da saúde}
- Identidade visual: {CORES E ESTILO: azul ardósia, branco, tipografia legível e visual científico contemporâneo}

BASE OBRIGATÓRIA
Clone https://github.com/juliooandradee/anatomy-atlas-educacional e leia README.md, PROMPT.md, LICENSE-CODE.md e LICENSE-DATA.md. O repositório já traz o app Next.js, os arquivos anatômicos processados em web/public/data/, os pipelines de origem e os testes. Use essa base real para que a anatomia, as interações e a organização das telas fiquem próximas ao exemplo. Não substitua o projeto por um mockup, imagens estáticas, uma demonstração sem dados ou uma reimplementação superficial.

Faça um inventário curto dos módulos e arquivos existentes. Em seguida, implemente a versão com o nome e a identidade visual que defini. Use Next.js, React, TypeScript, Three.js/React Three Fiber e a estrutura do projeto, preservando os dados e as relações espaciais. Se precisar mudar a arquitetura, justifique a mudança e mantenha todas as funções.

FUNCIONALIDADES QUE DEVEM ESTAR PRONTAS
1. Seis módulos navegáveis: neuroanatomia por RM, cabeça e pescoço, abdômen, pelve, coxas e pernas, tornozelos e pés. Mostre o nome da região e a origem do exame. Carregue apenas os arquivos da região ativa e descarte respostas antigas ao trocar rapidamente de módulo.
2. Em cada região, mantenha o modelo 3D e os cortes axial, coronal e sagital do mesmo volume. A seleção no 3D ou na lista deve localizar a estrutura e posicionar a mira em um voxel interior da máscara; cliques e arrastos nos cortes devem atualizar a mira e as outras vistas. Respeite orientação radiológica, lado direito/esquerdo e limites da imagem.
3. Inclua rotação, zoom, mostrar/ocultar e isolamento de estruturas, planos de referência, busca por nome, filtros por grupo quando disponíveis, navegação por cortes, ampliação de cada vista e controles utilizáveis no teclado e no celular.
4. Para as tomografias, preserve HU quando o arquivo da região os contém e ofereça janelas adequadas para encéfalo, tecidos moles e ossos. Para a RM, permita alternar T1 e T2 com a mesma posição da mira; intensidade de RM não é HU. A interpolação visual pode suavizar pixels na tela, mas não aumenta a resolução adquirida.
5. Mantenha as fichas de estudo com fontes, roteiros guiados e quiz de cinco perguntas com alternativas distintas. Registre respostas, pistas e progresso no navegador; trate armazenamento bloqueado sem quebrar o app. Não revele a resposta antes da escolha do aluno.
6. Faça uma interface responsiva, com contraste, foco visível, rótulos acessíveis, estado de carregamento e mensagem de erro com opção de tentar novamente. O 3D e os cortes devem continuar utilizáveis em telas pequenas, sem rolagem horizontal.

DADOS, FIDELIDADE E DIREITOS
Os arquivos processados já incluídos permitem abrir o app imediatamente. A RM usa ICBM152/CerebrA; cabeça e pescoço e abdômen usam dois casos do TotalSegmentator; pelve até os pés usa um caso BoneHub/VSD. São fontes e indivíduos distintos: não os apresente como um único paciente nem simule continuidade anatômica entre regiões. Preserve a associação entre volume, máscara, metadados e malhas. Não invente rótulos, estruturas ou detalhes de exame e não gere imagens médicas sintéticas para preencher lacunas.

Os pipelines Python estão em pipeline/ para quem desejar reconstruir os arquivos a partir das fontes; essa reconstrução não é necessária para personalizar a interface. Se alterar dados, recortes ou malhas, verifique dimensões, affine, espaçamento, lateralidade, integridade e correspondência voxel ↔ corte ↔ 3D. Registre o caso e a versão usados.

Crie sua própria identidade visual: substitua título, ícone, paleta, textos de abertura e metadados. Não copie nomes, emblemas, imagens de marca ou identidade institucional de terceiros. Preserve os créditos e avisos das fontes em LICENSE-DATA.md e no produto. O código permite reutilização não comercial conforme LICENSE-CODE.md; os dados têm licenças próprias, inclusive CC BY-NC-SA 4.0 para os derivados BoneHub. Não apresente a aplicação como dispositivo médico, ferramenta diagnóstica ou substituto de revisão anatômica.

EXECUÇÃO E ACEITE
Instale as dependências com npm ci dentro de web/. Rode npm test, npm run typecheck e npm run build. Inicie o servidor e abra a aplicação no navegador. Verifique cada uma das seis regiões, a seleção de estruturas reais, o alinhamento entre 3D e três cortes, a troca T1/T2, a janela de TC, o estudo, o quiz, a persistência do progresso e a troca rápida de região. Confira desktop e uma tela móvel; corrija erros de execução, recursos ausentes e transbordamento horizontal. Se alterar o processamento anatômico, execute também os verificadores Python correspondentes.

ENTREGA
Entregue o projeto completo e executável no repositório, não apenas arquivos isolados ou uma descrição. Informe como abrir localmente, quais arquivos foram alterados e o que cada mudança resolve. Liste os testes que de fato passaram e qualquer limite ainda não verificado. Mostre capturas das telas principais em desktop e celular. Explique como publicar na Vercel usando web como Root Directory, mas só faça o deploy quando eu pedir. Escreva de forma clara para quem está aprendendo: diferencie o que está pronto, o que foi testado e o que ainda exige revisão humana.
```

A base inclui o código e os arquivos processados, por isso o resultado pode ficar muito próximo. A identidade escolhida e a revisão de quem implementa determinam a aparência final.
