import postmark from "postmark";

const siteName = process.env.SITE_NAME || "NumExa";

/**
 * Sends a 2FA code to the user's email using Postmark.
 * Requires in .env: POSTMARK_API_KEY, FROM_EMAIL (must be a verified sender in Postmark).
 */
export async function send2faEmail(email, code) {
    const apiKey = process.env.POSTMARK_API_KEY;
    const from = process.env.FROM_EMAIL;

    if (!apiKey || !apiKey.trim()) {
        throw new Error("POSTMARK_API_KEY is not set in .env");
    }
    if (!from || !from.trim()) {
        throw new Error("FROM_EMAIL is not set (required for Postmark sender)");
    }

    const client = new postmark.ServerClient(apiKey.trim());

    try {
        await client.sendEmail({
            From: from.trim(),
            To: email,
            Subject: `Your ${siteName} Verification Code`,
            HtmlBody: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>🔐 ${siteName} 2FA Verification Code</h2>
                    <p>Use the code below to complete your login:</p>
                    <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${code}</p>
                    <p style="color: #888;">This code will expire in 5 minutes.</p>
                    <hr />
                    <small>If you did not request this, secure your account immediately.</small>
                </div>
            `,
            TextBody: `Your ${siteName} verification code is: ${code}. It expires in 5 minutes.`,
        });
        console.log("2FA code sent to", email);
    } catch (err) {
        console.error("Error sending 2FA email:", err);
        // throw new Error("Failed to send 2FA email");
        return;
    }
}
