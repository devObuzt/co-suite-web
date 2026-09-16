// تستات بلا أي حزمة: Node بيقرا TypeScript لحاله (type stripping).
//   node --test tests/
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { manzumaSession } from "../src/lib/manzumaSession.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stub(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push([url, init]);
    return response;
  };
  return calls;
}

test("بترجّع الجلسة مع البزنسات", async () => {
  stub(new Response(JSON.stringify({
    authenticated: true,
    user: { id: "u1" },
    organizations: [{ id: "o1", name: "Afkar", role: "owner" }],
  })));

  const session = await manzumaSession();

  assert.equal(session.userId, "u1");
  assert.equal(session.organizations[0].name, "Afkar");
  assert.equal(session.organizations[0].role, "owner");
});

test("بتبعت الكوكي المشترك — بلاه الحسابات ما بتعرف مين السائل", async () => {
  const calls = stub(new Response(JSON.stringify({ authenticated: true, user: { id: "u1" } })));

  await manzumaSession();

  const [url, init] = calls[0];
  assert.ok(String(url).endsWith("/api/session"));
  assert.equal(init.credentials, "include");
});

test("ما حدا مسجّل دخول = null", async () => {
  stub(new Response(JSON.stringify({ authenticated: false }), { status: 401 }));
  assert.equal(await manzumaSession(), null);
});

test("الحسابات مش شغّالة = null، مش رمية", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.equal(await manzumaSession(), null);
});

test("رد بلا مستخدم = null", async () => {
  stub(new Response(JSON.stringify({ authenticated: true })));
  assert.equal(await manzumaSession(), null);
});
