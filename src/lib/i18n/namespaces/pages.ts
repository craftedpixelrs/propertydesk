type Leaves<T> = T extends string ? string : { [K in keyof T]: Leaves<T[K]> };

export const pagesSr = {
  errorKicker: "Došlo je do greške",
  errorTitle: "Nešto nije prošlo kako treba",
  errorBody:
    "Pokušajte ponovo, a ako se problem ponavlja, kontaktirajte podršku sa oznakom {{digest}}.",
  notFoundKicker: "Greška 404",
  notFoundTitle: "Stranica nije pronađena",
  notFoundBody:
    "Tražena stranica ne postoji ili je premeštena. Vratite se na kontrolnu tablu i nastavite sa radom.",
  forbiddenKicker: "Greška 403",
  forbiddenTitle: "Pristup zabranjen",
  forbiddenBody:
    "Nemate potrebne dozvole za pregled ovog sadržaja. Kontaktirajte administratora vaše organizacije ako smatrate da je ovo greška.",
  globalErrorKicker: "Kritična greška",
  globalErrorTitle: "Aplikacija je naišla na neočekivan problem",
  globalErrorBody:
    "Osvežite stranicu ili se vratite kasnije. Ako se problem ponavlja, kontaktirajte podršku sa oznakom {{digest}}.",
  maintenanceTitle: "Planirano održavanje",
  maintenanceBody: "Radovi su u toku. Pokušajte ponovo uskoro.",
} as const;

export const pagesEn: Leaves<typeof pagesSr> = {
  errorKicker: "Something went wrong",
  errorTitle: "This page could not be loaded",
  errorBody:
    "Try again. If the problem continues, contact support and mention {{digest}}.",
  notFoundKicker: "Error 404",
  notFoundTitle: "Page not found",
  notFoundBody:
    "This page does not exist or has moved. Return to the dashboard to continue.",
  forbiddenKicker: "Error 403",
  forbiddenTitle: "Access denied",
  forbiddenBody:
    "You do not have permission to view this content. Contact your organization administrator if you think this is a mistake.",
  globalErrorKicker: "Critical error",
  globalErrorTitle: "The application hit an unexpected problem",
  globalErrorBody:
    "Refresh the page or try again later. If the problem continues, contact support and mention {{digest}}.",
  maintenanceTitle: "Scheduled maintenance",
  maintenanceBody: "Work is in progress. Please try again shortly.",
};
