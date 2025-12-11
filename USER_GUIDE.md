# 🎓 Guia de Uso - Melhorias de Usabilidade

## 📖 Como usar as novas funcionalidades

---

## 1. ✏️ Editar Mensagens

### Passo a passo:
1. **Localize sua mensagem** no histórico do chat
2. **Passe o mouse** sobre a mensagem
3. Aparecerão dois botões: ✏️ (editar) e 🗑️ (deletar)
4. **Clique no botão ✏️**
5. O texto da mensagem se transforma em um campo editável
6. **Edite o texto** como desejar
7. Para salvar:
   - Pressione **Enter**, OU
   - Clique no botão **✓** (check verde)
8. Para cancelar:
   - Pressione **Esc**, OU
   - Clique no botão **✗** (X vermelho)

### Observações:
- ✅ Só você pode editar suas próprias mensagens
- ✅ Mensagens editadas mostram badge "(editado)"
- ✅ Todos na sala veem a edição em tempo real
- ❌ Mensagens de sistema não podem ser editadas

---

## 2. 🗑️ Deletar Mensagens

### Passo a passo:
1. **Localize sua mensagem** no histórico
2. **Passe o mouse** sobre a mensagem
3. **Clique no botão 🗑️**
4. Aparece confirmação: "Deseja deletar esta mensagem?"
5. Clique em **OK** para confirmar

### Observações:
- ✅ Só você pode deletar suas próprias mensagens
- ✅ Mensagem deletada vira "[Mensagem deletada]"
- ✅ Todos na sala veem a exclusão
- ⚠️ Ação irreversível - não há como recuperar

---

## 3. @ Menções com Autocompletar

### Passo a passo:
1. No campo de mensagem, digite **@**
2. Comece a digitar o nome do usuário
3. Aparece lista de sugestões com usuários online
4. **Opção A**: Clique em uma sugestão
5. **Opção B**: Continue digitando até completar o nome
6. A menção é inserida automaticamente
7. Continue escrevendo sua mensagem

### Exemplos:
```
@jo       → mostra sugestões: @john, @joana
@joão     → sugere @joão
@        → mostra todos os usuários online
```

### Observações:
- ✅ Só mostra usuários online na sala atual
- ✅ Filtragem em tempo real
- ✅ Case-insensitive (maiúsculas/minúsculas)
- ✅ Fecha automaticamente ao selecionar

---

## 4. ⌨️ Enter vs Shift+Enter

### Comportamento:

| Tecla | Ação |
|-------|------|
| **Enter** | Envia a mensagem |
| **Shift + Enter** | Nova linha (quebra de linha) |

### Exemplos:

**Mensagem de uma linha:**
```
Digite: Olá, tudo bem?
Pressione: Enter
Resultado: Mensagem enviada
```

**Mensagem de múltiplas linhas:**
```
Digite: Primeira linha
Pressione: Shift + Enter
Digite: Segunda linha
Pressione: Shift + Enter
Digite: Terceira linha
Pressione: Enter
Resultado: Mensagem com 3 linhas enviada
```

### Observações:
- ✅ Campo de texto se expande automaticamente (até 120px)
- ✅ Scroll aparece se ultrapassar limite
- ✅ Comportamento igual ao WhatsApp/Telegram

---

## 5. ⏰ Ver Data/Hora Completa

### Passo a passo:
1. Cada mensagem mostra horário reduzido (ex: "14:30")
2. **Passe o mouse** sobre o horário
3. Aparece tooltip com data e hora completa
4. Formato: "11/12/2025 14:30:45"

### Observações:
- ✅ Não ocupa espaço extra na interface
- ✅ Formato brasileiro (dd/mm/yyyy)
- ✅ Útil para verificar mensagens antigas

---

## 6. ⬇️ Botão "Rolar para Baixo"

### Quando aparece:
- Aparece automaticamente quando você:
  - Rola o chat para cima (ver mensagens antigas)
  - Está a mais de 100px do final do chat

### Como usar:
1. Role o chat para cima para ver mensagens antigas
2. Aparece botão circular ⬇️ no canto inferior direito
3. **Clique no botão**
4. O chat rola suavemente até as mensagens mais recentes

### Quando desaparece:
- Desaparece automaticamente quando você está próximo ao final do chat
- Desaparece ao rolar manualmente até o final

### Observações:
- ✅ Animação suave de scroll
- ✅ Não bloqueia o conteúdo
- ✅ Feedback visual no hover (aumenta e muda cor)

---

## 7. ⏳ Feedback ao Enviar Mensagem

### O que você vê:
1. **Antes de enviar**: Botão mostra "📨 Enviar"
2. **Ao clicar em Enviar**: Botão muda para "⏳ Enviar"
3. **Durante envio**: 
   - Botão fica com animação pulsante
   - Botão desabilitado (não pode clicar novamente)
4. **Após envio**: Volta ao normal automaticamente

### Observações:
- ✅ Previne envio duplicado
- ✅ Feedback visual claro
- ✅ Duração: ~500ms

---

## 8. ⚠️ Confirmação ao Sair

### Quando acontece:
- Ao tentar fechar a aba do navegador
- Ao tentar fechar a janela
- Ao tentar navegar para outro site

### O que aparece:
```
⚠️ Você tem certeza que deseja sair do chat?
[Cancelar] [Sair]
```

### Observações:
- ✅ Só aparece se você está conectado
- ✅ Só aparece se há mensagens no chat
- ✅ Mensagem padrão do navegador
- ✅ Você pode desabilitar (navegador pergunta se quer desabilitar)

---

## 🎯 Dicas de Produtividade

### Atalhos Rápidos
- `Enter` → Enviar mensagem
- `Shift + Enter` → Nova linha
- `Esc` (durante edição) → Cancelar edição
- `@` + nome → Autocompletar menção
- Hover sobre horário → Ver timestamp completo
- Hover sobre mensagem → Mostrar ações (editar/deletar)

### Boas Práticas
1. **Edite** ao invés de enviar correção como nova mensagem
2. **Delete** mensagens duplicadas ou enviadas por engano
3. Use **@menções** para chamar atenção de usuários específicos
4. Use **Shift+Enter** para mensagens formatadas
5. Use **botão scroll** para voltar rápido ao presente
6. Confira **timestamp completo** quando necessário

### Fluxo Ideal
```
1. Digite mensagem
2. Use Shift+Enter para formatação (se necessário)
3. Use @ para mencionar alguém (se necessário)
4. Pressione Enter para enviar
5. Se errou, passe mouse e clique ✏️ para editar
6. Se duplicou, passe mouse e clique 🗑️ para deletar
```

---

## ❓ Perguntas Frequentes

### P: Posso editar mensagens de outros usuários?
**R:** Não, só suas próprias mensagens.

### P: Outros usuários veem que editei?
**R:** Sim, aparece badge "(editado)".

### P: Posso recuperar mensagem deletada?
**R:** Não, exclusão é permanente.

### P: As menções notificam o usuário?
**R:** Atualmente não, mas é uma funcionalidade futura.

### P: Quantas linhas posso escrever?
**R:** Sem limite, mas o campo tem altura máxima de 120px com scroll.

### P: O scroll button atrapalha?
**R:** Não, ele só aparece quando necessário e está posicionado para não bloquear conteúdo.

### P: Funciona no celular?
**R:** Sim! Todas as funcionalidades são responsivas.

### P: Como desabilitar confirmação ao sair?
**R:** O navegador pergunta se você quer desabilitar após a primeira vez.

---

## 🐛 Problemas Comuns

### Botão de editar não aparece
- **Causa**: Não é sua mensagem
- **Solução**: Só você pode editar suas mensagens

### Menções não aparecem
- **Causa**: Não há outros usuários online
- **Solução**: Espere outros usuários entrarem na sala

### Enter não envia
- **Causa**: Campo não está focado
- **Solução**: Clique no campo de mensagem antes

### Scroll button sempre visível
- **Causa**: Novas mensagens chegando
- **Solução**: Role até o final manualmente

---

## 📱 Compatibilidade Mobile

### Touch gestures suportados:
- ✅ Tap para editar/deletar
- ✅ Tap para selecionar menção
- ✅ Tap para scroll button
- ✅ Swipe para rolar histórico
- ✅ Long press para tooltip (timestamp)

### Teclado virtual:
- ✅ Campo se ajusta quando teclado abre
- ✅ Enter no teclado envia mensagem
- ✅ Quebra de linha disponível no teclado

---

## 🎨 Personalização

### Tema Dark Mode
- Todos os elementos respeitam o tema escuro
- Cores adaptadas para legibilidade
- Contrastes otimizados

### Acessibilidade
- Tooltips descritivos
- Feedback visual claro
- Suporte a navegação por teclado
- Indicadores de estado

---

**Versão do Guia**: 2.0  
**Última Atualização**: Dezembro 2025  
**Status**: ✅ Atualizado
