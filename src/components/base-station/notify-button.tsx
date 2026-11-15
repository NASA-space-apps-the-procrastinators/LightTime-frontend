"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSION_EVENT } from "@/hooks/use-notifications";

/** "Enable notifications" until the user answers; hidden where the browser has no notifications or they are blocked. */
export function NotifyButton() {
  const [permission, setPermission] = useState(() =>
    typeof Notification === "undefined" ? null : Notification.permission,
  );
  if (permission !== "default") return null;

  return (
    <Button
      variant="outline"
      size="sm"
      title="Show an ALERT notification when the console raises one"
      onClick={async () => {
        setPermission(await Notification.requestPermission());
        window.dispatchEvent(new Event(PERMISSION_EVENT));
      }}
      className="min-h-11 md:min-h-9"
    >
      <Bell aria-hidden />
      Enable notifications
    </Button>
  );
}
