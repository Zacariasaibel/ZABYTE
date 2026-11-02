import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="state-panel shell"><p>404</p><h1>Hier geht es nicht weiter.</h1><p>Diese Seite gibt es nicht. Im Katalog findest du unsere Produkte.</p><a class="button primary" routerLink="/" queryParamsHandling="preserve">Zum Katalog</a></section>`,
})
export class NotFoundComponent {}
