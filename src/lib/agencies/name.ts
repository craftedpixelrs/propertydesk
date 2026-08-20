export function slugifyAgencyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agencija"
  );
}

export function agencyNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.slice(0, 80) : "Agencija";
}
