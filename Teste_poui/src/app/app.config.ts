import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FuncionariosInterceptor } from './rh/mocks/funcionarios.interceptor';
import { DepartamentosInterceptor } from './rh/mocks/departamentos.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { PoHttpRequestModule } from '@po-ui/ng-components';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';

import { routes } from './app.routes';

registerLocaleData(localePtBr, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(PoHttpRequestModule),
    importProvidersFrom(ProtheusLibCoreModule),
    { provide: HTTP_INTERCEPTORS, useClass: FuncionariosInterceptor,   multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: DepartamentosInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
