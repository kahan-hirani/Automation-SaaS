import nodemailer from 'nodemailer';
import logger from '../utils/logger.util.js';

const hasGmailOAuth2Config = () => {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.SMTP_USER
  );
};

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const encodeSubject = (subject) => `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;

const getGmailAccessToken = async () => {
  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth token exchange failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('OAuth token exchange succeeded but access_token was missing');
  }

  return data.access_token;
};

const buildRawMessage = ({ from, to, subject, html, text }) => {
  const boundary = `boundary_${Date.now().toString(36)}`;
  const textBody = text || String(html || '').replace(/<[^>]*>/g, '');

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html || textBody,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return base64UrlEncode(raw);
};

const sendViaGmailApi = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_FROM || `Automation SaaS <${process.env.SMTP_USER}>`;
  const accessToken = await getGmailAccessToken();
  const raw = buildRawMessage({ from, to, subject, html, text });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API send failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return { messageId: data.id };
};

// Create reusable transporter
const createTransporter = () => {
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  if (hasGmailOAuth2Config()) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.SMTP_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass
    }
  });
};

/**
 * Verify SMTP connectivity/auth at startup (non-fatal).
 */
export const verifyEmailTransport = async () => {
  try {
    if (hasGmailOAuth2Config()) {
      const accessToken = await getGmailAccessToken();
      const profileResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileResp.ok) {
        const errText = await profileResp.text();
        throw new Error(`Gmail API profile check failed (${profileResp.status}): ${errText}`);
      }

      logger.info('Gmail API email transport verified successfully');
      return true;
    }

    const transporter = createTransporter();
    await transporter.verify();
    logger.info('SMTP email transport verified successfully');
    return true;
  } catch (error) {
    const transportMode = hasGmailOAuth2Config() ? 'Gmail API' : 'SMTP';
    logger.error(`${transportMode} verification failed: ${error.message}`);
    return false;
  }
};

/**
 * Send email notification
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (hasGmailOAuth2Config()) {
      const info = await sendViaGmailApi({ to, subject, html, text });
      logger.info(`Email sent via Gmail API: ${info.messageId}`, { to, subject });
      return info;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Automation SaaS" <noreply@automation-saas.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${info.messageId}`, { to, subject });
    
    return info;
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`, { to, subject });
    // Don't throw - email failures shouldn't break the app
    return null;
  }
};

/**
 * Send summary email with multiple automation results
 */
export const sendSummaryEmail = async (userEmail, automations) => {
  const totalSuccess = automations.filter(a => a.status === 'success').length;
  const totalFailed = automations.filter(a => a.status === 'failed').length;
  
  const html = `
    <h2>Daily Automation Summary</h2>
    <p><strong>Total Automations:</strong> ${automations.length}</p>
    <p><strong>Successful:</strong> ${totalSuccess}</p>
    <p><strong>Failed:</strong> ${totalFailed}</p>
    <hr>
    <h3>Details:</h3>
    ${automations.map(a => `
      <div style="margin: 10px 0; padding: 10px; border-left: 3px solid ${a.status === 'success' ? 'green' : 'red'}">
        <strong>${a.name}</strong> - ${a.status === 'success' ? '✅' : '❌'}<br>
        <small>${a.url}</small>
      </div>
    `).join('')}
  `;
  
  return sendEmail({
    to: userEmail,
    subject: `📊 Daily Automation Summary - ${totalSuccess} Success, ${totalFailed} Failed`,
    html
  });
};
