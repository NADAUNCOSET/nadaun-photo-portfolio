export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, shootType, date, scale, message } = req.body;

  if (!name || !phone || !shootType || !date) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
  }

  // Google Calendar 링크 생성 — 날짜 범위("2026-04-19 ~ 2026-04-20") 대응
  const eventTitle = encodeURIComponent(`[NADAUN] ${shootType} — ${name}`);
  const eventDetails = encodeURIComponent(`고객명: ${name}\n연락처: ${phone}\n촬영 종류: ${shootType}\n규모/예산: ${scale || '-'}\n내용: ${message || '-'}`);
  const dateParts = date.includes('~') ? date.split('~').map(d => d.trim()) : [date, date];
  const startDate = new Date(dateParts[0]);
  const endDate = new Date(dateParts[dateParts.length - 1]);
  endDate.setDate(endDate.getDate() + 1);
  const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'');
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${eventDetails}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Pretendard', Arial, sans-serif; background: #f5f4f0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #1a1a1a; padding: 32px 40px;">
      <div style="font-family: 'Inter Tight', Arial, sans-serif; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em;">NADAUN</div>
      <div style="font-size: 13px; color: #999; margin-top: 4px; letter-spacing: 0.06em; text-transform: uppercase;">New Inquiry</div>
    </div>
    <div style="padding: 40px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; width: 120px;">이름</td><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; font-size: 15px; color: #1a1a1a; font-weight: 500;">${name}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">연락처</td><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; font-size: 15px; color: #1a1a1a; font-weight: 500;">${phone}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">촬영 종류</td><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; font-size: 15px; color: #1a1a1a; font-weight: 500;">${shootType}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">희망 날짜</td><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; font-size: 15px; color: #1a1a1a; font-weight: 500;">${date}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">규모/예산</td><td style="padding: 12px 0; border-bottom: 0.5px solid #e8e6e1; font-size: 15px; color: #1a1a1a; font-weight: 500;">${scale || '-'}</td></tr>
        <tr><td style="padding: 12px 0; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; vertical-align: top;">내용</td><td style="padding: 12px 0; font-size: 15px; color: #1a1a1a; line-height: 1.7;">${(message || '-').replace(/\n/g, '<br>')}</td></tr>
      </table>
      <div style="margin-top: 32px;">
        <a href="${calendarUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #1a1a1a; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 4px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em;">
          📅 Google Calendar에 추가
        </a>
      </div>
    </div>
    <div style="padding: 24px 40px; border-top: 0.5px solid #e8e6e1; font-size: 12px; color: #999;">
      NADAUN · nadaun-portfolio.vercel.app
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(process.env.RESEND_API_KEY || '').replace(/[^!-~]/g, '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NADAUN Landing Page <onboarding@resend.dev>',
        to: ['rbsent.info@gmail.com'],
        subject: `[문의] ${shootType} — ${name} (${date})`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: '메일 발송 실패', detail: data });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
}
