import BetTicket from "../models/BetTicket.js";

export const getPreBetData = async (req, res) => {
    try {
        const { betId, level } = req.query;
        const data = await BetTicket.find({ betId: { $gt: Number(Number(betId ? betId : 1)) }, level: level }, { betId: 1, sellTicketCnt: 1}).lean();
        
        res.json(data);
    }
    catch (err) {
        console.log("Error in getSoldTickets:", err);
        res.status(500).json({ message: "Server Error", err: err.message });
    }
}
