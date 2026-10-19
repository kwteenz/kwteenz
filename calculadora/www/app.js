'use strict';

/* ============================================================
 * Motor da calculadora (sem DOM, fácil de testar)
 * ============================================================ */
const MAX_DIGITS = 12;

function createCalc() {
  const s = {
    current: '0',     // valor em edição (ponto como separador decimal)
    previous: null,   // operando anterior
    operator: null,   // '+', '−', '×', '÷'
    overwrite: false, // o próximo dígito substitui o visor
    error: false,
    expr: '',
  };

  const compute = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const fmt = (n) => {
    if (!Number.isFinite(n)) return 'Erro';
    const s = Number(n.toPrecision(MAX_DIGITS)).toString();
    return s.includes('e') ? Number(n).toExponential(6) : s;
  };

  const reset = () => {
    s.current = '0'; s.previous = null; s.operator = null;
    s.overwrite = false; s.error = false; s.expr = '';
  };

  const startEntry = () => {
    if (s.error) reset();
    if (s.overwrite) { s.current = '0'; s.overwrite = false; }
  };

  const digit = (d) => {
    startEntry();
    if (s.current.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
    if (s.current === '0') s.current = d;
    else if (s.current === '-0') s.current = '-' + d;
    else s.current += d;
  };

  const decimal = () => {
    startEntry();
    if (!s.current.includes('.')) s.current += '.';
  };

  const backspace = () => {
    if (s.error || s.overwrite) return;
    const c = s.current;
    s.current = c.length > 1 && !(c.length === 2 && c[0] === '-') ? c.slice(0, -1) : '0';
  };

  const sign = () => {
    if (s.error || s.current === '0') return;
    s.current = s.current.startsWith('-') ? s.current.slice(1) : '-' + s.current;
  };

  const percent = () => {
    if (s.error) return;
    s.current = fmt(parseFloat(s.current) / 100);
    s.overwrite = true;
  };

  const chooseOp = (op) => {
    if (s.error) return;
    const value = parseFloat(s.current);
    if (s.previous !== null && s.operator && !s.overwrite) {
      const r = compute(s.previous, value, s.operator);
      if (!Number.isFinite(r)) {
        s.expr = `${fmt(s.previous)} ${s.operator} ${fmt(value)} =`;
        s.error = true; s.previous = null; s.operator = null;
        return;
      }
      s.previous = r;
      s.current = fmt(r);
    } else if (s.previous === null) {
      s.previous = value;
    }
    s.operator = op;
    s.overwrite = true;
    s.expr = `${fmt(s.previous)} ${op}`;
  };

  // devolve { expr, result } em caso de sucesso, { expr, error: true } se ÷0, ou null
  const equals = () => {
    if (s.error || s.previous === null || !s.operator) return null;
    const a = s.previous;
    const b = parseFloat(s.current);
    const op = s.operator;
    const r = compute(a, b, op);
    const expr = `${fmt(a)} ${op} ${fmt(b)}`;
    s.previous = null; s.operator = null; s.overwrite = true;
    s.expr = expr + ' =';
    if (!Number.isFinite(r)) { s.error = true; return { expr, error: true }; }
    s.current = fmt(r);
    return { expr, result: s.current };
  };

  return { s, digit, decimal, backspace, sign, percent, chooseOp, equals, clear: reset };
}

if (typeof module !== 'undefined') module.exports = { createCalc };

/* ============================================================
 * Interface RPG (XP, nível, diário de missões)
 * ============================================================ */
if (typeof document !== 'undefined') {
  (() => {
    const $ = (id) => document.getElementById(id);
    const el = {
      display: $('display'), result: $('result'), expr: $('expr'), toast: $('toast'),
      lvl: $('lvl'), rank: $('rank'), xpfill: $('xpfill'), xptext: $('xptext'), log: $('log'),
      bar: document.querySelector('.xpbar'),
    };

    const RANKS = ['Camponês', 'Aprendiz', 'Escudeiro', 'Cavaleiro', 'Paladino', 'Mago', 'Arquimago', 'Lendário'];
    const XP_PER_QUEST = 10;
    const XP_PER_LEVEL = 100;
    const STORE_KEY = 'calculadora-rpg-v1';

    const calc = createCalc();
    let save = { xp: 0, log: [] };

    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && typeof raw.xp === 'number' && Array.isArray(raw.log)) save = raw;
    } catch (_) { /* sem armazenamento: segue em memória */ }

    const persist = () => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (_) { /* ignora */ }
    };

    const comma = (t) => String(t).replace(/\./g, ',');
    const level = () => Math.floor(save.xp / XP_PER_LEVEL) + 1;

    let toastTimer = null;
    const toast = (msg, bad) => {
      el.toast.textContent = msg;
      el.toast.classList.remove('show', 'bad');
      void el.toast.offsetWidth; // reinicia a animação
      el.toast.classList.add('show');
      if (bad) el.toast.classList.add('bad');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2300);
    };

    const renderHero = () => {
      const lv = level();
      const inLevel = save.xp % XP_PER_LEVEL;
      el.lvl.textContent = `NV ${lv}`;
      el.rank.textContent = RANKS[Math.min(lv - 1, RANKS.length - 1)];
      el.xpfill.style.width = `${inLevel}%`;
      el.xptext.textContent = `${inLevel}/${XP_PER_LEVEL} XP`;
      el.bar.setAttribute('aria-valuenow', String(inLevel));
    };

    const renderLog = () => {
      el.log.textContent = '';
      if (!save.log.length) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'Nenhuma missão cumprida ainda.';
        el.log.appendChild(li);
        return;
      }
      save.log.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = comma(entry);
        el.log.appendChild(li);
      });
    };

    const fitResult = (text) => {
      const n = text.length;
      el.result.style.fontSize = n > 14 ? '.8rem' : n > 11 ? '1.05rem' : n > 8 ? '1.4rem' : '';
    };

    const render = () => {
      const s = calc.s;
      const text = s.error ? 'DRAGÃO!' : comma(s.current);
      el.result.textContent = text;
      fitResult(text);
      el.expr.textContent = comma(s.expr);
      el.display.classList.toggle('dragon', s.error);
      document.querySelectorAll('button.op').forEach((b) => {
        b.classList.toggle('selected', s.overwrite && b.dataset.op === s.operator);
      });
    };

    const dragon = () => {
      toast('Você invocou o Dragão da Divisão por Zero!', true);
      el.display.classList.remove('shake');
      void el.display.offsetWidth;
      el.display.classList.add('shake');
    };

    const completeQuest = (rec) => {
      const before = level();
      save.xp += XP_PER_QUEST;
      save.log.unshift(`${rec.expr} = ${rec.result}`);
      save.log = save.log.slice(0, 6);
      persist();
      renderHero();
      renderLog();
      if (level() > before) toast(`NÍVEL UP! Agora você é ${el.rank.textContent}`);
      else toast(`+${XP_PER_QUEST} XP`);
    };

    const handleEquals = () => {
      const rec = calc.equals();
      if (!rec) return;
      if (rec.error) dragon(); else completeQuest(rec);
    };

    const handleOp = (op) => {
      calc.chooseOp(op);
      if (calc.s.error) dragon();
    };

    const keys = document.querySelector('.keys');
    keys.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const { action } = btn.dataset;
      if (action === 'op') handleOp(btn.dataset.op);
      else if (action === 'equals') handleEquals();
      else if (action === 'digit') calc.digit(btn.dataset.digit);
      else if (typeof calc[action] === 'function') calc[action]();
      render();
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^\d$/.test(k)) calc.digit(k);
      else if (k === ',' || k === '.') calc.decimal();
      else if (k === '+') handleOp('+');
      else if (k === '-') handleOp('−');
      else if (k === '*' || k.toLowerCase() === 'x') handleOp('×');
      else if (k === '/') { e.preventDefault(); handleOp('÷'); }
      else if (k === '%') calc.percent();
      else if (k === 'Backspace') calc.backspace();
      else if (k === 'Escape') calc.clear();
      else if (k === 'Enter' || k === '=') { e.preventDefault(); handleEquals(); }
      else return;
      render();
    });

    // Service worker: uso offline no navegador / PWA
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    renderHero();
    renderLog();
    render();
  })();
}
