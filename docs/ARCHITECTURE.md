# Architecture de Kontwa Console

## Parcours d'une commande

```
Client WhatsApp ──► Kontwa (bot) ──► API /api/orders ──► Console Angular
                                            ▲                   │
                                            └── PATCH /status ◄─┘  (le commerçant fait avancer la commande)
```

Dans la démo en ligne, l'API est remplacée par un **faux back-end** (`web/src/app/core/mock/`) qui répond aux mêmes routes depuis le navigateur. On passe à l'API réelle avec `npm run start:api`.

## Front-end (`web/src/app`)

| Dossier | Rôle |
|---|---|
| `core/models.ts` | Types partagés (commande, produit, statistiques). |
| `core/orders/order-status.ts` | Règles du cycle de vie : quelles transitions sont permises. |
| `core/orders/orders.store.ts` | État des commandes : `signal` pour les données, `computed` pour les filtres et compteurs, rafraîchissement RxJS toutes les 10 s. |
| `core/orders/stats.ts` | Calcul des indicateurs (même logique que `StatsCalculator.cs`). |
| `core/auth/` | Service de session (signals + stockage local), intercepteur (jeton, 401) et gardes de route. |
| `core/mock/` | Données de démo déterministes et faux back-end (intercepteur HTTP). |
| `features/` | Pages : connexion, mise en page, commandes, détail, catalogue, statistiques — toutes chargées à la demande. |
| `shared/` | Badge de statut, graphique SVG, formatage FCFA et durées. |

**Choix techniques**
- *Signals plutôt qu'un store externe* : l'état est petit, les signals d'Angular suffisent et évitent une dépendance (NgRx).
- *Polling plutôt que WebSocket* : simple et robuste pour un petit commerce ; l'API pourrait plus tard pousser les commandes (SignalR) sans changer les composants, seulement le store.
- *Copie profonde dans le faux back-end* : comme une vraie réponse HTTP, pour ne jamais partager d'objet entre « serveur » et composants.

## Back-end (`api/Kontwa.Api`)

| Fichier | Rôle |
|---|---|
| `Program.cs` | Configuration (JSON, CORS, authentification, limitation des connexions) et endpoints Minimal API. |
| `Domain/` | Modèles, règles de transition, calcul des statistiques — sans dépendance au web, donc faciles à tester. |
| `Data/ConsoleStore.cs` | Stockage en mémoire derrière une interface `IConsoleStore` ; une base de données (EF Core, PostgreSQL) pourrait la remplacer sans toucher aux endpoints. |
| `Auth/` | Jetons signés HMAC-SHA256 (comparaison en temps constant) et `AuthenticationHandler` personnalisé. |

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion, renvoie `{ token, user }` |
| GET | `/api/orders?status=&q=` | Liste filtrée |
| GET | `/api/orders/{id}` | Détail |
| PATCH | `/api/orders/{id}/status` | Change le statut (409 si transition interdite) |
| POST | `/api/orders/simulate` | Démo : nouvelle commande WhatsApp |
| GET/POST | `/api/products` | Catalogue |
| PUT/DELETE | `/api/products/{id}` | Modification, suppression |
| GET | `/api/stats?days=7` | Indicateurs |
