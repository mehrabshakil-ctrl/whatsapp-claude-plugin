import { randomInt } from 'node:crypto';

// The channel accepts five letters, excluding l, for typed fallback replies.
export class ApprovalRelay {
  constructor({ notify, respond, timeoutMs = 300000 }) {
    this.notify = notify;
    this.respond = respond;
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.issued = new Set();
  }
  async request(rpc, preview) {
    if (!['item/commandExecution/requestApproval', 'item/fileChange/requestApproval'].includes(rpc.method)) {
      throw new Error('Unsupported approval type');
    }
    const alphabet = 'abcdefghijkmnopqrstuvwxyz';
    let code;
    do { code = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join(''); }
    while (this.issued.has(code));
    this.issued.add(code);
    const timer = setTimeout(() => this.decide(code, 'deny'), this.timeoutMs);
    this.pending.set(code, { rpc, timer });
    try { await this.notify(code, rpc, preview); }
    catch (error) { this.decide(code, 'deny'); throw error; }
    return code;
  }
  decide(code, behavior) {
    if (!['allow', 'deny'].includes(behavior)) return false;
    const entry = this.pending.get(code);
    if (!entry) return false;
    this.pending.delete(code);
    clearTimeout(entry.timer);
    const allowed = entry.rpc.params.availableDecisions;
    const decision = behavior === 'allow' && (!allowed || allowed.includes('accept')) ? 'accept' : 'decline';
    this.respond(entry.rpc.id, { decision });
    return true;
  }
  forget(requestId) {
    for (const [code, entry] of this.pending) {
      if (entry.rpc.id === requestId) {
        clearTimeout(entry.timer);
        this.pending.delete(code);
      }
    }
  }
  close() {
    for (const code of [...this.pending.keys()]) this.decide(code, 'deny');
  }
}
