# Atribuição e licença dos dados anatômicos

## Abdômen e cabeça/pescoço

TotalSegmentator, Jakob Wasserthal et al., University Hospital Basel, subconjunto v2.0.1.

- Fonte: https://zenodo.org/records/10047263
- Licença: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- Casos: s0720 (abdômen) e s0591 (cabeça/pescoço).
- Derivados: `web/public/data/` (arquivos da raiz e `meshes/`) e `web/public/data/head-neck/`.

## Pelve, coxas/pernas e tornozelos/pés

Seyed Hamidreza Alavi e Malte Asseln (2026), **vsd-lower-extremities-seg**, BoneHub.

- Fonte: https://huggingface.co/datasets/BoneHub/vsd-lower-extremities-seg
- Revisão: 85214b5a182b980a7869b57efba89a59a2445875
- Licença: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0**, https://creativecommons.org/licenses/by-nc-sa/4.0/
- Caso: BoneHub 002, correspondente ao VSD 006.
- Derivados: `web/public/data/pelvis/`, `web/public/data/legs/`, `web/public/data/feet/`. Os dados adaptados desses diretórios permanecem sob **CC BY-NC-SA 4.0**.

Citar também a publicação de origem: M. C. M. Fischer (2023), *Database of Segmentations and Surface Models of Bones of the Entire Lower Body Created from Cadaver CT Scans*, Scientific Data 10, 763. https://doi.org/10.1038/s41597-023-02669-z

A restrição não comercial aplica-se aos dados BoneHub/VSD e seus derivados. Uma distribuição comercial que inclua esses dados exige autorização dos titulares ou substituição por dados com licença apropriada. Essas condições não atribuem automaticamente a mesma licença ao código independente da interface.

## Adaptações neste repositório

Seleção dos casos, reorientação RAS+, recortes regionais, reamostragem conjunta da TC e das máscaras, máscaras vertebrais combinadas no abdômen, conversão de CT para uint8 com janela (abdômen) ou int16 HU (novos módulos), extração de superfícies, suavização e simplificação adaptativa, formatos binários/GLB e tradução das legendas para português. Dados de origem foram preservados; os derivados não são produtos oficiais dos autores citados.

Uso educacional. A inspeção e os testes de software descritos no projeto não equivalem a validação clínica das segmentações.

## Neuroanatomia por ressonância

- **CerebrA**, Manera AL, Dadar M, Fonov V, Collins DL (2020). *CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template*. Scientific Data 7, 237. https://doi.org/10.1038/s41597-020-0557-9
- Dados e licença **CC0 1.0**: https://doi.gin.g-node.org/10.12751/g-node.be5e62/
- Ressonâncias T1/T2: **ICBM152 2009c nonlinear symmetric**, McGill, Fonov et al. A licença McGill permite uso, cópia, modificação e distribuição com preservação do aviso. Texto integral em `web/public/data/neuro/LICENSE-McGill.txt`.
- Espelho TemplateFlow, revisão `69a5e68d2b276b1e46f701892ac630397f56a741`. Manifesto com URLs e SHA-256: `pipeline/neuro-source.json`. As três imagens NIfTI foram comparadas aos MD5 dos ponteiros git-annex desta revisão.
- Derivados em `web/public/data/neuro/`: recorte na grade RAS de 1 mm; intensidades T1/T2 quantizadas com fator 100; união de sete pares de rótulos medianos; tradução dos nomes; extração, suavização e simplificação de malhas. As 102 classes originais resultam em 95 estruturas selecionáveis, incluindo as 62 parcelas corticais. Imagens e máscaras permanecem no mesmo espaço de origem; não houve novo registro espacial.
- É um template populacional médio. As bordas das parcelas seguem o atlas e não definem funções exclusivas de cada área.

## Conteúdo de estudo

As fichas e instruções foram redigidas para esta aplicação, com referências por ficha para OpenStax, *Anatomy and Physiology 2e*, e para a publicação CerebrA. Os textos de contexto regional descrevem grupos anatômicos, não atribuições funcionais exclusivas às parcelas. Não há revisão médica independente registrada nesta entrega.

Os arquivos de web/public/data são distribuídos com as licenças acima, por origem. A licença do código não substitui as licenças desses arquivos. Nenhum emblema ou marca institucional acompanha este repositório.
