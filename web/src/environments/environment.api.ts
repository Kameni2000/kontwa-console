/**
 * Configuration « API réelle » : l'application parle à l'API ASP.NET Core
 * du dossier /api (dotnet run → http://localhost:5080).
 * Utilisée par : npm run start:api
 */
export const environment = {
  apiUrl: 'http://localhost:5080/api',
  useMockBackend: false,
};
