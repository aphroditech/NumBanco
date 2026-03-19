import { Router } from "express";

const router = Router();

// Issue Ably token requests for the browser client.
// This keeps the Ably API key on the server only.
router.get("/auth", async (req, res) => {
  try {
    const ably = req.app.locals.ably;

    if (!ably) {
      return res.status(500).json({
        error: "Ably client not initialized",
      });
    }

    // Don't force a clientId here unless you also force the same one on the client.
    // Let Ably issue a token without a bound clientId to avoid mismatches.
    const tokenRequest = await ably.auth.createTokenRequest();

    return res.json(tokenRequest);
  } catch (err) {
    console.error("❌ Failed to create Ably token request", err);
    return res.status(500).json({
      error: "Failed to create Ably token request",
    });
  }
});

export default router;

