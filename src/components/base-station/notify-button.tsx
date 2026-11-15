"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSION_EVENT } from "@/hooks/use-notifications";

/** "Enable notifications" until the user answers; hidden where the browser has no notifications or they are blocked. */
export function NotifyButton({
  variant = "outline",
  className = "min-h-11 md:min-h-9",
}: {
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const [permission, setPermission] = useState(() =>
    typeof Notification === "undefined" ? null : Notification.permission,
  );
  if (permission !== "default") return null;

  return (
    <Button
      variant={variant}
      size="sm"
      title="Show an ALERT notification when the console raises one"
      onClick={async () => {
        setPermission(await Notification.requestPermission());
        window.dispatchEvent(new Event(PERMISSION_EVENT));
      }}
      className={className}
    >
      <Bell aria-hidden />
      Enable notifications
    </Button>
  );
}
