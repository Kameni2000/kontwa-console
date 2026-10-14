import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OrdersStore } from '../../core/orders/orders.store';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'kc-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly orders = inject(OrdersStore);
  readonly demoMode = environment.useMockBackend;
  private destroyRef = inject(DestroyRef);

  readonly nav = [
    { path: '/commandes', label: 'Commandes', icon: 'M4 6h16M4 12h16M4 18h10' },
    { path: '/catalogue', label: 'Catalogue', icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z' },
    { path: '/statistiques', label: 'Statistiques', icon: 'M5 19V10M12 19V5M19 19v-7' },
  ];

  ngOnInit(): void {
    // Rafraîchissement des commandes tant que la console est ouverte.
    this.orders.startPolling(this.destroyRef);
  }
}
