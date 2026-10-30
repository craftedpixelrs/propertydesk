import { Card, CardContent } from "@/components/ui/card";

export default function ResidentAccessRequiredPage() {
  return (
    <Card>
      <CardContent className="space-y-3 py-10 text-center">
        <h1 className="text-xl font-semibold">Pristup portalu stanara</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Portal se otvara isključivo preko jednokratne pozivnice koju vam upravnik zgrade šalje na
          email. Ako je link iskorišćen ili je istekao, zamolite upravnika da vam pošalje novu
          pozivnicu.
        </p>
      </CardContent>
    </Card>
  );
}
