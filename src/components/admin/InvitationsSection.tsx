import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Copy, Trash2 } from "lucide-react";
import { listInvitations, createInvitation, revokeInvitation } from "@/lib/invitations.functions";

const ROLES = ["admin", "manager", "user"] as const;

export function InvitationsSection() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listInvitations);
  const create = useServerFn(createInvitation);
  const revoke = useServerFn(revokeInvitation);
  const { data, isLoading } = useQuery({ queryKey: ["invitations"], queryFn: () => fetchList() });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]>("user");

  const createMut = useMutation({
    mutationFn: () => create({ data: { email, role } }),
    onSuccess: (inv) => {
      const link = `${window.location.origin}/accept-invite?token=${inv.token}`;
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.success("Invitation créée — lien copié dans le presse-papier", { description: link });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => { toast.success("Invitation supprimée"); qc.invalidateQueries({ queryKey: ["invitations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Lien copié"));
  };

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
        <Mail className="h-6 w-6 text-primary" /> Invitations
      </h2>
      <Card className="p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Email du destinataire</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@exemple.com" />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Rôle</label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? "…" : "Inviter"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Un lien partageable sera copié dans votre presse-papier (valide 7 jours).
        </p>
      </Card>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Expire</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {data?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune invitation.</td></tr>}
            {data?.map((i) => {
              const expired = new Date(i.expires_at) < new Date();
              return (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{i.email}</td>
                  <td className="p-3"><Badge variant="outline">{i.role}</Badge></td>
                  <td className="p-3">
                    {i.accepted_at ? <Badge>Acceptée</Badge>
                      : expired ? <Badge variant="destructive">Expirée</Badge>
                      : <Badge variant="secondary">En attente</Badge>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(i.expires_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {!i.accepted_at && (
                        <Button size="icon" variant="ghost" onClick={() => copy(i.token)} title="Copier le lien">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => revokeMut.mutate(i.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
