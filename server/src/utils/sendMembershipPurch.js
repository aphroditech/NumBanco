import postmark from "postmark";

const siteName = process.env.SITE_NAME || "NumExa";

/**
 * Sends a 2FA code to the user's email using Postmark.
 * Requires in .env: POSTMARK_API_KEY, FROM_EMAIL (must be a verified sender in Postmark).
 */
export async function sendMembershipPurch(email, memrbership) {
    const apiKey = process.env.POSTMARK_API_KEY;
    const from = process.env.FROM_EMAIL;

    if (!apiKey || !apiKey.trim()) {
        throw new Error("POSTMARK_API_KEY is not set in .env");
    }
    if (!from || !from.trim()) {
        throw new Error("FROM_EMAIL is not set (required for Postmark sender)");
    }

    const membershipAdContents = {
        Plus: "Congratulations on purchasing the Plus membership!\n\nAs a Plus member, you now have access to enhanced features and benefits that will elevate your experience on our platform. Enjoy the perks of being a Plus member and make the most out of your membership!",
        Pro: "Welcome to the Pro membership!\n\nYou now have access to all premium features and exclusive benefits. We appreciate your commitment to our platform!"
    };

    const client = new postmark.ServerClient(apiKey.trim());

    try {
        await client.sendEmail({
            From: from.trim(),
            To: email,
            Subject: `Your ${siteName} Membership Purchased`,
            HtmlBody: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>👍💰🤝 ${siteName} ${memrbership} Membership Purchased</h2>
                    <p>You have successfully purchased the ${memrbership} membership.</p>
                    <p style="color: #888;">${membershipAdContents[memrbership]}</p>
                    <hr />
                    <small>Global Platform, Please bet and big Win!.</small>
                </div>
            `,
            TextBody: `Your ${siteName} membership has been purchased: ${memrbership}.`,
        });
        console.log("Membership purchased email sent to", email);
    } catch (err) {
        const msg = err.message || String(err);
        console.error("Postmark membership purchased email error:", msg);
        // Postmark "pending approval" = can only send to same domain as From (e.g. *@numexa.store)
        if (msg.includes("pending approval") || msg.includes("same domain")) {
            const e = new Error("POSTMARK_PENDING_APPROVAL");
            e.originalMessage = msg;
            throw e;
        }
        throw new Error("Failed to send membership purchased email");
    }
}
