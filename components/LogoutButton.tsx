"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth.action";

const LogoutButton = () => {
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className="text-sm font-semibold"
    >
      Logout
    </Button>
  );
};

export default LogoutButton;