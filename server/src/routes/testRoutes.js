import { Router } from "express";

const router = Router();

// Test endpoint to verify Ably connection
router.get("/ably-test", (req, res) => {
    try {
        const ably = req.app.locals.ably;
        
        if (!ably) {
            return res.status(500).json({ 
                error: "Ably client not initialized",
                connected: false 
            });
        }

        const connectionState = ably.connection.state;
        
        res.json({
            connected: connectionState === 'connected',
            connectionState: connectionState,
            message: connectionState === 'connected' 
                ? "Ably is connected and ready!" 
                : `Ably connection state: ${connectionState}`
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            connected: false 
        });
    }
});

// Test endpoint to publish a test message
router.post("/ably-test-publish", async (req, res) => {
    try {
        const ably = req.app.locals.ably;
        
        if (!ably) {
            return res.status(500).json({ 
                error: "Ably client not initialized" 
            });
        }

        const channel = ably.channels.get("Num2Bet");
        await channel.attach();
        
        const testMessage = {
            ticket: 999,
            betId: 567887,
            userAuthId: "test-user",
            timestamp: Date.now(),
            test: true
        };
        console.log("test message", testMessage);
        await channel.publish("ticketSold", testMessage);
        
        res.json({
            success: true,
            message: "Test message published successfully",
            data: testMessage
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: error.stack 
        });
    }
});

export default router;

