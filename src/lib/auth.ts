import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function logout(navigate: (opts: { to: string }) => void) {
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast.error("Erreur lors de la déconnexion");
    return;
  }
  toast.success("À bientôt !");
  navigate({ to: "/" });
}
