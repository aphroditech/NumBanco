import { useEffect, useState } from "react";
import { getTicketStatus } from "services/supportService";

export default function TicketStatus({ ticketId }) {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    if (!ticketId) return;

    const loadStatus = async () => {
      const res = await getTicketStatus(ticketId);
      setStatus(res.data.status);
    };

    loadStatus();
    const timer = setInterval(loadStatus, 20000);
    return () => clearInterval(timer);
  }, [ticketId]);

  return (
    <div>
      <h2>Support Ticket Status</h2>
      <p>Ticket ID: {ticketId}</p>
      <h3>Status: {status}</h3>
    </div>
  );
}
