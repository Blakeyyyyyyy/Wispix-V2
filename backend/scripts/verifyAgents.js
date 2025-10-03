"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/services/database");
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function postJSON(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`POST ${url} -> ${res.status}: ${t}`);
    }
    return res.json();
}
async function pollExecution(execId, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const exec = await database_1.db.execution.findUnique({
            where: { id: execId },
            include: { steps: true },
        });
        if (exec && exec.status !== 'running')
            return exec;
        await sleep(1000);
    }
    throw new Error(`Timeout waiting for execution ${execId}`);
}
async function main() {
    console.log(`Seeding agents at ${BASE} ...`);
    const seed = await postJSON(`${BASE}/api/agents/dev/seed`, null);
    const created = seed.created;
    if (!created?.length)
        throw new Error('Seeding returned no automations');
    const results = [];
    for (const a of created) {
        console.log(`Triggering ${a.name} (${a.id}) ...`);
        const execRes = await postJSON(`${BASE}/api/automation/${a.id}/execute`, null);
        const execId = execRes.executionId;
        if (!execId)
            throw new Error(`No executionId returned for ${a.name}`);
        const exec = await pollExecution(execId, 60000);
        const stepNames = (exec.steps ?? []).map((s) => s.name);
        const notes = [];
        let ok = true;
        if (a.name.includes('Daily Briefer')) {
            ok = ok && stepNames.includes('gmail.smtp.send');
            if (!ok)
                notes.push('Expected gmail.smtp.send step missing');
        }
        else if (a.name.includes('Digest Mailer')) {
            ok = ok && stepNames.includes('gmail.smtp.send');
            if (!ok)
                notes.push('Expected gmail.smtp.send step missing');
        }
        else if (a.name.includes('CRM Manager')) {
            ok = ok && stepNames.includes('airtable.upsertLoop');
            if (!ok)
                notes.push('Expected airtable.upsertLoop step missing');
        }
        results.push({ name: a.name, executionId: exec.id, ok, notes });
    }
    console.log('\nVerification Summary:');
    let allOk = true;
    for (const r of results) {
        console.log(`- ${r.name}: ${r.ok ? 'PASS' : 'FAIL'} (exec ${r.executionId})${r.notes.length ? ' — ' + r.notes.join('; ') : ''}`);
        allOk = allOk && r.ok;
    }
    if (!allOk) {
        process.exitCode = 1;
        console.error('\nOne or more agents failed verification.');
    }
    else {
        console.log('\nAll agents verified.');
    }
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=verifyAgents.js.map