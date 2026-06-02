import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Users, Crown, Shield, Pencil, Check, X } from "lucide-react";
import {
  getMyTenantContext, listOrganizations, listOrgUsers,
  updateUserRole, updateOrganizationPlan, renameOrganization,
} from "@/lib/tenants.functions";

const ROLES = ["super_admin", "admin", "manager", "user"] as const;
const PLANS = ["free", "pro", "enterprise"] as const;

export function TenantsAdminSection() {
  const fetchCtx = useServerFn(getMyTenantContext);
  const { data: ctx } = useQuery({ queryKey: ["tenant-ctx"], queryFn: () => fetchCtx() });

  const [selectedOrg, setSelectedOrg] = useState<string | undefined>();
  const orgId = selectedOrg ?? ctx?.organization?.id;

  return (
    <div className="space-y-8">
      {ctx?.isSuperAdmin && (
        <OrganizationsTable onSelect={(id) => setSelectedOrg(id)} />
      )}
      {orgId && <OrgUsersTable organizationId={orgId} canManageSuperAdmin={!!ctx?.isSuperAdmin} />}
    </div>
  );
}

function OrganizationsTable({ onSelect }: { onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const fetchOrgs = useServerFn(listOrganizations);
  const updatePlan = useServerFn(updateOrganizationPlan);
  const rename = useServerFn(renameOrganization);
  const { data, isLoading } = useQuery({ queryKey: ["orgs"], queryFn: () => fetchOrgs() });
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");

  const planMut = useMutation({
    mutationFn: (v: { organizationId: string; plan: typeof PLANS[number] }) => updatePlan({ data: v }),
    onSuccess: () => { toast.success("Plan mis à jour"); qc.invalidateQueries({ queryKey: ["orgs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const nameMut = useMutation({
    mutationFn: (v: { organizationId: string; name: string }) => rename({ data: v }),
    onSuccess: () => { toast.success("Renommée"); setEditing(null); qc.invalidateQueries({ queryKey: ["orgs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
        <Building2 className="h-6 w-6 text-primary" /> Organisations
      </h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Membres</th>
              <th className="p-3">Premium</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {data?.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  {editing === o.id ? (
                    <div className="flex items-center gap-1">
                      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-48" />
                      <Button size="icon" variant="ghost" onClick={() => nameMut.mutate({ organizationId: o.id, name })}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <button className="hover:underline" onClick={() => { setEditing(o.id); setName(o.name); }}>
                      {o.name} <Pencil className="ml-1 inline h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{o.slug}</td>
                <td className="p-3">
                  <Select value={o.plan} onValueChange={(v) => planMut.mutate({ organizationId: o.id, plan: v as any })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3">{o.members}</td>
                <td className="p-3">{o.premium}</td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => onSelect(o.id)}>Voir membres</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function OrgUsersTable({ organizationId, canManageSuperAdmin }: { organizationId: string; canManageSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listOrgUsers);
  const updateRole = useServerFn(updateUserRole);

  const { data, isLoading } = useQuery({
    queryKey: ["org-users", organizationId],
    queryFn: () => fetchUsers({ data: { organizationId } }),
  });

  const roleMut = useMutation({
    mutationFn: (v: { targetUserId: string; role: typeof ROLES[number]; action: "add" | "remove" }) => updateRole({ data: v }),
    onSuccess: () => { toast.success("Rôle mis à jour"); qc.invalidateQueries({ queryKey: ["org-users", organizationId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
        <Users className="h-6 w-6 text-primary" /> Membres de l'organisation
      </h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Rôles actuels</th>
              <th className="p-3">Ajouter un rôle</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
            {data?.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-3">{u.is_premium ? <Badge><Crown className="mr-1 h-3 w-3" />Premium</Badge> : <Badge variant="secondary">Free</Badge>}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">aucun</span>}
                    {u.roles.map((r) => (
                      <Badge key={r} variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />{r}
                        <button
                          className="ml-1 text-destructive hover:opacity-70"
                          onClick={() => roleMut.mutate({ targetUserId: u.id, role: r as any, action: "remove" })}
                          title="Retirer ce rôle"
                        >×</button>
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <Select onValueChange={(v) => roleMut.mutate({ targetUserId: u.id, role: v as any, action: "add" })}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r !== "super_admin" || canManageSuperAdmin).map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
