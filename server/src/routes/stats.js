import express from "express";
const router = express.Router();

router.get("/sales", async (req, res) => {
  res.json({
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    data: [120, 190, 300, 250, 220]
  });
});

export default router;