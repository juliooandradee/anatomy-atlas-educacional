# Prompt para criar seu atlas a partir deste código

Copie o texto abaixo em um agente de programação que tenha acesso a GitHub e ao terminal. Personalize os campos entre chaves.

```text
Quero criar um atlas anatômico interativo para {PÚBLICO}, com a identidade visual {NOME, CORES E ESTILO}.

Comece clonando https://github.com/juliooandradee/anatomy-atlas-educacional. Leia README.md e LICENSE-DATA.md. Use o código, a arquitetura e os arquivos anatômicos processados já incluídos como base, em vez de reimplementar o explorador do zero.

Preserve as seis regiões e as interações existentes: modelo 3D, cortes axial/coronal/sagital sincronizados, seleção de estruturas, busca, contraste, camadas, roteiros e quiz. Mantenha a correspondência entre a geometria, os voxels e as máscaras. Não sintetize detalhes anatômicos nem represente os três exames de origem como se fossem um único paciente.

Substitua o título, o ícone, a paleta e os textos de apresentação pela identidade que descrevi. Não inclua emblemas, imagens ou nomes de marca de terceiros. Preserve os créditos, os avisos e as licenças dos dados em LICENSE-DATA.md e no aplicativo.

Execute npm ci, npm test, npm run typecheck e npm run build dentro de web/. Abra a aplicação e confira no navegador o carregamento das seis regiões, seleção no 3D e nos cortes, quiz e layout em celular. Corrija falhas antes de me entregar o resultado. Explique os arquivos alterados, os testes realizados, o que permanece sujeito a revisão anatômica e como publicar, com Root Directory = web.
```

O código e os arquivos anatômicos incluídos dão uma base próxima à aplicação original. A aparência final dependerá da identidade escolhida, das alterações feitas pelo agente e da validação visual.
