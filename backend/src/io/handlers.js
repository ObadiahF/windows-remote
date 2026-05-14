import { pasteText } from '../actions/paste.js';
import { pressDirection, typeText, pressBackspace } from '../actions/keyboard.js';
import { pressMedia, getMuteState } from '../actions/media.js';
import { runSystem } from '../actions/system.js';

const DIRECTION_KEYS = new Set(['up', 'down', 'left', 'right', 'select']);
const MEDIA_ACTIONS = new Set(['play_pause', 'volume_up', 'volume_down', 'mute']);
const SYSTEM_ACTIONS = new Set(['sleep', 'back']);

export function registerHandlers(io, socket) {
  socket.on('ping:echo', (_payload, ack) => {
    const reply = { timestamp: Date.now() };
    if (typeof ack === 'function') ack(reply);
    else socket.emit('pong:echo', reply);
  });

  socket.on('paste', async (payload, ack) => {
    const text = typeof payload === 'string' ? payload : payload?.text;
    if (!text || typeof text !== 'string') {
      return replyAck(ack, { error: 'Missing "text" string' });
    }
    await runAction(ack, () => pasteText(text), 'paste', { length: text.length });
  });

  socket.on('direction', async (payload, ack) => {
    const key = payload?.key;
    if (!DIRECTION_KEYS.has(key)) {
      return replyAck(ack, {
        error: `Invalid "key". Must be one of: ${[...DIRECTION_KEYS].join(', ')}`,
      });
    }
    await runAction(ack, () => pressDirection(key), `direction:${key}`);
  });

  socket.on('media', async (payload, ack) => {
    const action = payload?.action;
    if (!MEDIA_ACTIONS.has(action)) {
      return replyAck(ack, {
        error: `Invalid "action". Must be one of: ${[...MEDIA_ACTIONS].join(', ')}`,
      });
    }
    try {
      await pressMedia(action);
      replyAck(ack, { ok: true });
      try {
        const state = await getMuteState();
        socket.emit('mute:state', state);
      } catch (err) {
        console.warn('[mute:state] state query failed:', err.message);
      }
    } catch (err) {
      console.error('[media] failed:', err.message);
      replyAck(ack, { error: err.message });
    }
  });

  socket.on('system', async (payload, ack) => {
    const action = payload?.action;
    if (!SYSTEM_ACTIONS.has(action)) {
      return replyAck(ack, {
        error: `Invalid "action". Must be one of: ${[...SYSTEM_ACTIONS].join(', ')}`,
      });
    }
    await runAction(ack, () => runSystem(action), `system:${action}`);
  });

  socket.on('keyboard:type', async (payload, ack) => {
    const text = payload?.text;
    if (typeof text !== 'string' || text.length === 0) {
      return replyAck(ack, { error: 'Missing "text" string' });
    }
    await runAction(ack, () => typeText(text), 'keyboard:type');
  });

  socket.on('keyboard:backspace', async (...args) => {
    const ack = args.find((a) => typeof a === 'function');
    await runAction(ack, () => pressBackspace(), 'keyboard:backspace');
  });

  socket.on('mute:state:query', async (...args) => {
    const ack = args.find((a) => typeof a === 'function');
    try {
      const state = await getMuteState();
      replyAck(ack, { ok: true, ...state });
    } catch (err) {
      console.error('[mute:state:query] failed:', err.message);
      replyAck(ack, { error: err.message });
    }
  });
}

async function runAction(ack, action, label = 'action', extraOk = {}) {
  try {
    await action();
    replyAck(ack, { ok: true, ...extraOk });
  } catch (err) {
    console.error(`[${label}] failed:`, err.message);
    replyAck(ack, { error: err.message });
  }
}

function replyAck(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}
