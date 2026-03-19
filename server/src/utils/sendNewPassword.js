import postmark from "postmark";

const siteName = process.env.SITE_NAME || "NumExa";

/**
 * Sends a newly generated password to the user's email using Postmark.
 * Requires in .env:
 *  - POSTMARK_API_KEY
 *  - FROM_EMAIL (must be verified sender in Postmark)
 */
export async function sendNewPassword(email, newPassword) {
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
            Subject: `Your ${siteName} New Temporary Password`,
            HtmlBody: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>🔑 ${siteName} Password Reset</h2>
                    <p>Your password has been successfully reset.</p>
                    <p>Here is your new temporary password:</p>

                    <p style="
                        font-size: 22px;
                        font-weight: bold;
                        letter-spacing: 3px;
                        margin: 20px 0;
                        background: #f4f4f4;
                        padding: 10px 16px;
                        display: inline-block;
                        border-radius: 6px;
                    ">
                        ${newPassword}
                    </p>

                    <p style="color: #888;">
                        Please log in and change your password immediately for security.
                    </p>

                    <hr />
                    <small>
                        If you did not request this password reset, please contact support immediately.
                    </small>
                </div>
            `,
            TextBody: `Your ${siteName} password has been reset. Your new temporary password is: ${newPassword}. Please log in and change it immediately.`,
        });

        console.log("New password sent to", email);

    } catch (err) {
        const msg = err.message || String(err);
        console.error("Postmark new password email error:", msg);

        if (msg.includes("pending approval") || msg.includes("same domain")) {
            const e = new Error("POSTMARK_PENDING_APPROVAL");
            e.originalMessage = msg;
            throw e;
        }

        throw new Error("Failed to send new password email");
    }
}