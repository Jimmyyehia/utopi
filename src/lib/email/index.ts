import { Resend } from "resend"

let resendInstance: Resend | null = null

function getResend() {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const resend = getResend()
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const result = await resend.emails.send({
      from: "Utopi Workspace <bookings@utopi.space>",
      to,
      subject,
      html,
      text,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error }
  }
}

export function generateBookingConfirmationEmail(data: {
  userName: string
  roomName: string
  startTime: Date
  endTime: Date
  projectName: string
  reference: string
  paymentAmount?: number
}) {
  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const formatDate = (date: Date) => date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return {
    subject: `Booking Confirmed: ${data.roomName} on ${formatDate(data.startTime)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #67C2B2 0%, #A286DB 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
            <h1 style="color: #1A1A1A; margin: 0; font-size: 24px; font-weight: 700;">🎉 Booking Confirmed!</h1>
          </div>
          
          <div style="background: #F8FAFA; border-radius: 0 0 12px 12px; padding: 24px; border: 1px solid #D1E2DF; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hi <strong>${data.userName}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 24px;">Your booking request has been <strong style="color: #2D6A4F;">approved</strong>! Here are the details:</p>
            
            <div style="background: #FFFFFF; border: 1px solid #D1E2DF; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Room</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.roomName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Date</td>
                  <td style="padding: 8px 0; text-align: right;">${formatDate(data.startTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Time</td>
                  <td style="padding: 8px 0; text-align: right;">${formatTime(data.startTime)} - ${formatTime(data.endTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Project/Committee</td>
                  <td style="padding: 8px 0; text-align: right;">${data.projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Reference</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; background: #EBF6F4; padding: 4px 8px; border-radius: 4px;">${data.reference}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #E65100; font-weight: 500;">💰 Payment: Cash on Arrival</p>
              <p style="margin: 8px 0 0; color: #BF360C; font-size: 14px;">Please bring cash payment to the front desk when you arrive for your booking.</p>
            </div>
            
            <p style="font-size: 14px; color: #4A5A58; margin-bottom: 16px;">Need to make changes? Contact the workspace manager or reply to this email.</p>
            
            <hr style="border: none; border-top: 1px solid #D1E2DF; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
              This is an automated message from Utopi Workspace.<br>
              © 2024 Utopi — Your Innovation Space
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Booking Confirmed: ${data.roomName} on ${formatDate(data.startTime)}

Hi ${data.userName},

Your booking request has been approved! Here are the details:

Room: ${data.roomName}
Date: ${formatDate(data.startTime)}
Time: ${formatTime(data.startTime)} - ${formatTime(data.endTime)}
Project/Committee: ${data.projectName}
Reference: ${data.reference}

Payment: Cash on Arrival
Please bring cash payment to the front desk when you arrive for your booking.

Need to make changes? Contact the workspace manager.

---
Utopi — Your Innovation Space
    `,
  }
}

export function generateBookingRejectionEmail(data: {
  userName: string
  roomName: string
  startTime: Date
  endTime: Date
  projectName: string
  reason?: string
}) {
  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const formatDate = (date: Date) => date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return {
    subject: `Booking Request Declined: ${data.roomName} on ${formatDate(data.startTime)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #E05252 0%, #C44569 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
            <h1 style="color: #F8FAFA; margin: 0; font-size: 24px; font-weight: 700;">Booking Request Declined</h1>
          </div>
          
          <div style="background: #F8FAFA; border-radius: 0 0 12px 12px; padding: 24px; border: 1px solid #D1E2DF; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hi <strong>${data.userName}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 24px;">Unfortunately, your booking request for <strong>${data.roomName}</strong> has been <strong style="color: #E05252;">declined</strong>.</p>
            
            <div style="background: #FFFFFF; border: 1px solid #D1E2DF; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Room</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.roomName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Date</td>
                  <td style="padding: 8px 0; text-align: right;">${formatDate(data.startTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Time</td>
                  <td style="padding: 8px 0; text-align: right;">${formatTime(data.startTime)} - ${formatTime(data.endTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Project/Committee</td>
                  <td style="padding: 8px 0; text-align: right;">${data.projectName}</td>
                </tr>
              </table>
            </div>
            
            ${data.reason ? `
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #991B1B; font-weight: 500;">Reason:</p>
              <p style="margin: 8px 0 0; color: #7F1D1D;">${data.reason}</p>
            </div>
            ` : ""}
            
            <p style="font-size: 14px; color: #4A5A58; margin-bottom: 16px;">You can submit a new booking request for a different time slot or room.</p>
            
            <hr style="border: none; border-top: 1px solid #D1E2DF; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
              This is an automated message from Utopi Workspace.<br>
              © 2024 Utopi — Your Innovation Space
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Booking Request Declined: ${data.roomName} on ${formatDate(data.startTime)}

Hi ${data.userName},

Unfortunately, your booking request for ${data.roomName} has been declined.

Room: ${data.roomName}
Date: ${formatDate(data.startTime)}
Time: ${formatTime(data.startTime)} - ${formatTime(data.endTime)}
Project/Committee: ${data.projectName}

${data.reason ? `Reason: ${data.reason}` : ""}

You can submit a new booking request for a different time slot or room.

---
Utopi — Your Innovation Space
    `,
  }
}

export function generateBookingPendingEmail(data: {
  userName: string
  roomName: string
  startTime: Date
  endTime: Date
  projectName: string
}) {
  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const formatDate = (date: Date) => date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return {
    subject: `Booking Request Submitted: ${data.roomName} on ${formatDate(data.startTime)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #A286DB 0%, #67C2B2 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
            <h1 style="color: #1A1A1A; margin: 0; font-size: 24px; font-weight: 700;">📋 Request Submitted</h1>
          </div>
          
          <div style="background: #F8FAFA; border-radius: 0 0 12px 12px; padding: 24px; border: 1px solid #D1E2DF; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hi <strong>${data.userName}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 24px;">Your booking request has been submitted and is <strong style="color: #A286DB;">pending manager approval</strong>.</p>
            
            <div style="background: #FFFFFF; border: 1px solid #D1E2DF; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Room</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.roomName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Date</td>
                  <td style="padding: 8px 0; text-align: right;">${formatDate(data.startTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Time</td>
                  <td style="padding: 8px 0; text-align: right;">${formatTime(data.startTime)} - ${formatTime(data.endTime)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4A5A58; font-weight: 500;">Project/Committee</td>
                  <td style="padding: 8px 0; text-align: right;">${data.projectName}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #F3F0FF; border: 1px solid #E0D7FF; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #5B21B6; font-weight: 500;">⏳ What happens next?</p>
              <p style="margin: 8px 0 0; color: #4C1D95; font-size: 14px;">A workspace manager will review your request and either approve or decline it. You'll receive an email notification once a decision is made.</p>
            </div>
            
            <p style="font-size: 14px; color: #4A5A58; margin-bottom: 16px;">You can check the status of your request in the Utopi dashboard.</p>
            
            <hr style="border: none; border-top: 1px solid #D1E2DF; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
              This is an automated message from Utopi Workspace.<br>
              © 2024 Utopi — Your Innovation Space
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Booking Request Submitted: ${data.roomName} on ${formatDate(data.startTime)}

Hi ${data.userName},

Your booking request has been submitted and is pending manager approval.

Room: ${data.roomName}
Date: ${formatDate(data.startTime)}
Time: ${formatTime(data.startTime)} - ${formatTime(data.endTime)}
Project/Committee: ${data.projectName}

A workspace manager will review your request and either approve or decline it. You'll receive an email notification once a decision is made.

---
Utopi — Your Innovation Space
    `,
  }
}