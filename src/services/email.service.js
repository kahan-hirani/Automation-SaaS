import nodemailer from 'nodemailer';
import logger from '../utils/logger.util.js';

// Create reusable transporter
const createTransporter = () => {
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

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
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error(`SMTP verification failed: ${error.message}`);
    return false;
  }
};

/**
 * Send email notification
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
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
