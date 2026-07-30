import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';
import { PoI18nConfig, PoI18nModule } from '@po-ui/ng-components';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';

const i18nConfig: PoI18nConfig = {
  default: { language: 'pt', context: 'geral', cache: true },
  contexts: {
    geral: { url: '/assets/i18n/geral.' }
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(ProtheusLibCoreModule),
    importProvidersFrom(PoI18nModule.config(i18nConfig))
  ]
};
