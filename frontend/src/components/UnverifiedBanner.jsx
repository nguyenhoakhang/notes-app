import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function UnverifiedBanner() {
  const [sent, setSent] = useState(false);

  const resend = async () => {
    try {
      await api.post("/email/verification-notification");
      setSent(true);
      toast.success("Verification email sent!");
    } catch {
      toast.error("Failed to send. Try again.");
    }
  };

  return (
    <div className="unverified-banner">
      <span>⚠️ Your account is unverified.</span>
      {!sent ? (
        <button onClick={resend}>Resend verification email</button>
      ) : (
        <span> Check your inbox.</span>
      )}
    </div>
  );
}
