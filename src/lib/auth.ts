import { getSupabaseClient } from "@/lib/supabase-safe";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit.functions";

export async function logout(navigate: (opts: { to: string }) => void) {
  await logAudit({ data: { action: "logout" } }).catch(() => {});
  const authClient = getSupabaseClient();
  if (!authClient) {
    navigate({ to: "/" });
    return;
  }

  const { error } = await authClient.auth.signOut();
  if (error) {
    toast.error("Erreur lors de la déconnexion");
    return;
  }
  toast.success("À bientôt !");
  navigate({ to: "/" });
}
