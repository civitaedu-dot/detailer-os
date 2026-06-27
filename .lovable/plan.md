
## Objetivo
Colocar a plataforma no ar pela Lovable (substituindo a Vercel) e conectar o domínio comprado no Registro.br.

## Etapas

### 1. Preparar metadados do site antes do publish
Atualizar `index.html` para refletir a plataforma (hoje provavelmente está com título/descrição genéricos):
- `<title>` com nome real da plataforma
- `<meta name="description">` descrevendo o produto
- Tags Open Graph (`og:title`, `og:description`, `og:type`, `og:image`)
- Tags Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`)
- Favicon condizente

### 2. Verificação de segurança
Rodar o scan de segurança antes do deploy para garantir que não há findings críticos pendentes bloqueando o publish.

### 3. Publicar na Lovable
Publicar o projeto, gerando a URL `seu-projeto.lovable.app`. Isso é pré-requisito para conectar qualquer domínio próprio.

### 4. Conectar o domínio do Registro.br
No painel da Lovable: **Project Settings → Domains → Connect Domain** (ou pelo diálogo de Publish → Add custom domain). Informar o domínio (ex.: `seudominio.com.br`) e também adicionar o `www` como entrada separada, escolhendo um como **Primary** (o outro redireciona).

A Lovable mostrará os registros DNS exatos. O padrão é:

```text
Tipo  Nome      Valor
A     @         185.158.133.1
A     www       185.158.133.1
TXT   _lovable  lovable_verify=<token mostrado pela Lovable>
```

### 5. Configurar DNS no Registro.br
No painel do Registro.br:
1. Acessar o domínio → **DNS** → **Configurar DNS**.
2. Manter os servidores DNS do Registro.br (`a.dns.br`, `b.dns.br`, etc.) **ou** usar servidores próprios. Para o caminho mais simples, manter os do Registro.br e editar a zona diretamente lá.
3. Em **Editar Zona / Registros DNS**, remover quaisquer registros A/AAAA/CNAME antigos para `@` e `www` que apontem para Vercel ou outros provedores.
4. Adicionar os registros fornecidos pela Lovable (A para `@`, A para `www`, TXT `_lovable`).
5. Salvar e publicar a zona.

Observação Registro.br: o campo "Nome" às vezes aparece sem o `@` — basta deixar em branco para representar o domínio raiz. Para `www`, digitar apenas `www`. Para o TXT, o nome é `_lovable`.

### 6. Aguardar propagação e SSL
- Propagação DNS: normalmente minutos, podendo levar até 72h.
- A Lovable provisiona SSL automaticamente assim que verificar os registros.
- Acompanhar status em **Project Settings → Domains** (passa por: Verifying → Setting up → Active).

### 7. Validação final
Após status **Active**, testar:
- `https://seudominio.com.br` carrega a plataforma
- `https://www.seudominio.com.br` também resolve (redirecionando para o Primary)
- Cadeado SSL válido no navegador

## O que eu preciso de você para começar
1. Confirmação para publicar agora.
2. O domínio exato comprado no Registro.br (ex.: `nomeplataforma.com.br`).
3. Se quer um slug específico para a URL `*.lovable.app` (opcional).

## Sobre a Vercel
Depois que o domínio estiver **Active** na Lovable, você pode remover o projeto/domínio da Vercel sem impacto — o DNS já estará apontando 100% para a Lovable.
