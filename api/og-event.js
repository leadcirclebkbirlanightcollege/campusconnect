export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.redirect(302, "/");
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbGx4ZXFreGhkanl5eWF2eWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzU2MDEsImV4cCI6MjEwMjY1MTYwMX0.MYWBDG2wd8gkiz9CCOXOCeExLp8RFjP1MHeU4noEOII";

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${id}&select=id,title,description,event_date,event_time,venue,poster_url,flyer_url`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await response.json();
    const event = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!event) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Event Not Found | Campus Connect</title></head><body><h1>Event Not Found</h1></body></html>`);
    }

    const title = event.title || "Campus Event";
    const description = event.description
      ? event.description.slice(0, 200).replace(/[\r\n]+/g, " ")
      : "Campus Connect Event";

    let flyerUrl = event.flyer_url || event.poster_url || "https://campusconnect.indevs.in/pwa-512x512.png";
    const driveMatch = flyerUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      flyerUrl = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }

    const escapeHtml = (str) =>
      String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} | Campus Connect</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="https://campusconnect.indevs.in/events/${event.id}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Campus Connect" />
  <meta property="og:url" content="https://campusconnect.indevs.in/events/${event.id}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(flyerUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(flyerUrl)}" />

  <!-- Fallback redirect if viewed in a browser -->
  <meta http-equiv="refresh" content="0;url=/events/${event.id}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(flyerUrl)}" alt="${escapeHtml(title)}" />
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=3600");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send("Error fetching event metadata");
  }
}
