export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, note: 'stub — Task 3 substitui isto' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
