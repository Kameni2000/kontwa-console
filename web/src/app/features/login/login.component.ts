import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http-error';
import { DEMO_USER } from '../../core/mock/demo-data';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'kc-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly demoMode = environment.useMockBackend;
  readonly demo = DEMO_USER;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  fillDemo(): void {
    this.form.setValue({ email: DEMO_USER.email, password: DEMO_USER.password });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const back = this.route.snapshot.queryParamMap.get('retour');
        this.router.navigateByUrl(back && back.startsWith('/') ? back : '/commandes');
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
