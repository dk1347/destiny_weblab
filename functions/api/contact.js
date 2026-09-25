// functions/api/contact.js - D1 최종본 (destiny-db)
// 바인딩 변수명: DB

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name || '').trim();
    const contact = (body.contact || '').trim();
    const pkg = (body.package || '').trim();
    const message = (body.message || '').trim();
    const timestamp = body.timestamp || new Date().toISOString();
    const page = body.page || '';

    if (!name || !contact || !message) {
      return Response.json({ error: '필수 항목 누락' }, { status: 400 });
    }

    // --- D1 바인딩 체크 (네가 말한 원인 B) ---
    if (!env.DB) {
      return Response.json(
        { error: "DB 바인딩 없음: Dashboard > Settings > Functions > D1 bindings에 Variable name=DB 로 destiny-db 연결 필요" },
        { status: 500 }
      );
    }

    // --- D1 저장 ---
    try {
      await env.DB.prepare(
        `INSERT INTO inquiries (name, contact, package, message) VALUES (?1, ?2, ?3, ?4)`
      ).bind(name, contact, pkg, message).run();
    } catch (d1Err) {
      // 테이블 없을 수도 있으니 에러 메시지 그대로 반환 (F12 Response에서 보이게)
      return Response.json({ error: `D1_ERROR: ${d1Err.message}` }, { status: 500 });
    }

    // (선택) 텔레그램 알림
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      const text = `🔔 [Destiny Web Lab] 새 문의\n\n이름: ${name}\n연락처: ${contact}\n패키지: ${pkg}\n내용: ${message}\n시간: ${timestamp}\n페이지: ${page}`;
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
      }).catch(() => {});
    }

    return Response.json({ ok: true }, { status: 200 });

  } catch (err) {
    return Response.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}

// GET /api/contact -> 최근 20개 확인용 (브라우저에서 바로 확인 가능)
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return Response.json({ error: 'DB 바인딩 없음' }, { status: 500 });
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, contact, package, message, created_at FROM inquiries ORDER BY id DESC LIMIT 20`
    ).all();
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: `D1_ERROR: ${e.message}` }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
