import { CHAT_LIMITS } from '../services/ai/consultation-limits.js';
import { buildAssistantHistory } from '../services/ai/consultation-history';
import type { ChatMessage, ConsultationDiagnosis, ConsultationPhase, ConsultationSource } from '../services/ai/types';

type ChatResponse = {
  message?: { content: string }; phase?: ConsultationPhase; questions?: string[];
  diagnosis?: ConsultationDiagnosis | null; cta?: { show: boolean };
  sources?: ConsultationSource[]; sourceNotice?: string;
  limits?: { turnsRemaining: number }; error?: string;
};

export function initConsultation() {
  const form = document.querySelector<HTMLFormElement>('#chat-form');
  const input = document.querySelector<HTMLTextAreaElement>('#chat-input');
  const messages = document.querySelector<HTMLDivElement>('#chat-messages');
  const submit = form?.querySelector<HTMLButtonElement>('[type="submit"]');
  const reset = document.querySelector<HTMLButtonElement>('#chat-reset');
  if (!form || !input || !messages || !submit || !reset || form.dataset.ready) return;
  form.dataset.ready = 'true';
  const suggestions = document.querySelectorAll<HTMLButtonElement>('.suggestion');
  const notice = document.querySelector<HTMLParagraphElement>('#chat-notice');
  const turnStatus = document.querySelector('#turn-status');
  const count = document.querySelector('#character-count');
  const handoff = document.querySelector<HTMLDivElement>('#consultation-note');
  const welcome = messages.firstElementChild?.cloneNode(true);
  const newId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const state = { version: 1, sessionId: newId(), messages: [] as ChatMessage[], diagnosis: null as ConsultationDiagnosis | null, phase: 'answer' as ConsultationPhase };
  let busy = false;
  const used = () => state.messages.filter((item) => item.role === 'user').length;
  const emit = (name = 'yamicha:consultation-updated') => window.dispatchEvent(new CustomEvent(name, { detail: structuredClone(state) }));
  const setNotice = (text = '') => { if (notice) { notice.textContent = text; notice.hidden = !text; } };
  const scroll = () => messages.scrollTo({ top: messages.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const update = () => {
    const remaining = Math.max(0, CHAT_LIMITS.turns - used());
    input.disabled = submit.disabled = busy || remaining === 0;
    reset.disabled = busy;
    suggestions.forEach((button) => { button.disabled = busy || remaining === 0; });
    form.setAttribute('aria-busy', String(busy));
    if (turnStatus) turnStatus.textContent = remaining ? `あと${remaining}回相談できます` : 'この相談の会話上限に達しました';
    if (count) count.textContent = `${input.value.length} / ${CHAT_LIMITS.userChars}`;
  };
  function addMessage(role: 'user' | 'assistant', text: string, questions: string[] = []) {
    const row = document.createElement('div'); row.className = `message ${role}`;
    if (role === 'assistant') { const icon = document.createElement('span'); icon.className = 'message-icon'; icon.textContent = 'AI'; icon.setAttribute('aria-hidden', 'true'); row.append(icon); }
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    const paragraph = document.createElement('p'); paragraph.textContent = text; bubble.append(paragraph);
    if (questions.length) { const list = document.createElement('ol'); questions.slice(0, 1).forEach((text) => { const li = document.createElement('li'); li.textContent = text; list.append(li); }); bubble.append(list); }
    row.append(bubble); messages.append(row); scroll(); return { row, bubble };
  }
  function addSources(bubble: HTMLElement, data: ChatResponse) {
    const valid = (data.sources || []).filter((source) => {
      try { const url = new URL(source.url); return url.protocol === 'https:' && !url.username && !url.password && ['docs.aws.amazon.com', 'learn.microsoft.com', 'docs.ollama.com'].includes(url.hostname); } catch { return false; }
    });
    if (valid.length) {
      const box = document.createElement('div'); box.className = 'reply-sources';
      const label = document.createElement('strong'); label.textContent = '参照した技術ノートの出典'; box.append(label);
      const list = document.createElement('ul');
      valid.slice(0, 3).forEach((source) => {
        const item = document.createElement('li'); const link = document.createElement('a');
        link.textContent = source.title; link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const date = document.createElement('small'); date.textContent = `ノート確認日：${source.checkedAt}`;
        item.append(link, date); list.append(item);
      });
      box.append(list); bubble.append(box);
    }
    if (data.sourceNotice) { const text = document.createElement('p'); text.className = 'source-notice'; text.textContent = data.sourceNotice; bubble.append(text); }
  }
  function addDiagnosis(diagnosis: ConsultationDiagnosis) {
    const card = document.createElement('details'); card.className = 'diagnosis-card';
    const summary = document.createElement('summary'); summary.textContent = '業務改善の整理結果'; card.append(summary);
    const labels = { current_process: '現在の業務', problems: '課題', recommended_solution: '改善案', automation_methods: '自動化の方法', expected_effects: '期待される効果', missing_information: '実装前の確認事項' } as const;
    (Object.keys(labels) as Array<keyof typeof labels>).forEach((key) => {
      if (!diagnosis[key]?.length) return;
      const heading = document.createElement('h3'); heading.textContent = labels[key];
      const list = document.createElement('ul'); diagnosis[key].forEach((value) => { const li = document.createElement('li'); li.textContent = value; list.append(li); }); card.append(heading, list);
    });
    const labelsAI = { recommended: 'AIの活用が有効', partially_recommended: '一部にAIを活用', not_required: '通常のプログラムで対応', undetermined: 'AIの必要性は要確認' };
    const labelsDifficulty = { low: '低め', medium: '標準', high: '高め', undetermined: '要確認' };
    const assessment = document.createElement('p'); assessment.textContent = `${labelsAI[diagnosis.ai_required]}。${diagnosis.ai_reason}\n実装難易度：${labelsDifficulty[diagnosis.difficulty]}`;
    card.append(assessment); messages.append(card);
  }
  async function send() {
    const content = input.value.trim();
    if (!content || busy || used() >= CHAT_LIMITS.turns) return;
    if (content.length > CHAT_LIMITS.userChars) { setNotice(`入力は${CHAT_LIMITS.userChars}文字以内にしてください。`); return; }
    if (state.messages.reduce((sum, item) => sum + item.content.length, content.length) > CHAT_LIMITS.totalChars) {
      setNotice('会話の文字数上限に達しました。必要な条件をまとめて「新しい相談」を始めてください。'); return;
    }
    setNotice(); if (handoff) handoff.hidden = true;
    const userRow = addMessage('user', content).row;
    const pending = addMessage('assistant', '資料と相談内容を確認しています…').row;
    const outgoing: ChatMessage[] = [...state.messages, { role: 'user', content }];
    input.value = ''; busy = true; update();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId, messages: outgoing }), signal: controller.signal });
      const data = await response.json() as ChatResponse;
      if (!response.ok || typeof data.message?.content !== 'string' || !data.message.content.trim()) throw new Error(data.error || '回答を取得できませんでした。');
      pending.remove();
      state.messages.push({ role: 'user', content }, { role: 'assistant', content: buildAssistantHistory(data.message.content, data.questions || [], data.diagnosis) });
      state.phase = data.phase || 'answer'; state.diagnosis = data.diagnosis || null;
      const result = addMessage('assistant', data.message.content, data.questions || []);
      addSources(result.bubble, data);
      if (state.diagnosis) addDiagnosis(state.diagnosis);
      if (handoff) handoff.hidden = !data.cta?.show;
      emit(); scroll();
    } catch (error) {
      pending.remove(); userRow.remove(); input.value = content;
      setNotice(error instanceof DOMException && error.name === 'AbortError' ? '応答が時間内に届きませんでした。入力内容は残してあります。' : error instanceof Error ? error.message : 'ただいま相談室を利用できません。');
    } finally { clearTimeout(timer); busy = false; update(); if (!input.disabled) input.focus(); }
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); void send(); });
  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!busy) form.requestSubmit(); } });
  suggestions.forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.question || button.textContent?.trim() || ''; update(); input.focus(); }));
  reset.addEventListener('click', () => {
    if (busy) return;
    state.messages = []; state.diagnosis = null; state.phase = 'answer'; state.sessionId = newId();
    messages.replaceChildren(); if (welcome) messages.append(welcome.cloneNode(true));
    input.value = ''; setNotice(); if (handoff) handoff.hidden = true;
    update(); emit(); input.focus();
  });
  handoff?.querySelector('a')?.addEventListener('click', () => {
    try { sessionStorage.setItem('yamicha:consultation-handoff', JSON.stringify(state)); } catch { /* Storage may be blocked; the contact link still works. */ }
    emit('yamicha:consultation-handoff');
  });
  document.querySelectorAll<HTMLElement>('[data-focus-chat]').forEach((link) => link.addEventListener('click', () => window.setTimeout(() => input.focus(), 450)));
  update();
}
initConsultation();
