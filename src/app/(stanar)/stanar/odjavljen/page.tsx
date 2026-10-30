import { Card, CardContent } from "@/components/ui/card";

export default function ResidentSignedOutPage() {
  return (
    <Card>
      <CardContent className="space-y-2 py-10 text-center">
        <h1 className="text-xl font-semibold">Odjavljeni ste</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Hvala. Kada vam upravnik pošalje novu pozivnicu, ponovo ćete moći da pristupite portalu.
        </p>
      </CardContent>
    </Card>
  );
}
