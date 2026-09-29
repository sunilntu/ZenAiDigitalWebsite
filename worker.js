const MAX = {
  name: 100,
  email: 254,
  company: 150,
  role: 120,
  country: 80,
  interest: 100,
  message: 1500,
  sourcePage: 500,
  utm: 120,
};

const INTERESTS = new Set([
  "Enterprise AI Transformation Capability Assessment",
  "AI Strategy & Transformation",
  "Enterprise AI Architecture",
  "AI Governance & Information Architecture",
  "Capability Building",
  "Proof of Value / AI Delivery",
  "Speaking / Advisory",
  "Other",
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "ZenAI Digital" });
    }

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json({
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
        formEnabled: Boolean(
          env.TURNSTILE_SITE_KEY &&
          env.TURNSTILE_SECRET &&
          env.VERIFY_TOKEN_SECRET &&
          env.RESEND_API_KEY &&
          env.EMAIL_FROM &&
          env.DB
        ),
      }, 200, { "Cache-Control": "no-store" });
    }

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    if (url.pathname === "/verify" && request.method === "GET") {
      return showVerifyPage(url, env);
    }

    if (url.pathname === "/verify" && request.method === "POST") {
      return completeVerification(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  const missing = missingConfig(env, [
    "TURNSTILE_SECRET",
    "VERIFY_TOKEN_SECRET",
    "RESEND_API_KEY",
    "EMAIL_FROM",
  ]);
  if (missing.length || !env.DB) {
    return json({ ok: false, error: "Contact form is not configured yet." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: return a generic success without doing any work.
  if (text(body.website, 200)) {
    return json({ ok: true, message: "Please check your email to continue." });
  }

  const data = {
    name: text(body.name, MAX.name),
    email: text(body.email, MAX.email).toLowerCase(),
    company: text(body.company, MAX.company),
    role: text(body.role, MAX.role),
    country: text(body.country, MAX.country),
    interest: text(body.interest, MAX.interest),
    message: text(body.message, MAX.message),
    sourcePage: text(body.sourcePage, MAX.sourcePage),
    utmSource: text(body.utmSource, MAX.utm),
    utmMedium: text(body.utmMedium, MAX.utm),
    utmCampaign: text(body.utmCampaign, MAX.utm),
    consent: body.consent === true,
    marketingConsent: body.marketingConsent === true,
  };

  if (!data.name || !isEmail(data.email) || !data.interest || !data.message || !data.consent) {
    return json({ ok: false, error: "Please complete the required fields using a valid email address." }, 400);
  }
  if (!INTERESTS.has(data.interest)) {
    data.interest = "Other";
  }

  const turnstileToken = text(body.turnstileToken, 4096);
  const turnstile = await verifyTurnstile(turnstileToken, request, env);
  if (!turnstile.success) {
    return json({ ok: false, error: "Security check failed. Please try again." }, 400);
  }

  const now = new Date();
  const payload = {
    v: 1,
    verificationId: crypto.randomUUID(),
    exp: now.getTime() + 24 * 60 * 60 * 1000,
    consentAt: now.toISOString(),
    ...data,
  };

  // Personal information is NOT inserted into D1 here.
  // It is encrypted into an authenticated token and persisted only after the email owner confirms.
  const token = await encryptToken(payload, env.VERIFY_TOKEN_SECRET);
  const verifyUrl = new URL("/verify", request.url);
  verifyUrl.searchParams.set("t", token);

  const sent = await sendEmail(env, {
    to: data.email,
    subject: "Verify your email — ZenAI Digital",
    html: verificationEmail(verifyUrl.toString()),
  });

  if (!sent.ok) {
    console.error("Verification email failed", sent.error);
    return json({ ok: false, error: "We could not send the verification email. Please try again later." }, 502);
  }

  return json({
    ok: true,
    message: "Check your inbox and confirm your email. Your enquiry will be stored only after verification.",
  });
}

async function showVerifyPage(url, env) {
  const token = url.searchParams.get("t") || "";
  if (!env.VERIFY_TOKEN_SECRET || !token) {
    return verificationHtml("Verification link invalid", "This verification link is missing or invalid.", null, 400);
  }
  try {
    const payload = await decryptToken(token, env.VERIFY_TOKEN_SECRET);
    if (!payload?.exp || Date.now() > payload.exp) {
      return verificationHtml("Verification link expired", "Please return to the contact form and submit your enquiry again.", null, 410);
    }
    return verificationHtml(
      "Confirm your email",
      "Your email link is valid. Select the button below to confirm ownership and submit your enquiry to ZenAI Digital.",
      token,
      200
    );
  } catch {
    return verificationHtml("Verification link invalid", "This verification link is invalid or has been changed.", null, 400);
  }
}

async function completeVerification(request, env, ctx) {
  const missing = missingConfig(env, ["VERIFY_TOKEN_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "BUSINESS_NOTIFY_EMAIL"]);
  if (missing.length || !env.DB) {
    return verificationHtml("Service not configured", "The verification service is not fully configured yet.", null, 503);
  }

  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (!token) {
    return verificationHtml("Verification link invalid", "The verification token is missing.", null, 400);
  }

  let p;
  try {
    p = await decryptToken(token, env.VERIFY_TOKEN_SECRET);
  } catch {
    return verificationHtml("Verification link invalid", "This verification link is invalid or has been changed.", null, 400);
  }

  if (!p?.exp || Date.now() > p.exp || !p.verificationId || !isEmail(p.email)) {
    return verificationHtml("Verification link expired", "Please return to the contact form and submit your enquiry again.", null, 410);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM verified_enquiries WHERE verification_id = ?"
  ).bind(p.verificationId).first();

  if (existing) {
    return verificationHtml("Already verified", "This enquiry has already been verified and received. Thank you.", null, 200);
  }

  const verifiedAt = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO verified_contacts
      (email, name, company, role, country, marketing_consent, first_verified_at, last_verified_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      company = excluded.company,
      role = excluded.role,
      country = excluded.country,
      marketing_consent = excluded.marketing_consent,
      last_verified_at = excluded.last_verified_at,
      updated_at = excluded.updated_at
  `).bind(
    p.email, p.name, p.company || null, p.role || null, p.country || null,
    p.marketingConsent ? 1 : 0, verifiedAt, verifiedAt, verifiedAt
  ).run();

  const contact = await env.DB.prepare(
    "SELECT id FROM verified_contacts WHERE email = ? COLLATE NOCASE"
  ).bind(p.email).first();

  if (!contact?.id) {
    return verificationHtml("Verification error", "Your email was verified, but we could not save the enquiry. Please contact us directly.", null, 500);
  }

  await env.DB.prepare(`
    INSERT INTO verified_enquiries
      (contact_id, verification_id, interest, message, source_page, utm_source, utm_medium, utm_campaign, consent_at, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    contact.id,
    p.verificationId,
    p.interest,
    p.message,
    p.sourcePage || null,
    p.utmSource || null,
    p.utmMedium || null,
    p.utmCampaign || null,
    p.consentAt,
    verifiedAt
  ).run();

  const followups = [
    sendEmail(env, {
      to: p.email,
      subject: "Enquiry received — ZenAI Digital",
      html: confirmationEmail(p.name, p.interest),
    }),
    sendEmail(env, {
      to: env.BUSINESS_NOTIFY_EMAIL,
      subject: `New verified enquiry — ${p.interest}`,
      html: notificationEmail(p),
    }),
  ];
  ctx.waitUntil(Promise.allSettled(followups));

  return verificationHtml(
    "Email verified — enquiry received",
    "Thank you. Your verified enquiry has been saved and sent to ZenAI Digital.",
    null,
    200
  );
}

async function verifyTurnstile(token, request, env) {
  if (!token || !env.TURNSTILE_SECRET) return { success: false };
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    return await r.json();
  } catch {
    return { success: false };
  }
}

async function sendEmail(env, { to, subject, html }) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
    });
    if (!r.ok) return { ok: false, error: await r.text() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function encryptToken(payload, secret) {
  const key = await tokenKey(secret, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const packed = new Uint8Array(iv.length + encrypted.length);
  packed.set(iv, 0);
  packed.set(encrypted, iv.length);
  return base64UrlEncode(packed);
}

async function decryptToken(token, secret) {
  const packed = base64UrlDecode(token);
  if (packed.length < 13) throw new Error("token");
  const iv = packed.slice(0, 12);
  const encrypted = packed.slice(12);
  const key = await tokenKey(secret, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function tokenKey(secret, usages) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, usages);
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX.email;
}

function missingConfig(env, names) {
  return names.filter(name => !env[name]);
}

function json(payload, status = 200, extra = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

function verificationHtml(title, message, token, status) {
  const button = token ? `
    <form method="post" action="/verify">
      <input type="hidden" name="token" value="${escapeAttr(token)}">
      <button type="submit">Confirm email and submit enquiry</button>
    </form>` : "";
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} | ZenAI Digital</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#08101f;color:#eef4ff;display:grid;min-height:100vh;place-items:center;padding:24px}.card{max-width:650px;background:#111b30;border:1px solid #243452;border-radius:24px;padding:36px;box-shadow:0 24px 80px rgba(0,0,0,.3)}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.02;margin:0 0 16px}p{color:#b8c7df;line-height:1.7}button,a{display:inline-block;margin-top:18px;background:#6ee7d8;color:#07131f;border:0;border-radius:999px;padding:14px 20px;font-weight:750;text-decoration:none;cursor:pointer}</style></head><body><main class="card"><p>ZENAI DIGITAL</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${button}<p><a href="/">Return to ZenAI Digital</a></p></main></body></html>`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function verificationEmail(url) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2>Verify your email</h2><p>Someone used this address to send an enquiry to ZenAI Digital.</p><p>To confirm that you own this email address and submit the enquiry, use the button below. The link expires in 24 hours.</p><p><a href="${escapeAttr(url)}" style="display:inline-block;background:#0b6b61;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Verify email</a></p><p>If you did not submit an enquiry, you can ignore this message. No enquiry information will be stored in the ZenAI Digital contact database.</p></div>`;
}

function confirmationEmail(name, interest) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2>Thank you for contacting ZenAI Digital</h2><p>Hello ${escapeHtml(name)},</p><p>Your email has been verified and your enquiry about <strong>${escapeHtml(interest)}</strong> has been received.</p><p>We will review it and respond using this verified email address.</p></div>`;
}

function notificationEmail(p) {
  return `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#172033"><h2>New verified enquiry</h2><table cellpadding="7" cellspacing="0" border="0"><tr><td><strong>Name</strong></td><td>${escapeHtml(p.name)}</td></tr><tr><td><strong>Email</strong></td><td>${escapeHtml(p.email)}</td></tr><tr><td><strong>Company</strong></td><td>${escapeHtml(p.company || "")}</td></tr><tr><td><strong>Role</strong></td><td>${escapeHtml(p.role || "")}</td></tr><tr><td><strong>Interest</strong></td><td>${escapeHtml(p.interest)}</td></tr><tr><td><strong>Message</strong></td><td>${escapeHtml(p.message)}</td></tr><tr><td><strong>Marketing consent</strong></td><td>${p.marketingConsent ? "Yes" : "No"}</td></tr></table></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
}
function escapeAttr(value) { return escapeHtml(value); }
